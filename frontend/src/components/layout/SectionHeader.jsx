import { Box, Stack, Typography } from '@mui/material'

const SectionHeader = ({
  title,
  subtitle = null,
  eyebrow = null,
  action = null,
  align = 'flex-start',
  sx = [],
  ...props
}) => {
  const sxArray = Array.isArray(sx) ? sx : [sx]
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'flex-start', sm: align }}
      justifyContent="space-between"
      sx={[
        {
          width: '100%',
          gap: 1,
        },
        ...sxArray,
      ]}
      {...props}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              letterSpacing: '0.1em',
              fontWeight: (theme) => theme.typography.fontWeightMedium,
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Stack>
      {action ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {action}
        </Box>
      ) : null}
    </Stack>
  )
}

export default SectionHeader

