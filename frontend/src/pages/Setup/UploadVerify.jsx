import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Box, Paper, Typography, Stack, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, Alert, TextField, Stepper, Step, StepLabel, Grid, CircularProgress
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SchemaIcon from '@mui/icons-material/Schema'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import { API_BASE } from '../../api/client'
import { verifyTemplate as apiVerifyTemplate } from '../../api/templates'  // calls POST /templates/verify

// Mapping UI
import HeaderMappingEditor from '../../components/HeaderMappingEditor'

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
  return src.includes('?') ? `${src}&v=${cacheKey}` : `${src}?v=${cacheKey}`
}

export default function UploadVerify() {
  const {
    setSetupNav, addTemplate, setLastApprovedTemplate, connection, setSetupStep,
    // store pieces
    setTemplateId, setVerifyArtifacts, cacheKey, bumpCache, htmlUrls, setHtmlUrls,
  } = useAppStore()

  const [file, setFile] = useState(null)

  // verification state
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyProgress, setVerifyProgress] = useState(0)
  const [verifyStage, setVerifyStage] = useState('Idle')
  const [preview, setPreview] = useState(null) // { templateId, schema, htmlUrl, pngUrl, pdfUrl }

  // mapping dialog state
  const [mappingOpen, setMappingOpen] = useState(false)

  // template meta (now lives in the mapping dialog)
  const [tplName, setTplName] = useState('New Template')
  const [tplDesc, setTplDesc] = useState('')
  const [tplTags, setTplTags] = useState('')

  const toast = useToast()
  const inputRef = useRef()
  const verifyBtnRef = useRef(null)
  const mappingBtnRef = useRef(null)

  const format = useMemo(() => detectFormat(file), [file])

  // enable mapping only after verify + file + valid connection
  const canGenerate = !!file && verified && !!preview?.templateId && !!connection?.connectionId

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setVerified(false)
      setPreview(null)
      // IMPORTANT: clear any old template/final URLs and templateId so UI cannot show stale preview
      setHtmlUrls({ template: null, final: null })
      setTemplateId(null)
      bumpCache()
    }
  }

  // When a new templateId is verified, clear any previous final URL and bump cache
  useEffect(() => {
    if (preview?.templateId) {
      setHtmlUrls(prev => ({ ...prev, final: null }))
      bumpCache()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.templateId])

  // ---- VERIFY (calls backend) ----
  const startVerify = async () => {
    if (!file) return
    if (!connection?.connectionId) {
      toast.show('Please connect to a database first', 'warning')
      return
    }

    setVerifyModalOpen(true)
    setVerifying(true)
    setVerifyProgress(5)
    setVerifyStage('Uploading PDF…')

    // cosmetic progress ticker
    const stages = ['Parsing PDF', 'Inferring schema', 'Building HTML', 'Preparing preview']
    let stageIdx = 0
    const tick = setInterval(() => {
      setVerifyProgress((p) => Math.min(p + 8, 95))
      if (stageIdx < stages.length - 1) setVerifyStage(stages[++stageIdx])
    }, 350)

    try {
      // call your API wrapper; it should POST form-data to /templates/verify
      const res = await apiVerifyTemplate(file, connection.connectionId)

      const pv = {
        templateId: res.template_id,
        schema: res.schema,
        htmlUrl: `${API_BASE}${res.artifacts.html_url}`,
        pngUrl:  `${API_BASE}${res.artifacts.png_url}`,
        pdfUrl:  `${API_BASE}${res.artifacts.pdf_url}`,
      }
      setPreview(pv)
      setTemplateId(res.template_id)
      setVerifyArtifacts(res.artifacts)

      // Register the *template* preview URL; explicitly clear any stale final URL
      setHtmlUrls({ template: pv.htmlUrl, final: null })
      // bump cache so iframes reload immediately with the new URL
      bumpCache()

      setVerifyStage('Verified')
      setVerifyProgress(100)
      setVerified(true)
      toast.show('Template verified', 'success')
    } catch (err) {
      console.error(err)
      setVerifyStage('Verification failed')
      setVerifyProgress(100)
      toast.show(err?.message || 'Verification failed', 'error')
    } finally {
      clearInterval(tick)
      setVerifying(false)
    }
  }

  // ---- Mapping: open dialog when button clicked ----
  const startMapping = () => {
    if (!preview?.templateId) {
      toast.show('Verify a template first', 'info')
      return
    }
    if (!connection?.connectionId) {
      toast.show('Please connect to a database first', 'warning')
      return
    }
    // move stepper to mapping step and open dialog
    setSetupStep('mapping')
    setMappingOpen(true)
  }

  // ---- Approve (persist to store; mapping JSON is saved server-side) ----
  const onApprove = () => {
    const tpl = {
      id: preview?.templateId || `tpl_${Date.now()}`,
      name: tplName || file?.name || 'Template',
      status: 'approved',
      sourceType: (format || 'PDF').toLowerCase(),
      tags: tplTags ? tplTags.split(',').map(s => s.trim()).filter(Boolean) : [],
      description: tplDesc || ''
    }
    addTemplate(tpl)
    setLastApprovedTemplate(tpl)
    toast.show('Template approved and saved', 'success')
    setSetupStep('upload')
    mappingBtnRef.current?.focus()
  }

  // Prefer store-provided URLs (they get updated by preview/approve steps)
  const effectiveTemplateHtml = htmlUrls?.template || preview?.htmlUrl

  const templateIframeSrc = withCache(effectiveTemplateHtml, cacheKey)
  const mappingPreviewSrc = withCache(htmlUrls?.final || effectiveTemplateHtml, cacheKey)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography variant="h6">Generate Templates</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, px: 1.5, display: { xs: 'none', sm: 'inline-flex' } }}
            onClick={() => setSetupNav('connect')}
          >
            Change Connection
          </Button>
        </Stack>

        {/* Two-step flow now */}
        <Stepper activeStep={verified ? 1 : 0} alternativeLabel sx={{ pb: 1 }}>
          {['Upload & Verify', 'Generate Mapping'].map((label, idx) => (
            <Step key={label} completed={idx < (verified ? 2 : 0)}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Chip label={`Auto: ${format || '-'}`} size="small" />
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
            bumpCache()
          }
        }}
      >
        <Typography variant="body2" color="text.secondary">Drag & drop PDF/Excel here, or pick a file</Typography>
        <Button sx={{ mt: 1, borderRadius: 2, px: 2.5 }} variant="outlined" onClick={()=>inputRef.current?.click()}>
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
          sx={{ borderRadius: 2, px: 2.5, textTransform: 'none' }}
          onClick={startVerify} disabled={!file || verifying}
          ref={verifyBtnRef}
        >
          {verifying ? 'Verifying…' : 'Verify Template'}
        </Button>

        <Button
          variant="outlined" color="secondary"
          startIcon={<SchemaIcon />} sx={{ borderRadius: 2, px: 2.5, textTransform: 'none' }}
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
              <img alt="reference" src={preview.pngUrl} style={{ width: '100%', display: 'block' }} />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Generated HTML (photocopy)</Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height: 560, overflow: 'hidden' }}>
              <iframe
                title="template-preview"
                src={templateIframeSrc}
                key={`${cacheKey}-${templateIframeSrc}`}   // ← force remount on change
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Verify modal */}
      <Dialog
        open={verifyModalOpen}
        onClose={() => { if (!verifying) { setVerifyModalOpen(false); verifyBtnRef.current?.focus() } }}
        fullWidth maxWidth="sm"
      >
        <DialogTitle>Template Verification</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }} aria-live="polite">
            <LinearProgress variant="determinate" value={verifyProgress} />
            <Typography sx={{ mt: 1 }} variant="body2" color="text.secondary">{verifyStage}</Typography>
          </Box>
          {verified && <Alert severity="success" icon={<CheckCircleOutlineIcon />}>Verification passed</Alert>}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setVerifyModalOpen(false); verifyBtnRef.current?.focus() }}
            disabled={verifying}
            autoFocus
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mapping dialog (preview + meta on left, mapping editor on right) */}
      <Dialog open={mappingOpen} onClose={() => setMappingOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>Generate Mapping</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* LEFT: Big, scrollable A4 preview (3:2 width vs right) */}
            <Grid item xs={12} md={7}>
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
                  <Box sx={{ width: 794, height: 1123, boxShadow: 1, bgcolor: 'white' }}>
                    {preview && (
                      <iframe
                        title="mapping-template-preview"
                        src={mappingPreviewSrc}
                        key={`${cacheKey}-${mappingPreviewSrc}`}  // ← force remount on change
                        style={{ width: '100%', height: '100%', border: 0, display: 'block', background: 'white' }}
                      />
                    )}
                  </Box>
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
            <Grid item xs={12} md={5}>
              <HeaderMappingEditor
                templateId={preview?.templateId}
                connectionId={connection?.connectionId}
                onApproved={() => {
                  onApprove();       // persist name/desc/tags to your store
                  setMappingOpen(false);
                }}
                // blockApproveUntilResolved={true}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

    </Paper>
  )
}
