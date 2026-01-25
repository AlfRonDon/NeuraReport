/**
 * Premium Offline Banner
 * Elegant network status indicator with animations
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Collapse,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
import { figmaGrey } from '@/app/theme'
import {
  SignalWifiOff as OfflineIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  WifiTethering as OnlineIcon,
} from '@mui/icons-material'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

// =============================================================================
// ANIMATIONS
// =============================================================================

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const BannerBase = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(1, 3),
  animation: `${slideDown} 0.3s ease-out`,
  position: 'relative',
  overflow: 'hidden',
}))

const OfflineBannerContainer = styled(BannerBase)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${figmaGrey[1100]}, ${figmaGrey[1200]})`
    : `linear-gradient(135deg, ${figmaGrey[1000]}, ${figmaGrey[1100]})`,
  color: '#fff',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(
      90deg,
      transparent 0%,
      ${alpha('#fff', 0.1)} 50%,
      transparent 100%
    )`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 3s infinite linear`,
    pointerEvents: 'none',
  },
}))

const ReconnectedBannerContainer = styled(BannerBase)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${figmaGrey[1000]}, ${figmaGrey[1100]})`
    : `linear-gradient(135deg, ${figmaGrey[1100]}, ${figmaGrey[1200]})`,
  color: '#fff',
  justifyContent: 'center',
}))

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 8,
  backgroundColor: alpha('#fff', 0.2),
  flexShrink: 0,
}))

const PulsingIcon = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${pulse} 2s infinite ease-in-out`,
}))

const StatusText = styled(Typography)(() => ({
  fontSize: '0.8125rem',
  fontWeight: 600,
  letterSpacing: '-0.01em',
}))

const DescriptionText = styled(Typography)(() => ({
  fontSize: '0.75rem',
  opacity: 0.9,
}))

const RetryButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.75rem',
  padding: theme.spacing(0.5, 2),
  minWidth: 90,
  borderColor: alpha('#fff', 0.4),
  color: '#fff',
  backdropFilter: 'blur(4px)',
  backgroundColor: alpha('#fff', 0.1),
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: '#fff',
    backgroundColor: alpha('#fff', 0.2),
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&:disabled': {
    borderColor: alpha('#fff', 0.2),
    color: alpha('#fff', 0.7),
  },
}))

const SpinningLoader = styled(CircularProgress)(() => ({
  color: 'inherit',
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OfflineBanner() {
  const theme = useTheme()
  const { isOnline, checkConnectivity } = useNetworkStatus()
  const [isRetrying, setIsRetrying] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOfflineRef = useRef(false)
  const reconnectTimeoutRef = useRef(null)

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Track when we go offline and show reconnected message when back online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
    } else if (wasOfflineRef.current) {
      setShowReconnected(true)
      clearReconnectTimer()
      reconnectTimeoutRef.current = setTimeout(() => setShowReconnected(false), 3000)
      wasOfflineRef.current = false
    }
    return () => clearReconnectTimer()
  }, [isOnline, clearReconnectTimer])

  useEffect(() => () => clearReconnectTimer(), [clearReconnectTimer])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    try {
      const online = await checkConnectivity()
      if (online) {
        setShowReconnected(true)
        clearReconnectTimer()
        reconnectTimeoutRef.current = setTimeout(() => setShowReconnected(false), 3000)
      }
    } finally {
      setIsRetrying(false)
    }
  }, [checkConnectivity, clearReconnectTimer])

  // Reconnected banner
  if (showReconnected && isOnline) {
    return (
      <Collapse in={showReconnected}>
        <ReconnectedBannerContainer>
          <PulsingIcon>
            <IconContainer>
              <CheckCircleIcon sx={{ fontSize: 16 }} />
            </IconContainer>
          </PulsingIcon>
          <StatusText sx={{ ml: 1 }}>Connection restored</StatusText>
        </ReconnectedBannerContainer>
      </Collapse>
    )
  }

  if (isOnline) return null

  return (
    <Collapse in={!isOnline}>
      <OfflineBannerContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PulsingIcon>
            <IconContainer>
              <OfflineIcon sx={{ fontSize: 16 }} />
            </IconContainer>
          </PulsingIcon>
          <Box>
            <StatusText>You&apos;re offline</StatusText>
            <DescriptionText>
              Some features may not work until connection is restored.
            </DescriptionText>
          </Box>
        </Box>
        <RetryButton
          variant="outlined"
          onClick={handleRetry}
          disabled={isRetrying}
          startIcon={
            isRetrying ? (
              <SpinningLoader size={14} />
            ) : (
              <RefreshIcon sx={{ fontSize: 16 }} />
            )
          }
        >
          {isRetrying ? 'Checking...' : 'Retry'}
        </RetryButton>
      </OfflineBannerContainer>
    </Collapse>
  )
}
