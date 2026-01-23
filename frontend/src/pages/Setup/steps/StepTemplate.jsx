import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  LinearProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableChartIcon from '@mui/icons-material/TableChart'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAppStore } from '../../../stores'
import { useToast } from '../../../components/ToastProvider'
import { useInteraction, InteractionType, Reversibility } from '../../../components/ux/governance'
import * as api from '../../../api/client'

export default function StepTemplate({ wizardState, updateWizardState, onComplete, setLoading }) {
  const toast = useToast()
  const { execute } = useInteraction()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const activeConnection = useAppStore((s) => s.activeConnection)
  const setTemplateId = useAppStore((s) => s.setTemplateId)
  const setVerifyArtifacts = useAppStore((s) => s.setVerifyArtifacts)
  const addTemplate = useAppStore((s) => s.addTemplate)

  const [templateKind, setTemplateKind] = useState(wizardState.templateKind || 'pdf')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [verifyResult, setVerifyResult] = useState(null)
  const [error, setError] = useState(null)
  const [queueInBackground, setQueueInBackground] = useState(false)
  const [queuedJobId, setQueuedJobId] = useState(null)

  useEffect(() => {
    if (!queuedJobId) return
    let cancelled = false

    const pollJob = async () => {
      try {
        const job = await api.getJob(queuedJobId)
        if (cancelled || !job) return

        if (typeof job.progress === 'number') {
          setUploadProgress(Math.round(job.progress))
        }

        if (job.status === 'completed') {
          const result = job.result || {}
          const templateId = result.template_id || result.templateId
          if (!templateId) {
            setError('Template verification completed but no template ID was returned.')
            toast.show('Template verification completed without a template ID.', 'error')
            setQueuedJobId(null)
            return
          }

          setVerifyResult(result)
          setTemplateId(templateId)
          setVerifyArtifacts(result.artifacts)
          updateWizardState({ templateId })

          addTemplate({
            id: templateId,
            name: uploadedFile?.name || `Template ${templateId}`,
            kind: templateKind,
            status: 'pending',
            created_at: new Date().toISOString(),
          })

          toast.show('Template verified successfully', 'success')
          setQueuedJobId(null)
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          const message = job.error || 'Template verification failed'
          setError(message)
          toast.show(message, 'error')
          setQueuedJobId(null)
        }
      } catch (err) {
        if (cancelled) return
        const message = err.message || 'Failed to load queued job status'
        setError(message)
        toast.show(message, 'error')
        setQueuedJobId(null)
      }
    }

    pollJob()
    const intervalId = setInterval(pollJob, 3000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [
    queuedJobId,
    templateKind,
    uploadedFile,
    setTemplateId,
    setVerifyArtifacts,
    updateWizardState,
    addTemplate,
    toast,
  ])

  const handleKindChange = useCallback((_, newKind) => {
    if (newKind) {
      setTemplateKind(newKind)
      updateWizardState({ templateKind: newKind })
    }
  }, [updateWizardState])

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    const files = event.dataTransfer?.files
    if (files?.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
  }, [])

  const handleFileSelect = useCallback((event) => {
    const files = event.target.files
    if (files?.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleFile = useCallback(async (file) => {
    setError(null)
    setUploadedFile(file)
    setUploading(true)
    setUploadProgress(0)
    setQueuedJobId(null)

    try {
      const connectionId = wizardState.connectionId || activeConnection?.id
      if (!connectionId) {
        const msg = 'Please connect to a database before verifying templates.'
        setError(msg)
        toast.show(msg, 'warning')
        setUploading(false)
        setUploadProgress(0)
        return
      }

      await execute({
        type: InteractionType.UPLOAD,
        label: `Verify ${templateKind.toUpperCase()} template`,
        reversibility: Reversibility.SYSTEM_MANAGED,
        suppressSuccessToast: true,
        suppressErrorToast: true,
        blocksNavigation: true,
        intent: {
          connectionId,
          templateKind,
          fileName: file?.name,
          action: 'verify_template',
        },
        action: async () => {
          try {
            const result = await api.verifyTemplate({
              file,
              connectionId,
              kind: templateKind,
              background: queueInBackground,
              onProgress: (event) => {
                if (event.event === 'stage') {
                  const progress = event.progress || 0
                  setUploadProgress(progress)
                }
              },
              onUploadProgress: (percent) => {
                setUploadProgress(percent)
              },
            })

            if (queueInBackground) {
              const jobId = result?.job_id || result?.jobId || null
              setQueuedJobId(jobId)
              toast.show('Template verification queued. Track progress in Jobs.', 'success')
              return result
            }

            setVerifyResult(result)
            setTemplateId(result.template_id)
            setVerifyArtifacts(result.artifacts)
            updateWizardState({ templateId: result.template_id })

            // Add to templates list
            addTemplate({
              id: result.template_id,
              name: file.name,
              kind: templateKind,
              status: 'pending',
              created_at: new Date().toISOString(),
            })

            toast.show('Template verified successfully', 'success')
            return result
          } catch (err) {
            setError(err.message || 'Failed to verify template')
            toast.show(err.message || 'Failed to verify template', 'error')
            throw err
          }
        },
      })
    } finally {
      setUploading(false)
      setUploadProgress(100)
    }
  }, [
    wizardState.connectionId,
    activeConnection?.id,
    templateKind,
    queueInBackground,
    setTemplateId,
    setVerifyArtifacts,
    updateWizardState,
    addTemplate,
    toast,
    execute,
  ])

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const acceptedTypes = templateKind === 'pdf'
    ? '.pdf'
    : '.xlsx,.xls'

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
        Upload Your Template
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload a PDF or Excel file that will be used as the template for your reports.
      </Typography>

      {/* Template Type Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Template Type
        </Typography>
        <ToggleButtonGroup
          value={templateKind}
          exclusive
          onChange={handleKindChange}
          size="small"
        >
          <ToggleButton value="pdf" sx={{ px: 3 }}>
            <PictureAsPdfIcon sx={{ mr: 1 }} />
            PDF
          </ToggleButton>
          <ToggleButton value="excel" sx={{ px: 3 }}>
            <TableChartIcon sx={{ mr: 1 }} />
            Excel
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {queuedJobId && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={(
            <Button size="small" onClick={() => navigate('/jobs')} sx={{ textTransform: 'none' }}>
              View Jobs
            </Button>
          )}
        >
          Template verification queued. Job ID: {queuedJobId}
        </Alert>
      )}

      {verifyResult ? (
        <Paper
          sx={{
            p: 3,
            border: 2,
            borderColor: 'success.main',
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Template Verified
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {uploadedFile?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {verifyResult.template_id}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Paper
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          sx={{
            p: 4,
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
          onClick={handleBrowseClick}
        >
          <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
            <Button
              variant={queueInBackground ? 'contained' : 'outlined'}
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                setQueueInBackground((prev) => !prev)
              }}
              sx={{ textTransform: 'none' }}
            >
              {queueInBackground ? 'Queue in background: On' : 'Queue in background: Off'}
            </Button>
          </Stack>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            hidden
          />

          {uploading ? (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Uploading and verifying...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ maxWidth: 300, mx: 'auto' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {uploadProgress}%
              </Typography>
            </Box>
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" sx={{ mb: 1 }}>
                Drag and drop your {templateKind.toUpperCase()} file here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to browse
              </Typography>
              <Button variant="outlined" size="small">
                Browse Files
              </Button>
            </>
          )}
        </Paper>
      )}

      {/* Preview */}
      {verifyResult?.artifacts?.png_url && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Preview
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <img
              src={verifyResult.artifacts.png_url}
              alt="Template preview"
              style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }}
            />
          </Paper>
        </Box>
      )}
    </Box>
  )
}
