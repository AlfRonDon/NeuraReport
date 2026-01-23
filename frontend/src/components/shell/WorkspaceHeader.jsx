import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Stack,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import RefreshIcon from '@mui/icons-material/Refresh'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey'
import { useAppStore } from '../../stores'
import NotificationCenter from '../notifications/NotificationCenter'

const WORKSPACE_META = {
  setup: {
    title: 'Setup',
    description: 'Configure database connection and templates',
  },
  reports: {
    title: 'Generate Reports',
    description: 'Select templates and create reports',
  },
  analyze: {
    title: 'Analyze Documents',
    description: 'AI-powered document analysis',
  },
  editor: {
    title: 'Template Editor',
    description: 'Edit and customize templates',
  },
}

export default function WorkspaceHeader({
  workspace,
  context,
  status,
  onRefresh,
  actions,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const connection = useAppStore((s) => s.connection)
  const templates = useAppStore((s) => s.templates)

  const meta = WORKSPACE_META[workspace] || WORKSPACE_META.setup

  const breadcrumbs = useMemo(() => {
    const crumbs = []
    const path = location.pathname

    if (path === '/') {
      crumbs.push({ label: 'Setup', path: '/', active: true })
    } else if (path === '/reports') {
      crumbs.push({ label: 'Reports', path: '/reports', active: true })
    } else if (path === '/analyze') {
      crumbs.push({ label: 'Analyze', path: '/analyze', active: true })
    } else if (path.startsWith('/templates/')) {
      crumbs.push({ label: 'Reports', path: '/reports', active: false })
      crumbs.push({ label: 'Edit Template', path: path, active: true })
    }

    return crumbs
  }, [location.pathname])

  const statusChips = useMemo(() => {
    const chips = []

    if (connection?.status === 'connected') {
      chips.push({
        label: connection.name || 'Connected',
        color: 'success',
        variant: 'outlined',
      })
    }

    const approvedCount = templates.filter((t) => t.status === 'approved').length
    if (approvedCount > 0) {
      chips.push({
        label: `${approvedCount} template${approvedCount !== 1 ? 's' : ''}`,
        color: 'default',
        variant: 'outlined',
      })
    }

    if (status) {
      chips.push(status)
    }

    return chips
  }, [connection, templates, status])

  return (
    <Box
      sx={{
        height: 56,
        minHeight: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Left: Breadcrumbs + Title */}
      <Stack direction="row" alignItems="center" spacing={2}>
        {breadcrumbs.length > 1 ? (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" sx={{ opacity: 0.5 }} />}
            sx={{ '& .MuiBreadcrumbs-li': { lineHeight: 1 } }}
          >
            {breadcrumbs.map((crumb) =>
              crumb.active ? (
                <Typography
                  key={crumb.path}
                  variant="subtitle1"
                  fontWeight={600}
                  color="text.primary"
                >
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={crumb.path}
                  component="button"
                  variant="subtitle1"
                  underline="hover"
                  color="text.secondary"
                  onClick={() => navigate(crumb.path)}
                  sx={{ fontWeight: 500 }}
                >
                  {crumb.label}
                </Link>
              )
            )}
          </Breadcrumbs>
        ) : (
          <Typography variant="subtitle1" fontWeight={600}>
            {meta.title}
          </Typography>
        )}

        {context && (
          <Chip
            label={context}
            size="small"
            sx={{
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 500,
            }}
          />
        )}
      </Stack>

      {/* Right: Status + Actions */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* Status Chips */}
        {statusChips.map((chip, idx) => (
          <Chip
            key={idx}
            label={chip.label}
            size="small"
            color={chip.color || 'default'}
            variant={chip.variant || 'filled'}
          />
        ))}

        {/* Quick Actions */}
        {onRefresh && (
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={onRefresh} aria-label="Refresh">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <NotificationCenter />

        <Tooltip title="Keyboard shortcuts (⌘K)">
          <IconButton
            size="small"
            aria-label="Keyboard shortcuts"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('neura:open-command-palette'))
              }
            }}
          >
            <KeyboardCommandKeyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {actions}
      </Stack>
    </Box>
  )
}
