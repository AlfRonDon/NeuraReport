/**
 * Premium Breadcrumbs
 * Navigation path with theme-based styling
 */
import { useMemo } from 'react'
import { useLocation, Link as RouterLink } from 'react-router-dom'
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, useTheme, alpha } from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import HomeIcon from '@mui/icons-material/Home'

const ROUTE_LABELS = {
  connections: 'Connections',
  templates: 'Templates',
  reports: 'Reports',
  jobs: 'Jobs',
  schedules: 'Schedules',
  analyze: 'Analyze',
  settings: 'Settings',
  setup: 'Setup',
  general: 'General',
  database: 'Database',
  notifications: 'Notifications',
  api: 'API',
  new: 'New',
  edit: 'Edit',
  wizard: 'New Report',
}

export default function Breadcrumbs() {
  const theme = useTheme()
  const location = useLocation()

  const crumbs = useMemo(() => {
    const pathnames = location.pathname.split('/').filter((x) => x)

    return pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`
      const label = ROUTE_LABELS[value] || value
      const isLast = index === pathnames.length - 1

      return { to, label, isLast }
    })
  }, [location.pathname])

  if (crumbs.length === 0) {
    return (
      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: theme.palette.text.primary,
        }}
      >
        Dashboard
      </Typography>
    )
  }

  return (
    <MuiBreadcrumbs
      separator={
        <NavigateNextIcon
          sx={{
            fontSize: 14,
            color: theme.palette.text.disabled,
            mx: 0.25,
          }}
        />
      }
      aria-label="breadcrumb"
    >
      <Link
        component={RouterLink}
        to="/"
        underline="none"
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: theme.palette.text.secondary,
          transition: 'color 150ms ease',
          '&:hover': { color: theme.palette.text.primary },
        }}
      >
        <HomeIcon sx={{ fontSize: 16 }} />
      </Link>
      {crumbs.map((crumb) =>
        crumb.isLast ? (
          <Typography
            key={crumb.to}
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: theme.palette.text.primary,
            }}
          >
            {crumb.label}
          </Typography>
        ) : (
          <Link
            key={crumb.to}
            component={RouterLink}
            to={crumb.to}
            underline="none"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 400,
              color: theme.palette.text.secondary,
              transition: 'color 150ms ease',
              '&:hover': { color: theme.palette.text.primary },
            }}
          >
            {crumb.label}
          </Link>
        )
      )}
    </MuiBreadcrumbs>
  )
}
