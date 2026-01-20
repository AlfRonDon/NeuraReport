import { useMemo, lazy, Suspense, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ToastProvider.jsx'
import JobsPanel from './components/JobsPanel.jsx'
import { AppShell, CommandPalette } from './components/shell'
import theme from './theme.js'
import { useBootstrapState } from './hooks/useBootstrapState.js'
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts.js'

// Lazy-loaded pages
const SetupPage = lazy(() => import('./pages/Setup/SetupPage.jsx'))
const GeneratePage = lazy(() => import('./pages/Generate/GeneratePage.jsx'))
const TemplateEditorPage = lazy(() => import('./pages/Generate/TemplateEditor.jsx'))
const AnalyzePage = lazy(() => import('./features/analyze/containers/AnalyzePageContainer.jsx'))

// Loading fallback component
function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Stack>
    </Box>
  )
}

// Query client configuration
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30000,
      },
    },
  })
}

// App Providers wrapper
function AppProviders({ children }) {
  const queryClient = useMemo(createQueryClient, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Main app content with shell layout
function AppContent() {
  // Bootstrap state (hydrate from localStorage)
  useBootstrapState()

  // UI State
  const [jobsOpen, setJobsOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Handlers
  const handleOpenJobs = useCallback(() => setJobsOpen(true), [])
  const handleCloseJobs = useCallback(() => setJobsOpen(false), [])
  const handleOpenCommandPalette = useCallback(() => setCommandPaletteOpen(true), [])
  const handleCloseCommandPalette = useCallback(() => setCommandPaletteOpen(false), [])

  // Register global keyboard shortcuts
  useKeyboardShortcuts({
    [SHORTCUTS.COMMAND_PALETTE]: handleOpenCommandPalette,
    'escape': () => {
      if (commandPaletteOpen) handleCloseCommandPalette()
      else if (jobsOpen) handleCloseJobs()
    },
  })

  return (
    <>
      {/* Skip to content link for accessibility */}
      <Box
        component="a"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          const target = document.getElementById('main-content')
          if (target) {
            target.focus()
            target.scrollIntoView({ behavior: 'smooth' })
          }
        }}
        sx={{
          position: 'fixed',
          top: -40,
          left: 16,
          zIndex: 9999,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 1,
          borderRadius: 1,
          textDecoration: 'none',
          fontWeight: 600,
          transition: 'top 160ms ease',
          '&:focus-visible': {
            top: 16,
            outline: '2px solid',
            outlineColor: 'primary.dark',
            outlineOffset: 2,
          },
        }}
      >
        Skip to content
      </Box>

      {/* Main Application Shell */}
      <AppShell>
        <Box
          id="main-content"
          component="main"
          tabIndex={-1}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            outline: 'none',
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<SetupPage />} />
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
              <Route path="/templates/:templateId/edit" element={<TemplateEditorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Box>
      </AppShell>

      {/* Overlays */}
      <JobsPanel open={jobsOpen} onClose={handleCloseJobs} />
      <CommandPalette open={commandPaletteOpen} onClose={handleCloseCommandPalette} />
    </>
  )
}

// Root App component
export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AppProviders>
    </BrowserRouter>
  )
}
