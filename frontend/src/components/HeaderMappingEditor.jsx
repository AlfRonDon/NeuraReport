import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, FormControl, MenuItem, ListSubheader,
  Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
  Alert, CircularProgress
} from "@mui/material";
import { mappingPreview, mappingApprove } from "../api/client";

export default function HeaderMappingEditor({
  templateId,
  connectionId,
  onApproved,                     // callback after successful save
  blockApproveUntilResolved,      // preferred name
  disabledApproveWhileUnresolved, // back-compat alias
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);   // { mapping, errors, catalog, schema_info, (optional) headers }
  const [mapping, setMapping] = useState({});     // editable mapping (may be sparse)
  const [headersAll, setHeadersAll] = useState([]); // stable, full list of headers to render

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
    if (!templateId || !connectionId) return;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await mappingPreview(templateId, connectionId);
        setPreview(data);
        setMapping(data.mapping || {});
        // Build a stable list of headers to display:
        // Prefer server-provided headers; else keys from mapping; else labels from errors (if any)
        const fromServer = Array.isArray(data.headers) ? data.headers : [];
        const fromMapping = Object.keys(data.mapping || {});
        const fromErrors = (data.errors || []).map(e => e.label).filter(Boolean);
        const all = Array.from(new Set([...fromServer, ...fromMapping, ...fromErrors])).sort((a,b)=>a.localeCompare(b));
        setHeadersAll(all);
      } catch (e) {
        setErrorMsg(e?.message || "Failed to load mapping preview");
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId, connectionId]);

  const handleChange = (header, value) => {
    setMapping(m => ({ ...m, [header]: value }));
  };

  const handleReset = () => {
    setMapping(Object.fromEntries(headersAll.map(h => [h, "UNRESOLVED"])));
  };

  const handleApprove = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // send mapping for all headers; if some are missing, mark them unresolved
      const payload = Object.fromEntries(
        headersAll.map(h => [h, mapping?.[h] ?? "UNRESOLVED"])
      );
      await mappingApprove(templateId, payload);
      onApproved?.();
    } catch (e) {
      setErrorMsg(e?.message || "Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  // unresolved = empty or "UNRESOLVED", computed against headersAll
  const unresolvedCount = useMemo(
    () => headersAll.reduce((acc, h) => {
      const v = mapping?.[h];
      return acc + (!v || v === "UNRESOLVED" ? 1 : 0);
    }, 0),
    [headersAll, mapping]
  );

  // early UI states
  if (!templateId || !connectionId) {
    return (
      <Alert severity="info">
        Verify a template and ensure a DB connection is selected to generate mapping.
      </Alert>
    );
  }
  if (loading && !preview) return <Typography>Loading mapping…</Typography>;
  if (errorMsg && !preview) return <Alert severity="error">{errorMsg}</Alert>;
  if (!preview) return null;

  const parentTbl = preview?.schema_info?.["parent table"];
  const childTbl  = preview?.schema_info?.["child table"];

  // request/approval gating
  const waiting = loading; // saving or fetching
  const approveDisabled =
    waiting ||
    headersAll.length === 0 ||
    (blockApproval && unresolvedCount > 0);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Header Mappings</Typography>

      {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      {!!preview.errors?.length && (
        <Box sx={{ p: 1, border: "1px solid #eee", borderRadius: 1, bgcolor: "#fff9f9" }}>
          <Typography variant="subtitle2" color="error">Auto-mapping issues</Typography>
          {preview.errors.map((e, i) => (
            <Typography variant="body2" color="error" key={i}>
              • {e.issue}: {e.label}
            </Typography>
          ))}
        </Box>
      )}

      {/* Always render the table so users can edit even when all resolved */}
      <Table size="small" sx={{ mt: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "40%" }}>Header</TableCell>
            <TableCell sx={{ width: "45%" }}>Map to column</TableCell>
            <TableCell sx={{ width: "15%" }}>Status</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {headersAll.map(header => {
            const value = (mapping?.[header] ?? "UNRESOLVED");
            const resolved = value !== "UNRESOLVED";
            return (
              <TableRow key={header}>
                <TableCell sx={{ fontWeight: 500 }}>{header}</TableCell>
                <TableCell>
                  <FormControl fullWidth size="small" disabled={waiting}>
                    <Select
                      value={value} // show "UNRESOLVED" explicitly when unresolved
                      onChange={(e) => handleChange(header, e.target.value)}
                      MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                    >
                      <ListSubheader disableSticky>Choose column</ListSubheader>
                      <MenuItem value="UNRESOLVED">UNRESOLVED</MenuItem>

                      {/* Parent group first (if present) */}
                      {parentTbl && (
                        <ListSubheader disableSticky>{parentTbl}</ListSubheader>
                      )}
                      {Object.entries(groupedCatalog)
                        .filter(([tbl]) => tbl === parentTbl)
                        .flatMap(([_, cols]) =>
                          cols.map(fq => <MenuItem key={fq} value={fq}>{fq}</MenuItem>)
                        )
                      }

                      {/* Child group next (if present) */}
                      {childTbl && (
                        <ListSubheader disableSticky>{childTbl}</ListSubheader>
                      )}
                      {Object.entries(groupedCatalog)
                        .filter(([tbl]) => tbl === childTbl)
                        .flatMap(([_, cols]) =>
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
                <TableCell width={140}>
                  {resolved ? (
                    <Chip size="small" label="Resolved" color="success" />
                  ) : (
                    <Chip size="small" label="Unresolved" color="warning" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Footer bar with blurred/disabled state while waiting */}
      <Box position="relative">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            opacity: waiting ? 0.8 : 1,
            filter: waiting ? "blur(0.3px)" : "none",
            transition: "opacity 120ms ease, filter 120ms ease",
          }}
        >
          <Typography variant="body2" color={unresolvedCount ? "warning.main" : "success.main"}>
            {headersAll.length === 0
              ? "No headers detected in template"
              : (unresolvedCount ? `${unresolvedCount} unresolved` : "All resolved")}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={headersAll.length === 0 || waiting}
            >
              Reset
            </Button>

            <Button
              variant="contained"
              onClick={handleApprove}
              disabled={approveDisabled}
              startIcon={waiting ? <CircularProgress size={18} /> : null}
            >
              {waiting ? "Saving…" : "Approve & Save"}
            </Button>
          </Stack>
        </Stack>

        {/* subtle overlay to indicate busy state */}
        {waiting && (
          <Box
            aria-hidden
            position="absolute"
            inset={-4}
            bgcolor="rgba(255,255,255,0.35)"
            sx={{ backdropFilter: "blur(2px)", borderRadius: 1, pointerEvents: "none" }}
          />
        )}
      </Box>
    </Stack>
  );
}
