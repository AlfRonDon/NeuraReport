import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Divider,
  Alert,
  Collapse,
  alpha,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

import { useTemplateChatStore } from '@/stores/templateChatStore'
import { chatTemplateEdit, applyChatTemplateEdit } from '@/api/client'
import { useInteraction, InteractionType, Reversibility } from '@/components/ux/governance'
import { useToast } from '@/components/ToastProvider'
import ScaledIframePreview from '@/components/ScaledIframePreview'
import { figmaGrey } from '@/app/theme'

const ROLE_CONFIG = {
  user: {
    icon: PersonOutlineIcon,
    label: 'You',
    bgcolor: figmaGrey[1200],
    textColor: '#fff',
  },
  assistant: {
    icon: SmartToyOutlinedIcon,
    label: 'NeuraReport',
    bgcolor: 'background.paper',
    textColor: 'text.primary',
  },
}

function ChatMessage({ message }) {
  const { role, content, timestamp } = message
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.assistant
  const Icon = config.icon
  const isUser = role === 'user'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1.5,
        px: 2,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: isUser ? figmaGrey[1200] : figmaGrey[900],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18, color: 'white' }} />
      </Box>

      <Box
        sx={{
          flex: 1,
          maxWidth: isUser ? 'calc(100% - 100px)' : 'calc(100% - 48px)',
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            mb: 0.5,
            justifyContent: isUser ? 'flex-end' : 'flex-start',
          }}
        >
          <Typography variant="caption" fontWeight={600} color="text.primary">
            {config.label}
          </Typography>
          {timestamp && (
            <Typography variant="caption" color="text.disabled">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          )}
        </Stack>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isUser
              ? figmaGrey[1200]
              : 'background.paper',
            color: isUser ? '#fff' : 'text.primary',
            boxShadow: isUser
              ? '0 2px 8px rgba(33, 32, 28, 0.2)'
              : '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.6,
            }}
          >
            {content}
            {message.streaming && (
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 6,
                  height: 16,
                  ml: 0.5,
                  bgcolor: 'currentColor',
                  animation: 'blink 1s steps(1) infinite',
                  '@keyframes blink': {
                    '50%': { opacity: 0 },
                  },
                }}
              />
            )}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function ProposedChangesPanel({ changes, proposedHtml, onApply, onReject, applying }) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!proposedHtml) {
      setPreviewUrl(null)
      return
    }
    const blob = new Blob([proposedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [proposedHtml])

  if (!changes || changes.length === 0) return null

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mx: 2,
        mb: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette.divider, 0.3),
        bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.04) : figmaGrey[200],
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CheckCircleIcon sx={{ color: 'text.secondary' }} fontSize="small" />
          <Typography variant="subtitle2" fontWeight={600}>
            Ready to Apply Changes
          </Typography>
        </Stack>

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Proposed modifications:
          </Typography>
          <Stack spacing={0.5}>
            {changes.map((change, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                <Typography variant="body2" color="text.secondary">
                  •
                </Typography>
                <Typography variant="body2">
                  {change}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {proposedHtml && (
          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowPreview(!showPreview)}
              endIcon={showPreview ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1 }}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Collapse in={showPreview}>
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  p: 1,
                  height: 300,
                  overflow: 'hidden',
                }}
              >
                {previewUrl && (
                  <ScaledIframePreview
                    src={previewUrl}
                    title="Proposed changes preview"
                    fit="contain"
                    pageShadow
                    frameAspectRatio="210 / 297"
                  />
                )}
              </Box>
            </Collapse>
          </Box>
        )}

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            onClick={onApply}
            disabled={applying}
            startIcon={applying ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {applying ? 'Applying...' : 'Apply Changes'}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onReject}
            disabled={applying}
          >
            Request Different Changes
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

