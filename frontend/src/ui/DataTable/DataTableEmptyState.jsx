import { Box, Typography, Button, alpha } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'
import { palette } from '../../theme'

export default function DataTableEmptyState({
  icon: Icon = InboxIcon,
  title = 'No data',
  description,
  action,
  actionLabel,
  onAction,
}) {
  return (
    <Box
      sx={{
        py: 8,
        px: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        bgcolor: palette.scale[1000],
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '12px',
          bgcolor: alpha(palette.scale[100], 0.05),
          border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        <Icon sx={{ fontSize: 24, color: palette.scale[600] }} />
      </Box>

      <Typography
        sx={{
          fontSize: '1rem',
          fontWeight: 600,
          color: palette.scale[100],
          mb: 0.5,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: palette.scale[500],
            maxWidth: 340,
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      )}

      {(action || onAction) && (
        <Button
          variant="contained"
          onClick={onAction}
          startIcon={action?.icon}
          sx={{
            bgcolor: palette.green[400],
            color: palette.scale[1100],
            '&:hover': {
              bgcolor: palette.green[300],
            },
          }}
        >
          {actionLabel || action?.label || 'Get Started'}
        </Button>
      )}
    </Box>
  )
}
