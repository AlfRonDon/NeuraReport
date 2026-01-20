import { Stack, Typography, Box } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

/**
 * Presents a friendly empty/error/loading placeholder with optional action slot.
 */
export default function EmptyState({
  icon: Icon = InfoOutlinedIcon,
  iconColor = 'primary.main',
  title,
  description,
  action = null,
  align = 'center',
  size = 'medium',
  sx = [],
  ...props
}) {
  const IconComponent = Icon
  const iconSize = size === 'large' ? 48 : size === 'small' ? 28 : 36
  const spacing = size === 'large' ? 2.75 : size === 'small' ? 1.5 : 2
  const px = size === 'large' ? 3 : size === 'small' ? 1.5 : 2.5
  const py = size === 'large' ? 3.5 : size === 'small' ? 2 : 2.75
  const sxArray = Array.isArray(sx) ? sx : [sx]

  return (
    <Stack
      spacing={spacing}
      alignItems={align === 'center' ? 'center' : 'flex-start'}
      textAlign={align}
      sx={[
        {
          px,
          py,
          borderRadius: 2,
          bgcolor: 'background.default',
          border: '1px dashed',
          borderColor: 'divider',
        },
        ...sxArray,
      ]}
      {...props}
    >
      <Box
        aria-hidden
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          bgcolor: 'common.white',
          color: iconColor,
          boxShadow: 'inset 0 0 0 1px var(--mui-palette-divider)',
        }}
      >
        <IconComponent fontSize="inherit" sx={{ fontSize: iconSize - 6 }} />
      </Box>
      {title && (
        <Typography variant="subtitle1" component="h3">
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  )
}
