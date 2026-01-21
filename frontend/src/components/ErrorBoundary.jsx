import { Component } from 'react'
import { Box, Typography, Button, Stack, alpha } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import HomeIcon from '@mui/icons-material/Home'
import { palette } from '../theme'

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
            bgcolor: palette.scale[1000],
            p: 3,
          }}
        >
          <Box
            sx={{
              maxWidth: 480,
              textAlign: 'center',
              p: 4,
              bgcolor: palette.scale[900],
              borderRadius: 2,
              border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(palette.red[400], 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 32, color: palette.red[400] }} />
            </Box>

            <Typography
              variant="h5"
              sx={{ fontWeight: 600, color: palette.scale[100], mb: 1.5 }}
            >
              Something went wrong
            </Typography>

            <Typography
              sx={{ color: palette.scale[400], mb: 3, fontSize: '0.875rem' }}
            >
              An unexpected error occurred. You can try refreshing the page or go back to the dashboard.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  bgcolor: alpha(palette.red[400], 0.1),
                  border: `1px solid ${alpha(palette.red[400], 0.2)}`,
                  borderRadius: 1,
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
                    color: palette.red[300],
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
                onClick={this.handleGoHome}
                sx={{
                  borderColor: alpha(palette.scale[100], 0.2),
                  color: palette.scale[300],
                  '&:hover': {
                    borderColor: alpha(palette.scale[100], 0.4),
                    bgcolor: alpha(palette.scale[100], 0.05),
                  },
                }}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{
                  bgcolor: palette.green[500],
                  '&:hover': { bgcolor: palette.green[600] },
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
