import { alpha, createTheme } from '@mui/material/styles'

// ============================================================================
// FIGMA NEURACT DEMO - EXACT DESIGN TOKENS
// Extracted from Figma file: 1Hp9IvJjDcsI4MXJdbOqyo
// ============================================================================

// Neuract UI color palette (from Figma design variables)
const palette = {
  // Brand colors - neutral dark grey
  brand: {
    primary: '#21201C',    // Neutral dark grey from Figma Grey/1200
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

// ============================================================================
// FIGMA TYPOGRAPHY - Font Families (EXACT from Figma)
// ============================================================================
// Tomorrow - Headings and page titles
const fontFamilyHeading = '"Tomorrow", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif'
// Inter - Navigation items, labels, small text, UI elements
const fontFamilyUI = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
// Lato - Body text, tabs, paragraphs, inputs
const fontFamilyBody = '"Lato", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif'
// Monospace for code
const fontFamilyMono = '"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", Consolas, monospace'

// ============================================================================
// FIGMA COLOR TOKENS - Grey Scale (EXACT from Figma design variables)
// ============================================================================
const figmaGrey = {
  white: '#FFFFFF',   // Grey/white
  200: '#F9F9F8',     // Grey/200 - Main content background, sidebar
  300: '#F1F0EF',     // Grey/300 - Input backgrounds, cards
  400: '#E9E8E6',     // Grey/400 - Hover states, active items
  500: '#E2E1DE',     // Grey/500 - Borders, dividers
  600: '#DAD9D6',     // Grey/600 - Borders
  700: '#CFCECA',     // Grey/700 - Borders, strokes
  800: '#BCBBB5',     // Grey/800 - Dividers, taskbar borders
  900: '#8D8D86',     // Grey/900(main) - Secondary text, icons
  1000: '#82827C',    // Grey/1000 - Tertiary text
  1100: '#63635E',    // Grey/1100 - Primary text, labels
  1200: '#21201C',    // Grey/1200 - Headings, titles
}

// Figma Neutral Scale (EXACT values from design variables)
const figmaNeutral = {
  50: '#F9FAFB',      // Neutral/50
  100: '#F3F4F6',     // Neutral/100
  200: '#E5E7EB',     // Neutral/200 - Tab borders
  300: '#D1D5DB',     // Neutral/300
  400: '#9CA3AF',     // Neutral/400 - Placeholder text
  500: '#6B7280',     // Neutral/500 - Secondary labels
  600: '#4B5563',     // Neutral/600
  700: '#374151',     // Neutral/700 - Inactive tab text
  800: '#1F2937',     // Neutral/800
}

// ============================================================================
// FIGMA ACCENT COLORS (EXACT from Figma design - tabs, status indicators)
// ============================================================================
const figmaAccent = {
  primaryGreen: '#007E60',      // Active tab border
  greenBackground: '#EBFEF6',   // Active tab background
  greenText: '#02634E',         // Active tab text
  darkText: '#374151',          // Inactive tab text
}

// ============================================================================
// FIGMA STATUS COLORS (for device status indicators)
// ============================================================================
const figmaStatus = {
  reachable: '#22C55E',         // Green - device online/reachable
  unreachable: '#EF4444',       // Red - device offline/unreachable
  running: '#8D8D86',           // Grey - AI agent running status
}

// ============================================================================
// FIGMA GRADIENTS (for AI assistant and notification panels)
// ============================================================================
const figmaGradients = {
  aiAssistant: 'linear-gradient(180deg, #F9F9F8 0%, #88A6FF 258.88%)',
  notification: 'linear-gradient(180deg, #F1F0EF 0%, #A1D3FF 258.88%)',
}

// ============================================================================
// FIGMA SHADOWS (EXACT from Drop shadow/XSmall)
// ============================================================================
const figmaShadow = {
  xsmall: '0 1px 2px rgba(16, 24, 40, 0.04)',  // #1018280A
  aiPanel: '0px 4px 8.4px rgba(0,0,0,0.25)',   // AI assistant panel shadow
}

// ============================================================================
// FIGMA SPACING & DIMENSIONS (EXACT from Figma component specs)
// ============================================================================
const figmaSpacing = {
  sidebarWidth: 250,           // Left sidebar width
  detailsPanelWidth: 400,      // Right device details panel
  taskbarHeight: 48,           // Bottom taskbar height
  contentPadding: 20,          // Content area padding
  cardBorderRadius: 8,         // Card border radius
  buttonBorderRadius: 8,       // Button border radius
  pillBorderRadius: 24,        // Pill/chip border radius
  circleBorderRadius: 100,     // Circle/avatar border radius
}

// ============================================================================
// FIGMA COMPONENT SPECS (EXACT dimensions from Figma)
// ============================================================================
const figmaComponents = {
  // Tabs
  tabs: {
    height: 40,
    borderBottom: `1px solid ${figmaNeutral[200]}`,
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  // Search Input
  searchInput: {
    width: 240,
    height: 40,
    iconSize: 20,
  },
  // Filter Button
  filterButton: {
    height: 40,
    gap: 8,
  },
  // View Toggle (Map/Table)
  viewToggle: {
    borderRadius: 8,
  },
  // Zoom Controls
  zoomControls: {
    height: 40,
    borderRadius: 35,
    iconSize: 24,
    gap: 12,
  },
  // Data Table
  dataTable: {
    headerHeight: 60,
    rowHeight: 60,
    cellPadding: 16,
  },
  // Device Details Panel
  deviceDetailsPanel: {
    width: 400,
    sectionHeaderHeight: 40,
    rowHeight: 40,
    padding: 20,
  },
  // AI Assistant Panel
  aiAssistantPanel: {
    width: 394,
    minHeight: 114,
    borderRadius: '4px 4px 0 0',
    inputHeight: 48,
    padding: 16,
  },
  // Notification Card
  notificationCard: {
    width: 394,
    borderRadius: '4px 4px 0 0',
    padding: 16,
  },
  // User Avatar
  userAvatar: {
    size: 28,
    borderRadius: 32,
  },
  // Status Indicator
  statusIndicator: {
    dotSize: 8,
    gap: 6,
  },
  // Scrollbar
  scrollbar: {
    width: 20.156,
    borderRadius: 4,
  },
}

// Create dark theme (Supabase default)
const darkTheme = {
  palette: {
    mode: 'dark',
    // Primary - neutral light grey for dark mode (no colors per Figma)
    primary: {
      main: palette.scale[200],       // Light grey for dark mode
      light: palette.scale[100],
      dark: palette.scale[300],
      lighter: alpha(palette.scale[200], 0.15),
      contrastText: '#000000',
    },
    // Secondary is neutral grey (per Figma - no blue in design)
    secondary: {
      main: palette.scale[400],     // Grey - matches light theme
      light: palette.scale[300],
      dark: palette.scale[500],
      lighter: alpha(palette.scale[400], 0.1),
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
    // Info uses neutral grey (per Figma - no blue in design)
    info: {
      main: palette.scale[400],     // Grey - matches light theme
      light: palette.scale[300],
      dark: palette.scale[500],
      lighter: alpha(palette.scale[400], 0.1),
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
    // Action states - neutral, no green tint
    action: {
      hover: alpha(palette.scale[100], 0.05),
      selected: alpha(palette.scale[100], 0.08),
      disabled: alpha(palette.scale[100], 0.3),
      disabledBackground: alpha(palette.scale[100], 0.12),
      focus: alpha(palette.scale[100], 0.12),
    },
    grey: palette.scale,
  },
}

// Create light theme (EXACT match to Figma Neuract UI)
const lightTheme = {
  palette: {
    mode: 'light',
    // Primary - neutral dark grey (no colors per Figma)
    primary: {
      main: figmaGrey[1200],        // #21201C - Primary dark
      light: figmaGrey[1100],       // #63635E
      dark: '#000000',              // Pure black for hover
      lighter: figmaGrey[300],      // #F1F0EF
      contrastText: '#FFFFFF',
    },
    // Secondary is neutral grey - for most UI elements
    secondary: {
      main: figmaGrey[1100],     // #63635E
      light: figmaGrey[900],     // #8D8D86
      dark: figmaGrey[1200],     // #21201C
      lighter: figmaGrey[300],   // #F1F0EF
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#22C55E',
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
    // Info uses neutral grey (per Figma - no blue in design)
    info: {
      main: figmaGrey[900],       // #8D8D86 - Grey/900
      light: figmaGrey[800],      // #BCBBB5 - Grey/800
      dark: figmaGrey[1000],      // #82827C - Grey/1000
      lighter: figmaGrey[300],    // #F1F0EF - Grey/300
      contrastText: figmaGrey[1200],  // #21201C
    },
    // Backgrounds from Figma variables - distinct layers
    background: {
      default: figmaGrey[200],   // #F9F9F8 - Main content area (Grey/200)
      paper: figmaGrey.white,    // #FFFFFF - Cards, panels
      surface: figmaGrey.white,  // #FFFFFF
      overlay: figmaGrey[300],   // #F1F0EF - Overlay/input backgrounds
      sidebar: figmaGrey.white,  // #FFFFFF - White sidebar (no cream)
    },
    // Text colors from Figma variables
    text: {
      primary: figmaGrey[1200],    // #21201C - Primary text (Grey/1200)
      secondary: figmaGrey[1100],  // #63635E - Secondary text (Grey/1100)
      disabled: figmaGrey[800],    // #BCBBB5 - Disabled/muted (Grey/800)
    },
    divider: figmaGrey[500],       // #E2E1DE - Divider (Grey/500)
    // Action states - neutral, no green tint
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.06)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.06)',
      focus: 'rgba(0, 0, 0, 0.08)',
    },
    grey: palette.scale,
    // Expose Figma grey scale
    figmaGrey: figmaGrey,
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
      // Default font family - Lato for body text
      fontFamily: fontFamilyBody,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      // ============================================================================
      // FIGMA TYPOGRAPHY STYLES (EXACT from Figma design specs)
      // ============================================================================
      // Page Title - Tomorrow Medium 24px (e.g., "Plugged Devices" heading)
      h1: {
        fontFamily: fontFamilyHeading,
        fontSize: '24px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 'normal',
      },
      // Section Title - Tomorrow Medium 20px (e.g., "Settings" sidebar header)
      h2: {
        fontFamily: fontFamilyHeading,
        fontSize: '20px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 'normal',
      },
      // Subsection - Tomorrow Medium 18px
      h3: {
        fontFamily: fontFamilyHeading,
        fontSize: '18px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 'normal',
      },
      // Navigation Item - Inter Medium 16px
      h4: {
        fontFamily: fontFamilyUI,
        fontSize: '16px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 'normal',
      },
      // Label/Medium - Lato Medium 14px, 16px line-height
      h5: {
        fontFamily: fontFamilyBody,
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: '16px',
      },
      // Small Text - Inter Medium 12px
      h6: {
        fontFamily: fontFamilyUI,
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 'normal',
      },
      // Label/Medium/Semi Bold - Lato 14px, 600, 16px line-height
      subtitle1: {
        fontFamily: fontFamilyBody,
        fontSize: '14px',
        fontWeight: 600,
        lineHeight: '16px',
        letterSpacing: 0,
      },
      // Label/Small/Regular - Lato 12px, 400, 14px line-height
      subtitle2: {
        fontFamily: fontFamilyBody,
        fontSize: '12px',
        fontWeight: 400,
        lineHeight: '14px',
        letterSpacing: 0,
      },
      // Paragraph/Small/Regular - Lato 14px, 400, 20px line-height
      body1: {
        fontFamily: fontFamilyBody,
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: '20px',
        letterSpacing: 0,
      },
      // 16/para-Reg - Lato 16px, 400, 1.4 line-height, 0.64px letter-spacing
      body2: {
        fontFamily: fontFamilyBody,
        fontSize: '16px',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: '0.64px',
      },
      // Tiny Text - Inter Medium 10px
      caption: {
        fontFamily: fontFamilyUI,
        fontSize: '10px',
        fontWeight: 500,
        lineHeight: 'normal',
        letterSpacing: 0,
      },
      // Overline - Inter Medium 11px uppercase
      overline: {
        fontFamily: fontFamilyUI,
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        lineHeight: '16px',
      },
      // Button - Lato Medium 14px, 16px line-height
      button: {
        fontFamily: fontFamilyBody,
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: '16px',
        textTransform: 'none',
      },
      // Code - Monospace
      code: {
        fontFamily: fontFamilyMono,
        fontSize: '13px',
      },
      // Custom: Navigation Item style (can be applied via sx or variant)
      navigationItem: {
        fontFamily: fontFamilyUI,
        fontSize: '16px',
        fontWeight: 500,
        lineHeight: 'normal',
      },
      // Custom: Small Text style
      smallText: {
        fontFamily: fontFamilyUI,
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: 'normal',
      },
      // Custom: Tiny Text style
      tinyText: {
        fontFamily: fontFamilyUI,
        fontSize: '10px',
        fontWeight: 500,
        lineHeight: 'normal',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode,
            '--font-ui': fontFamilyUI,
            '--font-mono': fontFamilyMono,
            '--border-color': isDark ? 'rgba(255,255,255,0.08)' : figmaGrey[500],  // #E2E1DE
            '--surface-color': isDark ? palette.scale[900] : '#FFFFFF',
            '--sidebar-color': isDark ? palette.scale[1000] : '#FFFFFF',  // White sidebar
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          body: {
            margin: 0,
            padding: 0,
            // Light grey background from Figma Grey/200
            backgroundColor: isDark ? palette.scale[1100] : figmaGrey[200],  // #F9F9F8
            color: isDark ? palette.scale[100] : '#1F2937',
            fontFamily: fontFamilyUI,
            fontSize: '0.875rem',  // 14px base (from Figma)
            lineHeight: 1.5,
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
          elevation: 1,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            borderRadius: 8,  // Consistent 8px radius
            // SHADOW-ONLY - NO BORDERS (per design requirement)
            border: 'none',
          },
          outlined: {
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : '#E5E7EB'}`,
            boxShadow: 'none',
          },
          elevation0: {
            boxShadow: 'none',
          },
          elevation1: {
            // EXACT from Figma Drop shadow/XSmall: #1018280A, offset (0,1), radius 2
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 2px rgba(16, 24, 40, 0.04)',
          },
          elevation2: {
            // Double XSmall shadow for medium elevation
            boxShadow: isDark ? '0 6px 16px rgba(0,0,0,0.35)' : '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 8px rgba(16, 24, 40, 0.04)',
          },
          elevation3: {
            // Triple XSmall shadow for high elevation
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 8px rgba(16, 24, 40, 0.06), 0 8px 16px rgba(16, 24, 40, 0.04)',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 1,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,  // Consistent 8px radius for ALL cards
            backgroundColor: isDark ? palette.scale[1000] : figmaGrey.white,
            // SHADOW-ONLY - EXACT from Figma Drop shadow/XSmall
            border: 'none',
            boxShadow: isDark ? 'none' : figmaShadow.xsmall,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            // Increased padding for more whitespace (per design requirement)
            padding: 24,
            '&:last-child': {
              paddingBottom: 24,
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
            borderRadius: 8,  // 8px radius from Figma
            fontWeight: 500,
            fontSize: '0.875rem',  // 14px from Figma
            lineHeight: 1.143,     // 16px line-height from Figma
            padding: '8px 12px',   // Match Figma 40px height buttons
            minHeight: 40,
            transition: 'all 150ms ease',
            // Neutral focus state
            '&:focus-visible': {
              outline: `2px solid ${isDark ? palette.scale[400] : figmaGrey[1200]}`,
              outlineOffset: 2,
            },
          },
          // Primary contained - neutral dark grey (no colors per Figma)
          contained: {
            backgroundColor: isDark ? palette.scale[300] : figmaGrey[1200],  // Dark grey
            color: isDark ? palette.scale[1100] : '#FFFFFF',
            '&:hover': {
              backgroundColor: isDark ? palette.scale[200] : figmaGrey[1100],
            },
            '&:active': {
              backgroundColor: isDark ? palette.scale[100] : figmaGrey[1000],
            },
            '&.Mui-disabled': {
              backgroundColor: isDark ? palette.scale[800] : figmaGrey[400],
              color: isDark ? palette.scale[600] : figmaGrey[800],
            },
          },
          // Secondary - FLAT/LIGHT from Figma (Grey/300 bg, Grey/500 border)
          containedSecondary: {
            backgroundColor: isDark ? palette.scale[800] : figmaGrey[300],
            color: isDark ? palette.scale[100] : figmaGrey[1100],
            border: `1px solid ${isDark ? palette.scale[700] : figmaGrey[500]}`,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: isDark ? palette.scale[700] : figmaGrey[400],
              boxShadow: 'none',
            },
          },
          // Outlined - flat style with border from Figma
          outlined: {
            borderColor: isDark ? palette.scale[700] : figmaGrey[500],
            color: isDark ? palette.scale[100] : figmaGrey[1100],
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[300],
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : figmaGrey[400],
              borderColor: isDark ? palette.scale[600] : figmaGrey[600],
            },
          },
          // Text button - muted
          text: {
            color: isDark ? palette.scale[400] : figmaGrey[1100],
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : 'rgba(0,0,0,0.04)',
              color: isDark ? palette.scale[200] : figmaGrey[1200],
            },
          },
          sizeSmall: {
            padding: '6px 8px',
            fontSize: '0.75rem',   // 12px
            minHeight: 32,
          },
          sizeLarge: {
            padding: '12px 16px',
            fontSize: '1rem',      // 16px
            minHeight: 44,
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
      // ============================================================================
      // FIGMA CHIP/PILL (EXACT from Figma spacing specs)
      // Pill border-radius: 24px, Circle: 100px
      // ============================================================================
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: figmaSpacing.pillBorderRadius,  // 24px pill shape from Figma
            fontFamily: fontFamilyBody,
            fontWeight: 500,
            fontSize: '12px',
            height: 24,
          },
          filled: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[300],
          },
          outlined: {
            borderColor: isDark ? alpha(palette.scale[100], 0.15) : figmaGrey[500],
          },
          // Status chips - using Figma status colors
          colorSuccess: {
            backgroundColor: isDark ? alpha(palette.green[400], 0.15) : figmaAccent.greenBackground,
            color: isDark ? palette.green[400] : figmaAccent.greenText,
            borderColor: 'transparent',
          },
          colorError: {
            backgroundColor: isDark ? alpha(palette.red[500], 0.15) : '#FEE2E2',
            color: isDark ? palette.red[400] : figmaStatus.unreachable,
            borderColor: 'transparent',
          },
          colorWarning: {
            backgroundColor: isDark ? alpha(palette.yellow[400], 0.15) : '#FEF3C7',
            color: isDark ? palette.yellow[400] : '#D97706',
            borderColor: 'transparent',
          },
          colorInfo: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[300],
            color: isDark ? palette.scale[300] : figmaGrey[1100],
            borderColor: 'transparent',
          },
          sizeSmall: {
            height: 20,
            fontSize: '11px',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
        },
      },
      // ============================================================================
      // FIGMA SEARCH INPUT (EXACT from Figma searchInput specs)
      // Width: 240px, Height: 40px, Background: #F1F0EF
      // Border: 1px solid #E2E1DE, Border-radius: 8px
      // Padding: 12px horizontal, 8px vertical, Icon: 20px
      // ============================================================================
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,  // 8px from Figma
            fontFamily: fontFamilyBody,  // Lato
            fontSize: '14px',
            // Grey background from Figma Grey/300
            backgroundColor: isDark ? palette.scale[900] : figmaGrey[300],  // #F1F0EF
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha(palette.scale[100], 0.12) : figmaGrey[500],  // #E2E1DE
              borderWidth: 1,
              transition: 'border-color 150ms ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha(palette.scale[100], 0.25) : figmaGrey[600],
            },
            // Focus state - subtle darkening per Figma
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? palette.scale[300] : figmaGrey[900],  // #8D8D86
              borderWidth: 1,
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: figmaStatus.unreachable,
            },
          },
          input: {
            padding: '8px 12px',  // EXACT from Figma: 12px horizontal, 8px vertical
            height: '24px',  // Results in 40px total height
            '&::placeholder': {
              fontFamily: fontFamilyBody,  // Lato
              color: isDark ? palette.scale[500] : figmaNeutral[400],  // #9CA3AF
              opacity: 1,
            },
          },
          inputSizeSmall: {
            padding: '6px 12px',
            height: '20px',
          },
          // Search input adornment (icon)
          adornedStart: {
            paddingLeft: 12,
            '& .MuiInputAdornment-root': {
              marginRight: 8,
            },
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
            backgroundColor: isDark ? palette.scale[900] : figmaGrey.white,
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[600]}`,
            // EXACT from Figma - subtle shadow
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.4)'
              : '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.08)',
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
      // ============================================================================
      // FIGMA NAVIGATION ITEMS (EXACT from Figma sidebar navigation specs)
      // Height: 40px, Gap: 8px (icon to text), Icon: 20x20px
      // Active: #E9E8E6 background, Text: Inter Medium 16px, #63635E
      // ============================================================================
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,  // 8px from Figma
            padding: '10px 12px',
            minHeight: 40,  // 40px from Figma
            gap: 8,  // 8px gap from Figma
            transition: 'all 150ms ease',
            // Default state - muted grey
            color: isDark ? palette.scale[400] : figmaGrey[1100],  // #63635E
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[300],  // #F1F0EF
              color: isDark ? palette.scale[200] : figmaGrey[1200],  // #21201C
            },
            // Active/Selected state - Figma: #E9E8E6 background
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : figmaGrey[400],  // #E9E8E6
              color: isDark ? palette.scale[100] : figmaGrey[1200],  // #21201C
              '&:hover': {
                backgroundColor: isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[400],
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 28,  // Compact for 20px icons with gap
            width: 20,
            height: 20,
            // Icon color from Figma
            color: isDark ? palette.scale[500] : figmaGrey[900],  // #8D8D86
            '.Mui-selected &': {
              color: isDark ? palette.scale[200] : figmaGrey[1100],  // #63635E
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontFamily: fontFamilyUI,  // Inter from Figma
            fontSize: '16px',  // Navigation item size from Figma
            fontWeight: 500,
            lineHeight: 'normal',
            color: 'inherit',
          },
          secondary: {
            fontFamily: fontFamilyBody,  // Lato
            fontSize: '12px',
            color: isDark ? palette.scale[500] : figmaGrey[900],
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? alpha(palette.scale[100], 0.08) : figmaGrey[500],  // Warm divider from Figma
          },
        },
      },
      // ============================================================================
      // FIGMA USER AVATAR (EXACT from Figma userAvatar specs)
      // Size: 28px, Border: 1px solid #82827C, Border-radius: 32px
      // ============================================================================
      MuiAvatar: {
        styleOverrides: {
          root: {
            width: figmaComponents.userAvatar.size,  // 28px
            height: figmaComponents.userAvatar.size,  // 28px
            border: isDark ? `1px solid ${palette.scale[600]}` : `1px solid ${figmaGrey[1000]}`,  // #82827C
            borderRadius: figmaComponents.userAvatar.borderRadius,  // 32px
            backgroundColor: isDark ? palette.scale[800] : figmaGrey[300],
            color: isDark ? palette.scale[300] : figmaGrey[1100],
            fontSize: '12px',
            fontFamily: fontFamilyUI,
            fontWeight: 500,
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
            backgroundColor: isDark ? palette.scale[1000] : figmaGrey.white,
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[600]}`,
            // EXACT from Figma - layered shadow
            boxShadow: isDark
              ? '0 16px 48px rgba(0,0,0,0.4)'
              : '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.12)',
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
      // ============================================================================
      // FIGMA SIDEBAR/DRAWER (EXACT from Figma sidebar specs)
      // Width: 250px, Background: #F9F9F8, Padding: 16px/20px, Border-radius: 8px
      // ============================================================================
      MuiDrawer: {
        styleOverrides: {
          paper: {
            width: figmaSpacing.sidebarWidth,  // 250px from Figma
            backgroundColor: isDark ? palette.scale[1000] : figmaGrey[200],  // #F9F9F8 from Figma
            borderRight: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            padding: '20px 16px',  // EXACT from Figma: 16px horizontal, 20px vertical
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            // White header with subtle border (from Figma main content area)
            backgroundColor: isDark ? palette.scale[1000] : '#FFFFFF',
            borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : '#E5E7EB'}`,
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
      // ============================================================================
      // FIGMA TABS (EXACT from Figma tabs component specs)
      // Height: 40px, Border: 1px solid #E5E7EB
      // Active: #EBFEF6 bg, 2px #007E60 border, #02634E text
      // Inactive: transparent, #374151 text
      // ============================================================================
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderBottom: isDark ? `1px solid ${alpha(palette.scale[100], 0.1)}` : `1px solid ${figmaNeutral[200]}`,
          },
          indicator: {
            height: 2,
            borderRadius: 0,
            // Active tab border - green from Figma accent
            backgroundColor: isDark ? palette.scale[100] : figmaAccent.primaryGreen,
          },
          flexContainer: {
            gap: 0,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontFamily: fontFamilyBody,  // Lato from Figma
            fontWeight: 500,
            fontSize: '14px',
            minHeight: 40,
            padding: '8px 32px',  // EXACT from Figma: 32px horizontal, 8px vertical
            borderBottom: '2px solid transparent',
            // Inactive tab - Figma: #374151 text, transparent background
            color: isDark ? palette.scale[500] : figmaAccent.darkText,
            backgroundColor: 'transparent',
            transition: 'all 150ms ease',
            '&.Mui-selected': {
              fontWeight: 500,
              // Active tab - Figma: #02634E text, #EBFEF6 background
              color: isDark ? palette.scale[100] : figmaAccent.greenText,
              backgroundColor: isDark ? alpha(palette.scale[100], 0.08) : figmaAccent.greenBackground,
            },
            '&:hover': {
              color: isDark ? palette.scale[300] : figmaAccent.greenText,
              backgroundColor: isDark ? alpha(palette.scale[100], 0.04) : alpha(figmaAccent.greenBackground, 0.5),
            },
          },
        },
      },
      // ============================================================================
      // FIGMA DATA TABLE (EXACT from Figma dataTable component specs)
      // Header height: 60px, Row height: 60px, Cell padding: 16px
      // ============================================================================
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
            backgroundColor: isDark ? palette.scale[1000] : figmaGrey.white,
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            border: 'none',
            borderRadius: 0,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? palette.scale[900] : figmaGrey[200],  // #F9F9F8 from Figma
              fontFamily: fontFamilyBody,  // Lato
              fontWeight: 500,
              fontSize: '14px',
              color: isDark ? palette.scale[400] : figmaGrey[1100],  // #63635E from Figma
              textTransform: 'none',
              letterSpacing: 'normal',
              borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.08) : figmaGrey[500]}`,
              height: 60,  // EXACT from Figma: 60px header height
              padding: `0 ${figmaComponents.dataTable.cellPadding}px`,
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root': {
              '&:hover': {
                backgroundColor: isDark ? alpha(palette.scale[100], 0.02) : alpha(figmaGrey[300], 0.5),
              },
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            height: 60,  // EXACT from Figma: 60px row height
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontFamily: fontFamilyBody,  // Lato
            fontSize: '14px',
            color: isDark ? palette.scale[200] : figmaGrey[1200],  // #21201C from Figma
            padding: `0 ${figmaComponents.dataTable.cellPadding}px`,
            height: 60,  // EXACT from Figma: 60px row height
            borderBottom: `1px solid ${isDark ? alpha(palette.scale[100], 0.06) : figmaGrey[400]}`,
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
            color: isDark ? palette.scale[600] : figmaGrey[600],  // Neutral unchecked color
            // Neutral dark grey for checked state (no green)
            '&.Mui-checked': {
              color: isDark ? palette.scale[200] : figmaGrey[1200],
            },
            '&:hover': {
              backgroundColor: isDark ? alpha(palette.scale[100], 0.04) : alpha(figmaGrey[1200], 0.04),
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
                backgroundColor: isDark ? palette.scale[200] : figmaGrey[1200],  // Neutral dark grey
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
            backgroundColor: isDark ? palette.scale[700] : figmaGrey[600],  // Neutral track color
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
            // Neutral grey background for all alert variants
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[200],
            color: isDark ? palette.scale[200] : figmaGrey[1200],
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[500]}`,
          },
          standardSuccess: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[200],
            color: isDark ? palette.scale[200] : figmaGrey[1200],
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[500]}`,
          },
          standardError: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[200],
            color: isDark ? palette.scale[200] : figmaGrey[1200],
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[500]}`,
          },
          standardWarning: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[200],
            color: isDark ? palette.scale[200] : figmaGrey[1200],
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[500]}`,
          },
          standardInfo: {
            backgroundColor: isDark ? alpha(palette.scale[100], 0.05) : figmaGrey[200],
            color: isDark ? palette.scale[200] : figmaGrey[1200],
            border: `1px solid ${isDark ? alpha(palette.scale[100], 0.1) : figmaGrey[500]}`,
          },
          icon: {
            marginRight: 12,
            padding: 0,
            opacity: 1,
            // Neutral grey icons
            color: isDark ? palette.scale[400] : figmaGrey[900],
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

// ============================================================================
// EXPORTS - All Figma design tokens for use across components
// ============================================================================
export {
  createAppTheme,
  palette,
  // Font families
  fontFamilyHeading,
  fontFamilyUI,
  fontFamilyBody,
  fontFamilyMono,
  // Color tokens
  figmaGrey,
  figmaNeutral,
  figmaAccent,
  figmaStatus,
  figmaGradients,
  // Shadow tokens
  figmaShadow,
  // Spacing & dimension tokens
  figmaSpacing,
  figmaComponents,
}
