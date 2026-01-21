/**
 * Premium Card Components
 * Sophisticated card variants with glassmorphism, gradients, and micro-interactions
 */

import { forwardRef } from 'react'
import { Box, Paper, alpha, useTheme, styled } from '@mui/material'
import { keyframes } from '@mui/system'

// =============================================================================
// ANIMATIONS
// =============================================================================

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.2); }
`

// =============================================================================
// GLASS CARD
// =============================================================================

const GlassCardRoot = styled(Paper, {
  shouldForwardProp: (prop) => !['gradient', 'hoverable', 'glow', 'padding'].includes(prop),
})(({ theme, gradient, hoverable, glow: showGlow, padding = 'md' }) => {
  const paddingMap = {
    none: 0,
    sm: theme.spacing(2),
    md: theme.spacing(3),
    lg: theme.spacing(4),
    xl: theme.spacing(5),
  }

  return {
    position: 'relative',
    padding: paddingMap[padding] || paddingMap.md,
    borderRadius: theme.shape.borderRadiusLg || 12,
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.6)
      : alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.1 : 0.08)}`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',

    // Gradient overlay
    ...(gradient && {
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        pointerEvents: 'none',
        zIndex: 0,
      },
      '& > *': {
        position: 'relative',
        zIndex: 1,
      },
    }),

    // Hover effects
    ...(hoverable && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: alpha(theme.palette.primary.main, 0.2),
        boxShadow: theme.palette.mode === 'dark'
          ? `0 20px 40px ${alpha('#000', 0.3)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`
          : `0 20px 40px ${alpha(theme.palette.primary.main, 0.1)}`,
      },
      '&:active': {
        transform: 'translateY(-2px)',
      },
    }),

    // Glow animation
    ...(showGlow && {
      animation: `${glow} 3s ease-in-out infinite`,
    }),
  }
})

export const GlassCard = forwardRef(function GlassCard(props, ref) {
  const {
    children,
    gradient = false,
    hoverable = false,
    glow = false,
    padding = 'md',
    sx,
    ...other
  } = props

  return (
    <GlassCardRoot
      ref={ref}
      elevation={0}
      gradient={gradient}
      hoverable={hoverable}
      glow={glow}
      padding={padding}
      sx={sx}
      {...other}
    >
      {children}
    </GlassCardRoot>
  )
})

// =============================================================================
// GRADIENT CARD
// =============================================================================

const GradientCardRoot = styled(Paper, {
  shouldForwardProp: (prop) => !['colors', 'angle', 'hoverable', 'padding'].includes(prop),
})(({ theme, colors, angle = 135, hoverable, padding = 'md' }) => {
  const paddingMap = {
    none: 0,
    sm: theme.spacing(2),
    md: theme.spacing(3),
    lg: theme.spacing(4),
    xl: theme.spacing(5),
  }

  const defaultColors = [theme.palette.primary.main, theme.palette.secondary.main]
  const gradientColors = colors || defaultColors

  return {
    position: 'relative',
    padding: paddingMap[padding] || paddingMap.md,
    borderRadius: theme.shape.borderRadiusLg || 12,
    background: `linear-gradient(${angle}deg, ${gradientColors.join(', ')})`,
    color: '#ffffff',
    border: 'none',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

    // Noise texture overlay
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
      opacity: 0.03,
      pointerEvents: 'none',
    },

    // Inner content
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },

    // Hover effects
    ...(hoverable && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-4px) scale(1.01)',
        boxShadow: `0 20px 40px ${alpha(gradientColors[0], 0.4)}`,
      },
      '&:active': {
        transform: 'translateY(-2px) scale(1.005)',
      },
    }),
  }
})

export const GradientCard = forwardRef(function GradientCard(props, ref) {
  const {
    children,
    colors,
    angle = 135,
    hoverable = false,
    padding = 'md',
    sx,
    ...other
  } = props

  return (
    <GradientCardRoot
      ref={ref}
      elevation={0}
      colors={colors}
      angle={angle}
      hoverable={hoverable}
      padding={padding}
      sx={sx}
      {...other}
    >
      {children}
    </GradientCardRoot>
  )
})

