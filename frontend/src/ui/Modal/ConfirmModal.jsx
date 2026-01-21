import { useEffect, useRef } from 'react'
import { Typography, Stack, Box, alpha } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Modal from './Modal'
import { palette } from '../../theme'

const SEVERITY_CONFIG = {
  warning: {
    icon: WarningAmberIcon,
    color: palette.yellow[400],
    bgColor: alpha(palette.yellow[400], 0.15),
  },
  error: {
    icon: ErrorOutlineIcon,
    color: palette.red[400],
    bgColor: alpha(palette.red[400], 0.15),
  },
  info: {
    icon: InfoOutlinedIcon,
    color: palette.blue[400],
    bgColor: alpha(palette.blue[400], 0.15),
  },
}

const PREF_KEY = 'neurareport_preferences'

const getDeletePreference = () => {
  if (typeof window === 'undefined') return { confirmDelete: true }
  try {
    const raw = window.localStorage.getItem(PREF_KEY)
    if (!raw) return { confirmDelete: true }
    const parsed = JSON.parse(raw)
    return { confirmDelete: parsed?.confirmDelete ?? true }
  } catch {
    return { confirmDelete: true }
  }
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  severity = 'warning',
  loading = false,
}) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.warning
  const Icon = config.icon
  const confirmColor = severity === 'error' ? 'error' : 'primary'
  const autoConfirmRef = useRef(false)
  const isDeleteAction = `${title} ${confirmLabel}`.toLowerCase().includes('delete')

  useEffect(() => {
    if (!open) {
      autoConfirmRef.current = false
      return
    }
    if (!isDeleteAction || autoConfirmRef.current) return
    const prefs = getDeletePreference()
    if (prefs.confirmDelete === false) {
      autoConfirmRef.current = true
      onConfirm?.()
      onClose?.()
    }
  }, [open, isDeleteAction, onConfirm, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmColor={confirmColor}
      loading={loading}
      dividers={false}
    >
      <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 1 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '12px',
            bgcolor: config.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 28, color: config.color }} />
        </Box>
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: palette.scale[400],
            lineHeight: 1.5,
            maxWidth: 280,
          }}
        >
          {message}
        </Typography>
      </Stack>
    </Modal>
  )
}
