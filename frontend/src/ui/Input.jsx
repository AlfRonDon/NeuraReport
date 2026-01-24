import { forwardRef } from 'react'
import { TextField, InputAdornment, alpha } from '@mui/material'

const Input = forwardRef(function Input(
  {
    label,
    placeholder,
    value,
    onChange,
    onKeyDown,
    startIcon,
    endIcon,
    error,
    helperText,
    multiline = false,
    rows,
    maxRows,
    fullWidth = true,
    size = 'medium',
    disabled = false,
    autoFocus = false,
    type = 'text',
    ...props
  },
  ref
) {
  return (
    <TextField
      ref={ref}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      error={!!error}
      helperText={error || helperText}
      multiline={multiline}
      rows={rows}
      maxRows={maxRows}
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      autoFocus={autoFocus}
      type={type}
      InputProps={{
        startAdornment: startIcon ? (
          <InputAdornment position="start">{startIcon}</InputAdornment>
        ) : undefined,
        endAdornment: endIcon ? (
          <InputAdornment position="end">{endIcon}</InputAdornment>
        ) : undefined,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          bgcolor: 'background.paper',
          transition: 'all 150ms ease',
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.04),
          },
          '&.Mui-focused': {
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              `0 0 0 2px ${alpha(theme.palette.text.primary, 0.08)}`,
          },
        },
        ...props.sx,
      }}
      {...props}
    />
  )
})

export default Input
