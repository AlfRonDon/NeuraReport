/**
 * Chat Components - Innovative AI Chat Interface
 * Premium conversational UI inspired by ChatGPT, Claude, and Linear
 */

import { forwardRef, useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Stack,
  Chip,
  Fade,
  Grow,
  Collapse,
  CircularProgress,
  alpha,
  useTheme,
  styled,
  keyframes,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import MicIcon from '@mui/icons-material/Mic'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'

// =============================================================================
// ANIMATIONS
// =============================================================================

const typing = keyframes`
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
`

// =============================================================================
// TYPING INDICATOR - Elegant dots animation
// =============================================================================

const TypingDot = styled(Box)(({ theme, delay = 0 }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: `${typing} 1.4s ease-in-out infinite`,
  animationDelay: `${delay}ms`,
}))

export const TypingIndicator = forwardRef(function TypingIndicator(props, ref) {
  const { label = 'AI is thinking', sx, ...other } = props
  const theme = useTheme()

  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 1.5,
          px: 2,
          borderRadius: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        }}
      >
        <TypingDot delay={0} />
        <TypingDot delay={200} />
        <TypingDot delay={400} />
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          animation: `${pulse} 2s ease-in-out infinite`,
          fontStyle: 'italic',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
})

// =============================================================================
// CHAT BUBBLE - Message container with rich features
// =============================================================================

const BubbleRoot = styled(Box, {
  shouldForwardProp: (prop) => !['isUser', 'isStreaming'].includes(prop),
})(({ theme, isUser, isStreaming }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: isUser ? 'flex-end' : 'flex-start',
  animation: `${fadeInUp} 0.3s ease-out`,

  ...(isStreaming && {
    '& .bubble-content': {
      animation: `${glowPulse} 2s ease-in-out infinite`,
    },
  }),
}))

const BubbleContent = styled(Box, {
  shouldForwardProp: (prop) => !['isUser', 'variant'].includes(prop),
})(({ theme, isUser, variant = 'default' }) => {
  const baseStyles = {
    maxWidth: '85%',
    padding: theme.spacing(2, 2.5),
    borderRadius: theme.shape.borderRadius * 2,
    position: 'relative',
    wordBreak: 'break-word',

    // Message tail
    '&::before': {
      content: '""',
      position: 'absolute',
      bottom: 8,
      width: 12,
      height: 12,
      ...(isUser ? {
        right: -4,
        borderRadius: '0 0 0 12px',
        backgroundColor: theme.palette.primary.main,
      } : {
        left: -4,
        borderRadius: '0 0 12px 0',
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.95)
          : theme.palette.grey[100],
      }),
    },
  }

  if (isUser) {
    return {
      ...baseStyles,
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      color: theme.palette.primary.contrastText,
      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
    }
  }

  return {
    ...baseStyles,
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.95)
      : theme.palette.grey[100],
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,

    ...(variant === 'glass' && {
      backgroundColor: alpha(theme.palette.background.paper, 0.6),
      backdropFilter: 'blur(20px)',
      border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
    }),
  }
})

const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  opacity: 0,
  transition: 'opacity 0.2s ease',

  '.chat-bubble:hover &': {
    opacity: 1,
  },
}))

const ActionButton = styled(IconButton)(({ theme }) => ({
  padding: 4,
  color: theme.palette.text.secondary,

  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },

  '& svg': {
    fontSize: '1rem',
  },
}))

