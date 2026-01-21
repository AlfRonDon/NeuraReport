/**
 * Design System Tokens
 * Inspired by Linear, Vercel, Stripe, and Notion
 *
 * A comprehensive token system for building sophisticated UIs
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

// Base grayscale - Linear inspired with perfect contrast ratios
export const gray = {
  50: '#fafafa',
  100: '#f5f5f5',
  150: '#ededed',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  750: '#363636',
  800: '#262626',
  850: '#1f1f1f',
  900: '#171717',
  950: '#0a0a0a',
}

// Accent colors - Vibrant but professional
export const colors = {
  // Primary - Electric indigo (Linear-inspired)
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // Secondary - Cyan/Teal (Vercel-inspired)
  secondary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },

  // Success - Emerald
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },

  // Warning - Amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error - Rose
  error: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },

  // Info - Sky
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },

  // Purple - For AI/ML features
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },

  // Pink - For creative/design features
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
}

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const semanticColors = {
  dark: {
    // Background layers (from deepest to surface)
    bg: {
      base: '#09090b',       // Deepest background
      subtle: '#0f0f11',     // Slightly raised
      muted: '#18181b',      // Card backgrounds
      surface: '#1f1f23',    // Elevated surfaces
      elevated: '#27272a',   // Popovers, modals
      hover: '#2e2e33',      // Hover states
    },

    // Borders
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
      focus: colors.primary[500],
    },

    // Text
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
      tertiary: '#71717a',
      muted: '#52525b',
      disabled: '#3f3f46',
      inverse: '#09090b',
    },

    // Overlays
    overlay: {
      subtle: 'rgba(0, 0, 0, 0.4)',
      medium: 'rgba(0, 0, 0, 0.6)',
      heavy: 'rgba(0, 0, 0, 0.8)',
    },
  },

  light: {
    bg: {
      base: '#ffffff',
      subtle: '#fafafa',
      muted: '#f4f4f5',
      surface: '#ffffff',
      elevated: '#ffffff',
      hover: '#f4f4f5',
    },

    border: {
      subtle: 'rgba(0, 0, 0, 0.04)',
      default: 'rgba(0, 0, 0, 0.08)',
      strong: 'rgba(0, 0, 0, 0.12)',
      focus: colors.primary[500],
    },

    text: {
      primary: '#18181b',
      secondary: '#52525b',
      tertiary: '#71717a',
      muted: '#a1a1aa',
      disabled: '#d4d4d8',
      inverse: '#fafafa',
    },

    overlay: {
      subtle: 'rgba(0, 0, 0, 0.2)',
      medium: 'rgba(0, 0, 0, 0.4)',
      heavy: 'rgba(0, 0, 0, 0.6)',
    },
  },
}

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(', '),

    mono: [
      '"JetBrains Mono"',
      '"Fira Code"',
      '"SF Mono"',
      'Monaco',
      '"Cascadia Code"',
      'Consolas',
      '"Liberation Mono"',
      '"Courier New"',
      'monospace',
    ].join(', '),

    display: [
      '"Cal Sans"',
      'Inter',
      '-apple-system',
      'sans-serif',
    ].join(', '),
  },

  // Font sizes with line heights
  fontSize: {
    '2xs': ['0.625rem', { lineHeight: '0.875rem' }],    // 10px
    xs: ['0.75rem', { lineHeight: '1rem' }],           // 12px
    sm: ['0.8125rem', { lineHeight: '1.25rem' }],      // 13px
    base: ['0.875rem', { lineHeight: '1.375rem' }],    // 14px
    md: ['0.9375rem', { lineHeight: '1.5rem' }],       // 15px
    lg: ['1rem', { lineHeight: '1.5rem' }],            // 16px
    xl: ['1.125rem', { lineHeight: '1.75rem' }],       // 18px
    '2xl': ['1.25rem', { lineHeight: '1.875rem' }],    // 20px
    '3xl': ['1.5rem', { lineHeight: '2rem' }],         // 24px
    '4xl': ['1.875rem', { lineHeight: '2.25rem' }],    // 30px
    '5xl': ['2.25rem', { lineHeight: '2.5rem' }],      // 36px
    '6xl': ['3rem', { lineHeight: '3rem' }],           // 48px
    '7xl': ['3.75rem', { lineHeight: '3.75rem' }],     // 60px
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
}

// =============================================================================
// SPACING TOKENS
// =============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
}

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',      // 8px
  lg: '0.625rem',    // 10px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
}

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export const shadows = {
  // Subtle elevation shadows
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Dark mode shadows
  dark: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  },

  // Glow effects for focus states
  glow: {
    primary: `0 0 0 3px ${colors.primary[500]}33`,
    secondary: `0 0 0 3px ${colors.secondary[500]}33`,
    success: `0 0 0 3px ${colors.success[500]}33`,
    error: `0 0 0 3px ${colors.error[500]}33`,
  },
}

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

export const animation = {
  // Durations
  duration: {
    instant: '50ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },

  // Easings - Custom cubic-bezier curves
  easing: {
    // Standard easings
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Expressive easings (for micro-interactions)
    bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    snappy: 'cubic-bezier(0.2, 0, 0, 1)',

    // Spring-like (for natural motion)
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    springOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideInUp: {
      from: { transform: 'translateY(10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideInDown: {
      from: { transform: 'translateY(-10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideInLeft: {
      from: { transform: 'translateX(-10px)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
    },
    slideInRight: {
      from: { transform: 'translateX(10px)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(-5%)' },
      '50%': { transform: 'translateY(0)' },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  },
}

// =============================================================================
// Z-INDEX TOKENS
// =============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
  spotlight: 1900,
  max: 2147483647,
}

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// =============================================================================
// COMPONENT-SPECIFIC TOKENS
// =============================================================================

export const components = {
  button: {
    height: {
      xs: '24px',
      sm: '28px',
      md: '32px',
      lg: '36px',
      xl: '40px',
    },
    padding: {
      xs: '0 8px',
      sm: '0 10px',
      md: '0 12px',
      lg: '0 16px',
      xl: '0 20px',
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '13px',
      lg: '14px',
      xl: '15px',
    },
  },

  input: {
    height: {
      sm: '28px',
      md: '32px',
      lg: '36px',
      xl: '40px',
    },
    fontSize: {
      sm: '12px',
      md: '13px',
      lg: '14px',
    },
  },

  avatar: {
    size: {
      '2xs': 16,
      xs: 20,
      sm: 24,
      md: 32,
      lg: 40,
      xl: 48,
      '2xl': 64,
      '3xl': 80,
    },
  },

  card: {
    padding: {
      sm: spacing[3],
      md: spacing[4],
      lg: spacing[5],
      xl: spacing[6],
    },
  },

  sidebar: {
    width: {
      collapsed: 56,
      expanded: 240,
      wide: 280,
    },
  },
}

// =============================================================================
// GRADIENTS
// =============================================================================

export const gradients = {
  // Primary gradients
  primary: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)`,
  primarySubtle: `linear-gradient(135deg, ${colors.primary[500]}15 0%, ${colors.primary[600]}10 100%)`,

  // Vibrant gradients
  vibrant: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.purple[500]} 50%, ${colors.pink[500]} 100%)`,
  rainbow: `linear-gradient(135deg, ${colors.error[500]} 0%, ${colors.warning[500]} 25%, ${colors.success[500]} 50%, ${colors.info[500]} 75%, ${colors.purple[500]} 100%)`,

  // Glass effects
  glass: {
    light: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    dark: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  },

  // Mesh gradients (for backgrounds)
  mesh: {
    primary: `radial-gradient(at 40% 20%, ${colors.primary[500]}20 0px, transparent 50%), radial-gradient(at 80% 0%, ${colors.secondary[500]}20 0px, transparent 50%), radial-gradient(at 0% 50%, ${colors.purple[500]}15 0px, transparent 50%)`,
    subtle: `radial-gradient(at 100% 0%, ${colors.primary[500]}08 0px, transparent 50%), radial-gradient(at 0% 100%, ${colors.secondary[500]}08 0px, transparent 50%)`,
  },

  // Shimmer for loading states
  shimmer: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
}

// =============================================================================
// BLUR TOKENS
// =============================================================================

export const blur = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
}

// Export all tokens as default
export default {
  gray,
  colors,
  semanticColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
  breakpoints,
  components,
  gradients,
  blur,
}
