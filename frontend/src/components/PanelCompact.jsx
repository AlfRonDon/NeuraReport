import Paper from '@mui/material/Paper'
import { alpha } from '@mui/material/styles'

const baseSx = (theme) => ({
  borderRadius: { xs: 2.5, md: 3 },
  borderColor: alpha(theme.palette.divider, 0.6),
  backgroundColor: alpha(
    theme.palette.background.paper,
    theme.palette.mode === 'dark' ? 0.75 : 0.95,
  ),
  backdropFilter: 'blur(8px)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 10px 30px rgba(0, 0, 0, 0.35)'
      : '0 18px 38px rgba(15, 23, 42, 0.09)',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
})

export default function PanelCompact({ children, sx = [], elevation = 0, ...props }) {
  const sxArray = Array.isArray(sx) ? sx : [sx]

  return (
    <Paper
      variant="outlined"
      elevation={elevation}
      {...props}
      sx={[baseSx, ...sxArray]}
    >
      {children}
    </Paper>
  )
}