export const ChatBubble = forwardRef(function ChatBubble(props, ref) {
  const {
    message,
    isUser = false,
    timestamp,
    avatar,
    userName,
    isStreaming = false,
    showActions = true,
    onCopy,
    onRegenerate,
    onFeedback,
    sources,
    variant = 'default',
    sx,
    ...other
  } = props

  const theme = useTheme()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  return (
    <BubbleRoot
      ref={ref}
      className="chat-bubble"
      isUser={isUser}
      isStreaming={isStreaming}
      sx={sx}
      {...other}
    >
      {/* Header with avatar and name */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          mb: 0.5,
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <Avatar
          src={avatar}
          sx={{
            width: 28,
            height: 28,
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            fontSize: '0.75rem',
          }}
        >
          {isUser ? userName?.[0] || 'U' : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
        </Avatar>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {isUser ? userName || 'You' : 'AI Assistant'}
        </Typography>
        {timestamp && (
          <Typography variant="caption" color="text.tertiary" sx={{ fontSize: '0.65rem' }}>
            {timestamp}
          </Typography>
        )}
      </Stack>

      {/* Message content */}
      <BubbleContent
        className="bubble-content"
        isUser={isUser}
        variant={variant}
      >
        <Typography
          variant="body2"
          sx={{
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            '& code': {
              backgroundColor: alpha(theme.palette.common.black, 0.1),
              padding: '2px 6px',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.85em',
            },
            '& pre': {
              backgroundColor: alpha(theme.palette.common.black, 0.05),
              padding: theme.spacing(1.5),
              borderRadius: 1,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85em',
            },
          }}
        >
          {message}
          {isStreaming && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 8,
                height: 16,
                backgroundColor: 'currentColor',
                ml: 0.5,
                animation: `${pulse} 1s ease-in-out infinite`,
              }}
            />
          )}
        </Typography>
      </BubbleContent>

      {/* Sources (for AI responses) */}
      {!isUser && sources && sources.length > 0 && (
        <Collapse in={true}>
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" color="text.tertiary" sx={{ mr: 0.5 }}>
              Sources:
            </Typography>
            {sources.map((source, i) => (
              <Chip
                key={i}
                label={source}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  color: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              />
            ))}
          </Stack>
        </Collapse>
      )}

      {/* Action buttons (for AI responses) */}
      {!isUser && showActions && !isStreaming && (
        <ActionBar>
          <ActionButton onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
            {copied ? <CheckIcon /> : <ContentCopyIcon />}
          </ActionButton>
          <ActionButton onClick={() => onFeedback?.('up')} title="Good response">
            <ThumbUpOutlinedIcon />
          </ActionButton>
          <ActionButton onClick={() => onFeedback?.('down')} title="Bad response">
            <ThumbDownOutlinedIcon />
          </ActionButton>
          {onRegenerate && (
            <ActionButton onClick={onRegenerate} title="Regenerate">
              <RefreshIcon />
            </ActionButton>
          )}
        </ActionBar>
      )}
    </BubbleRoot>
  )
})

// =============================================================================
// CHAT INPUT - Premium input with rich features
// =============================================================================

const InputContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.8)
    : theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
  boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
  transition: 'all 0.2s ease',

  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
}))

const StyledTextField = styled(TextField)(({ theme }) => ({
  flex: 1,
  '& .MuiOutlinedInput-root': {
    padding: 0,
    backgroundColor: 'transparent',

    '& fieldset': {
      border: 'none',
    },

    '& textarea': {
      padding: theme.spacing(1),
      fontSize: '0.9375rem',
      lineHeight: 1.5,
      maxHeight: 200,

      '&::placeholder': {
        color: theme.palette.text.tertiary,
        opacity: 1,
      },
    },
  },
}))

const SendButton = styled(IconButton)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  transition: 'all 0.2s ease',

  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    transform: 'scale(1.05)',
  },

  '&:active': {
    transform: 'scale(0.95)',
  },

  '&.Mui-disabled': {
    backgroundColor: alpha(theme.palette.primary.main, 0.3),
    color: alpha(theme.palette.primary.contrastText, 0.5),
  },
}))

export const ChatInput = forwardRef(function ChatInput(props, ref) {
  const {
    value,
    onChange,
    onSend,
    onStop,
    placeholder = 'Ask anything about your data...',
    isLoading = false,
    disabled = false,
    showAttachment = true,
    showVoice = false,
    suggestions = [],
    onSuggestionClick,
    maxLength = 4000,
    sx,
    ...other
  } = props

  const theme = useTheme()
  const inputRef = useRef(null)
  const [localValue, setLocalValue] = useState(value || '')

  useEffect(() => {
    if (value !== undefined) {
      setLocalValue(value)
    }
  }, [value])

  const handleChange = (e) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange?.(e)
  }

  const handleSend = () => {
    if (localValue.trim() && !isLoading && !disabled) {
      onSend?.(localValue.trim())
      setLocalValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Box ref={ref} sx={sx} {...other}>
      {/* Suggestions */}
      {suggestions.length > 0 && !localValue && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mb: 1.5,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {suggestions.map((suggestion, i) => (
            <Grow key={i} in timeout={300 + i * 100}>
              <Chip
                label={suggestion}
                size="small"
                onClick={() => {
                  setLocalValue(suggestion)
                  onSuggestionClick?.(suggestion)
                }}
                sx={{
                  height: 28,
                  borderRadius: 2,
                  fontSize: '0.8125rem',
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  color: 'primary.main',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',

                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    transform: 'translateY(-1px)',
                  },
                }}
              />
            </Grow>
          ))}
        </Stack>
      )}

      {/* Input container */}
      <InputContainer>
        {/* Attachment button */}
        {showAttachment && (
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
        )}

        {/* Text input */}
        <StyledTextField
          ref={inputRef}
          multiline
          maxRows={6}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          inputProps={{ maxLength }}
        />

        {/* Voice button */}
        {showVoice && (
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <MicIcon fontSize="small" />
          </IconButton>
        )}

        {/* Send/Stop button */}
        {isLoading ? (
          <SendButton onClick={onStop}>
            <StopIcon fontSize="small" />
          </SendButton>
        ) : (
          <SendButton
            onClick={handleSend}
            disabled={!localValue.trim() || disabled}
          >
            <SendIcon fontSize="small" />
          </SendButton>
        )}
      </InputContainer>

      {/* Character count */}
      {localValue.length > maxLength * 0.8 && (
        <Typography
          variant="caption"
          color={localValue.length >= maxLength ? 'error' : 'text.secondary'}
          sx={{ mt: 0.5, textAlign: 'right', display: 'block' }}
        >
          {localValue.length}/{maxLength}
        </Typography>
      )}
    </Box>
  )
})

