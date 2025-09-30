import { useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createTheme, ThemeProvider, CssBaseline, AppBar, Toolbar, Box, Container } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SetupPage from './pages/Setup/SetupPage.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'

function AppHeader() {
  return (
    <AppBar position="fixed" color="default" elevation={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ px: 2, display: 'flex', gap: 2 }}>
        <Box sx={{ fontWeight: 700 }}>NeuraReport</Box>
      </Toolbar>
    </AppBar>
  )
}

function AppProviders({ children }) {
  const theme = useMemo(() => createTheme({
    palette: { mode: 'light' },
  }), [])
  const queryClient = useMemo(() => new QueryClient(), [])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ToastProvider>
          <AppHeader />
          {/* offset for fixed app bar */}
          <Box sx={(theme) => ({ ...theme.mixins.toolbar })} />
          <Container maxWidth="lg" sx={{ py: 2 }}>
            <Routes>
              <Route path="/" element={<SetupPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </ToastProvider>
      </AppProviders>
    </BrowserRouter>
  )
}
