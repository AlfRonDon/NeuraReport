import { createContext, useCallback, useContext, useState } from 'react'
import { Snackbar, Alert } from '@mui/material'

const ToastCtx = createContext({ show: () => {} })

export function ToastProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'info' })
  const show = useCallback((message, severity = 'info') => setState({ open: true, message, severity }), [])
  const onClose = () => setState((s) => ({ ...s, open: false }))
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <Snackbar open={state.open} autoHideDuration={2500} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={onClose} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </ToastCtx.Provider>
  )
}

export function useToast() { return useContext(ToastCtx) }

