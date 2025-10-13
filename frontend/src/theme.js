import { alpha, createTheme } from '@mui/material/styles'

const primaryMain = '#4F46E5'
const primaryDark = '#3730A3'
const primaryLight = '#6366F1'
const secondaryMain = '#0EA5E9'
const successMain = '#16A34A'
const warningMain = '#F59E0B'
const errorMain = '#DC2626'

const grey = {
  50: '#F7F8FB',
  100: '#EEF1F6',
  200: '#E0E5ED',
  300: '#CBD2E0',
  400: '#ABB3C5',
  500: '#8A92A6',
  600: '#6B7388',
  700: '#4D5469',
  800: '#343A4A',
  900: '#1F2433',
}

const borderColor = alpha(grey[300], 0.9)
const focusShadow = `0 0 0 3px ${alpha(primaryMain, 0.24)}`

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: primaryLight,
    },
    secondary: {
      main: secondaryMain,
    },
    success: {
      main: successMain,
    },
    warning: {
      main: warningMain,
    },
    error: {
      main: errorMain,
    },
    text: {
      primary: grey[900],
      secondary: grey[700],
      disabled: alpha(grey[500], 0.6),
    },
    divider: borderColor,
    background: {
      default: grey[50],
      paper: '#FFFFFF',
    },
    grey,
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.375rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.25,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    subtitle1: {
      fontSize: '0.95rem',
      fontWeight: 600,
      lineHeight: 1.45,
      color: grey[700],
    },
    subtitle2: {
      fontSize: '0.85rem',
      fontWeight: 600,
      lineHeight: 1.35,
      color: grey[600],
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
      color: grey[700],
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.55,
      color: grey[600],
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      letterSpacing: '0.02em',
      color: grey[500],
    },
    button: {
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: grey[500],
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
        },
        body: {
          backgroundColor: grey[50],
          color: grey[900],
          minWidth: 0,
          overflowWrap: 'anywhere',
        },
        '#root': {
          minHeight: '100vh',
          minWidth: 0,
          width: '100%',
        },
        'p, h1, h2, h3, h4, h5, h6, span, li, dd, dt': {
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        },
        'img, picture, video, canvas': {
          maxWidth: '100%',
          height: 'auto',
        },
        iframe: {
          maxWidth: '100%',
          display: 'block',
          border: 0,
        },
        pre: {
          maxWidth: '100%',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        },
        code: {
          maxWidth: '100%',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        },
      },
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'lg',
      },
      styleOverrides: {
        root: {
          paddingLeft: 20,
          paddingRight: 20,
          '@media (min-width:600px)': {
            paddingLeft: 24,
            paddingRight: 24,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'var(--mui-palette-background-default)',
          borderBottom: '1px solid var(--mui-palette-divider)',
          boxShadow: 'none',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
          paddingInline: 0,
          '@media (min-width:600px)': {
            minHeight: 72,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
        square: true,
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        outlined: {
          border: '1px solid var(--mui-palette-divider)',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        square: true,
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          padding: 0,
          '&:hover .MuiCardActionArea-focusHighlight': {
            opacity: 0.04,
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
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          paddingInline: 18,
          paddingBlock: 10,
          '&:focus-visible': {
            outline: 'none',
            boxShadow: focusShadow,
          },
        },
        sizeSmall: {
          paddingInline: 14,
          paddingBlock: 8,
        },
        sizeLarge: {
          paddingInline: 22,
          paddingBlock: 12,
        },
        contained: {
          boxShadow: '0 8px 16px rgba(79, 70, 229, 0.16)',
          '&:hover': {
            boxShadow: '0 10px 22px rgba(79, 70, 229, 0.18)',
          },
          '&:active': {
            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
          },
          '&.Mui-disabled': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1,
          },
          '&:focus-visible': {
            boxShadow: focusShadow,
          },
        },
        text: {
          paddingInline: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
        },
        sizeSmall: {
          height: 24,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          letterSpacing: '-0.005em',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(primaryMain, 0.6),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.4,
            borderColor: primaryMain,
          },
        },
        input: {
          paddingBlock: 10,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          letterSpacing: '-0.005em',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          overflow: 'hidden',
          height: 6,
          backgroundColor: alpha(primaryMain, 0.08),
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '-0.005em',
          minWidth: 'auto',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(primaryMain, 0.12),
            color: primaryMain,
            '&:hover': {
              backgroundColor: alpha(primaryMain, 0.16),
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: 'none',
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          maxWidth: 420,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          alignItems: 'flex-start',
          '& .MuiAlert-icon': {
            marginTop: 4,
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          paddingInline: 0,
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderTopWidth: 2,
          borderColor: alpha(grey[400], 0.6),
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontWeight: 600,
          letterSpacing: '-0.01em',
          '&.Mui-active': {
            color: primaryMain,
          },
          '&.Mui-completed': {
            color: grey[600],
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          '&:focus-visible': {
            outline: 'none',
            boxShadow: focusShadow,
            borderRadius: 6,
          },
        },
      },
    },
  },
})

export default theme
