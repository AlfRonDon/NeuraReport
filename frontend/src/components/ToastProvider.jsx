/**
 * Premium Toast Provider
 * Notification system with theme-based styling
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Snackbar, Alert, Button, useTheme, alpha } from '@mui/material'

const ToastCtx = createContext({ show: () => {}, showWithUndo: () => {} })

// Internal component that uses theme
function ToastContent({ state, onClose, onUndo }) {
  const theme = useTheme()

  const getSeverityStyles = () => {
    const severityColors = {
      success: theme.palette.success.main,
      error: theme.palette.error.main,
      warning: theme.palette.warning.main,
      info: theme.palette.info.main,
    }
    const color = severityColors[state.severity] || severityColors.info

    return {
      bgcolor: alpha(color, 0.15),
      color: color,
      border: `1px solid ${alpha(color, 0.3)}`,
      iconColor: color,
    }
  }

  const styles = getSeverityStyles()

  return (
    <Alert
      onClose={onClose}
      severity={state.severity}
      role="alert"
      aria-live={state.severity === 'error' ? 'assertive' : 'polite'}
      action={
        state.action ? (
          <Button
            color="inherit"
            size="small"
            onClick={onUndo}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              ml: 1,
            }}
          >
            {state.action.undoLabel}
          </Button>
        ) : undefined
      }
      sx={{
        ...styles,
        borderRadius: '12px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
        backdropFilter: 'blur(8px)',
        '& .MuiAlert-icon': {
          color: styles.iconColor,
        },
        '& .MuiAlert-action': {
          '& .MuiIconButton-root': {
            color: styles.color,
            '&:hover': {
              bgcolor: alpha(styles.color, 0.1),
            },
          },
        },
      }}
    >
      {state.message}
    </Alert>
  )
}

export function ToastProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'info', action: null })

  const show = useCallback((message, severity = 'info') => {
    setState({ open: true, message, severity, action: null })
  }, [])

  const showWithUndo = useCallback((message, onUndo, options = {}) => {
    const { severity = 'info', undoLabel = 'Undo', duration = 5000 } = options
    setState({
      open: true,
      message,
      severity,
      action: { onUndo, undoLabel },
      duration,
    })
  }, [])

  const onClose = (event, reason) => {
    // Don't close on clickaway if there's an action
    if (reason === 'clickaway' && state.action) return
    setState((s) => ({ ...s, open: false, action: null }))
  }

  const handleUndo = useCallback(() => {
    if (state.action?.onUndo) {
      state.action.onUndo()
    }
    setState((s) => ({ ...s, open: false, action: null }))
  }, [state.action])

  const contextValue = useMemo(() => ({ show, showWithUndo }), [show, showWithUndo])

  return (
    <ToastCtx.Provider value={contextValue}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={state.duration || (state.action ? 5000 : 3000)}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbar-root': {
            bottom: 24,
          },
        }}
      >
        <div>
          <ToastContent state={state} onClose={onClose} onUndo={handleUndo} />
        </div>
      </Snackbar>
    </ToastCtx.Provider>
  )
}

export function useToast() { return useContext(ToastCtx) }
