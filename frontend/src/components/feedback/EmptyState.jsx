import { Stack, Typography, Box, alpha } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { palette } from '../../theme'

export default function EmptyState({
  icon: Icon = InfoOutlinedIcon,
  iconColor,
  title,
  description,
  action = null,
  align = 'center',
  size = 'medium',
  sx = [],
  ...props
}) {
  const IconComponent = Icon
  const iconSize = size === 'large' ? 56 : size === 'small' ? 36 : 48
  const spacing = size === 'large' ? 2.5 : size === 'small' ? 1.5 : 2
  const px = size === 'large' ? 4 : size === 'small' ? 2 : 3
  const py = size === 'large' ? 5 : size === 'small' ? 3 : 4
  const sxArray = Array.isArray(sx) ? sx : [sx]
  const resolvedIconColor = iconColor || palette.scale[500]

  return (
    <Stack
      spacing={spacing}
      alignItems={align === 'center' ? 'center' : 'flex-start'}
      textAlign={align}
      sx={[
        {
          px,
          py,
          borderRadius: '12px',
          bgcolor: palette.scale[1000],
          border: `1px dashed ${alpha(palette.scale[100], 0.15)}`,
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
          borderRadius: '12px',
          bgcolor: alpha(palette.scale[100], 0.05),
          border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          color: resolvedIconColor,
        }}
      >
        <IconComponent sx={{ fontSize: iconSize * 0.5 }} />
      </Box>
      {title && (
        <Typography
          sx={{
            fontSize: size === 'large' ? '1.125rem' : size === 'small' ? '0.875rem' : '1rem',
            fontWeight: 600,
            color: palette.scale[100],
          }}
        >
          {title}
        </Typography>
      )}
      {description && (
        <Typography
          sx={{
            fontSize: size === 'large' ? '0.875rem' : '0.8125rem',
            color: palette.scale[500],
            maxWidth: 380,
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  )
}
