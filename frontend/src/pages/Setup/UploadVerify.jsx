import Grid from '@mui/material/Grid'
import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Box, Typography, Stack, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, Alert, TextField, Stepper, Step, StepLabel, CircularProgress
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SchemaIcon from '@mui/icons-material/Schema'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import { withBase, fetchArtifactManifest, fetchArtifactHead } from '../../api/client'
import { verifyTemplate as apiVerifyTemplate } from '../../api/templates'
import { useStepTimingEstimator, formatDuration } from '../../hooks/useStepTimingEstimator'

// Mapping UI
import HeaderMappingEditor from '../../components/HeaderMappingEditor'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
import { resolveTemplatePreviewUrl } from '../../utils/preview'
import Surface from '../../components/layout/Surface.jsx'

function detectFormat(file) {
  if (!file?.name) return null
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'PDF'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'Excel'
  return 'Unknown'
}

// helper to append cache-buster
function withCache(src, cacheKey) {
  if (!src) return src
  const key = cacheKey ?? Date.now()
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const url = new URL(src, base)
    url.searchParams.set('v', key)
    return url.toString()
  } catch (err) {
    const base = src.split('?')[0]
    return `${base}?v=${encodeURIComponent(key)}`
  }
}

function StepIndicator(props) {
  const { active, completed, icon } = props
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 14,
        border: '2px solid',
        borderColor: completed ? 'success.main' : active ? 'primary.main' : 'divider',
        bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'background.paper',
        color: completed || active ? 'common.white' : 'text.secondary',
        boxShadow: active ? '0 6px 16px rgba(79,70,229,0.18)' : 'none',
        transition: 'all 160ms ease',
      }}
    >
      {completed ? <CheckRoundedIcon fontSize="small" /> : icon}
    </Box>
  )
}

