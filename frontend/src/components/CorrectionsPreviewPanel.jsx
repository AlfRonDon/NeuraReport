import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, LinearProgress, Stack, TextField, Typography } from '@mui/material';

import { runCorrectionsPreview } from '../api/client';

export default function CorrectionsPreviewPanel({
  templateId,
  disabled,
  onCompleted,
  onInstructionsChange = () => {},
  initialInstructions = '',
  mappingOverride = {},
  sampleTokens = [],
  onSaveAndClose = () => {},
}) {
  const [instructions, setInstructions] = useState(initialInstructions || '');
  const latestInstructionsRef = useRef(initialInstructions || '');
  const syncTimerRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const abortRef = useRef(null);

  const mappingSnapshot = useMemo(() => {
    if (!mappingOverride || typeof mappingOverride !== 'object') return {};
    const snapshot = {};
    for (const [token, value] of Object.entries(mappingOverride)) {
      if (!token) continue;
      if (value === undefined || value === null) continue;
      snapshot[token] = typeof value === 'string' ? value : String(value);
    }
    return snapshot;
  }, [mappingOverride]);

  const sampleTokensSnapshot = useMemo(
    () =>
      Array.from(
        new Set(
          (sampleTokens || [])
            .filter((token) => typeof token === 'string')
            .map((token) => token.trim())
            .filter(Boolean)
        )
      ),
    [sampleTokens]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    latestInstructionsRef.current = instructions;
  }, [instructions]);

  const flushInstructions = useCallback(() => {
    if (typeof onInstructionsChange !== 'function') return;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    onInstructionsChange(latestInstructionsRef.current);
  }, [onInstructionsChange]);

  useEffect(() => {
    if (typeof onInstructionsChange !== 'function') return undefined;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    const valueForCallback = instructions;
    syncTimerRef.current = setTimeout(() => {
      onInstructionsChange(valueForCallback);
      syncTimerRef.current = null;
    }, 300);
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [instructions, onInstructionsChange]);

  useEffect(() => () => {
    flushInstructions();
  }, [flushInstructions]);

  useEffect(() => {
    const next = initialInstructions || '';
    setInstructions((prev) => (prev === next ? prev : next));
  }, [initialInstructions]);

  useEffect(() => {
    setAcknowledged(false);
  }, [instructions]);

  const handleRun = async () => {
    if (!templateId) {
      setErrorMsg('Template is not ready. Verify and map the template first.');
      return;
    }
    latestInstructionsRef.current = instructions;
    flushInstructions();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setErrorMsg('');
    setAcknowledged(false);

    try {
      const finalEvent = await runCorrectionsPreview({
        templateId,
        userInput: instructions,
        mappingOverride: mappingSnapshot,
        sampleTokens: sampleTokensSnapshot,
        onEvent: () => {},
        signal: controller.signal,
      });
      setResult(finalEvent);
      onCompleted?.(finalEvent);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setErrorMsg(err?.message || 'Corrections preview failed.');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setRunning(false);
    }
  };

  const handleSaveAndClose = () => {
    if (!result) return;
    latestInstructionsRef.current = instructions;
    flushInstructions();
    setAcknowledged(true);
    if (typeof onSaveAndClose === 'function') {
      onSaveAndClose();
    }
  };

  const processed = result?.processed || {};
  const summary = result?.summary || {};
  const constantsInlined = summary.constants_inlined ?? 0;
  const pageSummaryChars = (processed.page_summary || '').length;

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">Corrections Assistant</Typography>
        <Typography variant="body2" color="text.secondary">
          Provide instructions to fix the template and inline constants. Each run updates the HTML and refreshes the page
          summary for the narrative step.
        </Typography>

        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <TextField
          label="Instructions (free-form)"
          multiline
          minRows={3}
          placeholder="Example: Fix spelling issues, inline the company name using the PDF, and note any footer signatures."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={running || disabled}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            onClick={handleRun}
            disabled={running || disabled}
            startIcon={running ? <CircularProgress size={18} /> : null}
          >
            {running ? 'Running...' : result ? 'Rerun Corrections' : 'Run Corrections'}
          </Button>
          <Button variant="outlined" onClick={handleSaveAndClose} disabled={!result || running}>
            Save &amp; Close
          </Button>
        </Stack>

        {acknowledged && result && (
          <Alert severity="success" variant="outlined">
            Latest run marked complete. You can close this panel or continue to the narrative step.
          </Alert>
        )}

        {running && <LinearProgress />}

        {result && (
          <Alert severity="info" variant="outlined">
            Latest run saved. Constants inlined: {constantsInlined}. Page summary length: {pageSummaryChars} characters.
            The updated template and narrative will be used for the final narrative step.
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
