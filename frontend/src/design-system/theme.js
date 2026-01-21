/**
 * Premium Theme Configuration
 * A sophisticated MUI theme inspired by Linear, Vercel, Stripe, and Notion
 */

import { createTheme, alpha } from '@mui/material/styles'
import {
  gray,
  colors,
  semanticColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
  gradients,
  blur,
  components as componentTokens,
} from './tokens'

// =============================================================================
// THEME FACTORY
// =============================================================================

export function createPremiumTheme(mode = 'dark') {
  const isDark = mode === 'dark'
  const semantic = isDark ? semanticColors.dark : semanticColors.light

  return createTheme({
    // Color palette
    palette: {
      mode,
      primary: {
        main: colors.primary[500],
        light: colors.primary[400],
        dark: colors.primary[600],
        contrastText: '#ffffff',
        50: colors.primary[50],
        100: colors.primary[100],
        200: colors.primary[200],
        300: colors.primary[300],
        400: colors.primary[400],
        500: colors.primary[500],
        600: colors.primary[600],
        700: colors.primary[700],
        800: colors.primary[800],
        900: colors.primary[900],
      },
      secondary: {
        main: colors.secondary[500],
        light: colors.secondary[400],
        dark: colors.secondary[600],
        contrastText: '#ffffff',
      },
      success: {
        main: colors.success[500],
        light: colors.success[400],
        dark: colors.success[600],
        contrastText: '#ffffff',
      },
      warning: {
        main: colors.warning[500],
        light: colors.warning[400],
        dark: colors.warning[600],
        contrastText: '#000000',
      },
      error: {
        main: colors.error[500],
        light: colors.error[400],
        dark: colors.error[600],
        contrastText: '#ffffff',
      },
      info: {
        main: colors.info[500],
        light: colors.info[400],
        dark: colors.info[600],
        contrastText: '#ffffff',
      },
      grey: gray,
      background: {
        default: semantic.bg.base,
        paper: semantic.bg.muted,
        subtle: semantic.bg.subtle,
        surface: semantic.bg.surface,
        elevated: semantic.bg.elevated,
      },
      text: {
        primary: semantic.text.primary,
        secondary: semantic.text.secondary,
        tertiary: semantic.text.tertiary,
        disabled: semantic.text.disabled,
      },
      divider: semantic.border.default,
      action: {
        active: semantic.text.secondary,
        hover: semantic.bg.hover,
        selected: isDark ? alpha(colors.primary[500], 0.16) : alpha(colors.primary[500], 0.08),
        disabled: semantic.text.disabled,
        disabledBackground: isDark ? gray[800] : gray[100],
        focus: alpha(colors.primary[500], 0.12),
      },
    },

    // Typography
    typography: {
      fontFamily: typography.fontFamily.sans,
      fontFamilyMono: typography.fontFamily.mono,

      h1: {
        fontFamily: typography.fontFamily.display,
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: typography.letterSpacing.tight,
      },
      h2: {
        fontFamily: typography.fontFamily.display,
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: typography.letterSpacing.tight,
      },
      h3: {
        fontFamily: typography.fontFamily.sans,
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: typography.letterSpacing.tight,
      },
      h4: {
        fontFamily: typography.fontFamily.sans,
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.35,
      },
      h5: {
        fontFamily: typography.fontFamily.sans,
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontFamily: typography.fontFamily.sans,
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: '0.9375rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
      },
      body1: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.8125rem',
        fontWeight: 400,
        lineHeight: 1.55,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.5,
        color: semantic.text.secondary,
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: semantic.text.tertiary,
      },
      button: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1,
        textTransform: 'none',
        letterSpacing: '0.01em',
      },
    },

    // Shape
    shape: {
      borderRadius: 8,
      borderRadiusSm: 6,
      borderRadiusLg: 12,
      borderRadiusXl: 16,
    },

    // Shadows
    shadows: [
      'none',
      isDark ? shadows.dark.xs : shadows.xs,
      isDark ? shadows.dark.sm : shadows.sm,
      isDark ? shadows.dark.sm : shadows.sm,
      isDark ? shadows.dark.md : shadows.md,
      isDark ? shadows.dark.md : shadows.md,
      isDark ? shadows.dark.md : shadows.md,
      isDark ? shadows.dark.lg : shadows.lg,
      isDark ? shadows.dark.lg : shadows.lg,
      isDark ? shadows.dark.lg : shadows.lg,
      isDark ? shadows.dark.xl : shadows.xl,
      isDark ? shadows.dark.xl : shadows.xl,
      isDark ? shadows.dark.xl : shadows.xl,
      isDark ? shadows.dark.xl : shadows.xl,
      isDark ? shadows.dark.xl : shadows.xl,
      isDark ? shadows.dark.xl : shadows.xl,
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
      isDark ? shadows.dark['2xl'] : shadows['2xl'],
    ],

    // Spacing (8px base)
    spacing: 8,

    // Z-index
    zIndex: {
      mobileStepper: zIndex.docked,
      fab: zIndex.docked + 40,
      speedDial: zIndex.docked + 50,
      appBar: zIndex.sticky,
      drawer: zIndex.modal - 100,
      modal: zIndex.modal,
      snackbar: zIndex.toast,
      tooltip: zIndex.tooltip,
    },

    // Transitions
    transitions: {
      easing: {
        easeInOut: animation.easing.inOut,
        easeOut: animation.easing.out,
        easeIn: animation.easing.in,
        sharp: animation.easing.snappy,
        spring: animation.easing.spring,
      },
      duration: {
        shortest: 100,
        shorter: 150,
        short: 200,
        standard: 250,
        complex: 350,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },

    // Breakpoints
    breakpoints: {
      values: {
        xs: 0,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        xxl: 1536,
      },
    },

    // Component overrides
    components: {
      // Global CSS baseline
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            scrollBehavior: 'smooth',
          },
          body: {
            backgroundColor: semantic.bg.base,
            color: semantic.text.primary,
            fontFamily: typography.fontFamily.sans,
            fontSize: '0.875rem',
            lineHeight: 1.6,
          },
          '::selection': {
            backgroundColor: alpha(colors.primary[500], 0.3),
            color: semantic.text.primary,
          },
          '::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '::-webkit-scrollbar-thumb': {
            background: isDark ? gray[700] : gray[300],
            borderRadius: '4px',
            '&:hover': {
              background: isDark ? gray[600] : gray[400],
            },
          },
          // Focus visible styles
          '*:focus-visible': {
            outline: `2px solid ${colors.primary[500]}`,
            outlineOffset: '2px',
          },
        },
      },

      // Button
      MuiButton: {
        defaultProps: {
          disableElevation: true,
          disableRipple: false,
        },
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            fontWeight: 500,
            fontSize: '0.8125rem',
            padding: '8px 16px',
            minHeight: 36,
            transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
            '&:focus-visible': {
              boxShadow: shadows.glow.primary,
            },
          },
          contained: {
            background: gradients.primary,
            boxShadow: 'none',
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[500]} 100%)`,
              boxShadow: `0 4px 12px ${alpha(colors.primary[500], 0.4)}`,
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${colors.secondary[500]} 0%, ${colors.secondary[600]} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.secondary[400]} 0%, ${colors.secondary[500]} 100%)`,
              boxShadow: `0 4px 12px ${alpha(colors.secondary[500], 0.4)}`,
            },
          },
          outlined: {
            borderColor: semantic.border.default,
            borderWidth: 1.5,
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: colors.primary[500],
              backgroundColor: alpha(colors.primary[500], 0.08),
              borderWidth: 1.5,
            },
          },
          text: {
            '&:hover': {
              backgroundColor: alpha(colors.primary[500], 0.08),
            },
          },
          sizeSmall: {
            padding: '6px 12px',
            minHeight: 28,
            fontSize: '0.75rem',
          },
          sizeLarge: {
            padding: '12px 24px',
            minHeight: 44,
            fontSize: '0.9375rem',
          },
          startIcon: {
            marginRight: 8,
            '& > *:nth-of-type(1)': {
              fontSize: 18,
            },
          },
          endIcon: {
            marginLeft: 8,
            '& > *:nth-of-type(1)': {
              fontSize: 18,
            },
          },
        },
      },

      // Icon Button
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            padding: 8,
            transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
            '&:hover': {
              backgroundColor: semantic.bg.hover,
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          },
          sizeSmall: {
            padding: 6,
          },
        },
      },

      // Paper
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: semantic.bg.surface,
            border: `1px solid ${semantic.border.subtle}`,
            borderRadius: borderRadius.xl,
            transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
          },
          elevation1: {
            boxShadow: isDark ? shadows.dark.sm : shadows.sm,
          },
          elevation2: {
            boxShadow: isDark ? shadows.dark.md : shadows.md,
          },
          elevation3: {
            boxShadow: isDark ? shadows.dark.lg : shadows.lg,
          },
        },
      },

      // Card
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: borderRadius.xl,
            border: `1px solid ${semantic.border.subtle}`,
            backgroundColor: semantic.bg.surface,
            backgroundImage: 'none',
            transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
            '&:hover': {
              borderColor: semantic.border.default,
              boxShadow: isDark ? shadows.dark.md : shadows.md,
            },
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            '&:last-child': {
              paddingBottom: 20,
            },
          },
        },
      },

      // Text Field / Input
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius.md,
              backgroundColor: semantic.bg.muted,
              transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
              '& fieldset': {
                borderColor: semantic.border.subtle,
                borderWidth: 1.5,
                transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
              },
              '&:hover fieldset': {
                borderColor: semantic.border.default,
              },
              '&.Mui-focused': {
                backgroundColor: semantic.bg.surface,
                '& fieldset': {
                  borderColor: colors.primary[500],
                  borderWidth: 2,
                },
              },
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
          input: {
            padding: '10px 14px',
            fontSize: '0.875rem',
          },
          notchedOutline: {
            borderColor: semantic.border.subtle,
          },
        },
      },

      // Chip
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            fontWeight: 500,
            fontSize: '0.75rem',
            height: 26,
            transition: `all ${animation.duration.fast} ${animation.easing.smooth}`,
          },
          filled: {
            backgroundColor: semantic.bg.elevated,
            '&:hover': {
              backgroundColor: semantic.bg.hover,
            },
          },
          outlined: {
            borderColor: semantic.border.default,
            '&:hover': {
              backgroundColor: alpha(colors.primary[500], 0.08),
            },
          },
          colorPrimary: {
            backgroundColor: alpha(colors.primary[500], 0.15),
            color: colors.primary[isDark ? 300 : 600],
            '&:hover': {
              backgroundColor: alpha(colors.primary[500], 0.25),
            },
          },
          colorSuccess: {
            backgroundColor: alpha(colors.success[500], 0.15),
            color: colors.success[isDark ? 300 : 600],
          },
          colorError: {
            backgroundColor: alpha(colors.error[500], 0.15),
            color: colors.error[isDark ? 300 : 600],
          },
          colorWarning: {
            backgroundColor: alpha(colors.warning[500], 0.15),
            color: colors.warning[isDark ? 300 : 700],
          },
          colorInfo: {
            backgroundColor: alpha(colors.info[500], 0.15),
            color: colors.info[isDark ? 300 : 600],
          },
          deleteIcon: {
            color: 'inherit',
            opacity: 0.7,
            '&:hover': {
              color: 'inherit',
              opacity: 1,
            },
          },
        },
      },

      // Tabs
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 44,
          },
          indicator: {
            height: 2,
            borderRadius: '2px 2px 0 0',
            background: gradients.primary,
          },
          flexContainer: {
            gap: 4,
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            minHeight: 44,
            padding: '10px 16px',
            borderRadius: `${borderRadius.md} ${borderRadius.md} 0 0`,
            color: semantic.text.secondary,
            transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
            '&:hover': {
              backgroundColor: semantic.bg.hover,
              color: semantic.text.primary,
            },
            '&.Mui-selected': {
              color: colors.primary[isDark ? 400 : 600],
              fontWeight: 600,
            },
          },
        },
      },

      // Dialog / Modal
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius['2xl'],
            backgroundImage: 'none',
            backgroundColor: semantic.bg.elevated,
            border: `1px solid ${semantic.border.subtle}`,
            boxShadow: isDark ? shadows.dark['2xl'] : shadows['2xl'],
          },
          backdrop: {
            backgroundColor: semantic.overlay.medium,
            backdropFilter: `blur(${blur.sm})`,
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.125rem',
            fontWeight: 600,
            padding: '20px 24px 12px',
          },
        },
      },

      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '12px 24px 20px',
          },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 24px 20px',
            gap: 8,
          },
        },
      },

      // Drawer
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: semantic.bg.surface,
            backgroundImage: 'none',
            borderRight: `1px solid ${semantic.border.subtle}`,
          },
        },
      },

      // Tooltip
      MuiTooltip: {
        defaultProps: {
          arrow: true,
          enterDelay: 400,
          leaveDelay: 0,
        },
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? gray[800] : gray[900],
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: borderRadius.md,
            boxShadow: shadows.lg,
          },
          arrow: {
            color: isDark ? gray[800] : gray[900],
          },
        },
      },

      // Menu
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: semantic.bg.elevated,
            border: `1px solid ${semantic.border.subtle}`,
            borderRadius: borderRadius.lg,
            boxShadow: isDark ? shadows.dark.xl : shadows.xl,
            minWidth: 180,
          },
          list: {
            padding: 6,
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            fontWeight: 400,
            padding: '8px 12px',
            borderRadius: borderRadius.md,
            margin: '2px 0',
            transition: `all ${animation.duration.fast} ${animation.easing.smooth}`,
            '&:hover': {
              backgroundColor: semantic.bg.hover,
            },
            '&.Mui-selected': {
              backgroundColor: alpha(colors.primary[500], 0.12),
              '&:hover': {
                backgroundColor: alpha(colors.primary[500], 0.16),
              },
            },
          },
        },
      },

      // Table
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.lg,
            border: `1px solid ${semantic.border.subtle}`,
            overflow: 'hidden',
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: semantic.bg.muted,
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: semantic.text.secondary,
              borderBottom: `1px solid ${semantic.border.default}`,
            },
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: `background-color ${animation.duration.fast} ${animation.easing.smooth}`,
            '&:hover': {
              backgroundColor: semantic.bg.hover,
            },
            '&:last-child td': {
              borderBottom: 0,
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${semantic.border.subtle}`,
            padding: '12px 16px',
            fontSize: '0.8125rem',
          },
        },
      },

      // Avatar
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            fontWeight: 500,
          },
        },
      },

      // Progress
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 6,
            borderRadius: 3,
            backgroundColor: semantic.bg.elevated,
          },
          bar: {
            borderRadius: 3,
            background: gradients.primary,
          },
        },
      },

      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: colors.primary[500],
          },
        },
      },

      // Accordion
      MuiAccordion: {
        defaultProps: {
          disableGutters: true,
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            borderBottom: `1px solid ${semantic.border.subtle}`,
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },

      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 48,
            padding: '0 16px',
            '&.Mui-expanded': {
              minHeight: 48,
            },
          },
          content: {
            margin: '12px 0',
            '&.Mui-expanded': {
              margin: '12px 0',
            },
          },
        },
      },

      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: '0 16px 16px',
          },
        },
      },

      // Alert
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.lg,
            padding: '12px 16px',
            alignItems: 'flex-start',
          },
          standardSuccess: {
            backgroundColor: alpha(colors.success[500], 0.12),
            border: `1px solid ${alpha(colors.success[500], 0.3)}`,
            color: semantic.text.primary,
            '& .MuiAlert-icon': {
              color: colors.success[isDark ? 400 : 600],
            },
          },
          standardError: {
            backgroundColor: alpha(colors.error[500], 0.12),
            border: `1px solid ${alpha(colors.error[500], 0.3)}`,
            color: semantic.text.primary,
            '& .MuiAlert-icon': {
              color: colors.error[isDark ? 400 : 600],
            },
          },
          standardWarning: {
            backgroundColor: alpha(colors.warning[500], 0.12),
            border: `1px solid ${alpha(colors.warning[500], 0.3)}`,
            color: semantic.text.primary,
            '& .MuiAlert-icon': {
              color: colors.warning[isDark ? 400 : 600],
            },
          },
          standardInfo: {
            backgroundColor: alpha(colors.info[500], 0.12),
            border: `1px solid ${alpha(colors.info[500], 0.3)}`,
            color: semantic.text.primary,
            '& .MuiAlert-icon': {
              color: colors.info[isDark ? 400 : 600],
            },
          },
          icon: {
            marginRight: 12,
            padding: 0,
            opacity: 1,
          },
        },
      },

      // Badge
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 600,
            fontSize: '0.6875rem',
            minWidth: 18,
            height: 18,
            padding: '0 5px',
          },
          colorPrimary: {
            background: gradients.primary,
          },
        },
      },

      // Skeleton
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: semantic.bg.elevated,
            '&::after': {
              background: `linear-gradient(90deg, transparent, ${alpha(semantic.text.disabled, 0.1)}, transparent)`,
            },
          },
        },
      },

      // List
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            margin: '2px 8px',
            padding: '8px 12px',
            transition: `all ${animation.duration.fast} ${animation.easing.smooth}`,
            '&:hover': {
              backgroundColor: semantic.bg.hover,
            },
            '&.Mui-selected': {
              backgroundColor: alpha(colors.primary[500], 0.12),
              '&:hover': {
                backgroundColor: alpha(colors.primary[500], 0.16),
              },
            },
          },
        },
      },

      // Switch
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 44,
            height: 24,
            padding: 0,
          },
          switchBase: {
            padding: 2,
            '&.Mui-checked': {
              transform: 'translateX(20px)',
              '& + .MuiSwitch-track': {
                backgroundColor: colors.primary[500],
                opacity: 1,
              },
              '& .MuiSwitch-thumb': {
                backgroundColor: '#fff',
              },
            },
          },
          thumb: {
            width: 20,
            height: 20,
            boxShadow: shadows.sm,
          },
          track: {
            borderRadius: 12,
            backgroundColor: isDark ? gray[700] : gray[300],
            opacity: 1,
          },
        },
      },

      // Checkbox
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: 8,
            borderRadius: borderRadius.sm,
            '&.Mui-checked': {
              color: colors.primary[500],
            },
          },
        },
      },

      // Radio
      MuiRadio: {
        styleOverrides: {
          root: {
            padding: 8,
            '&.Mui-checked': {
              color: colors.primary[500],
            },
          },
        },
      },

      // Divider
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: semantic.border.subtle,
          },
        },
      },

      // Autocomplete
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius.lg,
            border: `1px solid ${semantic.border.subtle}`,
            boxShadow: isDark ? shadows.dark.lg : shadows.lg,
          },
          listbox: {
            padding: 6,
          },
          option: {
            borderRadius: borderRadius.md,
            margin: '2px 0',
            '&[aria-selected="true"]': {
              backgroundColor: alpha(colors.primary[500], 0.12),
            },
            '&:hover': {
              backgroundColor: semantic.bg.hover,
            },
          },
        },
      },

      // Breadcrumbs
      MuiBreadcrumbs: {
        styleOverrides: {
          separator: {
            color: semantic.text.tertiary,
          },
          li: {
            '& .MuiLink-root': {
              color: semantic.text.secondary,
              '&:hover': {
                color: semantic.text.primary,
              },
            },
          },
        },
      },

      // Snackbar
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              backgroundColor: isDark ? gray[800] : gray[900],
              color: '#fff',
              borderRadius: borderRadius.lg,
              boxShadow: shadows['2xl'],
            },
          },
        },
      },

      // Popover
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius.lg,
            border: `1px solid ${semantic.border.subtle}`,
            boxShadow: isDark ? shadows.dark.xl : shadows.xl,
          },
        },
      },

      // Select
      MuiSelect: {
        styleOverrides: {
          select: {
            '&:focus': {
              backgroundColor: 'transparent',
            },
          },
        },
      },

      // Slider
      MuiSlider: {
        styleOverrides: {
          root: {
            height: 6,
          },
          track: {
            background: gradients.primary,
            border: 'none',
          },
          rail: {
            backgroundColor: semantic.bg.elevated,
          },
          thumb: {
            width: 16,
            height: 16,
            backgroundColor: '#fff',
            boxShadow: shadows.md,
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `${shadows.md}, ${shadows.glow.primary}`,
            },
          },
        },
      },

      // Stepper
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontSize: '0.8125rem',
            '&.Mui-active': {
              fontWeight: 600,
            },
            '&.Mui-completed': {
              fontWeight: 500,
            },
          },
        },
      },

      MuiStepIcon: {
        styleOverrides: {
          root: {
            '&.Mui-active': {
              color: colors.primary[500],
            },
            '&.Mui-completed': {
              color: colors.success[500],
            },
          },
        },
      },
    },
  })
}

// Pre-built themes
export const darkTheme = createPremiumTheme('dark')
export const lightTheme = createPremiumTheme('light')

export default darkTheme
