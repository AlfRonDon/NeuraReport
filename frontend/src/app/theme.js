import { alpha, createTheme } from '@mui/material/styles'

// Supabase-inspired color palette
const palette = {
  // Brand colors
  brand: {
    primary: '#3ECF8E',    // Supabase green
    secondary: '#1C1C1C',  // Dark background
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
  // Functional colors
  green: {
    100: '#D5F5E3',
    200: '#A7E9C3',
    300: '#6EDAA6',
    400: '#3ECF8E',
    500: '#30A46C',
    600: '#2B8A5D',
    700: '#1F6B48',
    800: '#0F4A31',
    900: '#0D3B28',
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

// Typography
const fontFamilyUI = '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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

// Create light theme
const lightTheme = {
  palette: {
    mode: 'light',
    primary: {
      main: palette.green[500],
      light: palette.green[400],
      dark: palette.green[600],
      lighter: alpha(palette.green[500], 0.1),
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: palette.blue[500],
      light: palette.blue[400],
      dark: palette.blue[600],
      lighter: alpha(palette.blue[500], 0.1),
      contrastText: '#FFFFFF',
    },
    success: {
      main: palette.green[500],
      light: palette.green[400],
      dark: palette.green[600],
      lighter: alpha(palette.green[500], 0.1),
      contrastText: '#FFFFFF',
    },
    warning: {
      main: palette.yellow[500],
      light: palette.yellow[400],
      dark: palette.yellow[600],
      lighter: alpha(palette.yellow[500], 0.1),
      contrastText: '#FFFFFF',
    },
    error: {
      main: palette.red[500],
      light: palette.red[400],
      dark: palette.red[600],
      lighter: alpha(palette.red[500], 0.1),
      contrastText: '#FFFFFF',
    },
    info: {
      main: palette.blue[500],
      light: palette.blue[400],
      dark: palette.blue[600],
      lighter: alpha(palette.blue[500], 0.1),
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
      surface: '#F5F5F5',
      overlay: '#F0F0F0',
    },
    text: {
      primary: palette.scale[1100],
      secondary: palette.scale[500],
      disabled: palette.scale[400],
    },
    divider: alpha(palette.scale[1100], 0.08),
    action: {
      hover: alpha(palette.scale[1100], 0.04),
      selected: alpha(palette.green[500], 0.08),
      disabled: alpha(palette.scale[1100], 0.26),
      disabledBackground: alpha(palette.scale[1100], 0.12),
      focus: alpha(palette.green[500], 0.12),
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
      borderRadius: 6,
    },
    spacing: 8,
    typography: {
      fontFamily: fontFamilyUI,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: {
        fontSize: '2.25rem',
        fontWeight: 600,
        letterSpacing: '-0.025em',
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '1.875rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.25,
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
        lineHeight: 1.3,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        lineHeight: 1.35,
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 500,
        letterSpacing: '-0.005em',
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.45,
      },
      subtitle1: {
        fontSize: '0.9375rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
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
        letterSpacing: '0.01em',
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 500,
        letterSpacing: '-0.005em',
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
            '--border-color': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            '--surface-color': isDark ? palette.scale[900] : '#F5F5F5',
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          body: {
            margin: 0,
            padding: 0,
            backgroundColor: isDark ? palette.scale[1100] : '#FAFAFA',
            color: isDark ? palette.scale[100] : palette.scale[1100],
            fontFamily: fontFamilyUI,
            fontSize: '0.875rem',
            lineHeight: 1.6,
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
          },
          outlined: {
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08)}`,
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
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
            fontSize: '0.8125rem',
            padding: '8px 14px',
            minHeight: 36,
            transition: 'all 150ms ease',
            '&:focus-visible': {
              outline: `2px solid ${palette.green[400]}`,
              outlineOffset: 2,
            },
          },
          contained: {
            backgroundColor: palette.green[400],
            color: '#000000',
            '&:hover': {
              backgroundColor: palette.green[300],
            },
            '&:active': {
              backgroundColor: palette.green[500],
            },
            '&.Mui-disabled': {
              backgroundColor: isDark ? palette.scale[800] : palette.scale[200],
              color: isDark ? palette.scale[600] : palette.scale[400],
            },
          },
          containedSecondary: {
            backgroundColor: isDark ? palette.scale[800] : palette.scale[200],
            color: isDark ? palette.scale[100] : palette.scale[1100],
            '&:hover': {
              backgroundColor: isDark ? palette.scale[700] : palette.scale[300],
            },
          },
          outlined: {
            borderColor: isDark ? alpha(palette.scale[100], 0.15) : alpha(palette.scale[1100], 0.15),
            color: isDark ? palette.scale[100] : palette.scale[1100],
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : alpha(palette.scale[1100], 0.05),
              borderColor: isDark ? alpha(palette.scale[100], 0.25) : alpha(palette.scale[1100], 0.25),
            },
          },
          text: {
            color: isDark ? palette.scale[300] : palette.scale[700],
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : alpha(palette.scale[1100], 0.05),
            },
          },
          sizeSmall: {
            padding: '6px 10px',
            fontSize: '0.75rem',
            minHeight: 30,
          },
          sizeLarge: {
            padding: '10px 18px',
            fontSize: '0.875rem',
            minHeight: 42,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            color: isDark ? palette.scale[400] : palette.scale[600],
            transition: 'all 150ms ease',
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08),
              color: isDark ? palette.scale[100] : palette.scale[1100],
            },
            '&:focus-visible': {
              outline: `2px solid ${palette.green[400]}`,
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
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.75rem',
            height: 24,
          },
          filled: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : alpha(palette.scale[1100], 0.08),
          },
          outlined: {
            borderColor: isDark ? alpha(palette.scale[100], 0.15) : alpha(palette.scale[1100], 0.15),
          },
          colorSuccess: {
            backgroundColor: alpha(palette.green[400], 0.15),
            color: palette.green[400],
            borderColor: alpha(palette.green[400], 0.3),
          },
          colorError: {
            backgroundColor: alpha(palette.red[500], 0.15),
            color: palette.red[400],
            borderColor: alpha(palette.red[500], 0.3),
          },
          colorWarning: {
            backgroundColor: alpha(palette.yellow[400], 0.15),
            color: palette.yellow[400],
            borderColor: alpha(palette.yellow[400], 0.3),
          },
          colorInfo: {
            backgroundColor: alpha(palette.blue[400], 0.15),
            color: palette.blue[400],
            borderColor: alpha(palette.blue[400], 0.3),
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
            borderRadius: 6,
            fontSize: '0.875rem',
            backgroundColor: isDark ? palette.scale[900] : '#FFFFFF',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha(palette.scale[100], 0.12) : alpha(palette.scale[1100], 0.12),
              transition: 'border-color 150ms ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha(palette.scale[100], 0.25) : alpha(palette.scale[1100], 0.25),
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.green[400],
              borderWidth: 1,
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.red[500],
            },
          },
          input: {
            padding: '10px 12px',
            '&::placeholder': {
              color: isDark ? palette.scale[500] : palette.scale[400],
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
            fontSize: '0.875rem',
            fontWeight: 500,
            color: isDark ? palette.scale[400] : palette.scale[600],
            '&.Mui-focused': {
              color: palette.green[400],
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginTop: 6,
            fontSize: '0.75rem',
            color: isDark ? palette.scale[500] : palette.scale[500],
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: isDark ? palette.scale[500] : palette.scale[500],
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            backgroundColor: isDark ? palette.scale[900] : '#FFFFFF',
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : alpha(palette.scale[1100], 0.1)}`,
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.4)'
              : '0 4px 24px rgba(0,0,0,0.1)',
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
            fontSize: '0.8125rem',
            padding: '8px 12px',
            margin: '2px 0',
            minHeight: 36,
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : alpha(palette.scale[1100], 0.05),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(palette.green[400], 0.1),
              '&:hover': {
                backgroundColor: alpha(palette.green[400], 0.15),
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
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : alpha(palette.scale[1100], 0.05),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(palette.green[400], 0.1),
              '&:hover': {
                backgroundColor: alpha(palette.green[400], 0.15),
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 36,
            color: isDark ? palette.scale[500] : palette.scale[500],
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: '0.8125rem',
            fontWeight: 500,
          },
          secondary: {
            fontSize: '0.75rem',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08),
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
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : alpha(palette.scale[1100], 0.08)}`,
            boxShadow: isDark
              ? '0 16px 48px rgba(0,0,0,0.4)'
              : '0 16px 48px rgba(0,0,0,0.1)',
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
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            borderRight: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08)}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08)}`,
            boxShadow: 'none',
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
            backgroundColor: palette.green[400],
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            minHeight: 40,
            padding: '8px 16px',
            color: isDark ? palette.scale[400] : palette.scale[600],
            '&.Mui-selected': {
              color: isDark ? palette.scale[100] : palette.scale[1100],
            },
            '&:hover': {
              color: isDark ? palette.scale[200] : palette.scale[800],
            },
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? palette.scale[900] : '#FAFAFA',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: isDark ? palette.scale[400] : palette.scale[600],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08)}`,
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root': {
              '&:hover': {
                backgroundColor: isDark ? alpha(palette.scale[100], 0.02) : alpha(palette.scale[1100], 0.02),
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            padding: '12px 16px',
            borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.06) : alpha(palette.scale[1100], 0.06)}`,
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            borderTop: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : alpha(palette.scale[1100], 0.08)}`,
          },
          selectLabel: {
            fontSize: '0.75rem',
            color: isDark ? palette.scale[500] : palette.scale[500],
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
            color: isDark ? palette.scale[600] : palette.scale[400],
            '&.Mui-checked': {
              color: palette.green[400],
            },
            '&:hover': {
              backgroundColor: alpha(palette.green[400], 0.08),
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
                backgroundColor: palette.green[400],
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
            backgroundColor: isDark ? palette.scale[700] : palette.scale[300],
            opacity: 1,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? palette.scale[800] : palette.scale[200],
          },
          bar: {
            borderRadius: 2,
            backgroundColor: palette.green[400],
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: palette.green[400],
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
            color: palette.green[400],
            textDecorationColor: alpha(palette.green[400], 0.4),
            '&:hover': {
              textDecorationColor: palette.green[400],
            },
          },
        },
      },
    },
  })
}

// Export default dark theme (Supabase style)
const theme = createAppTheme('dark')

export default theme
export { createAppTheme, palette, fontFamilyUI, fontFamilyMono }
