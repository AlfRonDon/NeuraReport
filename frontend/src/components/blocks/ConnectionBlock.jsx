import { Box, Typography, Stack, Chip, alpha } from '@mui/material'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

export default function ConnectionBlock({ data }) {
  const { status, name, type, tables, error } = data || {}

  const isConnected = status === 'connected'
  const isFailed = status === 'error' || status === 'failed'

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: isConnected
          ? 'success.main'
          : isFailed
          ? 'error.main'
          : 'divider',
        bgcolor: isConnected
          ? (theme) => alpha(theme.palette.success.main, 0.04)
          : isFailed
          ? (theme) => alpha(theme.palette.error.main, 0.04)
          : 'background.default',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: isConnected
              ? 'success.main'
              : isFailed
              ? 'error.main'
              : 'action.selected',
            color: isConnected || isFailed ? 'white' : 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StorageOutlinedIcon />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight={600}>
              {name || 'Database Connection'}
            </Typography>
            <Chip
              size="small"
              label={isConnected ? 'Connected' : isFailed ? 'Failed' : 'Pending'}
              color={isConnected ? 'success' : isFailed ? 'error' : 'default'}
              icon={
                isConnected ? (
                  <CheckCircleOutlineIcon />
                ) : isFailed ? (
                  <ErrorOutlineIcon />
                ) : undefined
              }
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {type && `${type} • `}
            {tables ? `${tables} tables found` : error || 'Connecting...'}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
