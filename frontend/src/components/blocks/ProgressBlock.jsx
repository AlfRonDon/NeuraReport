import { Box, Typography, Stack, LinearProgress, CircularProgress, alpha } from '@mui/material'

export default function ProgressBlock({ data }) {
  const { progress = 0, stage = 'Processing...', detail, indeterminate = false } = data || {}

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'primary.main',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress
            size={24}
            variant={indeterminate ? 'indeterminate' : 'determinate'}
            value={progress}
            sx={{ color: 'primary.main' }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {stage}
            </Typography>
            {detail && (
              <Typography variant="caption" color="text.secondary">
                {detail}
              </Typography>
            )}
          </Box>
          {!indeterminate && (
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {Math.round(progress)}%
            </Typography>
          )}
        </Stack>

        <LinearProgress
          variant={indeterminate ? 'indeterminate' : 'determinate'}
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          }}
        />
      </Stack>
    </Box>
  )
}
