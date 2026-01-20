import { forwardRef } from 'react'
import { IconButton as MuiIconButton, Tooltip, alpha } from '@mui/material'

const IconButton = forwardRef(function IconButton(
  {
    children,
    tooltip,
    size = 'medium',
    color = 'default',
    disabled = false,
    ...props
  },
  ref
) {
  const button = (
    <MuiIconButton
      ref={ref}
      size={size}
      color={color}
      disabled={disabled}
      sx={{
        borderRadius: 2,
        transition: 'all 150ms ease',
        '&:hover': {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        },
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </MuiIconButton>
  )

  if (tooltip && !disabled) {
    return (
      <Tooltip title={tooltip} arrow>
        {button}
      </Tooltip>
    )
  }

  return button
})

export default IconButton
