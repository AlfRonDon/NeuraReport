import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Chip, FormControl, MenuItem, ListSubheader,
  Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
  Alert, CircularProgress, LinearProgress, TextField
} from "@mui/material";
import { mappingPreview, mappingApprove } from "../api/client";
import { useStepTimingEstimator, formatDuration } from "../hooks/useStepTimingEstimator";

const VALUE_UNRESOLVED = "UNRESOLVED";
const VALUE_SAMPLE = "INPUT_SAMPLE";
const UNRESOLVED_VALUES = new Set([VALUE_UNRESOLVED, VALUE_SAMPLE]);

export default function HeaderMappingEditor({
  templateId,
  connectionId,
  onApproved,                     // callback after successful save (receives server resp with URLs)
  blockApproveUntilResolved,      // preferred name
  disabledApproveWhileUnresolved, // back-compat alias
}) {
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);   // { mapping, errors, catalog, schema_info, (optional) headers }
  const [mapping, setMapping] = useState({});     // editable mapping (may be sparse)
  const [headersAll, setHeadersAll] = useState([]); // stable, full list of headers to render
  const [approveStage, setApproveStage] = useState("");
  const [approveLog, setApproveLog] = useState([]);
  const [approveProgress, setApproveProgress] = useState(0);
  const [userValuesText, setUserValuesText] = useState("");
  const approveAbortRef = useRef(null);
  const approveRequestRef = useRef(0);
  const {
    eta: approveEta,
    startRun: beginApproveTiming,
    noteStage: trackApproveStage,
    finishRun: finishApproveTiming,
  } = useStepTimingEstimator("mapping-approve");

  const formatIssue = (issue) => {
    const normalized = (issue ?? "").toString().trim();
    if (normalized === VALUE_SAMPLE) return "Pick from input sample";
    if (normalized === VALUE_UNRESOLVED) return "User Input";
    return normalized;
  };

  // normalize the “block approval” flag (support either prop name)
  const blockApproval = Boolean(
    blockApproveUntilResolved ?? disabledApproveWhileUnresolved ?? false
  );

  // group catalog options by table for nicer dropdowns
  const groupedCatalog = useMemo(() => {
    const out = {};
    const list = preview?.catalog || [];
    for (const fq of list) {
      const [tbl, col] = fq.split(".");
      if (!tbl || !col) continue;
      (out[tbl] ||= []).push(fq);
    }
    return Object.fromEntries(
      Object.keys(out).sort().map(tbl => [tbl, out[tbl].slice().sort()])
    );
  }, [preview?.catalog]);

  // fetch preview on mount/prop change
  useEffect(() => {
    if (!templateId || !connectionId) {
      setPreview(null);
      setMapping({});
      setHeadersAll([]);
      setApproveStage("");
      setApproveLog([]);
      setApproveProgress(0);
      setUserValuesText("");
      return;
    }
    let cancelled = false;
    setFetching(true);
    setErrorMsg("");
    setPreview(null);
    setMapping({});
    setHeadersAll([]);
    setApproveStage("");
    setApproveLog([]);
    setApproveProgress(0);
    setUserValuesText("");
    (async () => {
      try {
        const data = await mappingPreview(templateId, connectionId);
        if (cancelled) return;
        setPreview(data);
        setMapping(data.mapping || {});
        // Build a stable list of headers to display:
        // Prefer server-provided headers; else keys from mapping; else labels from errors (if any)
        const fromServer = Array.isArray(data.headers) ? data.headers : [];
        const fromMapping = Object.keys(data.mapping || {});
        const fromErrors = (data.errors || []).map(e => e.label).filter(Boolean);
        const all = Array.from(new Set([...fromServer, ...fromMapping, ...fromErrors]))
          .sort((a,b)=>a.localeCompare(b));
        setHeadersAll(all);
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e?.message || "Failed to load mapping preview");
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId, connectionId]);

  useEffect(() => () => {
    approveAbortRef.current?.abort();
  }, []);

  const handleChange = (header, value) => {
    setMapping(m => ({ ...m, [header]: value }));
  };

  const handleReset = () => {
    setMapping(Object.fromEntries(headersAll.map(h => [h, VALUE_UNRESOLVED])));
    setUserValuesText("");
  };

  const handleApprove = async () => {
    const payload = Object.fromEntries(
      headersAll.map((h) => [h, mapping?.[h] ?? VALUE_UNRESOLVED])
    );

    if (approveAbortRef.current) {
      approveAbortRef.current.abort();
    }
    const controller = new AbortController();
    approveAbortRef.current = controller;

    const requestId = approveRequestRef.current + 1;
    approveRequestRef.current = requestId;

    beginApproveTiming();
    setSaving(true);
    setErrorMsg("");
    setApproveStage("Saving approved mapping...");
    setApproveLog(["Saving approved mapping..."]);
    setApproveProgress(5);
    trackApproveStage("Saving approved mapping...");

    const handleProgress = (evt) => {
      if (approveRequestRef.current !== requestId) return;
      if (typeof evt?.progress === "number") {
        setApproveProgress(evt.progress);
      }
      if (evt?.stage) {
        setApproveStage(evt.stage);
        setApproveLog((prev) =>
          prev[prev.length - 1] === evt.stage ? prev : [...prev, evt.stage]
        );
        trackApproveStage(evt.stage);
      }
    };

    let outcome = "pending";
    try {
      const resp = await mappingApprove(templateId, payload, {
        connectionId,
        userValuesText,
        onProgress: handleProgress,
        signal: controller.signal,
      });
      if (approveRequestRef.current !== requestId) {
        outcome = "aborted";
        return;
      }
      setApproveProgress((p) => (p < 100 ? 100 : p));
      setApproveStage("Approval complete.");
      trackApproveStage("Approval complete.");
      outcome = "success";
      const maybe = onApproved?.({ ...resp, requestId });
      if (maybe && typeof maybe.then === "function") {
        await maybe;
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        outcome = "aborted";
      } else {
        outcome = "error";
        const msg = e?.message || "Failed to save mapping";
        setErrorMsg(msg);
        setApproveStage(`Error: ${msg}`);
        setApproveLog((prev) =>
          prev[prev.length - 1] === `Error: ${msg}` ? prev : [...prev, `Error: ${msg}`]
        );
        trackApproveStage(`Error: ${msg}`);
        setApproveProgress(100);
      }
    } finally {
      if (approveAbortRef.current === controller) {
        approveAbortRef.current = null;
      }
      if (approveRequestRef.current === requestId && outcome !== "aborted") {
        finishApproveTiming();
        setSaving(false);
      }
    }
  };

  // unresolved = empty or "UNRESOLVED", computed against headersAll
  const unresolvedCount = useMemo(
    () =>
      headersAll.reduce((acc, h) => {
        const v = (mapping?.[h] ?? VALUE_UNRESOLVED).trim();
        return acc + (v === VALUE_UNRESOLVED ? 1 : 0);
      }, 0),
    [headersAll, mapping]
  );

  const unresolvedOnly = useMemo(
    () =>
      headersAll.filter((h) => (mapping?.[h] ?? VALUE_UNRESOLVED).trim() === VALUE_UNRESOLVED),
    [headersAll, mapping]
  );

  const requireUserInput = unresolvedOnly.length > 0;

  // early UI states
  if (!templateId || !connectionId) {
    return (
      <Alert severity="info">
        Verify a template and ensure a DB connection is selected to generate mapping.
      </Alert>
    );
  }
  if (fetching && !preview) return <Typography>Loading mapping...</Typography>;
  if (errorMsg && !preview) return <Alert severity="error">{errorMsg}</Alert>;
  if (!preview) return null;

  const parentTbl = preview?.schema_info?.["parent table"];
  const childTbl  = preview?.schema_info?.["child table"];

  // request/approval gating
  const waiting = fetching || saving;
  const approveDisabled =
    waiting ||
    headersAll.length === 0 ||
    (blockApproval && unresolvedCount > 0) ||
    (requireUserInput && !userValuesText.trim());

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Header Mappings</Typography>

      {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      {!!preview.errors?.length && (
        <Box sx={{ p: 1, border: "1px solid #eee", borderRadius: 1, bgcolor: "#fff9f9" }}>
          <Typography variant="subtitle2" color="error">Auto-mapping issues</Typography>
          {preview.errors.map((e, i) => (
            <Typography variant="body2" color="error" key={i}>
              • {formatIssue(e.issue)}: {e.label}
            </Typography>
          ))}
        </Box>
      )}

      {/* Always render the table so users can edit even when all resolved */}
      <Box sx={{ mt: 1, overflowX: 'auto' }}>
        <Table
          size="small"
          sx={{
            minWidth: 560,
            width: '100%',
            '& th, & td': {
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              verticalAlign: 'top',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '40%', fontWeight: 600 }}>Header</TableCell>
              <TableCell sx={{ width: '45%', fontWeight: 600 }}>Map to column</TableCell>
              <TableCell sx={{ width: '15%', fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {headersAll.map(header => {
              const value = (mapping?.[header] ?? VALUE_UNRESOLVED);
              const normalized = (value || "").trim();
              const isSample = normalized === VALUE_SAMPLE;
              const isUnresolved = normalized === VALUE_UNRESOLVED;
              const resolved = !(isSample || isUnresolved);
              return (
                <TableRow key={header}>
                  <TableCell sx={{ fontWeight: 500 }}>{header}</TableCell>
                  <TableCell sx={{ minWidth: 0 }}>
                    <FormControl fullWidth size="small" disabled={waiting}>
                      <Select
                        value={value} // keep placeholder value selected when unresolved
                        onChange={(e) => handleChange(header, e.target.value)}
                        MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                      >
                        <ListSubheader disableSticky>Choose column</ListSubheader>
                        <MenuItem value={VALUE_UNRESOLVED}>User Input</MenuItem>
                        <MenuItem value={VALUE_SAMPLE}>Pick from input sample</MenuItem>

                        {/* Parent group first (if present) */}
                        {parentTbl && (
                          <ListSubheader disableSticky>{parentTbl}</ListSubheader>
                        )}
                        {Object.entries(groupedCatalog)
                          .filter(([tbl]) => tbl === parentTbl)
                          .flatMap(([, cols]) =>
                            cols.map(fq => <MenuItem key={fq} value={fq}>{fq}</MenuItem>)
                          )
                        }

                        {/* Child group next (if present) */}
                        {childTbl && (
                          <ListSubheader disableSticky>{childTbl}</ListSubheader>
                        )}
                        {Object.entries(groupedCatalog)
                          .filter(([tbl]) => tbl === childTbl)
                          .flatMap(([, cols]) =>
                            cols.map(fq => <MenuItem key={fq} value={fq}>{fq}</MenuItem>)
                          )
                        }

                        {/* Any other tables (edge case) */}
                        {Object.entries(groupedCatalog)
                          .filter(([tbl]) => tbl !== parentTbl && tbl !== childTbl)
                          .flatMap(([tbl, cols]) => ([
                            <ListSubheader key={`lh-${tbl}`} disableSticky>{tbl}</ListSubheader>,
                            ...cols.map(fq => <MenuItem key={fq} value={fq}>{fq}</MenuItem>)
                          ]))
                        }
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ width: 140 }}>
                    {resolved ? (
                      <Chip size="small" label="Resolved" color="success" />
                    ) : isSample ? (
                      <Chip size="small" label="Input sample" color="info" />
                    ) : (
                      <Chip size="small" label="User Input" color="warning" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      {requireUserInput && (
        <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
          <Typography variant="subtitle2" gutterBottom>
            Provide the appropriate values for the following fields
          </Typography>
          <Typography variant="body2" color="text.secondary">
            List the values the report should use for these placeholders. Describe each value clearly (e.g., "From Date: 01-Apr-2025").
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1, mb: 1 }}>
            {unresolvedOnly.map((label) => (
              <li key={label}>
                <Typography variant="body2">{label}</Typography>
              </li>
            ))}
          </Box>
          <TextField
            label="User-provided values"
            placeholder="Example: From Date: 01-Apr-2025; Location: Plant A"
            multiline
            minRows={3}
            fullWidth
            value={userValuesText}
            onChange={(e) => setUserValuesText(e.target.value)}
            disabled={waiting}
          />
          {requireUserInput && !userValuesText.trim() && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
              Enter the values before approving.
            </Typography>
          )}
        </Box>
      )}

      {/* Footer bar with disabled overlay while waiting */}
      <Box position="relative">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent={{ xs: "flex-start", sm: "space-between" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={{ xs: 1, sm: 1.5 }}
          sx={{
            opacity: waiting ? 0.8 : 1,
            transition: "opacity 120ms ease",
          }}
        >
          <Typography variant="body2" color={unresolvedCount ? "warning.main" : "success.main"}>
            {headersAll.length === 0
              ? "No headers detected in template"
              : (unresolvedCount ? `${unresolvedCount} unresolved` : "All resolved")}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={headersAll.length === 0 || waiting}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Reset
            </Button>

            <Button
              variant="contained"
              onClick={handleApprove}
              disabled={approveDisabled}
              startIcon={saving ? <CircularProgress size={18} /> : null}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {saving ? "Saving..." : "Approve & Save"}
            </Button>
          </Stack>
        </Stack>

        {(saving || approveLog.length > 0) && (
          <Box sx={{ mt: 1 }}>
            {approveStage && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {approveStage}
              </Typography>
            )}
            <LinearProgress variant="determinate" value={approveProgress} />
            <Box sx={{ mt: 0.5, display: 'grid', gap: 0.25 }}>
              {approveLog.map((msg, idx) => (
                <Typography
                  key={`${msg}-${idx}`}
                  variant="caption"
                  color={idx === approveLog.length - 1 && saving ? 'primary.main' : 'text.secondary'}
                >
                  {idx + 1}. {msg}
                </Typography>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Estimated time remaining:{' '}
              {approveEta.ms == null
                ? "Learning step timings..."
                : `${approveEta.reliable ? "" : "~ "}${formatDuration(approveEta.ms)}${approveEta.reliable ? "" : " (learning)"}`}
            </Typography>
          </Box>
        )}

        {/* subtle overlay to indicate busy state */}
        {waiting && (
          <Box
            aria-hidden
            position="absolute"
            inset={-4}
            bgcolor="rgba(255,255,255,0.5)"
            sx={{ borderRadius: 1, pointerEvents: "none" }}
          />
        )}
      </Box>
    </Stack>
  );
}



