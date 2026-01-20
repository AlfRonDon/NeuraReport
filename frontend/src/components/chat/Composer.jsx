import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Box,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  alpha,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Button, IconButton, Kbd } from '../primitives'
import { useSessionStore, useAppStore } from '../../stores'

export default function Composer({ onSubmit, onStop, onFileUpload }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const createSession = useSessionStore((s) => s.createSession)
  const isProcessing = useAppStore((s) => s.isProcessing)

  // Focus input on mount and session change
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  const handleSubmit = useCallback(() => {
    const text = value.trim()
    if (!text || isProcessing) return

    // Create session if none exists
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession('New Session')
    }

    onSubmit?.(text, sessionId)
    setValue('')
  }, [value, isProcessing, activeSessionId, createSession, onSubmit])

  const handleKeyDown = useCallback(
    (e) => {
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
        return
      }

      // Enter to submit (without shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
        return
      }

      // Escape to stop if processing
      if (e.key === 'Escape' && isProcessing) {
        e.preventDefault()
        onStop?.()
        return
      }
    },
    [handleSubmit, isProcessing, onStop]
  )

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileUpload?.(file)
      }
      e.target.value = ''
    },
    [onFileUpload]
  )

  return (
    <Box
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Input Area */}
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
            borderColor: 'primary.main',
            boxShadow: (theme) =>
              `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }}
      >
        {/* File Upload Button */}
        <IconButton
          tooltip="Attach file"
          size="small"
          disabled={isProcessing}
          component="label"
        >
          <AttachFileIcon fontSize="small" />
          <input
            type="file"
            hidden
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={handleFileSelect}
          />
        </IconButton>

        {/* Text Input */}
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={6}
          placeholder={
            isProcessing
              ? 'Processing...'
              : 'Type a command or describe what you want to generate...'
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
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

        {/* Submit/Stop Button */}
        {isProcessing ? (
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={onStop}
            startIcon={<StopIcon />}
            sx={{ minWidth: 80, flexShrink: 0 }}
          >
            Stop
          </Button>
        ) : (
          <IconButton
            tooltip="Send (⌘↵)"
            size="small"
            color="primary"
            onClick={handleSubmit}
            disabled={!value.trim()}
            sx={{
              bgcolor: value.trim() ? 'primary.main' : 'action.disabledBackground',
              color: value.trim() ? 'primary.contrastText' : 'text.disabled',
              '&:hover': {
                bgcolor: value.trim() ? 'primary.dark' : 'action.disabledBackground',
              },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Keyboard Hints */}
      <Stack
        direction="row"
        spacing={3}
        justifyContent="center"
        sx={{ mt: 1.5 }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Kbd size="small">⌘</Kbd>
          <Kbd size="small">K</Kbd>
          <Typography variant="caption" color="text.disabled">
            commands
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Kbd size="small">↵</Kbd>
          <Typography variant="caption" color="text.disabled">
            send
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Kbd size="small">⇧</Kbd>
          <Kbd size="small">↵</Kbd>
          <Typography variant="caption" color="text.disabled">
            new line
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
