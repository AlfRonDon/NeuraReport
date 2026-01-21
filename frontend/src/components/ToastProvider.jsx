import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Snackbar, Alert, Button, alpha } from '@mui/material'
import { palette } from '../theme'

const ToastCtx = createContext({ show: () => {}, showWithUndo: () => {} })

const SEVERITY_STYLES = {
  success: {
    bgcolor: alpha(palette.green[400], 0.15),
    color: palette.green[400],
    border: `1px solid ${alpha(palette.green[400], 0.3)}`,
    iconColor: palette.green[400],
  },
  error: {
    bgcolor: alpha(palette.red[400], 0.15),
    color: palette.red[400],
    border: `1px solid ${alpha(palette.red[400], 0.3)}`,
    iconColor: palette.red[400],
  },
  warning: {
    bgcolor: alpha(palette.yellow[400], 0.15),
    color: palette.yellow[400],
    border: `1px solid ${alpha(palette.yellow[400], 0.3)}`,
    iconColor: palette.yellow[400],
  },
  info: {
    bgcolor: alpha(palette.blue[400], 0.15),
    color: palette.blue[400],
    border: `1px solid ${alpha(palette.blue[400], 0.3)}`,
    iconColor: palette.blue[400],
  },
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

  const styles = SEVERITY_STYLES[state.severity] || SEVERITY_STYLES.info

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
                onClick={handleUndo}
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
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
      </Snackbar>
    </ToastCtx.Provider>
  )
}

export function useToast() { return useContext(ToastCtx) }
