import { useCallback } from 'react'
import {
  Box,
  Stack,
  Typography,
  Divider,
  Badge,
  Avatar,
  alpha,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { Button, IconButton } from '../primitives'
import SessionList from './SessionList'
import { useSessionStore, useAppStore } from '../../stores'
import { SIDEBAR_WIDTH } from './constants'

function QuickAccessItem({ icon: Icon, label, badge, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        borderRadius: 1.5,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        transition: 'background-color 150ms ease',
      }}
    >
      <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {label}
      </Typography>
      {badge && (
        <Typography variant="caption" color="text.disabled">
          {badge}
        </Typography>
      )}
    </Box>
  )
}

export default function Sidebar({ onClose }) {
  const createSession = useSessionStore((s) => s.createSession)
  const connection = useAppStore((s) => s.connection)
  const templates = useAppStore((s) => s.templates)
  const openSettings = useAppStore((s) => s.openSettings)

  const handleNewSession = useCallback(() => {
    createSession('New Session')
  }, [createSession])

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            NR
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            NeuraReport
          </Typography>
        </Stack>
        {onClose && (
          <IconButton size="small" onClick={onClose} tooltip="Hide sidebar">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* New Session Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleNewSession}
          sx={{
            borderStyle: 'dashed',
            bgcolor: 'transparent',
            border: 1,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          New Session
        </Button>
      </Box>

      {/* Session List */}
      <SessionList />

      <Divider />

      {/* Quick Access */}
      <Box sx={{ py: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ px: 2, mb: 1, display: 'block', textTransform: 'uppercase' }}
        >
          Quick Access
        </Typography>
        <QuickAccessItem
          icon={StorageOutlinedIcon}
          label="Database"
          badge={connection?.status === 'connected' ? '●' : '○'}
        />
        <QuickAccessItem
          icon={DescriptionOutlinedIcon}
          label="Templates"
          badge={templates.length || '0'}
        />
        <QuickAccessItem
          icon={SettingsOutlinedIcon}
          label="Settings"
          onClick={openSettings}
        />
      </Box>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Badge
            variant="dot"
            color={connection?.status === 'connected' ? 'success' : 'default'}
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
              U
            </Avatar>
          </Badge>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              User
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {connection?.name || 'Not connected'}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}
