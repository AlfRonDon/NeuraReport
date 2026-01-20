import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { palette } from '../../theme'

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  loading = false,
  hideCloseButton = false,
  dividers = true,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirmColor = 'primary',
  confirmVariant = 'contained',
}) {
  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          bgcolor: palette.scale[1000],
          border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          p: 2.5,
          pb: subtitle ? 1.5 : 2.5,
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
        {!hideCloseButton && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              mt: -0.5,
              mr: -0.5,
              color: palette.scale[500],
              '&:hover': {
                bgcolor: alpha(palette.scale[100], 0.08),
                color: palette.scale[100],
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </DialogTitle>

      {dividers && (
        <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
      )}

      <DialogContent sx={{ p: 2.5 }}>
        {children}
      </DialogContent>

      {(actions || onConfirm) && (
        <>
          {dividers && (
            <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
          )}
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            {actions || (
              <>
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
                  variant={confirmVariant}
                  color={confirmColor}
                  onClick={onConfirm}
                  disabled={confirmDisabled || loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                  sx={{
                    ...(confirmVariant === 'contained' && confirmColor === 'primary' && {
                      bgcolor: palette.green[400],
                      color: palette.scale[1100],
                      '&:hover': {
                        bgcolor: palette.green[300],
                      },
                    }),
                    ...(confirmColor === 'error' && {
                      bgcolor: palette.red[500],
                      color: '#FFFFFF',
                      '&:hover': {
                        bgcolor: palette.red[600],
                      },
                    }),
                  }}
                >
                  {confirmLabel}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