function FollowUpQuestions({ questions, onQuestionClick }) {
  if (!questions || questions.length === 0) return null

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <LightbulbIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary">
          Quick responses:
        </Typography>
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {questions.map((question, idx) => (
          <Chip
            key={idx}
            label={question}
            size="small"
            variant="outlined"
            onClick={() => onQuestionClick(question)}
            sx={{
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  )
}

export default function TemplateChatEditor({
  templateId,
  templateName,
  currentHtml,
  onHtmlUpdate,
  onApplySuccess,
}) {
  const toast = useToast()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState(null)

  // Get store methods
  const getOrCreateSession = useTemplateChatStore((s) => s.getOrCreateSession)
  const getSession = useTemplateChatStore((s) => s.getSession)
  const addUserMessage = useTemplateChatStore((s) => s.addUserMessage)
  const addAssistantMessage = useTemplateChatStore((s) => s.addAssistantMessage)
  const getMessagesForApi = useTemplateChatStore((s) => s.getMessagesForApi)
  const setProposedChanges = useTemplateChatStore((s) => s.setProposedChanges)
  const clearProposedChanges = useTemplateChatStore((s) => s.clearProposedChanges)
  const clearSession = useTemplateChatStore((s) => s.clearSession)
  const { execute } = useInteraction()

  // Initialize session
  useEffect(() => {
    if (templateId) {
      getOrCreateSession(templateId, templateName)
    }
  }, [templateId, templateName, getOrCreateSession])

  const session = getSession(templateId)
  const messages = session?.messages || []
  const proposedChanges = session?.proposedChanges
  const proposedHtml = session?.proposedHtml
  const readyToApply = session?.readyToApply

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isProcessing || !templateId) return

    setInputValue('')
    setFollowUpQuestions(null)
    addUserMessage(templateId, text)

    await execute({
      type: InteractionType.GENERATE,
      label: 'Generate edit suggestions',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        templateId,
        action: 'template_chat',
      },
      action: async () => {
        setIsProcessing(true)
        try {
          // Get messages for API (including the new user message)
          const apiMessages = [
            ...getMessagesForApi(templateId),
            { role: 'user', content: text },
          ]

          const response = await chatTemplateEdit(templateId, apiMessages, currentHtml)

          // Add assistant response
          addAssistantMessage(templateId, response.message, {
            proposedChanges: response.proposed_changes,
            proposedHtml: response.updated_html,
            readyToApply: response.ready_to_apply,
          })

          // Update proposed changes state
          setProposedChanges(templateId, {
            proposedChanges: response.proposed_changes,
            proposedHtml: response.updated_html,
            readyToApply: response.ready_to_apply,
          })

          // Set follow-up questions if provided
          if (response.follow_up_questions) {
            setFollowUpQuestions(response.follow_up_questions)
          }
          return response
        } catch (err) {
          toast.show(String(err.message || err), 'error')
          addAssistantMessage(
            templateId,
            "I apologize, but I encountered an error. Please try again or rephrase your request."
          )
          throw err
        } finally {
          setIsProcessing(false)
        }
      },
    })
  }, [
    inputValue,
    isProcessing,
    templateId,
    currentHtml,
    addUserMessage,
    addAssistantMessage,
    getMessagesForApi,
    setProposedChanges,
    toast,
    execute,
  ])

  const handleApplyChanges = useCallback(async () => {
    if (!proposedHtml || !templateId) return

    await execute({
      type: InteractionType.UPDATE,
      label: 'Apply template changes',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        templateId,
        action: 'apply_template_changes',
      },
      action: async () => {
        setApplying(true)
        try {
          const result = await applyChatTemplateEdit(templateId, proposedHtml)

          // Clear proposed changes
          clearProposedChanges(templateId)

          // Notify parent of HTML update
          onHtmlUpdate?.(proposedHtml)
          onApplySuccess?.(result)

          // Add confirmation message
          addAssistantMessage(
            templateId,
            "The changes have been applied successfully. Is there anything else you'd like to modify?"
          )

          toast.show('Template changes applied successfully.', 'success')
          return result
        } catch (err) {
          toast.show(String(err.message || err), 'error')
          throw err
        } finally {
          setApplying(false)
        }
      },
    })
  }, [
    proposedHtml,
    templateId,
    clearProposedChanges,
    addAssistantMessage,
    onHtmlUpdate,
    onApplySuccess,
    toast,
    execute,
  ])

  const handleRejectChanges = useCallback(() => {
    clearProposedChanges(templateId)
    addAssistantMessage(
      templateId,
      "No problem! What different changes would you like me to make instead?"
    )
  }, [templateId, clearProposedChanges, addAssistantMessage])

  const handleQuestionClick = useCallback((question) => {
    setInputValue(question)
    setFollowUpQuestions(null)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  const handleClearChat = useCallback(() => {
    clearSession(templateId, templateName)
    setFollowUpQuestions(null)
    toast.show('Chat cleared. Starting fresh conversation.', 'info')
  }, [templateId, templateName, clearSession, toast])

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              AI Template Editor
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Describe the changes you want and I'll help you implement them
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleClearChat}
            title="Clear chat and start over"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 1,
        }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Proposed Changes Panel */}
      {readyToApply && proposedChanges && (
        <ProposedChangesPanel
          changes={proposedChanges}
          proposedHtml={proposedHtml}
          onApply={handleApplyChanges}
          onReject={handleRejectChanges}
          applying={applying}
        />
      )}

      {/* Follow-up Questions */}
      <FollowUpQuestions
        questions={followUpQuestions}
        onQuestionClick={handleQuestionClick}
      />

      {/* Input */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 1.5,
            borderRadius: 3,
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
            border: 1,
            borderColor: 'divider',
            transition: 'all 150ms ease',
            '&:focus-within': {
              borderColor: (theme) => theme.palette.mode === 'dark' ? figmaGrey[1000] : figmaGrey[1100],
              boxShadow: (theme) =>
                `0 0 0 2px ${alpha(theme.palette.text.primary, 0.08)}`,
            },
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder={
              isProcessing
                ? 'Processing...'
                : readyToApply
                ? 'Apply the changes above or describe different modifications...'
                : 'Describe what changes you want to make to the template...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '0.9375rem',
                lineHeight: 1.5,
              },
            }}
            sx={{
              '& .MuiInputBase-root': {
                py: 0.5,
              },
            }}
          />

          <IconButton
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            sx={{
              bgcolor: (theme) => inputValue.trim() && !isProcessing
                ? (theme.palette.mode === 'dark' ? figmaGrey[1100] : figmaGrey[1200])
                : 'action.disabledBackground',
              color: inputValue.trim() && !isProcessing
                ? '#fff'
                : 'text.disabled',
              '&:hover': {
                bgcolor: (theme) => inputValue.trim() && !isProcessing
                  ? (theme.palette.mode === 'dark' ? figmaGrey[1000] : figmaGrey[1100])
                  : 'action.disabledBackground',
              },
            }}
          >
            {isProcessing ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon fontSize="small" />
            )}
          </IconButton>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ mt: 1 }}
        >
          <Typography variant="caption" color="text.disabled">
            Press Enter to send, Shift+Enter for new line
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
