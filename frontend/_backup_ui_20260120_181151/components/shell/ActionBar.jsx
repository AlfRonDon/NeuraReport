import { forwardRef } from 'react'
import {
  Box,
  Stack,
  Button,
  IconButton,
  Typography,
  LinearProgress,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import DownloadIcon from '@mui/icons-material/Download'
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn'

const ActionBar = forwardRef(function ActionBar(
  {
    primaryLabel = 'Run',
    primaryIcon = <PlayArrowIcon />,
    primaryDisabled = false,
    primaryLoading = false,
    onPrimaryClick,
    secondaryActions = [],
    status,
    statusColor = 'default',
    progress,
    progressLabel,
    canCancel = false,
    onCancel,
    hint,
  },
  ref
) {
  const showProgress = typeof progress === 'number' && progress >= 0

  return (
    <Box
      ref={ref}
      sx={{
        height: 64,
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Left: Status & Progress */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        {showProgress ? (
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, maxWidth: 400 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
              {progressLabel || `${Math.round(progress)}%`}
            </Typography>
          </Stack>
        ) : status ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor:
                  statusColor === 'success'
                    ? 'success.main'
                    : statusColor === 'error'
                    ? 'error.main'
                    : statusColor === 'warning'
                    ? 'warning.main'
                    : 'text.disabled',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {status}
            </Typography>
          </Stack>
        ) : hint ? (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Stack>

      {/* Right: Actions */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* Secondary Actions */}
        {secondaryActions.map((action, idx) => (
          <Tooltip key={idx} title={action.tooltip || action.label}>
            {action.icon ? (
              <IconButton
                size="small"
                onClick={action.onClick}
                disabled={action.disabled}
                color={action.color || 'default'}
              >
                {action.icon}
              </IconButton>
            ) : (
              <Button
                variant="outlined"
                size="small"
                onClick={action.onClick}
                disabled={action.disabled}
                startIcon={action.startIcon}
              >
                {action.label}
              </Button>
            )}
          </Tooltip>
        ))}

        {/* Cancel Button (when running) */}
        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<StopIcon />}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}

        {/* Primary Action */}
        <Button
          variant="contained"
          size="medium"
          onClick={onPrimaryClick}
          disabled={primaryDisabled || primaryLoading}
          startIcon={
            primaryLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              primaryIcon
            )
          }
          sx={{
            minWidth: 120,
            px: 3,
            py: 1,
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            },
          }}
        >
          {primaryLabel}
        </Button>

        {/* Keyboard Hint */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{
            ml: 1,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Press
          </Typography>
          <Box
            component="kbd"
            sx={{
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            ↵
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
})

export default ActionBar
