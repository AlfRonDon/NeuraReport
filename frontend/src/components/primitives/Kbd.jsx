import { Box, alpha } from '@mui/material'

const KEY_MAP = {
  cmd: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  enter: '↵',
  return: '↵',
  esc: 'esc',
  escape: 'esc',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  tab: '⇥',
  backspace: '⌫',
  delete: '⌦',
  space: '␣',
}

export default function Kbd({ children, size = 'medium' }) {
  const text = String(children).toLowerCase()
  const display = KEY_MAP[text] || children

  const sizes = {
    small: { px: 0.5, py: 0.25, fontSize: '0.65rem', minWidth: 16 },
    medium: { px: 0.75, py: 0.25, fontSize: '0.75rem', minWidth: 20 },
    large: { px: 1, py: 0.5, fontSize: '0.875rem', minWidth: 24 },
  }

  const sizeProps = sizes[size] || sizes.medium

  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sizeProps,
        borderRadius: 0.75,
        bgcolor: (theme) => alpha(theme.palette.action.selected, 0.8),
        border: 1,
        borderColor: 'divider',
        fontFamily: 'inherit',
        fontWeight: 500,
        color: 'text.secondary',
        whiteSpace: 'nowrap',
      }}
    >
      {display}
    </Box>
  )
}
