import { Box } from '@mui/material'

const KEY_MAP = {
  cmd: '⌘',
  ctrl: 'Ctrl',
  alt: '⌥',
  shift: '⇧',
  enter: '↵',
  esc: 'Esc',
  tab: 'Tab',
  space: 'Space',
  backspace: '⌫',
  delete: 'Del',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

export default function Kbd({ children, size = 'small', sx, ...props }) {
  const displayKey = KEY_MAP[children?.toLowerCase?.()] || children

  const sizes = {
    small: {
      px: 0.75,
      py: 0.25,
      fontSize: '0.6875rem',
      minWidth: 20,
    },
    medium: {
      px: 1,
      py: 0.5,
      fontSize: '0.75rem',
      minWidth: 24,
    },
  }

  const sizeStyles = sizes[size] || sizes.small

  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sizeStyles,
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderBottomWidth: 2,
        fontFamily: 'inherit',
        fontWeight: 500,
        lineHeight: 1,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...sx,
      }}
      {...props}
    >
      {displayKey}
    </Box>
  )
}

export function KbdCombo({ keys = [], separator = '+', size = 'small', sx }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ...sx,
      }}
    >
      {keys.map((key, idx) => (
        <Box key={idx} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          {idx > 0 && (
            <Box component="span" sx={{ fontSize: '0.625rem', opacity: 0.5 }}>
              {separator}
            </Box>
          )}
          <Kbd size={size}>{key}</Kbd>
        </Box>
      ))}
    </Box>
  )
}
