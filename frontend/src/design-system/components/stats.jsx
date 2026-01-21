/**
 * Statistics & Metrics Components
 * Beautiful data visualization cards for KPIs, metrics, and analytics
 */

import { forwardRef } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  Skeleton,
  alpha,
  useTheme,
  styled,
} from '@mui/material'
import { keyframes } from '@mui/system'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'

// =============================================================================
// ANIMATIONS
// =============================================================================

const countUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`

// =============================================================================
// STAT CARD - Compact metric display
// =============================================================================

const StatCardRoot = styled(Box, {
  shouldForwardProp: (prop) => !['color', 'hoverable'].includes(prop),
})(({ theme, color = 'primary', hoverable }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2, 2.5),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.1 : 0.08),
  border: `1px solid ${alpha(theme.palette[color].main, 0.15)}`,
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',

  ...(hoverable && {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: `0 8px 24px ${alpha(theme.palette[color].main, 0.2)}`,
      backgroundColor: alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.15 : 0.12),
    },
    '&:active': {
      transform: 'translateY(-1px) scale(1.01)',
    },
  }),
}))

const StatIconWrapper = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color = 'primary' }) => ({
  width: 44,
  height: 44,
  backgroundColor: alpha(theme.palette[color].main, 0.15),
  color: theme.palette[color].main,
  transition: 'transform 0.25s ease',

  '.stat-card:hover &': {
    transform: 'scale(1.1) rotate(5deg)',
  },
}))

export const StatCard = forwardRef(function StatCard(props, ref) {
  const {
    icon,
    label,
    value,
    color = 'primary',
    hoverable = false,
    loading = false,
    onClick,
    sx,
    ...other
  } = props

  const theme = useTheme()

  if (loading) {
    return (
      <StatCardRoot ref={ref} color="grey" sx={sx} {...other}>
        <Skeleton variant="circular" width={44} height={44} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width={60} height={16} />
          <Skeleton width={80} height={28} sx={{ mt: 0.5 }} />
        </Box>
      </StatCardRoot>
    )
  }

  return (
    <StatCardRoot
      ref={ref}
      className="stat-card"
      color={color}
      hoverable={hoverable}
      onClick={onClick}
      sx={sx}
      {...other}
    >
      <StatIconWrapper color={color}>
        {icon}
      </StatIconWrapper>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={500}
          sx={{ lineHeight: 1.2 }}
        >
          {label}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={800}
          color={`${color}.main`}
          sx={{
            lineHeight: 1.2,
            animation: `${countUp} 0.4s ease-out`,
          }}
        >
          {value}
        </Typography>
      </Box>
    </StatCardRoot>
  )
})

// =============================================================================
// METRIC CARD - Detailed metric with trend
// =============================================================================

const MetricCardRoot = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2.5, 3),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },

  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.palette.mode === 'dark'
      ? `0 12px 32px ${alpha('#000', 0.3)}`
      : `0 12px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
    borderColor: alpha(theme.palette.primary.main, 0.2),

    '& .metric-icon': {
      transform: 'scale(1.1) rotate(8deg)',
      opacity: 0.3,
    },
  },
}))

const TrendChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'trend',
})(({ theme, trend }) => {
  const colors = {
    up: {
      bg: alpha(theme.palette.success.main, 0.12),
      color: theme.palette.success[theme.palette.mode === 'dark' ? 'light' : 'dark'],
    },
    down: {
      bg: alpha(theme.palette.error.main, 0.12),
      color: theme.palette.error[theme.palette.mode === 'dark' ? 'light' : 'dark'],
    },
    flat: {
      bg: alpha(theme.palette.grey[500], 0.12),
      color: theme.palette.text.secondary,
    },
  }

  const config = colors[trend] || colors.flat

  return {
    height: 24,
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: config.bg,
    color: config.color,
    '& .MuiChip-icon': {
      color: 'inherit',
      marginLeft: 6,
      marginRight: -2,
    },
  }
})

