import { useMemo, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Box, Container, Typography } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ToastProvider.jsx'
import theme from './theme.js'
import { useBootstrapState } from './hooks/useBootstrapState.js'

const SetupPage = lazy(() => import('./pages/Setup/SetupPage.jsx'))
const GeneratePage = lazy(() => import('./pages/Generate/GeneratePage.jsx'))

function AppHeader() {
  return (
    <AppBar
      position="fixed"
      color="default"
    >
      <Toolbar disableGutters>
        <Container sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              aria-hidden
              sx={{
                width: 12,
                height: 12,
                borderRadius: 6,
                bgcolor: 'primary.main',
                boxShadow: '0 0 0 4px rgba(79,70,229,0.14)',
              }}
            />
            <Typography variant="h6" component="span">
              NeuraReport
            </Typography>
          </Box>
        </Container>
      </Toolbar>
    </AppBar>
  )
}

function AppProviders({ children }) {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  }), [])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}

export default function App() {
  useBootstrapState()
  return (
    <BrowserRouter>
      <AppProviders>
        <ToastProvider>
          <AppHeader />
          <Box
            component="a"
            href="#main-content"
            onClick={() => {
              const target = document.getElementById('main-content')
              if (target) target.focus()
            }}
            sx={{
              position: 'fixed',
              top: -40,
              left: 16,
              zIndex: (t) => t.zIndex.appBar + 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              px: 2,
              py: 1,
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(79,70,229,0.18)',
              transition: 'top 160ms ease',
              '&:focus-visible': { top: 16 },
            }}
          >
            Skip to content
          </Box>
          <Box
            sx={{
              minHeight: '100vh',
              bgcolor: 'background.default',
            }}
          >
            {/* offset for fixed app bar */}
            <Box sx={{ height: { xs: 64, sm: 72 } }} aria-hidden />
            <Container
              id="main-content"
              component="main"
              tabIndex={-1}
              sx={{
                outline: 'none',
                py: { xs: 4, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 3.5, md: 4.5 },
              }}
            >
              <Suspense
                fallback={
                  <Box
                    sx={{
                      py: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                    }}
                    aria-live="polite"
                  >
                    Loading...
                  </Box>
                }
              >
                <Routes>
                  <Route path="/" element={<SetupPage />} />
                  <Route path="/generate" element={<GeneratePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Container>
          </Box>
        </ToastProvider>
      </AppProviders>
    </BrowserRouter>
  )
}
