import { LinearProgress, Stack, Typography } from '@mui/material'

export default function LoadingState({
  label = 'Loading…',
  description,
  progress = null,
  inline = false,
  dense = false,
  color = 'primary',
  sx = [],
  ...props
}) {
  const sxArray = Array.isArray(sx) ? sx : [sx]
  const spacing = inline || dense ? 0.75 : 1.5
  const width = inline ? 'auto' : '100%'

  return (
    <Stack
      direction="column"
      spacing={spacing}
      role="status"
      aria-live="polite"
      sx={[
        {
          width,
          maxWidth: inline ? '100%' : 440,
        },
        ...sxArray,
      ]}
      {...props}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <LinearProgress
        variant={progress == null ? 'indeterminate' : 'determinate'}
        value={progress ?? undefined}
        color={color}
        aria-label={label}
        sx={{ borderRadius: 2 }}
      />
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Stack>
  )
}

