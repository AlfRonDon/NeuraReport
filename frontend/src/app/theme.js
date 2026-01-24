import { alpha, createTheme } from '@mui/material/styles'

// Neuract UI-inspired color palette (from Figma)
const palette = {
  // Brand colors
  brand: {
    primary: '#08C18F',    // Neuract green (from Figma Primary/300)
    secondary: '#1B2533',  // Dark text color
  },
  // Scale (grayscale for dark mode)
  scale: {
    100: '#EDEDED',
    200: '#DEDEDE',
    300: '#BBBBBB',
    400: '#999999',
    500: '#7E7E7E',
    600: '#656565',
    700: '#444444',
    800: '#2A2A2A',
    900: '#1F1F1F',
    1000: '#1A1A1A',
    1100: '#111111',
    1200: '#0A0A0A',
  },
  // Functional colors (Neuract UI palette from Figma)
  green: {
    100: '#D1F4E0',
    200: '#A3E9C1',
    300: '#08C18F',  // Primary brand green from Figma
    400: '#08C18F',  // Neuract green
    500: '#22C55E',  // Success green from Figma
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  blue: {
    100: '#D5E4FF',
    200: '#A5C4FC',
    300: '#6A9EFA',
    400: '#3B82F6',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
  },
  yellow: {
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  red: {
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  purple: {
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
}

// Typography (Lato font from Figma Neuract UI)
const fontFamilyUI = '"Lato", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const fontFamilyMono = '"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", Consolas, monospace'

// Create dark theme (Supabase default)
const darkTheme = {
  palette: {
    mode: 'dark',
    primary: {
      main: palette.green[400],
      light: palette.green[300],
      dark: palette.green[500],
      lighter: alpha(palette.green[400], 0.15),
      contrastText: '#000000',
    },
    secondary: {
      main: palette.blue[400],
      light: palette.blue[300],
      dark: palette.blue[500],
      lighter: alpha(palette.blue[400], 0.15),
      contrastText: '#FFFFFF',
    },
    success: {
      main: palette.green[400],
      light: palette.green[300],
      dark: palette.green[500],
      lighter: alpha(palette.green[400], 0.15),
      contrastText: '#000000',
    },
    warning: {
      main: palette.yellow[400],
      light: palette.yellow[300],
      dark: palette.yellow[500],
      lighter: alpha(palette.yellow[400], 0.15),
      contrastText: '#000000',
    },
    error: {
      main: palette.red[500],
      light: palette.red[400],
      dark: palette.red[600],
      lighter: alpha(palette.red[500], 0.15),
      contrastText: '#FFFFFF',
    },
    info: {
      main: palette.blue[400],
      light: palette.blue[300],
      dark: palette.blue[500],
      lighter: alpha(palette.blue[400], 0.15),
      contrastText: '#FFFFFF',
    },
    background: {
      default: palette.scale[1100],
      paper: palette.scale[1000],
      surface: palette.scale[900],
      overlay: palette.scale[800],
    },
    text: {
      primary: palette.scale[100],
      secondary: palette.scale[400],
      disabled: palette.scale[600],
    },
    divider: alpha(palette.scale[100], 0.08),
    action: {
      hover: alpha(palette.scale[100], 0.05),
      selected: alpha(palette.green[400], 0.12),
      disabled: alpha(palette.scale[100], 0.3),
      disabledBackground: alpha(palette.scale[100], 0.12),
      focus: alpha(palette.green[400], 0.2),
    },
    grey: palette.scale,
  },
}

// Create light theme (Neuract UI visual style from Figma - warm earthy palette)
const lightTheme = {
  palette: {
    mode: 'light',
    // Primary green - Neuract brand (from Figma Primary/300)
    primary: {
      main: '#08C18F',
      light: '#3DD9A8',
      dark: '#06A077',
      lighter: '#D1F4E0',
      contrastText: '#FFFFFF',
    },
    // Secondary is warm neutral - used for most buttons
    secondary: {
      main: '#697483',      // Gray Typography/400 from Figma
      light: '#8D8D86',
      dark: '#4B5563',
      lighter: '#F5F6F7',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#22C55E',      // Success/500 from Figma
      light: '#4ADE80',
      dark: '#16A34A',
      lighter: '#D1F4E0',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      lighter: '#FEF3C7',
      contrastText: '#000000',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
      lighter: '#FEE2E2',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      lighter: '#DBEAFE',
      contrastText: '#FFFFFF',
    },
    // Backgrounds - warm cream tones from Figma Neuract UI
    background: {
      default: '#F9F9F8',   // App background - warm off-white (grey/200 from Figma)
      paper: '#FFFFFF',     // Cards, panels, modals - pure white
      surface: '#FFF5EB',   // Warm cream surface
      overlay: '#F5EBE1',   // Warm beige overlay
    },
    // Text colors from Figma - Neutral and Gray Typography
    text: {
      primary: '#1B2533',   // Gray Typography/800 from Figma
      secondary: '#697483', // Gray Typography/400 from Figma
      disabled: '#8D8D86',  // grey/900 from Figma
    },
    divider: '#E5D4C3',     // Warm border color from Figma
    // Action states
    action: {
      hover: 'rgba(0, 0, 0, 0.02)',
      selected: 'rgba(8, 193, 143, 0.08)',  // Primary with transparency
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.06)',
      focus: 'rgba(8, 193, 143, 0.12)',
    },
    grey: palette.scale,
  },
}

// Create theme factory
function createAppTheme(mode = 'dark') {
  const themeOptions = mode === 'dark' ? darkTheme : lightTheme
  const isDark = mode === 'dark'

  return createTheme({
    ...themeOptions,
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
    typography: {
      fontFamily: fontFamilyUI,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      // Page titles: 18-20px, MEDIUM weight (not bold except for numbers)
      h1: {
        fontSize: '1.25rem',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '1.125rem',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
      },
      h3: {
        fontSize: '1rem',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
      },
      // Card titles: 14-16px, medium
      h4: {
        fontSize: '0.9375rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.2,
      },
      h5: {
        fontSize: '0.875rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.2,
      },
      h6: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.2,
      },
      subtitle1: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      subtitle2: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      // Body text: 13-14px, regular weight
      body1: {
        fontSize: '0.8125rem',  // 13px
        fontWeight: 400,
        lineHeight: 1.4,
      },
      body2: {
        fontSize: '0.75rem',  // 12px
        fontWeight: 400,
        lineHeight: 1.4,
      },
      // Meta/helper text: 12px, muted
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
      },
      button: {
        fontWeight: 500,
        letterSpacing: 0,
        textTransform: 'none',
      },
      code: {
        fontFamily: fontFamilyMono,
        fontSize: '0.8125rem',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode,
            '--font-ui': fontFamilyUI,
            '--font-mono': fontFamilyMono,
            '--border-color': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            '--surface-color': isDark ? palette.scale[900] : '#F5F5F5',
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          body: {
            margin: 0,
            padding: 0,
            // App background MUST differ from card surfaces
            backgroundColor: isDark ? palette.scale[1100] : '#F6F7F8',
            color: isDark ? palette.scale[100] : '#374151',
            fontFamily: fontFamilyUI,
            fontSize: '0.8125rem',  // 13px base
            lineHeight: 1.4,
          },
          '#root': {
            minHeight: '100vh',
          },
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          'code, pre': {
            fontFamily: fontFamilyMono,
          },
          '::selection': {
            backgroundColor: alpha(palette.green[400], 0.3),
            color: 'inherit',
          },
          '::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.15) : alpha(palette.scale[1100], 0.15),
            borderRadius: 4,
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.25) : alpha(palette.scale[1100], 0.25),
            },
          },
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          '@keyframes slideUp': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            borderRadius: 8,
            // Warm border in light mode (from Figma)
            border: isDark ? 'none' : '1px solid #E5D4C3',
          },
          outlined: {
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : '#D9C7B5'}`,
          },
          elevation1: {
            // Multi-layered soft shadow from Figma
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '3px 3px 8px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.05)',
          },
          elevation2: {
            boxShadow: isDark ? '0 6px 16px rgba(0,0,0,0.35)' : '-1px 1px 8px rgba(0,0,0,0.12), -1px 1px 24px rgba(0,0,0,0.12)',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            // Warm border with soft shadow from Figma
            border: isDark ? `1px solid ${alpha(palette.scale[100], 0.08)}` : '1px solid #D9C7B5',
            boxShadow: isDark ? 'none' : '1px 1px 4px rgba(64,55,47,0.12)',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 16,  // Consistent 16px padding
            '&:last-child': {
              paddingBottom: 16,
            },
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.8125rem',  // 13px
            padding: '8px 16px',
            minHeight: 36,
            transition: 'opacity 150ms ease, box-shadow 150ms ease',
            // Neutral focus state - NOT green
            '&:focus-visible': {
              outline: `2px solid ${isDark ? palette.scale[400] : '#374151'}`,
              outlineOffset: 2,
            },
          },
          // Primary - solid fill, Neuract green from Figma
          contained: {
            backgroundColor: '#08C18F',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#06A077',
              opacity: 1,
            },
            '&:active': {
              backgroundColor: '#058A68',
            },
            '&.Mui-disabled': {
              backgroundColor: isDark ? palette.scale[800] : '#E5E5E5',
              color: isDark ? palette.scale[600] : '#9CA3A8',
            },
          },
          // Secondary - flat/light grey, NO outlines, low contrast
          containedSecondary: {
            backgroundColor: isDark ? palette.scale[800] : '#F3F4F6',
            color: isDark ? palette.scale[100] : '#6B7280',
            border: 'none',
            '&:hover': {
              backgroundColor: isDark ? palette.scale[700] : '#E5E7EB',
              boxShadow: 'none',
            },
          },
          // Outlined - convert to flat style (no outlines per design)
          outlined: {
            borderColor: 'transparent',
            color: isDark ? palette.scale[100] : '#6B7280',
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : '#F3F4F6',
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : '#E5E7EB',
              borderColor: 'transparent',
            },
          },
          text: {
            color: isDark ? palette.scale[400] : '#9CA3A8',
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : 'rgba(0,0,0,0.03)',
              color: isDark ? palette.scale[200] : '#6B7280',
            },
          },
          sizeSmall: {
            padding: '6px 12px',
            fontSize: '0.8125rem',
            minHeight: 32,
          },
          sizeLarge: {
            padding: '10px 20px',
            fontSize: '0.875rem',
            minHeight: 40,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            // Muted grey icons by default
            color: isDark ? palette.scale[500] : '#9CA3AF',
            transition: 'all 150ms ease',
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.06) : 'rgba(0,0,0,0.03)',
              color: isDark ? palette.scale[200] : '#6B7280',
            },
            // Neutral focus state - NOT green
            '&:focus-visible': {
              outline: `2px solid ${isDark ? palette.scale[400] : '#374151'}`,
              outlineOffset: 2,
            },
          },
          sizeSmall: {
            padding: 6,
          },
          sizeMedium: {
            padding: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 50,  // Pill shape from Figma (rounded-[50px])
            fontWeight: 500,
            fontSize: '0.75rem',  // 12px from Figma
            height: 24,
          },
          filled: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : '#F5F6F7',  // Badge background from Figma
          },
          outlined: {
            borderColor: isDark ? alpha(palette.scale[100], 0.15) : '#E5D4C3',  // Warm border
          },
          // Status pills with soft pastel backgrounds
          colorSuccess: {
            backgroundColor: isDark ? alpha(palette.green[400], 0.15) : '#DCFCE7',
            color: isDark ? palette.green[400] : '#16A34A',
            borderColor: 'transparent',
          },
          colorError: {
            backgroundColor: isDark ? alpha(palette.red[500], 0.15) : '#FEE2E2',
            color: isDark ? palette.red[400] : '#DC2626',
            borderColor: 'transparent',
          },
          colorWarning: {
            backgroundColor: isDark ? alpha(palette.yellow[400], 0.15) : '#FEF3C7',
            color: isDark ? palette.yellow[400] : '#D97706',
            borderColor: 'transparent',
          },
          colorInfo: {
            backgroundColor: isDark ? alpha(palette.blue[400], 0.15) : '#DBEAFE',
            color: isDark ? palette.blue[400] : '#2563EB',
            borderColor: 'transparent',
          },
          sizeSmall: {
            height: 20,
            fontSize: '0.6875rem',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,  // Consistent 8px from Figma
            fontSize: '0.875rem',  // 14px from Figma
            backgroundColor: isDark ? palette.scale[900] : '#FFF5EB',  // Warm cream from Figma
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha(palette.scale[100], 0.12) : '#D9C7B5',  // Warm border from Figma
              transition: 'border-color 150ms ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha(palette.scale[100], 0.25) : '#C4B5A5',
            },
            // Focus state - primary green accent
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? palette.scale[300] : '#08C18F',
              borderWidth: 1,
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.red[500],
            },
          },
          input: {
            padding: '10px 12px',
            '&::placeholder': {
              color: isDark ? palette.scale[500] : '#8D8D86',  // grey/900 from Figma
              opacity: 1,
            },
          },
          inputSizeSmall: {
            padding: '8px 12px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',  // 13px
            fontWeight: 500,
            color: isDark ? palette.scale[400] : '#6B7280',
            // Focus state - neutral, NOT green
            '&.Mui-focused': {
              color: isDark ? palette.scale[200] : '#374151',
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginTop: 6,
            fontSize: '0.75rem',
            color: isDark ? palette.scale[500] : '#888888',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: isDark ? palette.scale[500] : '#888888',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            backgroundColor: isDark ? palette.scale[900] : '#FFFFFF',
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : '#D9C7B5'}`,  // Warm border from Figma
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.4)'
              : '-1px 1px 8px rgba(0,0,0,0.12), -1px 1px 24px rgba(0,0,0,0.12)',  // Multi-layer shadow from Figma
            marginTop: 4,
          },
          list: {
            padding: 4,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontSize: '0.875rem',
            padding: '8px 12px',
            margin: '2px 0',
            minHeight: 36,
            color: isDark ? palette.scale[300] : '#6B7280',
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : 'rgba(0,0,0,0.03)',
              color: isDark ? palette.scale[100] : '#3F3F3F',
            },
            // Subtle selected state - no brand green
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : 'rgba(0,0,0,0.04)',
              color: isDark ? palette.scale[100] : '#3F3F3F',
              '&:hover': {
                backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : 'rgba(0,0,0,0.05)',
              },
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '8px 12px',
            transition: 'all 150ms ease',
            // Muted by default
            color: isDark ? palette.scale[400] : '#9CA3A8',
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : 'rgba(0,0,0,0.02)',
              color: isDark ? palette.scale[200] : '#6B7280',
            },
            // Subtle active state - NO strong fills, no brand green background
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : 'rgba(0,0,0,0.04)',
              color: isDark ? palette.scale[100] : '#3F3F3F',
              '&:hover': {
                backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : 'rgba(0,0,0,0.05)',
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 36,
            // Muted icons by default
            color: isDark ? palette.scale[500] : '#9CA3A8',
            '.Mui-selected &': {
              color: isDark ? palette.scale[200] : '#6B7280',
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: '0.875rem',
            fontWeight: 400,  // Regular weight, not medium
            color: 'inherit',
          },
          secondary: {
            fontSize: '0.8125rem',
            color: isDark ? palette.scale[500] : '#9CA3A8',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? alpha(palette.scale[100], 0.08) : '#E5D4C3',  // Warm divider from Figma
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? palette.scale[800] : palette.scale[200],
            color: isDark ? palette.scale[300] : palette.scale[700],
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 600,
            fontSize: '0.65rem',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? palette.scale[800] : palette.scale[1000],
            color: isDark ? palette.scale[100] : palette.scale[100],
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
          arrow: {
            color: isDark ? palette.scale[800] : palette.scale[1000],
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : '#D9C7B5'}`,  // Warm border from Figma
            boxShadow: isDark
              ? '0 16px 48px rgba(0,0,0,0.4)'
              : '-1px 1px 8px rgba(0,0,0,0.12), -1px 1px 24px rgba(0,0,0,0.12)',  // Multi-layer shadow
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1rem',
            fontWeight: 500,  // Medium weight, not bold
            padding: '20px 24px 12px',
            color: isDark ? palette.scale[100] : '#374151',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '12px 24px',
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
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? palette.scale[1000] : '#FFF5EB',  // Warm cream from Figma
            // Warm border for sidebar
            borderRight: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : '#E5D4C3'}`,
            boxShadow: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? palette.scale[1000] : '#F5EBE1',  // Warm beige header from Figma
            borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : '#E5D4C3'}`,
            boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',  // Subtle shadow from Figma
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 56,
            '@media (min-width: 600px)': {
              minHeight: 56,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
          indicator: {
            height: 2,
            borderRadius: 1,
            // Neutral indicator - NOT green
            backgroundColor: isDark ? palette.scale[100] : '#374151',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 400,
            fontSize: '0.8125rem',  // 13px
            minHeight: 40,
            padding: '8px 16px',
            // Muted by default
            color: isDark ? palette.scale[500] : '#9CA3AF',
            '&.Mui-selected': {
              fontWeight: 500,
              color: isDark ? palette.scale[100] : '#374151',
            },
            '&:hover': {
              color: isDark ? palette.scale[300] : '#6B7280',
            },
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            // No boxed border around table
            border: 'none',
            borderRadius: 0,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? palette.scale[900] : '#F9F9F8',  // Warm grey from Figma
              fontWeight: 500,
              fontSize: '0.75rem',  // 12px for table headers
              color: isDark ? palette.scale[400] : '#697483',  // Gray Typography/400 from Figma
              textTransform: 'none',
              letterSpacing: 'normal',
              borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : '#E5D4C3'}`,  // Warm border
              height: 48,
              padding: '0 16px',
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root': {
              '&:hover': {
                backgroundColor: isDark ? alpha(palette.scale[100], 0.02) : 'rgba(0,0,0,0.015)',
              },
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            height: 48,  // 48px row height as per Figma
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',  // 14px from Figma
            color: isDark ? palette.scale[200] : '#1B2533',  // Gray Typography/800 from Figma
            padding: '0 16px',
            height: 48,
            // Warm horizontal separator from Figma
            borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.06) : '#F2E0CE'}`,
            borderLeft: 'none',
            borderRight: 'none',
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            borderTop: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : 'rgba(0,0,0,0.05)'}`,
          },
          selectLabel: {
            fontSize: '0.75rem',
            color: isDark ? palette.scale[500] : '#888888',
          },
          displayedRows: {
            fontSize: '0.75rem',
            color: isDark ? palette.scale[500] : palette.scale[500],
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: isDark ? palette.scale[600] : '#D9C7B5',  // Warm unchecked color
            // Neuract green for checked state
            '&.Mui-checked': {
              color: '#08C18F',  // Primary green from Figma
            },
            '&:hover': {
              backgroundColor: 'rgba(8, 193, 143, 0.04)',  // Primary with transparency
            },
          },
        },
      },
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
              color: '#FFFFFF',
              '& + .MuiSwitch-track': {
                backgroundColor: '#08C18F',  // Primary green from Figma
                opacity: 1,
              },
            },
          },
          thumb: {
            width: 20,
            height: 20,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          },
          track: {
            borderRadius: 12,
            backgroundColor: isDark ? palette.scale[700] : '#D9C7B5',  // Warm track color
            opacity: 1,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? palette.scale[800] : '#E5E7EB',
          },
          bar: {
            borderRadius: 2,
            // Neutral progress bar color
            backgroundColor: isDark ? palette.scale[400] : '#6B7280',
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            // Neutral spinner color
            color: isDark ? palette.scale[400] : '#6B7280',
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.06) : alpha(palette.scale[1100], 0.06),
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: '0.8125rem',
            alignItems: 'flex-start',
            padding: '12px 16px',
          },
          standardSuccess: {
            backgroundColor: alpha(palette.green[400], 0.1),
            color: palette.green[400],
            border: `1px solid ${alpha(palette.green[400], 0.2)}`,
          },
          standardError: {
            backgroundColor: alpha(palette.red[500], 0.1),
            color: palette.red[400],
            border: `1px solid ${alpha(palette.red[500], 0.2)}`,
          },
          standardWarning: {
            backgroundColor: alpha(palette.yellow[400], 0.1),
            color: palette.yellow[400],
            border: `1px solid ${alpha(palette.yellow[400], 0.2)}`,
          },
          standardInfo: {
            backgroundColor: alpha(palette.blue[400], 0.1),
            color: palette.blue[400],
            border: `1px solid ${alpha(palette.blue[400], 0.2)}`,
          },
          icon: {
            marginRight: 12,
            padding: 0,
            opacity: 1,
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiAlert-root': {
              boxShadow: isDark
                ? '0 4px 24px rgba(0,0,0,0.4)'
                : '0 4px 24px rgba(0,0,0,0.1)',
            },
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          separator: {
            color: isDark ? palette.scale[600] : palette.scale[400],
            marginLeft: 8,
            marginRight: 8,
          },
          li: {
            '& .MuiTypography-root': {
              fontSize: '0.8125rem',
            },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            // Neutral link color - NOT green
            color: isDark ? palette.scale[300] : '#374151',
            textDecorationColor: isDark ? alpha(palette.scale[300], 0.4) : 'rgba(55, 65, 81, 0.4)',
            '&:hover': {
              color: isDark ? palette.scale[100] : '#111827',
              textDecorationColor: isDark ? palette.scale[100] : '#111827',
            },
          },
        },
      },
    },
  })
}

// Export default light theme
const theme = createAppTheme('light')

export default theme
export { createAppTheme, palette, fontFamilyUI, fontFamilyMono }
