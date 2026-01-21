import { useMemo, lazy, Suspense, useState, useCallback, useEffect } from 'react'
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
import ErrorBoundary from './components/ErrorBoundary.jsx'
import JobsPanel from './components/JobsPanel.jsx'
import { CommandPalette } from './components/shell'
import theme from './theme.js'
import { useBootstrapState } from './hooks/useBootstrapState.js'
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts.js'
import ProjectLayout from './layouts/ProjectLayout.jsx'

// Lazy-loaded pages - Main app pages
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const ConnectionsPage = lazy(() => import('./pages/connections/ConnectionsPage.jsx'))
const TemplatesPage = lazy(() => import('./pages/templates/TemplatesPage.jsx'))
const JobsPage = lazy(() => import('./pages/jobs/JobsPage.jsx'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.jsx'))
const SchedulesPage = lazy(() => import('./pages/schedules/SchedulesPage.jsx'))
const AnalyzePage = lazy(() => import('./features/analyze/containers/AnalyzePageContainer.jsx'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx'))
const ActivityPage = lazy(() => import('./pages/activity/ActivityPage.jsx'))
const HistoryPage = lazy(() => import('./pages/history/HistoryPage.jsx'))
const UsageStatsPage = lazy(() => import('./pages/stats/UsageStatsPage.jsx'))

// AI Features
const QueryBuilderPage = lazy(() => import('./pages/query/QueryBuilderPage.jsx'))
const EnrichmentConfigPage = lazy(() => import('./pages/enrichment/EnrichmentConfigPage.jsx'))
const SchemaBuilderPage = lazy(() => import('./pages/federation/SchemaBuilderPage.jsx'))
const SynthesisPage = lazy(() => import('./pages/synthesis/SynthesisPage.jsx'))
const DocumentQAPage = lazy(() => import('./pages/docqa/DocumentQAPage.jsx'))
const SummaryPage = lazy(() => import('./pages/summary/SummaryPage.jsx'))

// Lazy-loaded pages - Setup and editing
const SetupWizard = lazy(() => import('./pages/Setup/SetupWizard.jsx'))
const SetupPage = lazy(() => import('./pages/Setup/SetupPage.jsx'))
const GeneratePage = lazy(() => import('./pages/Generate/GeneratePage.jsx'))
const TemplateEditorPage = lazy(() => import('./pages/Generate/TemplateEditor.jsx'))

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

  useEffect(() => {
    const handleOpenCommandPaletteEvent = () => handleOpenCommandPalette()
    const handleOpenJobsPanelEvent = () => handleOpenJobs()
    window.addEventListener('neura:open-command-palette', handleOpenCommandPaletteEvent)
    window.addEventListener('neura:open-jobs-panel', handleOpenJobsPanelEvent)
    return () => {
      window.removeEventListener('neura:open-command-palette', handleOpenCommandPaletteEvent)
      window.removeEventListener('neura:open-jobs-panel', handleOpenJobsPanelEvent)
    }
  }, [handleOpenCommandPalette, handleOpenJobs])

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

      {/* Main Content */}
      <Box
        id="main-content"
        component="main"
        tabIndex={-1}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Setup Wizard - Standalone route with its own layout */}
            <Route path="/setup/wizard" element={<SetupWizard />} />

            {/* Legacy routes redirect to new layout */}
            <Route path="/setup" element={<Navigate to="/" replace />} />
            <Route path="/generate" element={<Navigate to="/reports" replace />} />

            {/* Main app routes with ProjectLayout (Supabase-style sidebar) */}
            <Route element={<ProjectLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/templates/:templateId/edit" element={<TemplateEditorPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/stats" element={<UsageStatsPage />} />
              {/* AI Features */}
              <Route path="/query" element={<QueryBuilderPage />} />
              <Route path="/enrichment" element={<EnrichmentConfigPage />} />
              <Route path="/federation" element={<SchemaBuilderPage />} />
              <Route path="/synthesis" element={<SynthesisPage />} />
              <Route path="/docqa" element={<DocumentQAPage />} />
              <Route path="/summary" element={<SummaryPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Box>

      {/* Overlays */}
      <JobsPanel open={jobsOpen} onClose={handleCloseJobs} />
      <CommandPalette open={commandPaletteOpen} onClose={handleCloseCommandPalette} />
    </>
  )
}

// Root App component
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProviders>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
