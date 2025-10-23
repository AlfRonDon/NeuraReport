import { useMemo, lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Box,
  Container,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query'
import { ToastProvider } from './components/ToastProvider.jsx'
import HeartbeatBadge from './components/HeartbeatBadge.jsx'
import theme from './theme.js'
import { useBootstrapState } from './hooks/useBootstrapState.js'
import { useAppStore } from './store/useAppStore.js'
import appLogo from './assets/app-logo.png'

const SetupPage = lazy(() => import('./pages/Setup/SetupPage.jsx'))
const GeneratePage = lazy(() => import('./pages/Generate/GeneratePage.jsx'))

function AppHeader() {
  const fetchCount = useIsFetching()
  const connection = useAppStore((state) => state.connection)
  const setupNav = useAppStore((state) => state.setupNav)
  const [logoFailed, setLogoFailed] = useState(false)

  const status = connection?.status || 'unknown'
  const heartbeatStatus =
    status === 'connected' ? 'healthy' : status === 'failed' ? 'unreachable' : 'unknown'
  const statusLabel =
    status === 'connected'
      ? 'Connection healthy'
      : status === 'failed'
        ? 'Connection failed'
        : 'Not tested yet'
  const stepLabelMap = {
    connect: 'Connect database',
    generate: 'Upload & verify',
    templates: 'Run reports',
  }
  const stepLabel = stepLabelMap[setupNav] || stepLabelMap.connect
  const fetchActive = fetchCount > 0

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 82, sm: 90 },
          py: { xs: 0, sm: 0 },
          alignItems: 'center',
        }}
      >
        <Container
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {logoFailed ? (
              <Box
                aria-hidden
                sx={{
                  width: 108,
                  height: 108,
                  borderRadius: 18,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'transparent',
                  mt: { xs: -1, sm: -1.5 },
                  mb: { xs: -1, sm: -1.5 },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--font-brand, "Oxanium", "Outfit", "Segoe UI", sans-serif)',
                    fontWeight: 700,
                    fontSize: 34,
                    letterSpacing: '0.06em',
                    color: 'primary.main',
                  }}
                >
                  NR
                </Typography>
              </Box>
            ) : (
              <Box
                component="img"
                src={appLogo}
                alt="NeuraReport logo"
                onError={() => setLogoFailed(true)}
                sx={{
                  width: 108,
                  height: 108,
                  borderRadius: 20,
                  boxShadow: 'none',
                  bgcolor: 'transparent',
                  mt: { xs: -1, sm: -1.5 },
                  mb: { xs: -1, sm: -1.5 },
                }}
              />
            )}
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-brand, "Oxanium", "Outfit", "Segoe UI", sans-serif)',
                display: 'inline-flex',
                alignItems: 'baseline',
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: { xs: 38, sm: 44 },
                  lineHeight: 1,
                  display: 'inline-block',
                }}
              >
                N
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: { xs: 32, sm: 36 },
                  lineHeight: 1,
                  display: 'inline-block',
                  ml: '0.018em',
                }}
              >
                EURA
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: { xs: 38, sm: 44 },
                  lineHeight: 1,
                  display: 'inline-block',
                  ml: '0.034em',
                }}
              >
                R
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: { xs: 32, sm: 36 },
                  lineHeight: 1,
                  display: 'inline-block',
                  ml: '0.018em',
                }}
              >
                EPORT
              </Box>
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <Tooltip title={connection?.lastMessage || statusLabel} arrow placement="bottom">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <HeartbeatBadge
                  size="small"
                  status={heartbeatStatus}
                  latencyMs={connection?.latencyMs ?? undefined}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {statusLabel}
                </Typography>
              </Box>
            </Tooltip>
            {connection?.name ? (
              <Chip
                size="small"
                label={connection.name}
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  maxWidth: 180,
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            ) : null}
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Step · ${stepLabel}`}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            />
          </Box>
        </Container>
      </Toolbar>
      {fetchActive ? (
        <LinearProgress color="secondary" sx={{ height: 2 }} aria-label="Loading data" />
      ) : null}
    </AppBar>
  )
}

function AppProviders({ children }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  )
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
            <Box sx={{ height: { xs: 82, sm: 90 } }} aria-hidden />
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
