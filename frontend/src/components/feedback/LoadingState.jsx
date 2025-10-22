import { LinearProgress, Stack, Typography } from '@mui/material'

export default function LoadingState({
  label = 'Loading…',
  description,
  progress = null,
  inline = false,
  sx = [],
  ...props
}) {
  const sxArray = Array.isArray(sx) ? sx : [sx]
  const spacing = inline ? 1 : 1.5
  const width = inline ? 'auto' : '100%'

  return (
    <Stack
      direction="column"
      spacing={spacing}
      sx={[{ width, maxWidth: inline ? '100%' : 440 }, ...sxArray]}
      {...props}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <LinearProgress
        variant={progress == null ? 'indeterminate' : 'determinate'}
        value={progress ?? undefined}
        aria-label={label}
      />
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Stack>
  )
}

