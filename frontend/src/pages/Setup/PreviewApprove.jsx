import React from 'react'
import {
  Typography,
  Box,
  Stack,
  Button,
  Divider,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAppStore } from '../../store/useAppStore'
import { mappingPreview, approveMapping } from '../../api/templates'
import { withBase, fetchArtifactManifest, fetchArtifactHead } from '../../api/client'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
import { resolveTemplatePreviewUrl, appendCacheBuster } from '../../utils/preview'


export default function PreviewApprove() {
  const toast = useToast()

  const {
    templateId,
    connection,
    cacheKey,
    setCacheKey,
    htmlUrls,
    setHtmlUrls,
  } = useAppStore()

  const connectionId = connection?.connectionId || null

  const [loading, setLoading] = React.useState(false)
  const [mapping, setMapping] = React.useState(null)
  const [errors, setErrors] = React.useState([])
  const [catalog, setCatalog] = React.useState([])
  const [lastPreviewAt, setLastPreviewAt] = React.useState(null)

  const canPreview = Boolean(templateId && connectionId)
  const canApprove = Boolean(mapping && templateId)

  React.useEffect(() => {
    if (!templateId) return
    let cancelled = false
    ;(async () => {
      try {
        const manifest = await fetchArtifactManifest(templateId)
        if (cancelled) return
        const producedAt = manifest?.produced_at
        const key = producedAt ? Date.parse(producedAt) || producedAt : Date.now()
        setCacheKey(key)
        const files = manifest?.files || {}
        const templateRel = files['template_p1.html'] || 'template_p1.html'
        const finalRel = files['report_final.html'] || null
        const templateBase = withBase(`/uploads/${templateId}/${templateRel}`)
        const finalBase = finalRel ? withBase(`/uploads/${templateId}/${finalRel}`) : null
        setHtmlUrls(() => ({
          template: appendCacheBuster(templateBase, key),
          final: finalBase ? appendCacheBuster(finalBase, key) : null,
        }))
      } catch (err) {
        if (cancelled) return
        const key = Date.now()
        setCacheKey(key)
        setHtmlUrls((prev) => ({
          ...prev,
          template: appendCacheBuster(withBase(`/uploads/${templateId}/template_p1.html`), key),
        }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templateId, setCacheKey, setHtmlUrls])

  const templateUrl = htmlUrls?.template || (templateId ? `/uploads/${templateId}/template_p1.html` : null)
  const finalUrl = htmlUrls?.final || (templateId ? `/uploads/${templateId}/report_final.html` : null)
  const fallbackTemplate = templateUrl ? withBase(templateUrl) : null
  const fallbackFinal = finalUrl ? withBase(finalUrl) : null

  const previewInfo = resolveTemplatePreviewUrl(
    {
      templateId,
      final_html_url: htmlUrls?.final || fallbackFinal,
      template_html_url: htmlUrls?.template || fallbackTemplate,
      html_url: fallbackFinal,
      template_html: fallbackTemplate,
      manifest_produced_at: cacheKey,
      previewTs: cacheKey,
    },
    { ts: cacheKey },
  )
  const previewSrc = previewInfo.url
  const previewKey = previewInfo.key || `${templateId || 'preview'}-${cacheKey}`

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

      if (resp.html_url) {
        setHtmlUrls((prev) => ({ ...prev, final: withBase(resp.html_url) }))
        setCacheKey(Date.now())
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
      const resp = await approveMapping(templateId, mapping, { connectionId, userValuesText: '' })
      const stripQuery = (url) => (url ? url.split('?')[0] : url)
      const refinedFinal = resp?.final_html_url ? withBase(stripQuery(resp.final_html_url)) : null
      const refinedTemplate = resp?.template_html_url ? withBase(stripQuery(resp.template_html_url)) : null

      let manifest = resp?.manifest || null
      if (!manifest) {
        try {
          manifest = await fetchArtifactManifest(templateId)
        } catch (err) {
          console.warn('manifest fetch failed', err)
        }
      }

      const producedAtRaw = manifest?.produced_at
      const cacheSeed = producedAtRaw ? Date.parse(producedAtRaw) || producedAtRaw : Date.now()
      setCacheKey(cacheSeed)

      const buildFromManifest = (name) => {
        const rel = manifest?.files?.[name]
        if (!rel) return null
        return withBase(`/uploads/${templateId}/${rel}`)
      }

      const templateBase = buildFromManifest('template_p1.html') || refinedTemplate || htmlUrls.template
      const finalBase = buildFromManifest('report_final.html') || refinedFinal || templateBase
      const templateUrl = templateBase ? appendCacheBuster(templateBase, cacheSeed) : null
      const finalUrl = finalBase ? appendCacheBuster(finalBase, cacheSeed) : templateUrl

      setHtmlUrls({
        template: templateUrl || finalUrl,
        final: finalUrl || templateUrl,
      })

      toast.show('Mapping approved and auto-filled HTML saved.', 'success')
    } catch (e) {
      console.error(e)
      toast.show(e.message || 'Approve failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Surface>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">Preview & Approve</Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexWrap: 'wrap', rowGap: 0.5 }}
        >
          <Chip
            label={templateId ? `Template: ${templateId.slice(0, 8)}...` : 'No template'}
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
        <Box
          flex={1}
          minHeight={320}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'auto',
            p: 1,
            bgcolor: 'background.paper',
            minWidth: 0,
          }}
        >
          {previewSrc ? (
            <ScaledIframePreview key={previewKey} src={previewSrc} title="html-preview" sx={{ width: '100%' }} loading="eager" />
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

        <Box width={{ xs: '100%', md: 420 }} sx={{ minWidth: 0 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Detected Placeholders</Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                startIcon={loading ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                variant="outlined"
                onClick={onGenerateMapping}
                disabled={!canPreview || loading}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {loading ? 'Working...' : 'Generate Mapping'}
              </Button>
              <Button
                startIcon={<CheckCircleIcon />}
                variant="contained"
                onClick={onApprove}
                disabled={!canApprove || loading}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Approve
              </Button>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => setCacheKey(Date.now())}
                disabled={!previewSrc}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Reload Preview
              </Button>
            </Stack>

            {lastPreviewAt && (
              <Typography variant="caption" color="text.secondary">
                Last mapping preview: {lastPreviewAt}
              </Typography>
            )}

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
                      <ListItem>
                        <ListItemText primary="No placeholders mapped yet." />
                      </ListItem>
                    )}
                  </List>
                </Box>

                {!!errors?.length && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      Issues
                    </Typography>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 160, overflow: 'auto' }}>
                      <List dense disablePadding>
                        {errors.map((issue, idx) => (
                          <ListItem key={`${issue.label}-${idx}`} divider sx={{ px: 1.5 }}>
                            <ListItemText
                              primaryTypographyProps={{ variant: 'body2', color: 'warning.main' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                              primary={issue.label}
                              secondary={issue.issue}
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
                      {catalog.slice(0, 50).map((entry) => (
                        <Chip key={entry} size="small" label={entry} variant="outlined" />
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
    </Surface>
  )
}

