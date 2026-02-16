import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link,
  Alert,
  Paper,
  Chip,
  IconButton,
} from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import CloseIcon from '@mui/icons-material/Close'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'

import Surface from '@/components/layout/Surface.jsx'
import ScaledIframePreview from '@/components/ScaledIframePreview.jsx'
import { useToast } from '@/components/ToastProvider.jsx'
import {
  useInteraction,
  InteractionType,
  Reversibility,
  useNavigateInteraction,
} from '@/components/ux/governance'
import { useAppStore } from '@/stores'
import { useTemplateChatStore } from '@/stores/templateChatStore'
import { chatTemplateCreate, createTemplateFromChat } from '@/api/client'
import TemplateChatEditor from '@/features/generate/containers/TemplateChatEditor.jsx'
import AiUsageNotice from '@/components/ai/AiUsageNotice.jsx'
import { neutral } from '@/app/theme'

const MAX_PDF_SIZE_MB = 10

const SESSION_KEY = '__chat_create__'

export default function TemplateChatCreateContainer() {
  const navigate = useNavigateInteraction()
  const toast = useToast()
  const { execute } = useInteraction()
  const addTemplate = useAppStore((s) => s.addTemplate)
  const setTemplateId = useAppStore((s) => s.setTemplateId)
  const deleteSession = useTemplateChatStore((s) => s.deleteSession)
  const [searchParams] = useSearchParams()
  const fromWizard = searchParams.get('from') === 'wizard'
  const wizardConnectionId = searchParams.get('connectionId') || null

  const [currentHtml, setCurrentHtml] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [samplePdf, setSamplePdf] = useState(null) // { file: File, name, size }
  const fileInputRef = useRef(null)

  const handleFileSelect = useCallback((file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.show('Please upload a PDF file.', 'warning')
      return
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      toast.show(`File too large. Maximum size is ${MAX_PDF_SIZE_MB}MB.`, 'warning')
      return
    }
    setSamplePdf({ file, name: file.name, size: file.size })
    toast.show(`Sample PDF "${file.name}" attached. The AI will use this as a visual reference.`, 'info')
  }, [toast])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleRemovePdf = useCallback(() => {
    setSamplePdf(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // Update preview when HTML changes
  useEffect(() => {
    if (!currentHtml) {
      setPreviewUrl(null)
      return
    }
    const blob = new Blob([currentHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [currentHtml])

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      // Don't clean up — let the user resume if they navigate back
    }
  }, [])

  const handleHtmlUpdate = useCallback((html) => {
    setCurrentHtml(html)
  }, [])

  const handleApplySuccess = useCallback((result) => {
    // In create mode, "apply" just updates local state (nothing persisted yet)
    if (result?.updated_html) {
      setCurrentHtml(result.updated_html)
    }
  }, [])

  const handleBack = useCallback(async () => {
    const backTo = fromWizard ? '/setup?step=template' : '/templates'
    await navigate(backTo, {
      interaction: {
        type: InteractionType.NAVIGATE,
        label: fromWizard ? 'Back to wizard' : 'Back to templates',
        reversibility: Reversibility.FULLY_REVERSIBLE,
      },
    })
  }, [navigate, fromWizard])

  const handleOpenNameDialog = useCallback(() => {
    setNameDialogOpen(true)
  }, [])

  const handleCloseNameDialog = useCallback(() => {
    setNameDialogOpen(false)
  }, [])

  const handleCreateTemplate = useCallback(async () => {
    const name = templateName.trim()
    if (!name) {
      toast.show('Please enter a template name.', 'warning')
      return
    }
    if (!currentHtml) {
      toast.show('No template HTML to save. Continue the conversation to generate a template first.', 'warning')
      return
    }

    await execute({
      type: InteractionType.CREATE,
      label: 'Create template from chat',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        action: 'create_template_from_chat',
        name,
      },
      action: async () => {
        setCreating(true)
        try {
          const result = await createTemplateFromChat(name, currentHtml)

          // Add to store and set as active template
          if (result?.template_id) {
            addTemplate({
              id: result.template_id,
              name: result.name,
              kind: result.kind || 'pdf',
              status: 'draft',
              artifacts: {},
              tags: [],
            })
            setTemplateId(result.template_id)
          }

          // Clean up the creation session
          deleteSession(SESSION_KEY)

          setNameDialogOpen(false)

          // Navigate: if from wizard, go back to mapping step; otherwise go to editor
          if (fromWizard) {
            // Update wizard session state so it knows we have a template
            try {
              const wizardRaw = sessionStorage.getItem('neurareport_wizard_state')
              const wizardData = wizardRaw ? JSON.parse(wizardRaw) : {}
              wizardData.templateId = result.template_id
              wizardData.templateKind = result.kind || 'pdf'
              wizardData.templateName = name
              sessionStorage.setItem('neurareport_wizard_state', JSON.stringify(wizardData))
            } catch (_) { /* ignore storage errors */ }

            toast.show(`Template "${name}" created. Now map your data fields.`, 'success')
            await navigate('/setup?step=mapping', {
              interaction: {
                type: InteractionType.NAVIGATE,
                label: 'Continue to mapping',
                reversibility: Reversibility.FULLY_REVERSIBLE,
              },
            })
          } else {
            toast.show(`Template "${name}" created successfully.`, 'success')
            await navigate(`/templates/${result.template_id}/edit`, {
              state: { from: '/templates', editMode: 'chat' },
              interaction: {
                type: InteractionType.NAVIGATE,
                label: 'Open new template editor',
                reversibility: Reversibility.FULLY_REVERSIBLE,
              },
            })
          }
        } catch (err) {
          toast.show(String(err.message || err), 'error')
          throw err
        } finally {
          setCreating(false)
        }
      },
    })
  }, [templateName, currentHtml, execute, addTemplate, setTemplateId, deleteSession, toast, navigate, fromWizard])

  // Wrap the chatApi to match (messages, html) signature, passing sample PDF if attached
  const chatApi = useCallback((messages, html) => {
    return chatTemplateCreate(messages, html, samplePdf?.file || null)
  }, [samplePdf])

  return (
    <>
      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link
            component={RouterLink}
            to="/templates"
            underline="hover"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Templates
          </Link>
          <Typography color="text.primary" fontWeight={600}>
            Create with AI
          </Typography>
        </Breadcrumbs>
      </Box>

      <Surface sx={{ gap: { xs: 2, md: 2.5 } }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} flexWrap="wrap">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <AutoAwesomeIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="h5" fontWeight={600}>
                Create Template with AI
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Describe the report you need and the AI will build the template for you
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {currentHtml && (
              <Button
                variant="contained"
                onClick={handleOpenNameDialog}
                startIcon={<SaveIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: neutral[900],
                  '&:hover': { bgcolor: neutral[700] },
                }}
              >
                Create Template
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
          </Stack>
        </Stack>

        <AiUsageNotice
          dense
          title="AI template creation"
          description="The AI will generate an HTML template based on your description. You can iterate before saving."
          chips={[
            { label: 'Source: Your description', color: 'info', variant: 'outlined' },
            { label: 'Editable after creation', color: 'success', variant: 'outlined' },
          ]}
          sx={{ mb: 1 }}
        />

        {/* Sample PDF Upload */}
        {samplePdf ? (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              borderColor: 'primary.main',
              bgcolor: 'primary.50',
            }}
          >
            <PictureAsPdfIcon sx={{ color: 'error.main', fontSize: 28 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {samplePdf.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(samplePdf.size / 1024).toFixed(0)} KB — AI will use this as a visual reference
              </Typography>
            </Box>
            <Chip label="Sample PDF" size="small" color="primary" variant="outlined" />
            <IconButton size="small" onClick={handleRemovePdf} title="Remove sample PDF">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              borderStyle: 'dashed',
              borderColor: 'divider',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              transition: 'all 0.15s',
            }}
          >
            <UploadFileIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Have a sample PDF?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Drop a PDF here or click to upload. The AI will use it as a visual reference for layout and styling.
              </Typography>
            </Box>
            <Chip label="Optional" size="small" variant="outlined" />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </Paper>
        )}

        {/* Main content: Preview + Chat */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
            gap: 2,
            minHeight: { xs: 400, md: 600 },
          }}
        >
          {/* Left: Preview */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Template Preview
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {previewUrl ? (
                <ScaledIframePreview src={previewUrl} />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    p: 4,
                  }}
                >
                  <Alert severity="info" variant="outlined" sx={{ maxWidth: 400 }}>
                    Start a conversation to generate a template. The preview will appear here as the AI creates your template.
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: Chat */}
          <TemplateChatEditor
            templateId={SESSION_KEY}
            templateName="New Template"
            currentHtml={currentHtml}
            onHtmlUpdate={handleHtmlUpdate}
            onApplySuccess={handleApplySuccess}
            mode="create"
            chatApi={chatApi}
          />
        </Box>
      </Surface>

      {/* Name Dialog */}
      <Dialog
        open={nameDialogOpen}
        onClose={handleCloseNameDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Name Your Template
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Give your template a descriptive name. You can change this later.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Template Name"
            placeholder="e.g., Monthly Sales Invoice"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && templateName.trim()) {
                handleCreateTemplate()
              }
            }}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseNameDialog} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTemplate}
            disabled={!templateName.trim() || creating}
            sx={{
              bgcolor: neutral[900],
              '&:hover': { bgcolor: neutral[700] },
            }}
          >
            {creating ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
