import { useEffect, useState, useCallback, useRef } from 'react'
import { Box, Typography, Button, CircularProgress, Collapse, alpha } from '@mui/material'
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { palette } from '../theme'

export default function OfflineBanner() {
  const { isOnline, checkConnectivity } = useNetworkStatus()
  const [isRetrying, setIsRetrying] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOfflineRef = useRef(false)

  // Track when we go offline and show reconnected message when back online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
    } else if (wasOfflineRef.current) {
      setShowReconnected(true)
      const timeoutId = setTimeout(() => setShowReconnected(false), 3000)
      wasOfflineRef.current = false
      return () => clearTimeout(timeoutId)
    }
  }, [isOnline])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    try {
      const online = await checkConnectivity()
      if (online) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 3000)
      }
    } finally {
      setIsRetrying(false)
    }
  }, [checkConnectivity])

  // Reconnected banner
  if (showReconnected && isOnline) {
    return (
      <Collapse in={showReconnected}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: palette.green[600],
            color: '#FFFFFF',
            fontSize: '0.75rem',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Connection restored
          </Typography>
        </Box>
      </Collapse>
    )
  }

  if (isOnline) return null

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 2,
        py: 1,
        bgcolor: palette.yellow[600],
        color: palette.scale[1000],
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SignalWifiOffIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
          You&apos;re offline
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', opacity: 0.9 }}>
          Some features may not work until connection is restored.
        </Typography>
      </Box>
      <Button
        size="small"
        variant="outlined"
        onClick={handleRetry}
        disabled={isRetrying}
        startIcon={
          isRetrying ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <RefreshIcon sx={{ fontSize: 16 }} />
          )
        }
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.75rem',
          borderColor: alpha(palette.scale[1000], 0.4),
          color: palette.scale[1000],
          py: 0.25,
          minWidth: 80,
          '&:hover': {
            borderColor: palette.scale[1000],
            bgcolor: alpha(palette.scale[1000], 0.1),
          },
        }}
      >
        {isRetrying ? 'Checking' : 'Retry'}
      </Button>
    </Box>
  )
}