// =============================================================================
// SURFACE CARD (Subtle elevation)
// =============================================================================

const SurfaceCardRoot = styled(Paper, {
  shouldForwardProp: (prop) => !['hoverable', 'bordered', 'selected', 'padding'].includes(prop),
})(({ theme, hoverable, bordered = true, selected, padding = 'md' }) => {
  const paddingMap = {
    none: 0,
    sm: theme.spacing(2),
    md: theme.spacing(3),
    lg: theme.spacing(4),
    xl: theme.spacing(5),
  }

  return {
    position: 'relative',
    padding: paddingMap[padding] || paddingMap.md,
    borderRadius: theme.shape.borderRadiusLg || 12,
    backgroundColor: theme.palette.mode === 'dark'
      ? theme.palette.background.surface || alpha(theme.palette.background.paper, 0.8)
      : theme.palette.background.paper,
    backgroundImage: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

    // Border
    ...(bordered && {
      border: `1px solid ${
        selected
          ? theme.palette.primary.main
          : alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.1 : 0.08)
      }`,
    }),

    // Selected state
    ...(selected && {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
    }),

    // Hover effects
    ...(hoverable && {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 1)
          : theme.palette.grey[50],
        borderColor: alpha(theme.palette.divider, 0.2),
        boxShadow: theme.palette.mode === 'dark'
          ? `0 8px 24px ${alpha('#000', 0.2)}`
          : `0 8px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
      },
      '&:active': {
        transform: 'scale(0.99)',
      },
    }),
  }
})

export const SurfaceCard = forwardRef(function SurfaceCard(props, ref) {
  const {
    children,
    hoverable = false,
    bordered = true,
    selected = false,
    padding = 'md',
    sx,
    ...other
  } = props

  return (
    <SurfaceCardRoot
      ref={ref}
      elevation={0}
      hoverable={hoverable}
      bordered={bordered}
      selected={selected}
      padding={padding}
      sx={sx}
      {...other}
    >
      {children}
    </SurfaceCardRoot>
  )
})

// =============================================================================
// INTERACTIVE CARD (For clickable list items)
// =============================================================================

const InteractiveCardRoot = styled(Box, {
  shouldForwardProp: (prop) => !['active', 'disabled'].includes(prop),
})(({ theme, active, disabled }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  userSelect: 'none',

  backgroundColor: active
    ? alpha(theme.palette.primary.main, 0.1)
    : 'transparent',

  '&:hover': !disabled && {
    backgroundColor: active
      ? alpha(theme.palette.primary.main, 0.12)
      : alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.08 : 0.04),
  },

  '&:active': !disabled && {
    backgroundColor: active
      ? alpha(theme.palette.primary.main, 0.15)
      : alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.12 : 0.08),
  },

  // Active indicator
  ...(active && {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 3,
      height: '60%',
      borderRadius: '0 2px 2px 0',
      backgroundColor: theme.palette.primary.main,
    },
  }),
}))

export const InteractiveCard = forwardRef(function InteractiveCard(props, ref) {
  const {
    children,
    active = false,
    disabled = false,
    onClick,
    sx,
    ...other
  } = props

  return (
    <InteractiveCardRoot
      ref={ref}
      active={active}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      sx={sx}
      {...other}
    >
      {children}
    </InteractiveCardRoot>
  )
})

// =============================================================================
// SKELETON CARD (Loading state)
// =============================================================================

const SkeletonCardRoot = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadiusLg || 12,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.4)
    : theme.palette.grey[100],
  border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
  overflow: 'hidden',

  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.common.white, 0.1)} 50%, transparent 100%)`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 1.5s ease-in-out infinite`,
  },
}))

export const SkeletonCard = forwardRef(function SkeletonCard(props, ref) {
  const { sx, ...other } = props

  return (
    <SkeletonCardRoot
      ref={ref}
      elevation={0}
      sx={sx}
      {...other}
    />
  )
})

export default {
  GlassCard,
  GradientCard,
  SurfaceCard,
  InteractiveCard,
  SkeletonCard,
}
