import { forwardRef } from 'react'
import { Box, Stack, Typography, Breadcrumbs, Link } from '@mui/material'

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])

function renderCrumb(crumb, index) {
  if (!crumb) return null
  if (typeof crumb === 'string') {
    return (
      <Typography
        key={`${crumb}-${index}`}
        variant="body2"
        color="text.secondary"
      >
        {crumb}
      </Typography>
    )
  }
  const { label, href, onClick, icon: IconComponent } = crumb
  const leading = IconComponent ? <IconComponent fontSize="inherit" /> : null
  if (href || onClick) {
    return (
      <Link
        key={`${label || href || index}-${index}`}
        underline="hover"
        color="text.secondary"
        href={href}
        onClick={onClick}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        {leading}
        <span>{label}</span>
      </Link>
    )
  }
  return (
    <Typography
      key={`${label || index}-${index}`}
      variant="body2"
      color="text.secondary"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
    >
      {leading}
      <span>{label}</span>
    </Typography>
  )
}

const PageHeader = forwardRef(function PageHeader(
  {
    eyebrow = null,
    title,
    description = null,
    actions = null,
    breadcrumbs = null,
    children,
    sx = [],
    disablePadding = false,
    ...props
  },
  ref,
) {
  const sxArray = Array.isArray(sx) ? sx : [sx]
  const crumbs = toArray(breadcrumbs).filter(Boolean)

  return (
    <Box
      ref={ref}
      sx={[
        {
          width: '100%',
          pt: disablePadding ? 0 : { xs: 1, sm: 1.5 },
          pb: disablePadding ? 0 : { xs: 1.5, sm: 2 },
        },
        ...sxArray,
      ]}
      {...props}
    >
      <Stack
        spacing={1}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'stretch' },
          gap: 1.5,
        }}
      >
        {!!crumbs.length && (
          <Breadcrumbs
            aria-label="breadcrumb"
            separator="/"
            sx={{ fontSize: 13, color: 'text.secondary' }}
          >
            {crumbs.map((crumb, index) => renderCrumb(crumb, index))}
          </Breadcrumbs>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={0.75}>
            {eyebrow && (
              <Typography
                variant="overline"
                sx={{
                  color: 'text.secondary',
                  letterSpacing: '0.12em',
                  fontWeight: (theme) => theme.typography.fontWeightBold,
                }}
              >
                {eyebrow}
              </Typography>
            )}
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
            {description && (
              <Typography variant="body1" color="text.secondary">
                {description}
              </Typography>
            )}
          </Stack>
          {actions ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Box>
  )
})

export default PageHeader