export default function UploadVerify() {
  const {
    setSetupNav,
    addTemplate,
    setLastApprovedTemplate,
    connection,
    activeConnectionId,
    setSetupStep,
    templateId,
    setTemplateId,
    setVerifyArtifacts,
    cacheKey,
    setCacheKey,
    htmlUrls,
    setHtmlUrls,
  } = useAppStore()

  const [file, setFile] = useState(null)


  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyProgress, setVerifyProgress] = useState(0)
  const [verifyStage, setVerifyStage] = useState('Idle')
  const [verifyLog, setVerifyLog] = useState([])
  const [preview, setPreview] = useState(null) // { templateId, schema, htmlUrl, pngUrl, pdfUrl }


  const [mappingOpen, setMappingOpen] = useState(false)


  const [tplName, setTplName] = useState('New Template')
  const [tplDesc, setTplDesc] = useState('')
  const [tplTags, setTplTags] = useState('')

  const toast = useToast()
  const inputRef = useRef()
  const verifyBtnRef = useRef(null)
  const mappingBtnRef = useRef(null)
  const { eta: verifyEta, startRun: beginVerifyTiming, noteStage: trackVerifyStage, finishRun: finishVerifyTiming } =
    useStepTimingEstimator('template-verify')

  const format = useMemo(() => detectFormat(file), [file])


  const connectionId = connection?.connectionId || activeConnectionId || null
  const canGenerate = !!file && verified && !!preview?.templateId && !!connectionId

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setVerified(false)
      setPreview(null)
      setVerifyStage('Idle')
      setVerifyProgress(0)
      setVerifyLog([])
    
      setHtmlUrls({ template: null, final: null })
      setTemplateId(null)
      setCacheKey(Date.now())
    }
  }


  useEffect(() => {
    if (!preview?.templateId) return
    let cancelled = false
    ;(async () => {
      try {
        const manifest = await fetchArtifactManifest(preview.templateId)
        if (cancelled) return
        const producedAt = manifest?.produced_at
        const key = producedAt ? Date.parse(producedAt) || producedAt : Date.now()
        setCacheKey(key)
        const files = manifest?.files || {}
        const templateRel = files['template_p1.html'] || 'template_p1.html'
        const finalRel = files['report_final.html'] || null
        const templateBase = withBase(`/uploads/${preview.templateId}/${templateRel}`)
        const finalBase = finalRel ? withBase(`/uploads/${preview.templateId}/${finalRel}`) : null
        setHtmlUrls(() => ({
          template: withCache(templateBase, key),
          final: finalBase ? withCache(finalBase, key) : null,
        }))
      } catch (err) {
        if (cancelled) return
        const key = Date.now()
        setCacheKey(key)
        setHtmlUrls((prev) => ({
          ...prev,
          template: withCache(withBase(`/uploads/${preview.templateId}/template_p1.html`), key),
        }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [preview?.templateId, setCacheKey, setHtmlUrls])


  const startVerify = async () => {
    if (!file) return
    if (!connectionId) {
      toast.show('Please connect to a database first', 'warning')
      return
    }

    setVerifyModalOpen(true)
    setVerifying(true)
    setVerified(false)
    setVerifyProgress(0)
    setVerifyStage('Starting verification...')
    setVerifyLog([])
    beginVerifyTiming()
    trackVerifyStage('Starting verification...')

    const handleProgress = (evt) => {
      if (typeof evt?.progress === 'number') {
        setVerifyProgress(evt.progress)
      }
      if (evt?.stage) {
        setVerifyStage(evt.stage)
        setVerifyLog((prev) => (prev[prev.length - 1] === evt.stage ? prev : [...prev, evt.stage]))
        trackVerifyStage(evt.stage)
      }
    }

    try {
      const res = await apiVerifyTemplate({
        file,
        connectionId,
        onProgress: handleProgress,
      })

      const pv = {
        templateId: res.template_id,
        schema: res.schema,
        htmlUrl: res.artifacts?.html_url || null,
        pngUrl:  res.artifacts?.png_url || null,
        pdfUrl:  res.artifacts?.pdf_url || null,
      }
      setPreview(pv)
      setTemplateId(res.template_id)
      setVerifyArtifacts(res.artifacts)

    
      setHtmlUrls({ template: pv.htmlUrl, final: null })
    
      setCacheKey(Date.now())

      setVerifyStage('Verification complete.')
      trackVerifyStage('Verification complete.')
      setVerifyProgress((p) => (p < 100 ? 100 : p))
      setVerified(true)
      toast.show('Template verified', 'success')
    } catch (err) {
      console.error(err)
      const msg = err?.message || 'Verification failed'
      setVerifyStage(`Verification failed: ${msg}`)
      setVerifyLog((prev) => [...prev, `Error: ${msg}`])
      trackVerifyStage(`Verification failed: ${msg}`)
      setVerifyProgress(100)
      toast.show(err?.message || 'Verification failed', 'error')
    } finally {
      finishVerifyTiming()
      setVerifying(false)
    }
  }


  const startMapping = () => {
    if (!preview?.templateId) {
      toast.show('Verify a template first', 'info')
      return
    }
    if (!connectionId) {
      toast.show('Please connect to a database first', 'warning')
      return
    }
  
    setSetupStep('mapping')
    setMappingOpen(true)
  }




  const onApprove = async (resp) => {
    const templateId = preview?.templateId
    const stripQuery = (url) => (url ? url.split('?')[0] : url)
    const refinedFinal = resp?.final_html_url ? withBase(stripQuery(resp.final_html_url)) : null
    const refinedTemplate = resp?.template_html_url ? withBase(stripQuery(resp.template_html_url)) : null
    let manifest = resp?.manifest || null

    if (!manifest && templateId) {
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
      if (!templateId) return null
      const rel = manifest?.files?.[name]
      if (!rel) return null
      return withBase(`/uploads/${templateId}/${rel}`)
    }

    const templateBase = buildFromManifest('template_p1.html') || refinedTemplate || (preview?.htmlUrl ? stripQuery(preview.htmlUrl) : null)
    const finalBase = buildFromManifest('report_final.html') || refinedFinal || templateBase

    let thumbnailBase =
      buildFromManifest('report_final.png') ||
      (resp?.thumbnail_url ? withBase(stripQuery(resp.thumbnail_url)) : null) ||
      preview?.pngUrl ||
      null

    if (templateId && thumbnailBase) {
      try {
        const head = await fetchArtifactHead(templateId, 'report_final.png')
        if (!head?.artifact?.exists) {
          thumbnailBase = null
        }
      } catch (err) {
        console.warn('thumbnail head failed', err)
      }
    }

    const templateUrl = templateBase ? withCache(templateBase, cacheSeed) : null
    const finalUrl = finalBase ? withCache(finalBase, cacheSeed) : templateUrl
    const thumbnailUrl = thumbnailBase ? withCache(thumbnailBase, cacheSeed) : null

    if (templateUrl || finalUrl) {
      setHtmlUrls({ template: templateUrl || finalUrl, final: finalUrl || templateUrl })
      setPreview((p) => ({ ...p, htmlUrl: finalUrl || templateUrl || p?.htmlUrl, pngUrl: thumbnailUrl || p?.pngUrl }))
    }

    const tpl = {
      id: templateId || `tpl_${Date.now()}`,
      name: tplName || file?.name || 'Template',
      status: 'approved',
      sourceType: (format || 'PDF').toLowerCase(),
      tags: tplTags ? tplTags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      description: tplDesc || '',
      htmlUrl: finalUrl || templateUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
    }
    addTemplate(tpl)
    setLastApprovedTemplate(tpl)

    toast.show('Template approved and saved', 'success')

    setSetupStep('upload')
    mappingBtnRef.current?.focus()
  }


  const effectiveTemplateHtml = htmlUrls?.final || htmlUrls?.template || preview?.htmlUrl
  const previewInfo = resolveTemplatePreviewUrl(
    {
      templateId: preview?.templateId || templateId,
      final_html_url: htmlUrls?.final,
      template_html_url: htmlUrls?.template,
      html_url: effectiveTemplateHtml,
      previewTs: cacheKey,
      manifest_produced_at: cacheKey,
    },
    { ts: cacheKey },
  )
  const templateIframeSrc = previewInfo.url || withCache(effectiveTemplateHtml, cacheKey)
  const templateIframeKey = previewInfo.key || `${preview?.templateId || templateId || 'template'}-${cacheKey}`

  return (
    <Surface sx={{ gap: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography variant="h6">Generate Templates</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            sx={{ px: 1.5, display: { xs: 'none', sm: 'inline-flex' } }}
            onClick={() => setSetupNav('connect')}
          >
            Change Connection
          </Button>
        </Stack>

        {/* Two-step flow now */}
        <Stepper
          activeStep={verified ? 1 : 0}
          alternativeLabel
          aria-label="Template onboarding steps"
          sx={{
            pb: 0,
            '& .MuiStep-root': { position: 'relative' },
            '& .MuiStepConnector-root': { top: 16 },
            '& .MuiStepLabel-label': { mt: 1 },
            '& .MuiStepConnector-line': { borderColor: 'divider' },
          }}
        >
          {['Upload & Verify', 'Generate Mapping'].map((label, idx) => (
            <Step key={label} completed={idx < (verified ? 2 : 0)}>
              <StepLabel StepIconComponent={StepIndicator}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mt: 1, width: { xs: '100%', sm: 'auto' } }}
        >
          <Chip label={`Auto: ${format || '-'}`} size="small" variant="outlined" />
          <Chip
            label={connection?.status === 'connected' ? 'Connected' : 'Unknown'}
            size="small"
            color={connection?.status === 'connected' ? 'success' : 'default'}
            variant={connection?.status === 'connected' ? 'filled' : 'outlined'}
          />
        </Stack>
      </Stack>

      {/* Dropzone */}
      <Box
        sx={{ mt: 1.5, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}
        onDragOver={(e)=>e.preventDefault()}
        onDrop={(e)=>{
          e.preventDefault()
          if (e.dataTransfer.files?.length) {
            const f = e.dataTransfer.files[0]
            setFile(f)
            setVerified(false)
            setPreview(null)
            setHtmlUrls({ template: null, final: null })
            setTemplateId(null)
            setCacheKey(Date.now())
          }
        }}
      >
        <Typography variant="body2" color="text.secondary">Drag & drop PDF/Excel here, or pick a file</Typography>
        <Button sx={{ mt: 1, px: 2.5 }} variant="outlined" onClick={()=>inputRef.current?.click()}>
          Choose File
        </Button>
        <input ref={inputRef} type="file" hidden onChange={onPick} accept=".pdf,.xls,.xlsx" />
      </Box>

      {file && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2">Selected</Typography>
          <Typography variant="body2" color="text.secondary">
            {file.name} • {(file.size/1024).toFixed(1)} KB
          </Typography>
        </Box>
      )}

      {/* Verify / Mapping buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
        <Button
          variant="contained" color="primary" disableElevation
          startIcon={verifying ? <CircularProgress size={18} /> : <TaskAltIcon />}
          sx={{ px: 2.5 }}
          onClick={startVerify} disabled={!file || verifying}
          ref={verifyBtnRef}
        >
          {verifying ? 'Verifying...' : 'Verify Template'}
        </Button>

        <Button
          variant="outlined" color="secondary"
          startIcon={<SchemaIcon />} sx={{ px: 2.5 }}
          onClick={startMapping}
          disabled={!canGenerate || verifying}
          ref={mappingBtnRef}
        >
          Generate Mapping
        </Button>
      </Stack>

      {/* Preview (after verify) */}
      {preview && (
        <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Reference (PDF page 1)</Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <img alt="reference" src={preview.pngUrl} loading="lazy" style={{ width: '100%', display: 'block' }} />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Generated HTML (photocopy)</Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto', p: 1 }}>
              {templateIframeSrc ? (
                <ScaledIframePreview
                  key={templateIframeKey}
                  src={templateIframeSrc}
                  title="template-preview"
                  sx={{ width: '100%' }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                  No preview yet
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Verify modal */}
      <Dialog
        open={verifyModalOpen}
        onClose={() => { if (!verifying) { setVerifyModalOpen(false); verifyBtnRef.current?.focus() } }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="verify-dialog-title"
        aria-describedby="verify-dialog-description"
      >
        <DialogTitle id="verify-dialog-title">Template Verification</DialogTitle>
        <DialogContent id="verify-dialog-description">
          <Box sx={{ my: 2 }} aria-live="polite">
            <LinearProgress variant="determinate" value={verifyProgress} />
            <Typography sx={{ mt: 1 }} variant="body2" color="text.secondary">{verifyStage}</Typography>
            {!!verifyLog.length && (
              <Box sx={{ mt: 1, display: 'grid', gap: 0.25 }}>
                {verifyLog.map((msg, idx) => (
                  <Typography
                    key={`${msg}-${idx}`}
                    variant="caption"
                    color={idx === verifyLog.length - 1 && verifying ? 'primary.main' : 'text.secondary'}
                  >
                    {idx + 1}. {msg}
                  </Typography>
                ))}
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Estimated time remaining:{' '}
              {verifyEta.ms == null
                ? 'Learning step timings...'
                : `${verifyEta.reliable ? '' : '~ '}${formatDuration(verifyEta.ms)}${verifyEta.reliable ? '' : ' (learning)'}`}
            </Typography>
          </Box>
          {verified && <Alert severity="success" icon={<CheckCircleOutlineIcon />}>Verification passed</Alert>}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setVerifyModalOpen(false); verifyBtnRef.current?.focus() }}
            disabled={verifying}
            autoFocus
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mapping dialog (preview + meta on left, mapping editor on right) */}
      <Dialog
        open={mappingOpen}
        onClose={() => setMappingOpen(false)}
        maxWidth="xl"
        fullWidth
        aria-labelledby="mapping-dialog-title"
        aria-describedby="mapping-dialog-description"
      >
        <DialogTitle id="mapping-dialog-title">Generate Mapping</DialogTitle>
        <DialogContent dividers id="mapping-dialog-description">
          <Grid container spacing={2}>
            {/* LEFT: Big, scrollable A4 preview (3:2 width vs right) */}
            <Grid xs={12} md={7} sx={{ minWidth: 0 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Template Preview</Typography>

                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    overflow: 'auto',
                    maxHeight: '75vh',
                    bgcolor: 'background.paper',
                  }}
                >
                  {templateIframeSrc ? (
                    <ScaledIframePreview
                      key={`${templateIframeKey}-mapping`}
                      title="mapping-template-preview"
                      src={templateIframeSrc}
                      sx={{ width: '100%' }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: 'center' }}>
                      Upload and verify a template to see the photocopy preview here.
                    </Typography>
                  )}
                </Box>

                {/* Optional: Template Details */}
                <Typography variant="subtitle2">Template Details</Typography>
                <TextField
                  label="Template Name"
                  size="small"
                  value={tplName}
                  onChange={(e)=>setTplName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Description"
                  size="small"
                  value={tplDesc}
                  onChange={(e)=>setTplDesc(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Tags (comma separated)"
                  size="small"
                  value={tplTags}
                  onChange={(e)=>setTplTags(e.target.value)}
                  fullWidth
                />
              </Stack>
            </Grid>

            {/* RIGHT: Mapping editor */}
            <Grid xs={12} md={5} sx={{ minWidth: 0 }}>
              <HeaderMappingEditor
                templateId={preview?.templateId}
                connectionId={connectionId}
                onApproved={(resp) => {
                  onApprove(resp)          
                  setMappingOpen(false)    
                }}
              
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

    </Surface>
  )
}







