import {
  Drawer as MuiDrawer,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { palette } from '../../theme'

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  anchor = 'right',
  width = 480,
  actions,
  loading = false,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) {
  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: width },
          maxWidth: '100%',
          bgcolor: palette.scale[1000],
          borderLeft: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: palette.scale[100],
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: palette.scale[500],
                  mt: 0.5,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: palette.scale[500],
              '&:hover': {
                bgcolor: alpha(palette.scale[100], 0.08),
                color: palette.scale[100],
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2.5,
            bgcolor: palette.scale[1100],
          }}
        >
          {children}
        </Box>

        {/* Footer Actions */}
        {(actions || onConfirm) && (
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}`,
              bgcolor: palette.scale[1000],
            }}
          >
            {actions || (
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                  sx={{
                    color: palette.scale[300],
                    borderColor: alpha(palette.scale[100], 0.15),
                    '&:hover': {
                      borderColor: alpha(palette.scale[100], 0.25),
                      bgcolor: alpha(palette.scale[100], 0.05),
                    },
                  }}
                >
                  {cancelLabel}
                </Button>
                <Button
                  variant="contained"
                  onClick={onConfirm}
                  disabled={confirmDisabled || loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                  sx={{
                    bgcolor: palette.green[400],
                    color: palette.scale[1100],
                    '&:hover': {
                      bgcolor: palette.green[300],
                    },
                  }}
                >
                  {confirmLabel}
                </Button>
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </MuiDrawer>
  )
}
