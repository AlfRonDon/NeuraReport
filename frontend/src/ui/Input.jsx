/**
 * Input Component - FIGMA Design System
 * Height: 40px, Border-radius: 8px, Background: #F1F0EF
 * Border: 1px solid #E2E1DE, Placeholder: #9CA3AF
 */
import { forwardRef } from 'react'
import { TextField, InputAdornment, alpha } from '@mui/material'
import { figmaGrey, figmaNeutral } from '@/app/theme'

// FIGMA Input Constants (from searchInput specs)
const FIGMA_INPUT = {
  height: 40,             // 40px from Figma
  borderRadius: 8,        // 8px from Figma
  fontSize: 14,           // 14px from Figma
  iconSize: 20,           // 20px from Figma
  paddingHorizontal: 12,  // 12px from Figma
  paddingVertical: 8,     // 8px from Figma
}

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
          <InputAdornment position="start" sx={{ '& svg': { fontSize: FIGMA_INPUT.iconSize } }}>
            {startIcon}
          </InputAdornment>
        ) : undefined,
        endAdornment: endIcon ? (
          <InputAdornment position="end" sx={{ '& svg': { fontSize: FIGMA_INPUT.iconSize } }}>
            {endIcon}
          </InputAdornment>
        ) : undefined,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          // FIGMA Input Specs
          borderRadius: `${FIGMA_INPUT.borderRadius}px`,
          minHeight: FIGMA_INPUT.height,
          fontSize: `${FIGMA_INPUT.fontSize}px`,
          // Background from Figma Grey/300
          bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : figmaGrey[300],
          transition: 'all 150ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            // Border from Figma Grey/500
            borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.12) : figmaGrey[500],
          },
          '&:hover': {
            bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.7) : figmaGrey[300],
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.2) : figmaGrey[600],
            },
          },
          '&.Mui-focused': {
            bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : figmaGrey[300],
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.text.secondary : figmaGrey[900],
              borderWidth: 1,
            },
          },
          '& input::placeholder': {
            // Placeholder color from Figma Neutral/400
            color: figmaNeutral[400],
            opacity: 1,
          },
        },
        ...props.sx,
      }}
      {...props}
    />
  )
})

export default Input
