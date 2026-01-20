import { memo } from 'react'
import { Box, Typography, Avatar, Stack, alpha, Skeleton } from '@mui/material'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

const ROLE_CONFIG = {
  user: {
    icon: PersonOutlineIcon,
    label: 'You',
    bgcolor: 'primary.main',
    align: 'right',
  },
  assistant: {
    icon: SmartToyOutlinedIcon,
    label: 'NeuraReport',
    bgcolor: 'secondary.main',
    align: 'left',
  },
  system: {
    icon: InfoOutlinedIcon,
    label: 'System',
    bgcolor: 'grey.500',
    align: 'center',
  },
}

function Message({ message, renderBlock }) {
  const { role, content, blocks, streaming, timestamp } = message
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.assistant
  const Icon = config.icon

  const isUser = role === 'user'
  const isSystem = role === 'system'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1.5,
        px: 2,
        py: 1.5,
        ...(isSystem && {
          justifyContent: 'center',
        }),
      }}
    >
      {/* Avatar */}
      {!isSystem && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: config.bgcolor,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Avatar>
      )}

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          maxWidth: isSystem ? 600 : isUser ? 'calc(100% - 100px)' : 'calc(100% - 48px)',
          minWidth: 0,
        }}
      >
        {/* Header */}
        {!isSystem && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              mb: 0.5,
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.primary"
            >
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
        )}

        {/* Message Bubble */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isUser
              ? 'primary.main'
              : isSystem
              ? (theme) => alpha(theme.palette.info.main, 0.08)
              : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            border: isSystem ? '1px solid' : 'none',
            borderColor: (theme) => alpha(theme.palette.info.main, 0.2),
            boxShadow: isUser
              ? '0 2px 8px rgba(79, 70, 229, 0.2)'
              : '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {/* Text Content */}
          {content && (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.6,
              }}
            >
              {content}
              {streaming && (
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
          )}

          {/* Streaming Skeleton */}
          {streaming && !content && (
            <Stack spacing={1}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </Stack>
          )}

          {/* Blocks */}
          {blocks && blocks.length > 0 && (
            <Stack spacing={2} sx={{ mt: content ? 2 : 0 }}>
              {blocks.map((block) => renderBlock?.(block))}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default memo(Message)