export const MetricCard = forwardRef(function MetricCard(props, ref) {
  const {
    label,
    value,
    subtitle,
    change,
    changeLabel = 'vs last period',
    icon,
    loading = false,
    sx,
    ...other
  } = props

  const theme = useTheme()

  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
  const TrendIcon = trend === 'up' ? TrendingUpIcon : trend === 'down' ? TrendingDownIcon : TrendingFlatIcon

  if (loading) {
    return (
      <MetricCardRoot ref={ref} sx={sx} {...other}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="60%" height={36} sx={{ mt: 1 }} />
        <Skeleton width="50%" height={20} sx={{ mt: 1 }} />
      </MetricCardRoot>
    )
  }

  return (
    <MetricCardRoot ref={ref} sx={sx} {...other}>
      {/* Background icon */}
      {icon && (
        <Box
          className="metric-icon"
          sx={{
            position: 'absolute',
            right: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.1,
            color: 'primary.main',
            transition: 'all 0.3s ease',
            '& > svg': {
              fontSize: 80,
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Stack spacing={0.5} sx={{ position: 'relative' }}>
        {/* Label */}
        <Typography
          variant="overline"
          color="text.tertiary"
          sx={{ fontSize: '0.6875rem', letterSpacing: '0.08em' }}
        >
          {label}
        </Typography>

        {/* Value */}
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: `${countUp} 0.5s ease-out`,
          }}
        >
          {value}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}

        {/* Change indicator */}
        {change !== undefined && change !== null && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <TrendChip
              trend={trend}
              size="small"
              icon={<TrendIcon sx={{ fontSize: '0.875rem !important' }} />}
              label={`${change > 0 ? '+' : ''}${change}%`}
            />
            <Typography variant="caption" color="text.tertiary">
              {changeLabel}
            </Typography>
          </Stack>
        )}
      </Stack>
    </MetricCardRoot>
  )
})

// =============================================================================
// KPI CARD - Hero-style KPI display
// =============================================================================

const KPICardRoot = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
    : `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 100%)`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',

  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: theme.palette.mode === 'dark'
      ? `0 24px 48px ${alpha('#000', 0.4)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`
      : `0 24px 48px ${alpha(theme.palette.primary.main, 0.15)}`,

    '& .kpi-glow': {
      opacity: 1,
    },
  },
}))

const KPIGlow = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '-50%',
  right: '-20%',
  width: '60%',
  height: '200%',
  background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.3)} 0%, transparent 70%)`,
  opacity: 0.5,
  transition: 'opacity 0.4s ease',
  pointerEvents: 'none',
}))

export const KPICard = forwardRef(function KPICard(props, ref) {
  const {
    label,
    value,
    target,
    progress,
    description,
    icon,
    color = 'primary',
    loading = false,
    sx,
    ...other
  } = props

  const theme = useTheme()

  if (loading) {
    return (
      <KPICardRoot ref={ref} sx={sx} {...other}>
        <Skeleton width={120} height={16} />
        <Skeleton width={180} height={56} sx={{ mt: 2 }} />
        <Skeleton width={200} height={20} sx={{ mt: 2 }} />
      </KPICardRoot>
    )
  }

  return (
    <KPICardRoot ref={ref} sx={sx} {...other}>
      <KPIGlow className="kpi-glow" />

      <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight={500}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {label}
          </Typography>
          {icon && (
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: alpha(theme.palette[color].main, 0.1),
                color: `${color}.main`,
              }}
            >
              {icon}
            </Avatar>
          )}
        </Stack>

        {/* Value */}
        <Box>
          <Typography
            variant="h2"
            fontWeight={800}
            sx={{
              fontSize: { xs: '2.5rem', md: '3rem' },
              lineHeight: 1,
              background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].light} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: `${countUp} 0.6s ease-out`,
            }}
          >
            {value}
          </Typography>

          {target && (
            <Typography variant="body2" color="text.tertiary" sx={{ mt: 1 }}>
              Target: <strong>{target}</strong>
            </Typography>
          )}
        </Box>

        {/* Progress bar */}
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                position: 'relative',
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette[color].main, 0.1),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.min(progress, 100)}%`,
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette[color].main} 0%, ${theme.palette[color].light} 100%)`,
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {progress}% of target
            </Typography>
          </Box>
        )}

        {/* Description */}
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Stack>
    </KPICardRoot>
  )
})

// =============================================================================
// MINI STAT - For inline/compact displays
// =============================================================================

export const MiniStat = forwardRef(function MiniStat(props, ref) {
  const {
    label,
    value,
    change,
    color = 'primary',
    sx,
    ...other
  } = props

  const theme = useTheme()
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <Stack
      ref={ref}
      direction="row"
      alignItems="center"
      spacing={1}
      sx={sx}
      {...other}
    >
      <Typography variant="body2" color="text.secondary">
        {label}:
      </Typography>
      <Typography variant="body2" fontWeight={700} color={`${color}.main`}>
        {value}
      </Typography>
      {change !== undefined && change !== null && (
        <Chip
          size="small"
          label={`${change > 0 ? '+' : ''}${change}%`}
          sx={{
            height: 20,
            fontSize: '0.6875rem',
            fontWeight: 600,
            bgcolor: alpha(
              trend === 'up'
                ? theme.palette.success.main
                : trend === 'down'
                ? theme.palette.error.main
                : theme.palette.grey[500],
              0.12
            ),
            color: trend === 'up'
              ? 'success.main'
              : trend === 'down'
              ? 'error.main'
              : 'text.secondary',
          }}
        />
      )}
    </Stack>
  )
})

export default {
  StatCard,
  MetricCard,
  KPICard,
  MiniStat,
}
