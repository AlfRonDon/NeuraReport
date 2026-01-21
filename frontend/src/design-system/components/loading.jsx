/**
 * Loading Components - Premium Loading States
 * Beautiful loading indicators, skeletons, and progress displays
 */

import { forwardRef } from 'react'
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  LinearProgress,
  Skeleton,
  alpha,
  useTheme,
  styled,
  keyframes,
} from '@mui/material'

// =============================================================================
// ANIMATIONS
// =============================================================================

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.95);
  }
`

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`

const orbit = keyframes`
  0% { transform: rotate(0deg) translateX(20px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
`

const bounce = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
`

const wave = keyframes`
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
`

const fadeInOut = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`

// =============================================================================
// LOADING SPINNER - Classic circular spinner with variations
// =============================================================================

const SpinnerRoot = styled(Box, {
  shouldForwardProp: (prop) => !['size', 'variant'].includes(prop),
})(({ size = 'medium', variant = 'default' }) => {
  const sizes = {
    small: 24,
    medium: 40,
    large: 56,
    xlarge: 80,
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizes[size] || size,
    height: sizes[size] || size,
  }
})

export const LoadingSpinner = forwardRef(function LoadingSpinner(props, ref) {
  const {
    size = 'medium',
    variant = 'default', // default, gradient, dots, pulse, orbit
    color = 'primary',
    label,
    sx,
    ...other
  } = props

  const theme = useTheme()

  const sizes = {
    small: 24,
    medium: 40,
    large: 56,
    xlarge: 80,
  }

  const numericSize = sizes[size] || size

  const renderSpinner = () => {
    switch (variant) {
      case 'gradient':
        return (
          <Box
            sx={{
              width: numericSize,
              height: numericSize,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, transparent, ${theme.palette[color].main})`,
              animation: `${spin} 1s linear infinite`,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 4,
                borderRadius: '50%',
                backgroundColor: theme.palette.background.paper,
              },
            }}
          />
        )

      case 'dots':
        return (
          <Stack direction="row" spacing={0.5}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: numericSize / 4,
                  height: numericSize / 4,
                  borderRadius: '50%',
                  backgroundColor: theme.palette[color].main,
                  animation: `${bounce} 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </Stack>
        )

      case 'pulse':
        return (
          <Box
            sx={{
              width: numericSize,
              height: numericSize,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette[color].main, 0.3),
              animation: `${pulse} 1.5s ease-in-out infinite`,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: '25%',
                borderRadius: '50%',
                backgroundColor: theme.palette[color].main,
              },
            }}
          />
        )

      case 'orbit':
        return (
          <Box
            sx={{
              width: numericSize,
              height: numericSize,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: '35%',
                borderRadius: '50%',
                backgroundColor: theme.palette[color].main,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: theme.palette[color].light,
                top: '50%',
                left: '50%',
                marginTop: -4,
                marginLeft: -4,
                animation: `${orbit} 1.5s linear infinite`,
              }}
            />
          </Box>
        )

      case 'wave':
        return (
          <Stack direction="row" spacing={0.25} alignItems="center">
            {[0, 1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  width: numericSize / 8,
                  height: numericSize / 2,
                  backgroundColor: theme.palette[color].main,
                  borderRadius: 1,
                  animation: `${wave} 1s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </Stack>
        )

      default:
        return (
          <CircularProgress
            size={numericSize}
            color={color}
            thickness={4}
          />
        )
    }
  }

  return (
    <Box
      ref={ref}
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        ...sx,
      }}
      {...other}
    >
      {renderSpinner()}
      {label && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ animation: `${fadeInOut} 2s ease-in-out infinite` }}
        >
          {label}
        </Typography>
      )}
    </Box>
  )
})

// =============================================================================
// SHIMMER LOADER - Animated skeleton effect
// =============================================================================

const ShimmerBox = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(90deg, ${alpha(theme.palette.grey[800], 0.8)} 25%, ${alpha(theme.palette.grey[700], 0.9)} 50%, ${alpha(theme.palette.grey[800], 0.8)} 75%)`
    : `linear-gradient(90deg, ${theme.palette.grey[200]} 25%, ${theme.palette.grey[100]} 50%, ${theme.palette.grey[200]} 75%)`,
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.5s ease-in-out infinite`,
  borderRadius: 1,
}))

export const ShimmerLoader = forwardRef(function ShimmerLoader(props, ref) {
  const {
    width = '100%',
    height = 20,
    variant = 'rectangular', // rectangular, circular, text, card
    lines = 1,
    spacing = 1,
    sx,
    ...other
  } = props

  const theme = useTheme()

  if (variant === 'text') {
    return (
      <Box ref={ref} sx={sx} {...other}>
        <Stack spacing={spacing}>
          {Array.from({ length: lines }).map((_, i) => (
            <ShimmerBox
              key={i}
              sx={{
                width: i === lines - 1 ? '60%' : '100%',
                height: height,
                borderRadius: 0.5,
              }}
            />
          ))}
        </Stack>
      </Box>
    )
  }

  if (variant === 'circular') {
    return (
      <ShimmerBox
        ref={ref}
        sx={{
          width: width,
          height: width,
          borderRadius: '50%',
          ...sx,
        }}
        {...other}
      />
    )
  }

  if (variant === 'card') {
    return (
      <Box
        ref={ref}
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          ...sx,
        }}
        {...other}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <ShimmerBox sx={{ width: 48, height: 48, borderRadius: '50%' }} />
            <Box sx={{ flex: 1 }}>
              <ShimmerBox sx={{ width: '60%', height: 16, mb: 1 }} />
              <ShimmerBox sx={{ width: '40%', height: 12 }} />
            </Box>
          </Stack>
          <ShimmerBox sx={{ width: '100%', height: 14 }} />
          <ShimmerBox sx={{ width: '90%', height: 14 }} />
          <ShimmerBox sx={{ width: '70%', height: 14 }} />
        </Stack>
      </Box>
    )
  }

  return (
    <ShimmerBox
      ref={ref}
      sx={{
        width: width,
        height: height,
        ...sx,
      }}
      {...other}
    />
  )
})

// =============================================================================
// LOADING SKELETON - Structured skeleton screens
// =============================================================================

export const LoadingSkeleton = forwardRef(function LoadingSkeleton(props, ref) {
  const {
    variant = 'default', // default, table, card, list, dashboard, chat
    rows = 5,
    sx,
    ...other
  } = props

  const theme = useTheme()

  if (variant === 'table') {
    return (
      <Box ref={ref} sx={sx} {...other}>
        {/* Header */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            p: 2,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <ShimmerBox
              key={i}
              sx={{ flex: i === 1 ? 2 : 1, height: 16 }}
            />
          ))}
        </Stack>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <Stack
            key={i}
            direction="row"
            spacing={2}
            sx={{
              p: 2,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
            }}
          >
            {[1, 2, 3, 4].map((j) => (
              <ShimmerBox
                key={j}
                sx={{ flex: j === 1 ? 2 : 1, height: 14 }}
              />
            ))}
          </Stack>
        ))}
      </Box>
    )
  }

  if (variant === 'card') {
    return (
      <ShimmerLoader ref={ref} variant="card" sx={sx} {...other} />
    )
  }

  if (variant === 'list') {
    return (
      <Box ref={ref} sx={sx} {...other}>
        <Stack spacing={1.5}>
          {Array.from({ length: rows }).map((_, i) => (
            <Stack
              key={i}
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <ShimmerBox sx={{ width: 40, height: 40, borderRadius: '50%' }} />
              <Box sx={{ flex: 1 }}>
                <ShimmerBox sx={{ width: '50%', height: 14, mb: 0.5 }} />
                <ShimmerBox sx={{ width: '30%', height: 12 }} />
              </Box>
              <ShimmerBox sx={{ width: 60, height: 24, borderRadius: 1 }} />
            </Stack>
          ))}
        </Stack>
      </Box>
    )
  }

  if (variant === 'dashboard') {
    return (
      <Box ref={ref} sx={sx} {...other}>
        {/* Stats row */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                p: 2.5,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <ShimmerBox sx={{ width: 80, height: 12, mb: 1.5 }} />
              <ShimmerBox sx={{ width: '50%', height: 28 }} />
            </Box>
          ))}
        </Stack>
        {/* Charts row */}
        <Stack direction="row" spacing={2}>
          <Box
            sx={{
              flex: 2,
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <ShimmerBox sx={{ width: 120, height: 16, mb: 2 }} />
            <ShimmerBox sx={{ width: '100%', height: 200, borderRadius: 1 }} />
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <ShimmerBox sx={{ width: 100, height: 16, mb: 2 }} />
            <Stack spacing={1.5}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                  <ShimmerBox sx={{ width: 12, height: 12, borderRadius: '50%' }} />
                  <ShimmerBox sx={{ flex: 1, height: 14 }} />
                  <ShimmerBox sx={{ width: 40, height: 14 }} />
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    )
  }

  if (variant === 'chat') {
    return (
      <Box ref={ref} sx={sx} {...other}>
        <Stack spacing={2}>
          {/* AI message */}
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <ShimmerBox sx={{ width: 32, height: 32, borderRadius: '50%' }} />
            <Box sx={{ flex: 1, maxWidth: '70%' }}>
              <ShimmerBox sx={{ width: 60, height: 10, mb: 1 }} />
              <ShimmerBox
                sx={{
                  width: '100%',
                  height: 80,
                  borderRadius: 2,
                }}
              />
            </Box>
          </Stack>
          {/* User message */}
          <Stack direction="row-reverse" spacing={1.5} alignItems="flex-start">
            <ShimmerBox sx={{ width: 32, height: 32, borderRadius: '50%' }} />
            <Box sx={{ maxWidth: '60%' }}>
              <ShimmerBox
                sx={{
                  width: 200,
                  height: 50,
                  borderRadius: 2,
                  ml: 'auto',
                }}
              />
            </Box>
          </Stack>
          {/* AI typing */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ShimmerBox sx={{ width: 32, height: 32, borderRadius: '50%' }} />
            <Stack direction="row" spacing={0.5}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.text.primary, 0.2),
                    animation: `${bounce} 1.4s ease-in-out infinite`,
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Box>
    )
  }

  // Default
  return (
    <Box ref={ref} sx={sx} {...other}>
      <Stack spacing={1.5}>
        <ShimmerBox sx={{ width: '40%', height: 20 }} />
        <ShimmerBox sx={{ width: '100%', height: 16 }} />
        <ShimmerBox sx={{ width: '90%', height: 16 }} />
        <ShimmerBox sx={{ width: '60%', height: 16 }} />
      </Stack>
    </Box>
  )
})

// =============================================================================
// PROGRESS BAR - Enhanced linear progress
// =============================================================================

const ProgressBarRoot = styled(Box)(({ theme }) => ({
  width: '100%',
}))

const ProgressTrack = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 8,
  borderRadius: 4,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  overflow: 'hidden',
}))

const ProgressFill = styled(Box, {
  shouldForwardProp: (prop) => !['value', 'animated', 'gradient'].includes(prop),
})(({ theme, value = 0, animated, gradient }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: `${Math.min(value, 100)}%`,
  borderRadius: 4,
  background: gradient
    ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
    : theme.palette.primary.main,
  backgroundSize: '200% 100%',
  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',

  ...(animated && {
    animation: `${gradientShift} 2s ease infinite`,
  }),
}))

export const ProgressBar = forwardRef(function ProgressBar(props, ref) {
  const {
    value = 0,
    label,
    showValue = true,
    animated = false,
    gradient = false,
    size = 'medium', // small, medium, large
    color = 'primary',
    sx,
    ...other
  } = props

  const heights = {
    small: 4,
    medium: 8,
    large: 12,
  }

  return (
    <ProgressBarRoot ref={ref} sx={sx} {...other}>
      {(label || showValue) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 0.75 }}
        >
          {label && (
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          )}
          {showValue && (
            <Typography
              variant="caption"
              fontWeight={600}
              color="primary.main"
            >
              {Math.round(value)}%
            </Typography>
          )}
        </Stack>
      )}
      <ProgressTrack sx={{ height: heights[size] }}>
        <ProgressFill
          value={value}
          animated={animated}
          gradient={gradient}
        />
      </ProgressTrack>
    </ProgressBarRoot>
  )
})

// =============================================================================
// FULL PAGE LOADER - Overlay loading state
// =============================================================================

const FullPageLoaderRoot = styled(Box)(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: alpha(theme.palette.background.default, 0.9),
  backdropFilter: 'blur(8px)',
  zIndex: theme.zIndex.modal + 1,
}))

export const FullPageLoader = forwardRef(function FullPageLoader(props, ref) {
  const {
    message = 'Loading...',
    progress,
    showProgress = false,
    sx,
    ...other
  } = props

  const theme = useTheme()

  return (
    <FullPageLoaderRoot ref={ref} sx={sx} {...other}>
      <LoadingSpinner size="large" variant="gradient" />
      <Typography
        variant="subtitle1"
        fontWeight={500}
        sx={{ mt: 3 }}
      >
        {message}
      </Typography>
      {showProgress && progress !== undefined && (
        <Box sx={{ width: 240, mt: 2 }}>
          <ProgressBar value={progress} animated gradient />
        </Box>
      )}
    </FullPageLoaderRoot>
  )
})

export default {
  LoadingSpinner,
  ShimmerLoader,
  LoadingSkeleton,
  ProgressBar,
  FullPageLoader,
}
