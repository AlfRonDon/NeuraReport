import Grid from '@mui/material/Grid2'
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Breadcrumbs,
  Link,
} from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation, Link as RouterLink } from 'react-router-dom'

import ScaledIframePreview from '../../../components/ScaledIframePreview.jsx'
import Surface from '../../../components/layout/Surface.jsx'
import { useToast } from '../../../components/ToastProvider.jsx'
import { useAppStore } from '../../../store/useAppStore.js'
import { buildLastEditInfo } from '../../../utils/templateMeta'
import {
  getTemplateHtml,
  editTemplateManual,
  editTemplateAi,
  undoTemplateEdit,
} from '../../../api/client'

const surfaceStackSx = {
  gap: { xs: 2, md: 2.5 },
}

const FixedTextarea = forwardRef(function FixedTextarea(props, ref) {
  return <textarea {...props} ref={ref} />
})

export default function TemplateEditor() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const templates = useAppStore((state) => state.templates)
  const updateTemplateEntry = useAppStore((state) => state.updateTemplate)

  // Track where user came from for proper back navigation
  const referrer = location.state?.from || '/generate'

  const template = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId],
  )

  const [loading, setLoading] = useState(true)
  const [html, setHtml] = useState('')
  const [initialHtml, setInitialHtml] = useState('')
  const [instructions, setInstructions] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [undoBusy, setUndoBusy] = useState(false)
  const [serverMeta, setServerMeta] = useState(null)
  const [diffSummary, setDiffSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [diffOpen, setDiffOpen] = useState(false)

  const dirty = html !== initialHtml

  const syncTemplateMetadata = useCallback(
    (metadata) => {
      if (!metadata || !templateId || typeof updateTemplateEntry !== 'function') return
      updateTemplateEntry(templateId, (tpl) => {
        if (!tpl) return tpl
        const prevGenerator = tpl.generator || {}
        const prevSummary = prevGenerator.summary || {}
        const nextSummary = { ...prevSummary }
        const fields = ['lastEditType', 'lastEditAt', 'lastEditNotes']
        let summaryChanged = false
        fields.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(metadata, field) && metadata[field] !== undefined) {
            if (nextSummary[field] !== metadata[field]) {
              nextSummary[field] = metadata[field]
              summaryChanged = true
            }
          }
        })
        if (!summaryChanged) {
          return tpl
        }
        return {
          ...tpl,
          generator: {
            ...prevGenerator,
            summary: nextSummary,
          },
        }
      })
    },
    [templateId, updateTemplateEntry],
  )

  const loadTemplate = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTemplateHtml(templateId)
      const nextHtml = typeof data?.html === 'string' ? data.html : ''
      setHtml(nextHtml)
      setInitialHtml(nextHtml)
      setServerMeta(data?.metadata || null)
      setDiffSummary(data?.diff_summary || null)
      setHistory(Array.isArray(data?.history) ? data.history : [])
      if (data?.metadata) {
        syncTemplateMetadata(data.metadata)
      }
    } catch (err) {
      setError(String(err?.message || err))
      toast.show(String(err), 'error')
    } finally {
      setLoading(false)
    }
  }, [templateId, toast, syncTemplateMetadata])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  useEffect(() => {
    if (!html) {
      setPreviewUrl(null)
      return
    }
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [html])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty) return
      event.preventDefault()
      // eslint-disable-next-line no-param-reassign
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [dirty])

  const handleSave = useCallback(async () => {
    if (!templateId) return
    setSaving(true)
    try {
      const data = await editTemplateManual(templateId, html)
      const nextHtml = typeof data?.html === 'string' ? data.html : html
      setHtml(nextHtml)
      setInitialHtml(nextHtml)
      setServerMeta(data?.metadata || null)
      setDiffSummary(data?.diff_summary || null)
      setHistory(Array.isArray(data?.history) ? data.history : history)
      if (data?.metadata) {
        syncTemplateMetadata(data.metadata)
      }
      toast.show('Template HTML saved.', 'success')
    } catch (err) {
      toast.show(String(err), 'error')
    } finally {
      setSaving(false)
    }
  }, [templateId, html, toast, syncTemplateMetadata])

  const handleApplyAi = useCallback(async () => {
    if (!templateId) return
    const text = (instructions || '').trim()
    if (!text) {
      toast.show('Enter AI instructions before applying.', 'info')
      return
    }
    setAiBusy(true)
    try {
      const data = await editTemplateAi(templateId, text, html)
      const nextHtml = typeof data?.html === 'string' ? data.html : html
      setHtml(nextHtml)
      setInitialHtml(nextHtml)
      setServerMeta(data?.metadata || null)
      setDiffSummary(data?.diff_summary || null)
      setHistory(Array.isArray(data?.history) ? data.history : history)
      if (data?.metadata) {
        syncTemplateMetadata(data.metadata)
      }
      setInstructions('')
      const changes = Array.isArray(data?.summary) ? data.summary : []
      if (changes.length) {
        toast.show(`AI updated template: ${changes.join('; ')}`, 'success')
      } else {
        toast.show('AI updated the template HTML.', 'success')
      }
    } catch (err) {
      toast.show(String(err), 'error')
    } finally {
      setAiBusy(false)
    }
  }, [templateId, html, instructions, toast, syncTemplateMetadata])

  const handleUndo = useCallback(async () => {
    if (!templateId) return
    setUndoBusy(true)
    try {
      const data = await undoTemplateEdit(templateId)
      const nextHtml = typeof data?.html === 'string' ? data.html : html
      setHtml(nextHtml)
      setInitialHtml(nextHtml)
      setServerMeta(data?.metadata || null)
      setDiffSummary(data?.diff_summary || null)
      setHistory(Array.isArray(data?.history) ? data.history : history)
      if (data?.metadata) {
        syncTemplateMetadata(data.metadata)
      }
      toast.show('Reverted to the previous template version.', 'success')
    } catch (err) {
      toast.show(String(err), 'error')
    } finally {
      setUndoBusy(false)
    }
  }, [templateId, html, toast, syncTemplateMetadata])

  const handleBack = () => {
    if (dirty && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave the editor and discard them?',
      )
      if (!confirmed) return
    }
    navigate(referrer)
  }

  const lastEditInfo = buildLastEditInfo(serverMeta)

  const renderDiff = () => {
    const beforeLines = (initialHtml || '').split('\n')
    const afterLines = (html || '').split('\n')
    const maxLen = Math.max(beforeLines.length, afterLines.length)
    const rows = []
    for (let i = 0; i < maxLen; i += 1) {
      rows.push({
        before: beforeLines[i] ?? '',
        after: afterLines[i] ?? '',
      })
    }
    return (
      <Stack spacing={1} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
        {rows.map((row, idx) => {
          const changed = row.before !== row.after
          return (
            <Box
              key={`diff-${idx}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                bgcolor: changed ? 'rgba(255,229,100,0.12)' : 'transparent',
                borderBottom: '1px solid',
                borderColor: 'divider',
                p: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  color: changed ? 'warning.main' : 'text.secondary',
                }}
              >
                {row.before}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  color: changed ? 'success.main' : 'text.secondary',
                }}
              >
                {row.after}
              </Typography>
            </Box>
          )
        })}
      </Stack>
    )
  }

  const breadcrumbLabel = referrer === '/' ? 'Setup' : 'Generate'

  return (
    <>
    {/* Breadcrumb Navigation */}
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
      >
        <Link
          component={RouterLink}
          to={referrer}
          underline="hover"
          color="text.secondary"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          {breadcrumbLabel}
        </Link>
        <Typography color="text.primary" fontWeight={600}>
          Edit Template
        </Typography>
      </Breadcrumbs>
    </Box>

    <Surface sx={surfaceStackSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {template?.name || 'Template Editor'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {templateId ? `ID: ${templateId}` : 'No template selected'}
          </Typography>
          {lastEditInfo && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Last edit: {lastEditInfo.chipLabel}
            </Typography>
          )}
          {diffSummary && (
            <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
              Recent change: {diffSummary}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Back to {breadcrumbLabel}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      ) : (
        <>
          <Divider />
          <Grid
            container
            spacing={2.5}
            sx={{ alignItems: 'stretch' }}
          >
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
              <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Typography variant="subtitle1">Preview</Typography>
                {previewUrl ? (
                  <Box
                    sx={{
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      p: 1.5,
                      minHeight: 200,
                    }}
                  >
                    <ScaledIframePreview
                      src={previewUrl}
                      title={`Template preview for ${templateId}`}
                      fit="contain"
                      pageShadow
                      frameAspectRatio="210 / 297"
                      clampToParentHeight
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      borderRadius: 1.5,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      p: 2,
                      minHeight: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No HTML loaded yet.
                    </Typography>
                  </Box>
                )}
                {lastEditInfo && (
                  <Typography variant="caption" color="text.secondary">
                    {lastEditInfo.chipLabel}
                  </Typography>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
              <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Typography variant="subtitle1">HTML &amp; AI guidance</Typography>
                <TextField
                  label="Template HTML"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  multiline
                  minRows={10}
                  maxRows={24}
                  fullWidth
                  variant="outlined"
                  size="small"
                  helperText={dirty ? 'You have unsaved changes.' : 'HTML is in sync with the saved template.'}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="AI instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  multiline
                  rows={4}
                  InputProps={{ inputComponent: FixedTextarea }}
                  fullWidth
                  variant="outlined"
                  size="small"
                  helperText="Describe how the template should change. AI will preserve tokens and structure unless you ask otherwise."
                  InputLabelProps={{ shrink: true }}
                />
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saving || loading}
                  >
                    {saving ? 'Saving...' : 'Save HTML'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleApplyAi}
                    disabled={aiBusy || loading}
                  >
                    {aiBusy ? 'Applying AI...' : 'Apply via AI'}
                  </Button>
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={handleUndo}
                    disabled={undoBusy || loading}
                  >
                    {undoBusy ? 'Undoing...' : 'Undo last change'}
                  </Button>
                  <Button
                    variant="text"
                    color="primary"
                    onClick={() => setDiffOpen(true)}
                    disabled={loading}
                  >
                    View diff
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  AI edits are generated and may need review before use in production runs.
                </Typography>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">History</Typography>
                  {Array.isArray(history) && history.length ? (
                    <Stack spacing={0.5}>
                      {history
                        .slice(-5)
                        .reverse()
                        .map((entry, idx) => (
                          <Typography key={`hist-${idx}`} variant="caption" color="text.secondary">
                            {entry.timestamp || 'Unknown time'} — {entry.type || 'edit'}
                            {entry.notes ? `: ${entry.notes}` : ''}
                          </Typography>
                        ))}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No edit history recorded yet.
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </Surface>
    <Dialog
      open={diffOpen}
      onClose={() => setDiffOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>HTML diff (before vs current)</DialogTitle>
      <DialogContent dividers>{renderDiff()}</DialogContent>
    </Dialog>
    </>
  )
}

