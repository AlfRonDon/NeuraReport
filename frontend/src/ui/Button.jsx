import { forwardRef } from 'react'
import { Button as MuiButton, CircularProgress } from '@mui/material'

const Button = forwardRef(function Button(
  {
    children,
    variant = 'contained',
    size = 'medium',
    loading = false,
    disabled = false,
    startIcon,
    endIcon,
    fullWidth = false,
    color = 'primary',
    ...props
  },
  ref
) {
  return (
    <MuiButton
      ref={ref}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      endIcon={endIcon}
      fullWidth={fullWidth}
      color={color}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 2,
        px: size === 'small' ? 2 : 3,
        py: size === 'small' ? 0.75 : 1,
        boxShadow: variant === 'contained' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        '&:hover': {
          boxShadow:
            variant === 'contained'
              ? '0 4px 12px rgba(79, 70, 229, 0.25)'
              : 'none',
        },
        '&.Mui-disabled': {
          bgcolor: variant === 'contained' ? 'action.disabledBackground' : 'transparent',
        },
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </MuiButton>
  )
})

export default Button
