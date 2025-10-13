import Paper from '@mui/material/Paper'

const baseSx = {
  p: { xs: 3, md: 3.5 },
  display: 'flex',
  flexDirection: 'column',
  gap: { xs: 2, md: 2.5 },
  backgroundColor: 'background.paper',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
}

export default function Surface({ children, sx = [], ...props }) {
  const sxArray = Array.isArray(sx) ? sx : [sx]
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={[
        baseSx,
        ...sxArray,
      ]}
    >
      {children}
    </Paper>
  )
}
