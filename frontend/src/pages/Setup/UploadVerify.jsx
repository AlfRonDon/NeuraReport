import { useMemo, useRef, useState, useEffect, useCallback, useId } from 'react'
import {
  Box, Typography, Stack, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, TextField, Stepper, Step, StepLabel, CircularProgress
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SchemaIcon from '@mui/icons-material/Schema'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import { alpha } from '@mui/material/styles'
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
import EmptyState from '../../components/feedback/EmptyState.jsx'
import LoadingState from '../../components/feedback/LoadingState.jsx'

function detectFormat(file) {
  if (!file?.name) return null
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'PDF'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'Excel'
  return 'Unknown'
}

const ACCEPTED_FORMATS = new Set(['PDF', 'Excel'])
const ACCEPTED_EXTENSIONS = '.pdf,.xls,.xlsx'

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

const isSupportedTemplateFile = (file) => {
  if (!file) return false
  return ACCEPTED_FORMATS.has(detectFormat(file))
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
  } catch {
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
  const [preview, setPreview] = useState(null) // { templateId, schema, htmlUrl, llm2HtmlUrl, pngUrl, pdfUrl }
  const previewTemplateId = preview?.templateId


  const [mappingOpen, setMappingOpen] = useState(false)


  const [tplName, setTplName] = useState('New Template')
  const [tplDesc, setTplDesc] = useState('')
  const [tplTags, setTplTags] = useState('')

  const toast = useToast()
  const inputRef = useRef()
  const verifyBtnRef = useRef(null)
  const mappingBtnRef = useRef(null)
  const {
    eta: verifyEta,
    startRun: beginVerifyTiming,
    noteStage: trackVerifyStage,
    completeStage: markVerifyStageDone,
    finishRun: finishVerifyTiming,
  } = useStepTimingEstimator('template-verify')
  const uploadInputId = useId()
  const dropDescriptionId = `${uploadInputId}-helper`

  const resetVerificationState = useCallback(
    (options = {}) => {
      setVerified(false)
      setPreview(null)
      setVerifyStage('Idle')
      setVerifyProgress(0)
      setVerifyLog([])
      setVerifyArtifacts(null)
      setHtmlUrls({ template: null, final: null, llm2: null })
      setTemplateId(null)
      setCacheKey(Date.now())
      if (options.clearFile) {
        setFile(null)
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }
    },
    [inputRef, setCacheKey, setHtmlUrls, setTemplateId, setVerifyArtifacts],
  )

  const applySelectedFile = useCallback(
    (selectedFile) => {
      if (!selectedFile) return
      if (!isSupportedTemplateFile(selectedFile)) {
        toast.show('Unsupported file type. Please upload a PDF or Excel template.', 'warning')
        return
      }
      resetVerificationState({ clearFile: true })
      setFile(selectedFile)
      setSetupStep('upload')
    },
    [resetVerificationState, setSetupStep, toast],
  )

  const clearFile = useCallback(() => {
    resetVerificationState({ clearFile: true })
  }, [resetVerificationState])

  const handleDropzoneKey = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      const fileList = event.dataTransfer?.files
      if (fileList?.length) {
        const dropped = fileList[0]
        applySelectedFile(dropped)
      }
    },
    [applySelectedFile],
  )

  const format = useMemo(() => detectFormat(file), [file])
  const verifyEtaText = useMemo(() => {
    if (verifyEta.ms == null) return 'Learning how long this step usually takes...'
    const prefix = verifyEta.reliable ? '' : '~ '
    const suffix = verifyEta.reliable ? '' : ' (learning)'
    return `Estimated remaining time: ${prefix}${formatDuration(verifyEta.ms)}${suffix}`
  }, [verifyEta])
  const verifyStageLabel = verifyStage && verifyStage !== 'Idle' ? verifyStage : 'Preparing verification...'
  const dropDisabled = verifying


  const connectionId = connection?.connectionId || activeConnectionId || null
  const canGenerate = !!file && verified && !!preview?.templateId && !!connectionId

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      applySelectedFile(f)
    }
    if (e.target) {
      // allow selecting the same file again
      e.target.value = ''
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
        const llm2Rel = files['template_llm2.html'] || templateRel
        const finalRel = files['report_final.html'] || null
        const templateBase = withBase(`/uploads/${preview.templateId}/${templateRel}`)
        const llm2Base = withBase(`/uploads/${preview.templateId}/${llm2Rel}`)
        const finalBase = finalRel ? withBase(`/uploads/${preview.templateId}/${finalRel}`) : null
        setHtmlUrls(() => ({
          template: withCache(templateBase, key),
          llm2: withCache(llm2Base, key),
          final: finalBase ? withCache(finalBase, key) : null,
        }))
      } catch {
        if (cancelled) return
        const key = Date.now()
        setCacheKey(key)
        setHtmlUrls((prev) => ({
          ...prev,
          template: withCache(withBase(`/uploads/${preview.templateId}/template_p1.html`), key),
          llm2: withCache(withBase(`/uploads/${preview.templateId}/template_llm2.html`), key),
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
      if (!evt) return;

      if (typeof evt.progress === 'number') {
        setVerifyProgress(evt.progress);
      }

      const eventType = evt.event || (evt.stage ? 'stage' : null);

      if (eventType === 'stage') {
        const stageKey = typeof evt.stage === 'string' ? evt.stage : String(evt.stage ?? 'stage');
        const label = evt.label || evt.message || stageKey;
        const rawStatus = typeof evt.status === 'string' ? evt.status.toLowerCase() : '';
        let status = 'started';
        if (rawStatus === 'done' || rawStatus === 'complete') status = 'complete';
        else if (rawStatus === 'error' || rawStatus === 'failed') status = 'error';
        else if (rawStatus === 'skipped') status = 'skipped';
        else if (rawStatus) status = rawStatus;
        const skipped = Boolean(evt.skipped);
        const now = Date.now();

        let stageSummary = '';
        if (status === 'complete') {
          if (skipped) stageSummary = `${label} - skipped`;
          else if (evt.elapsed_ms != null) stageSummary = `${label} - done in ${formatDuration(evt.elapsed_ms)}`;
          else stageSummary = `${label} - done`;
        } else if (status === 'error') {
          const detail = evt.detail ? `: ${evt.detail}` : '';
          stageSummary = `${label} - failed${detail}`;
        } else if (status === 'skipped') {
          stageSummary = `${label} - skipped`;
        } else {
          stageSummary = `${label} - in progress...`;
        }
        setVerifyStage(stageSummary);

        setVerifyLog((prev) => {
          const entries = [...prev];
          const idx = entries.findIndex((entry) => entry.key === stageKey);
          const existing = idx === -1 ? null : entries[idx];
          const startedAt = status === 'started' ? now : (existing?.startedAt ?? now);
          const elapsedMs = (status === 'complete' || status === 'error' || status === 'skipped')
            ? (evt.elapsed_ms ?? existing?.elapsedMs ?? null)
            : existing?.elapsedMs ?? null;
          const nextEntry = {
            key: stageKey,
            label,
            status,
            startedAt,
            updatedAt: now,
            elapsedMs,
            skipped: skipped ?? existing?.skipped ?? false,
            detail: evt.detail ?? existing?.detail ?? null,
            meta: { ...(existing?.meta || {}), ...evt },
          };
          if (idx === -1) entries.push(nextEntry);
          else entries[idx] = nextEntry;
          return entries;
        });

        if (status === 'started') {
          trackVerifyStage(stageKey);
        } else if (status === 'complete' || status === 'error' || status === 'skipped') {
          markVerifyStageDone(stageKey, evt.elapsed_ms);
        }
      } else if (eventType === 'result') {
        const label = evt.stage || 'Verification complete.';
        const now = Date.now();
        const summary = evt.elapsed_ms != null
          ? `${label} - finished in ${formatDuration(evt.elapsed_ms)}`
          : label;
        setVerifyStage(summary);
        setVerifyProgress((p) => {
          if (typeof evt.progress === 'number') {
            return evt.progress;
          }
          return p < 100 ? 100 : p;
        });
        setVerifyLog((prev) => {
          const entries = [...prev];
          const idx = entries.findIndex((entry) => entry.key === 'verify.result');
          const existing = idx === -1 ? null : entries[idx];
          const nextEntry = {
            key: 'verify.result',
            label,
            status: 'complete',
            startedAt: existing?.startedAt ?? now,
            updatedAt: now,
            elapsedMs: evt.elapsed_ms ?? existing?.elapsedMs ?? null,
            skipped: false,
            detail: evt.detail ?? existing?.detail ?? null,
            meta: { ...(existing?.meta || {}), ...evt },
          };
          if (idx === -1) entries.push(nextEntry);
          else entries[idx] = nextEntry;
          return entries;
        });
      } else if (eventType === 'error') {
        const label = evt.stage || 'Verification failed';
        const detail = evt.detail || 'Unknown error';
        setVerifyStage(`${label} - failed: ${detail}`);
        setVerifyLog((prev) => [
          ...prev,
          {
            key: `verify.error.${Date.now()}`,
            label,
            status: 'error',
            startedAt: Date.now(),
            updatedAt: Date.now(),
            elapsedMs: evt.elapsed_ms ?? null,
            skipped: false,
            detail,
            meta: { ...evt },
          },
        ]);
      }
    };

    try {
      const res = await apiVerifyTemplate({
        file,
        connectionId,
        onProgress: handleProgress,
      })

      const schemaExtUrl = res.schema_ext_url || res.artifacts?.schema_ext_url || null
      const htmlUrl = res.artifacts?.html_url || null
      const llm2Url = res.llm2_html_url || res.artifacts?.llm2_html_url || htmlUrl
      const pv = {
        templateId: res.template_id,
        schema: res.schema,
        schemaExtUrl,
        htmlUrl,
        llm2HtmlUrl: llm2Url,
        pngUrl:  res.artifacts?.png_url || null,
        pdfUrl:  res.artifacts?.pdf_url || null,
      }
      setPreview(pv)
      setTemplateId(res.template_id)
      setVerifyArtifacts(res.artifacts)

      setHtmlUrls({ template: htmlUrl, llm2: llm2Url, final: null })
      setCacheKey(Date.now())

      setVerifyStage((prev) => prev || 'Verification complete.')
      setVerifyProgress((p) => (p < 100 ? 100 : p))
      setVerified(true)
      toast.show('Template verified', 'success')
    } catch (err) {
      console.error(err)
      const msg = err?.message || 'Verification failed'
      setVerifyStage(`Verification failed: ${msg}`)
      setVerifyLog((prev) => [
        ...prev,
        {
          key: `verify.error.${Date.now()}`,
          label: 'Verification failed',
          status: 'error',
          startedAt: Date.now(),
          updatedAt: Date.now(),
          elapsedMs: null,
          skipped: false,
          detail: msg,
          meta: { error: err?.toString?.() ?? msg },
        },
      ])
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
    const llm2Base =
      buildFromManifest('template_llm2.html') ||
      (preview?.llm2HtmlUrl ? stripQuery(preview.llm2HtmlUrl) : null) ||
      templateBase
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
    const llm2Url = llm2Base ? withCache(llm2Base, cacheSeed) : templateUrl
    const finalUrl = finalBase ? withCache(finalBase, cacheSeed) : templateUrl
    const thumbnailUrl = thumbnailBase ? withCache(thumbnailBase, cacheSeed) : null

    const normalizedKeys = Array.isArray(resp?.keys)
      ? Array.from(
          new Set(
            resp.keys
              .map((token) => (typeof token === 'string' ? token.trim() : ''))
              .filter(Boolean),
          ),
        )
      : []

    const artifacts =
      resp?.artifacts && typeof resp.artifacts === 'object' && !Array.isArray(resp.artifacts)
        ? resp.artifacts
        : undefined

    if (templateUrl || finalUrl || llm2Url) {
      setHtmlUrls({
        template: templateUrl || llm2Url || finalUrl,
        llm2: llm2Url || templateUrl || finalUrl,
        final: finalUrl || templateUrl || llm2Url,
      })
      setPreview((p) => ({
        ...p,
        htmlUrl: finalUrl || templateUrl || p?.htmlUrl,
        llm2HtmlUrl: llm2Url || templateUrl || p?.llm2HtmlUrl,
        pngUrl: thumbnailUrl || p?.pngUrl,
        keys: normalizedKeys,
      }))
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
      mappingKeys: normalizedKeys,
      artifacts,
    }
    addTemplate(tpl)
    setLastApprovedTemplate(tpl)

    toast.show('Template approved and saved', 'success')

    setSetupStep('upload')
    mappingBtnRef.current?.focus()
  }

  const handleCorrectionsComplete = useCallback(
    (payload) => {
      if (!payload) return

      const cacheSeed = payload.cache_key || Date.now()
      setCacheKey(cacheSeed)

      const templateHtmlRaw = payload?.artifacts?.template_html || null
      const pageSummaryRaw = payload?.artifacts?.page_summary || null

      const templateUrl = templateHtmlRaw ? withCache(templateHtmlRaw, cacheSeed) : null
      const pageSummaryUrl = pageSummaryRaw ? withCache(pageSummaryRaw, cacheSeed) : null

      if (templateUrl) {
        setHtmlUrls((prev) => ({
          ...prev,
          template: templateUrl,
          llm2: templateUrl,
        }))
      }

      const fallbackTemplateId = previewTemplateId || payload?.template_id || templateId || null

      setPreview((prev) => {
        const hasPrevious = !!prev
        if (!hasPrevious && !templateUrl && !pageSummaryUrl) {
          return prev
        }
        const next = hasPrevious ? { ...prev } : {}
        if (!hasPrevious && fallbackTemplateId) {
          next.templateId = fallbackTemplateId
        }
        if (templateUrl) {
          next.htmlUrl = templateUrl
          next.llm2HtmlUrl = templateUrl
        }
        if (pageSummaryUrl) {
          next.pageSummaryUrl = pageSummaryUrl
        }
        next.previewTs = cacheSeed
        next.manifest_produced_at = cacheSeed
        return next
      })
    },
    [previewTemplateId, templateId, setCacheKey, setHtmlUrls, setPreview],
  )


  const effectiveTemplateHtml =
    htmlUrls?.llm2 ||
    htmlUrls?.final ||
    htmlUrls?.template ||
    preview?.llm2HtmlUrl ||
    preview?.htmlUrl
  const previewInfo = resolveTemplatePreviewUrl(
    {
      templateId: preview?.templateId || templateId,
      final_html_url: htmlUrls?.final,
      template_html_url: htmlUrls?.template,
      llm2_html_url: htmlUrls?.llm2,
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
          <Typography variant="h6">Upload & Verify Template</Typography>
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
          {['Verify Template', 'Review Mapping'].map((label, idx) => (
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
      <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
        <Box
          role="button"
          tabIndex={dropDisabled ? -1 : 0}
          aria-describedby={dropDescriptionId}
          aria-disabled={dropDisabled}
          onClick={() => {
            if (!dropDisabled) inputRef.current?.click()
          }}
          onKeyDown={dropDisabled ? undefined : handleDropzoneKey}
          onDragOver={dropDisabled ? undefined : handleDragOver}
          onDrop={dropDisabled ? undefined : handleDrop}
          sx={{
            position: 'relative',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: (theme) => {
              if (dropDisabled) return alpha(theme.palette.action.disabled, 0.4)
              if (file) return alpha(theme.palette.success.main, 0.5)
              return alpha(theme.palette.primary.main, 0.35)
            },
            px: { xs: 2.5, sm: 3.5 },
            py: { xs: 3, sm: 3.5 },
            textAlign: 'center',
            outline: 'none',
            cursor: dropDisabled ? 'not-allowed' : 'pointer',
            bgcolor: (theme) => {
              if (dropDisabled) return alpha(theme.palette.action.disabledBackground, 0.4)
              if (file) return alpha(theme.palette.success.main, 0.08)
              return alpha(theme.palette.primary.main, 0.05)
            },
            color: 'text.secondary',
            transition: 'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
            '&:hover': dropDisabled
              ? {}
              : {
                  borderColor: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
            '&:focus-visible': dropDisabled
              ? {}
              : {
                  borderColor: 'primary.main',
                  boxShadow: (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.22)}`,
                },
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <Box
              aria-hidden
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'common.white',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                color: 'primary.main',
              }}
            >
              <CloudUploadOutlinedIcon fontSize="medium" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {dropDisabled ? 'Verification in progress...' : 'Drop template here or click to browse'}
            </Typography>
            <Typography id={dropDescriptionId} variant="body2" color="text.secondary">
              Accepts PDF or Excel files (.pdf, .xls, .xlsx)
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip label="PDF" size="small" variant="outlined" />
              <Chip label="Excel" size="small" variant="outlined" />
            </Stack>
          </Stack>
          <input
            ref={inputRef}
            id={uploadInputId}
            type="file"
            hidden
            accept={ACCEPTED_EXTENSIONS}
            onChange={onPick}
            disabled={dropDisabled}
          />
        </Box>
      </Box>

      {file ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          sx={{
            mt: 2,
            px: { xs: 2, sm: 2.5 },
            py: { xs: 1.75, sm: 2 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
            bgcolor: 'common.white',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" sx={{ wordBreak: 'break-word' }}>
              {file.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(format || 'Unknown format')} - {formatFileSize(file.size)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Chip
              label={format || 'Unknown'}
              size="small"
              color={format === 'PDF' ? 'primary' : format === 'Excel' ? 'secondary' : 'default'}
              variant={format === 'PDF' || format === 'Excel' ? 'filled' : 'outlined'}
            />
            <Button variant="text" size="small" color="primary" onClick={clearFile}>
              Remove
            </Button>
          </Stack>
        </Stack>
      ) : null}

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
          Review Mapping
        </Button>
      </Stack>

      {/* Preview (after verify) */}
      <Stack spacing={2.5} sx={{ mt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          Fidelity Preview
        </Typography>
        {preview ? (
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, md: 3 },
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Reference (PDF page 1)</Typography>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  aspectRatio: '210 / 297',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  boxShadow: '0 16px 38px rgba(15, 23, 42, 0.08)',
                }}
              >
                <Box
                  component="img"
                  alt="Reference page preview"
                  src={preview.pngUrl}
                  loading="lazy"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Box>
            </Stack>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Generated HTML (photocopy)</Typography>
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '210 / 297',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {templateIframeSrc ? (
                  <>
                    <ScaledIframePreview
                      key={templateIframeKey}
                      src={templateIframeSrc}
                      title="template-preview"
                      frameAspectRatio="210 / 297"
                      loading="eager"
                      contentAlign="top"
                      pageShadow
                      pageRadius={18}
                      pageBorderColor="rgba(15,23,42,0.08)"
                      marginGuides={{ inset: 36, color: 'rgba(79,70,229,0.3)' }}
                      sx={{ width: '100%', height: '100%' }}
                    />
                    {verifying && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 1,
                          bgcolor: 'rgba(15,23,42,0.06)',
                          backdropFilter: 'blur(1.5px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 2,
                        }}
                      >
                        <LoadingState
                          label="Generating preview..."
                          description="We are re-rendering the A4 layout to match the reference PDF."
                          inline
                          dense
                          color="secondary"
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      width: '100%',
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 2,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      No preview yet
                    </Typography>
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>
        ) : (
          <EmptyState
            icon={SchemaIcon}
            size="large"
            title="Preview not ready"
            description={file ? 'Verify the template to generate the side-by-side A4 preview.' : 'Upload and verify a template to generate the preview.'}
            action={
              file ? (
                <Button
                  variant="contained"
                  size="small"
                  onClick={startVerify}
                  disabled={verifying}
                  startIcon={verifying ? <CircularProgress size={16} /> : <TaskAltIcon />}
                >
                  {verifying ? 'Verifying...' : 'Verify now'}
                </Button>
              ) : null
            }
            sx={{
              borderStyle: 'solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              textAlign: 'left',
              alignItems: 'flex-start',
            }}
          />
        )}
      </Stack>

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
            <LoadingState
              label={verifyStageLabel}
              progress={verifyProgress}
              description={verifyEtaText}
            />
            {!!verifyLog.length && (
              <Stack
                component="ol"
                spacing={0.5}
                sx={{
                  mt: 2,
                  pl: 2.5,
                  listStyle: 'decimal',
                }}
              >
                {verifyLog.map((entry, idx) => {
                  const baseLabel = entry?.label || entry?.key || `Step ${idx + 1}`
                  let suffix = ''
                  if (entry?.status === 'complete') {
                    if (entry?.skipped) suffix = ' (skipped)'
                    else if (entry?.elapsedMs != null) suffix = ` (${formatDuration(entry.elapsedMs)})`
                    else suffix = ' (done)'
                  } else if (entry?.status === 'error') {
                    suffix = ` (failed${entry?.detail ? `: ${entry.detail}` : ''})`
                  } else if (entry?.status === 'started') {
                    suffix = ' (in progress)'
                  } else if (entry?.status === 'skipped') {
                    suffix = ' (skipped)'
                  }
                  const text = `${baseLabel}${suffix}`
                  const isActive = Boolean(verifying && entry?.status === 'started')
                  const isError = entry?.status === 'error'
                  return (
                    <Typography
                      key={`${entry?.key || baseLabel}-${idx}`}
                      component="li"
                      variant="caption"
                      color={isActive ? 'primary.main' : isError ? 'error.main' : 'text.secondary'}
                      sx={{ display: 'list-item' }}
                    >
                      {text}
                    </Typography>
                  )
                })}
              </Stack>
            )}
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
        <DialogTitle id="mapping-dialog-title">Mapping Editor</DialogTitle>
        <DialogContent dividers id="mapping-dialog-description">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            {/* LEFT: dedicated preview + template meta */}
            <Box
              sx={{
                width: { xs: '100%', md: '40%' },
                flexBasis: { md: '40%' },
                maxWidth: { md: '40%' },
                minWidth: { md: 320 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                <Typography variant="subtitle2">Template Preview</Typography>

                <Box
                  sx={{
                    flexGrow: 1,
                    flexBasis: 0,
                    minHeight: 0,
                    maxHeight: { md: '70vh' },
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {templateIframeSrc ? (
                    <ScaledIframePreview
                      key={`${templateIframeKey}-mapping`}
                      title="mapping-template-preview"
                      src={templateIframeSrc}
                      sx={{ width: '100%', maxHeight: '100%' }}
                      frameAspectRatio="210 / 297"
                      fit="width"
                      loading="eager"
                      contentAlign="top"
                      pageShadow
                      pageRadius={16}
                      pageBorderColor="rgba(15,23,42,0.08)"
                      marginGuides={{ inset: 32, color: 'rgba(79,70,229,0.28)' }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: 'center' }}>
                      Upload and verify a template to see the photocopy preview here.
                    </Typography>
                  )}
                </Box>

                {/* Template Details */}
                <Typography variant="subtitle2">Template Details</Typography>
                <TextField
                  label="Template Name"
                  size="small"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Description"
                  size="small"
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Tags (comma separated)"
                  size="small"
                  value={tplTags}
                  onChange={(e) => setTplTags(e.target.value)}
                  fullWidth
                />
              </Stack>
            </Box>

            {/* RIGHT: Mapping editor */}
            <Box
              sx={{
                width: { xs: '100%', md: '60%' },
                flexBasis: { md: '60%' },
                maxWidth: { md: '60%' },
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
              }}
            >
              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  overflow: 'auto',
                }}
              >
                <HeaderMappingEditor
                  templateId={preview?.templateId}
                  connectionId={connectionId}
                  onApproved={(resp) => {
                    onApprove(resp)
                    setMappingOpen(false)
                  }}
                  onCorrectionsComplete={handleCorrectionsComplete}
                />
              </Box>
            </Box>
          </Box>
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








