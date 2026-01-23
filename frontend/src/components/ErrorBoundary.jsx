/**
 * Premium Error Boundary
 * Graceful error handling with theme-aware styling
 */
import { Component } from 'react'
import { Box, Typography, Button, Stack, alpha } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import HomeIcon from '@mui/icons-material/Home'

// Note: Class components cannot use hooks, so we use inline styles
// that work well with both light and dark themes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      const reloadHandler = this.props.onReload || this.handleReload
      const goHomeHandler = this.props.onGoHome || this.handleGoHome

      // Allow custom fallback UI
      if (fallback) {
        return fallback(this.state.error, this.handleRetry)
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 3,
          }}
        >
          <Box
            sx={{
              maxWidth: 480,
              textAlign: 'center',
              p: 4,
              bgcolor: 'background.paper',
              borderRadius: 4,
              border: 1,
              borderColor: 'divider',
              boxShadow: (theme) => `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 36, color: 'error.main' }} />
            </Box>

            <Typography
              variant="h5"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5 }}
            >
              Something went wrong
            </Typography>

            <Typography
              sx={{ color: 'text.secondary', mb: 3, fontSize: '0.875rem' }}
            >
              An unexpected error occurred. You can try refreshing the page or go back to the dashboard.
            </Typography>

            {import.meta.env?.DEV && this.state.error && (
              <Box
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                  border: 1,
                  borderColor: (theme) => alpha(theme.palette.error.main, 0.2),
                  borderRadius: 2,
                  p: 2,
                  mb: 3,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'error.main',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={goHomeHandler}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'text.primary',
                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
                  },
                }}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={reloadHandler}
                color="primary"
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    boxShadow: (theme) => `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                Refresh Page
              </Button>
            </Stack>
          </Box>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
