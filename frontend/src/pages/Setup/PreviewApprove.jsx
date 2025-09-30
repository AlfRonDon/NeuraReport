import React from 'react'
import {
  Paper, Typography, Box, Stack, Button, Divider, Chip, CircularProgress,
  List, ListItem, ListItemText, Alert,
} from '@mui/material'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAppStore } from '../../store/useAppStore'
import { mappingPreview, approveMapping } from '../../api/templates'
import { useToast } from '../../components/ToastProvider.jsx'

// cache-busting helper
const withCache = (src, cacheKey) => {
  if (!src) return src
  return src.includes('?') ? `${src}&v=${cacheKey}` : `${src}?v=${cacheKey}`
}

export default function PreviewApprove() {
  const toast = useToast()

  const {
    templateId,
    connection,
    cacheKey,
    bumpCache,
    htmlUrls,
    setHtmlUrls,
  } = useAppStore()

  const connectionId = connection?.connectionId || null

  const [loading, setLoading] = React.useState(false)
  const [mapping, setMapping] = React.useState(null)       // { header -> table.col | UNRESOLVED }
  const [errors, setErrors] = React.useState([])           // [{ label, issue }]
  const [catalog, setCatalog] = React.useState([])         // ["table.col", ...]
  const [lastPreviewAt, setLastPreviewAt] = React.useState(null)

  const canPreview = Boolean(templateId && connectionId)
  const canApprove = Boolean(mapping && templateId)

  // Seed default preview URLs when template changes (photocopy first)
  React.useEffect(() => {
    if (!templateId) return
    setHtmlUrls(prev => ({
      ...prev,
      template: `/uploads/${templateId}/template_p1.html`,
      final: prev?.final || `/uploads/${templateId}/report_final.html`,
    }))
    bumpCache()
  }, [templateId, setHtmlUrls, bumpCache])

  // Prefer template preview (photocopy) when present; else fall back to final
  const templateUrl =
    htmlUrls?.template || (templateId ? `/uploads/${templateId}/template_p1.html` : null)
  const finalUrl =
    htmlUrls?.final || (templateId ? `/uploads/${templateId}/report_final.html` : null)

  const baseHtml = templateUrl || finalUrl
  const src = withCache(baseHtml, cacheKey)

  async function onGenerateMapping() {
    if (!canPreview) {
      toast.show('Verify a template and connect to a database first.', 'warning')
      return
    }
    setLoading(true)
    try {
      const resp = await mappingPreview(templateId, connectionId)
      setMapping(resp.mapping || {})
      setErrors(resp.errors || [])
      setCatalog(resp.catalog || [])
      setLastPreviewAt(new Date().toLocaleString())

      // If backend returns a preview URL, persist and force reload
      if (resp.html_url) {
        setHtmlUrls(prev => ({ ...prev, final: resp.html_url }))
        bumpCache()
      }
      toast.show('Mapping generated.', 'success')
    } catch (e) {
      console.error(e)
      toast.show(e.message || 'Mapping preview failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function onApprove() {
    if (!canApprove) {
      toast.show('Generate mapping first.', 'info')
      return
    }
    setLoading(true)
    try {
      const resp = await approveMapping(templateId, mapping)

      // Use the cache-busted URLs returned by the backend for instant refresh
      setHtmlUrls({
        final: resp.final_html_url || htmlUrls.final,
        template: resp.template_html_url || htmlUrls.template,  // ⬅️ use the photocopy URL if present
      })
      bumpCache()

      toast.show('Mapping approved and auto-filled HTML saved.', 'success')
    } catch (e) {
      console.error(e)
      toast.show(e.message || 'Approve failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Preview & Approve</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={templateId ? `Template: ${templateId.slice(0, 8)}…` : 'No template'}
            size="small"
            color={templateId ? 'default' : 'warning'}
          />
          <Chip
            label={connectionId ? 'DB: connected' : 'DB: not connected'}
            size="small"
            color={connectionId ? 'success' : 'default'}
          />
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {/* LEFT: HTML preview */}
        <Box
          flex={1}
          minHeight={320}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            bgcolor: 'background.paper',
          }}
        >
          {src ? (
            <iframe
              title="html-preview"
              src={src}
              style={{ width: '100%', height: '70vh', border: 0, background: 'white' }}
            />
          ) : (
            <Box
              sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
            >
              <Typography variant="body2" color="text.secondary">
                Upload & verify a template to view preview.
              </Typography>
            </Box>
          )}
        </Box>

        {/* RIGHT: Mapping / Actions */}
        <Box width={{ xs: '100%', md: 420 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Detected Placeholders</Typography>

            <Stack direction="row" spacing={1}>
              <Button
                startIcon={loading ? <CircularProgress size={16}/> : <AutoFixHighIcon />}
                variant="outlined"
                onClick={onGenerateMapping}
                disabled={!canPreview || loading}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {loading ? 'Working…' : 'Generate Mapping'}
              </Button>
              <Button
                startIcon={<CheckCircleIcon />}
                variant="contained"
                onClick={onApprove}
                disabled={!canApprove || loading}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Approve
              </Button>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => bumpCache()}
                disabled={!src}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Reload Preview
              </Button>
            </Stack>

            {lastPreviewAt && (
              <Typography variant="caption" color="text.secondary">
                Last mapping preview: {lastPreviewAt}
              </Typography>
            )}

            {/* Mapping summary */}
            {mapping && (
              <>
                {errors?.length ? (
                  <Alert severity="warning">
                    {errors.length} issue{errors.length > 1 ? 's' : ''} detected. Resolve before finalizing if needed.
                  </Alert>
                ) : (
                  <Alert severity="success">No blocking issues detected.</Alert>
                )}

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 240, overflow: 'auto' }}>
                  <List dense disablePadding>
                    {Object.entries(mapping).map(([label, col]) => (
                      <ListItem key={label} divider sx={{ px: 1.5 }}>
                        <ListItemText
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                          primary={label}
                          secondary={col}
                        />
                      </ListItem>
                    ))}
                    {!Object.keys(mapping || {}).length && (
                      <ListItem><ListItemText primary="No placeholders mapped yet." /></ListItem>
                    )}
                  </List>
                </Box>

                {!!errors?.length && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Issues</Typography>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 160, overflow: 'auto' }}>
                      <List dense disablePadding>
                        {errors.map((e, i) => (
                          <ListItem key={i} divider sx={{ px: 1.5 }}>
                            <ListItemText
                              primaryTypographyProps={{ variant: 'body2', color: 'warning.main' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                              primary={e.label}
                              secondary={e.issue}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </>
                )}

                {!!catalog?.length && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Catalog ({catalog.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {catalog.slice(0, 50).map((c) => (
                        <Chip key={c} size="small" label={c} variant="outlined" />
                      ))}
                      {catalog.length > 50 && <Chip size="small" label={`+${catalog.length - 50} more`} />}
                    </Box>
                  </>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}
