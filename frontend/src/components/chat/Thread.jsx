import { useRef, useEffect, useCallback } from 'react'
import { Box, Typography, Stack, Fab, Zoom, alpha } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { ScrollArea } from '../primitives'
import Message from './Message'
import { useSessionStore } from '../../stores'

export default function Thread({ renderBlock }) {
  const scrollRef = useRef(null)
  const session = useSessionStore((s) => s.getActiveSession())
  const messages = session?.messages || []

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToBottom('smooth')
    }
  }, [messages.length])

  const handleScrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToBottom('smooth')
  }, [])

  if (!session) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 400, textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: '1.5rem',
            }}
          >
            NR
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Welcome to NeuraReport
          </Typography>
          <Typography color="text.secondary">
            Create a new session to start generating reports from your data.
            Connect a database, upload templates, or describe what you want to create.
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <ScrollArea ref={scrollRef} autoScroll>
        <Box sx={{ py: 2, minHeight: '100%' }}>
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              renderBlock={renderBlock}
            />
          ))}
        </Box>
      </ScrollArea>

      {/* Scroll to bottom FAB */}
      <Zoom in={messages.length > 5}>
        <Fab
          size="small"
          onClick={handleScrollToBottom}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      </Zoom>
    </Box>
  )
}
