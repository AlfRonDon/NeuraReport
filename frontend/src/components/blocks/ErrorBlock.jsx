import { Box, Typography, Stack, alpha } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Button } from '../primitives'
import RefreshIcon from '@mui/icons-material/Refresh'

export default function ErrorBlock({ data, onRetry }) {
  const { message, detail, code, retryable = true } = data || {}

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'error.main',
        bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'error.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ErrorOutlineIcon />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} color="error.main">
            {message || 'An error occurred'}
          </Typography>
          {detail && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {detail}
            </Typography>
          )}
          {code && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{
                display: 'inline-block',
                mt: 1,
                px: 1,
                py: 0.25,
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontFamily: 'monospace',
              }}
            >
              Code: {code}
            </Typography>
          )}
        </Box>

        {retryable && onRetry && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </Stack>
    </Box>
  )
}