// =============================================================================
// CHAT THREAD - Complete conversation view
// =============================================================================

const ThreadContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}))

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),

  // Custom scrollbar
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.primary, 0.15),
    borderRadius: 3,
    '&:hover': {
      backgroundColor: alpha(theme.palette.text.primary, 0.25),
    },
  },
}))

const InputWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.default, 0.5),
  backdropFilter: 'blur(10px)',
}))

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: theme.spacing(4),
  textAlign: 'center',
}))

export const ChatThread = forwardRef(function ChatThread(props, ref) {
  const {
    messages = [],
    onSend,
    onStop,
    isLoading = false,
    suggestions = [],
    emptyTitle = 'Start a conversation',
    emptyDescription = 'Ask questions about your data and get AI-powered insights',
    sx,
    ...other
  } = props

  const theme = useTheme()
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <ThreadContainer ref={ref} sx={sx} {...other}>
      <MessagesContainer>
        {messages.length === 0 ? (
          <EmptyState>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
                mb: 3,
              }}
            >
              <AutoAwesomeIcon
                sx={{
                  fontSize: 36,
                  color: 'primary.main',
                  animation: `${pulse} 2s ease-in-out infinite`,
                }}
              />
            </Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {emptyTitle}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 400, mb: 3 }}
            >
              {emptyDescription}
            </Typography>

            {/* Starter suggestions */}
            {suggestions.length > 0 && (
              <Stack spacing={1} sx={{ width: '100%', maxWidth: 400 }}>
                {suggestions.slice(0, 4).map((suggestion, i) => (
                  <Grow key={i} in timeout={500 + i * 150}>
                    <Box
                      onClick={() => onSend?.(suggestion)}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',

                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          borderColor: alpha(theme.palette.primary.main, 0.2),
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {suggestion}
                      </Typography>
                    </Box>
                  </Grow>
                ))}
              </Stack>
            )}
          </EmptyState>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble
                key={msg.id || i}
                message={msg.content}
                isUser={msg.role === 'user'}
                timestamp={msg.timestamp}
                avatar={msg.avatar}
                userName={msg.userName}
                isStreaming={msg.isStreaming}
                sources={msg.sources}
              />
            ))}
            {isLoading && !messages.some(m => m.isStreaming) && (
              <TypingIndicator />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessagesContainer>

      <InputWrapper>
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          suggestions={messages.length === 0 ? [] : suggestions.slice(0, 3)}
        />
      </InputWrapper>
    </ThreadContainer>
  )
})

// =============================================================================
// THINKING INDICATOR - For AI reasoning display
// =============================================================================

const ThinkingContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: alpha(theme.palette.info.main, 0.08),
  border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
  position: 'relative',
  overflow: 'hidden',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${theme.palette.info.main}, transparent)`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 2s linear infinite`,
  },
}))

export const ThinkingIndicator = forwardRef(function ThinkingIndicator(props, ref) {
  const { steps = [], currentStep, sx, ...other } = props
  const theme = useTheme()

  return (
    <ThinkingContainer ref={ref} sx={sx} {...other}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={14} thickness={4} />
          <Typography variant="caption" fontWeight={600} color="info.main">
            AI is analyzing...
          </Typography>
        </Stack>

        {steps.length > 0 && (
          <Stack spacing={0.5} sx={{ ml: 3 }}>
            {steps.map((step, i) => (
              <Typography
                key={i}
                variant="caption"
                color={i === currentStep ? 'text.primary' : 'text.secondary'}
                sx={{
                  opacity: i <= currentStep ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {i < currentStep ? (
                  <CheckIcon sx={{ fontSize: 12, color: 'success.main' }} />
                ) : i === currentStep ? (
                  <CircularProgress size={10} thickness={4} />
                ) : (
                  <Box sx={{ width: 12 }} />
                )}
                {step}
              </Typography>
            ))}
          </Stack>
        )}
      </Stack>
    </ThinkingContainer>
  )
})

export default {
  ChatBubble,
  ChatInput,
  ChatThread,
  TypingIndicator,
  ThinkingIndicator,
}
