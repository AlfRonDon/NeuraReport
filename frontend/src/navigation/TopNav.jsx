/**
 * Premium Top Navigation
 * Sophisticated header with glassmorphism, animations, and refined interactions
 */
import { useState, useCallback, useMemo } from 'react'
import { useNavigateInteraction, useInteraction, InteractionType, Reversibility } from '@/components/ux/governance'
import {
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Badge,
  Stack,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Typography,
  Button,
  Zoom,
  Fade,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  PersonOutline as PersonOutlineIcon,
  Keyboard as KeyboardIcon,
  HelpOutline as HelpOutlineIcon,
  Work as WorkIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'
import Breadcrumbs from './Breadcrumbs'
import { useAppStore } from '../stores'
import { useJobsList } from '../hooks/useJobs'
import { getShortcutDisplay, SHORTCUTS } from '../hooks/useKeyboardShortcuts'
import { withBase } from '../api/client'
import GlobalSearch from './GlobalSearch'
import NotificationCenter from './NotificationCenter'

// =============================================================================
// ANIMATIONS
// =============================================================================

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  // Solid white header from Figma - no blur
  backgroundColor: theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
  backdropFilter: 'none',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#E5E7EB'}`,
  boxShadow: 'none',
}))

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  gap: theme.spacing(2),
  minHeight: 60,
  padding: theme.spacing(0, 3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0, 2),
  },
}))

const NavIconButton = styled(IconButton)(({ theme }) => ({
  width: 36,
  height: 36,
  borderRadius: 8,
  // Muted grey icons from Figma
  color: theme.palette.mode === 'dark' ? '#8D8D86' : '#9CA3AF',
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    color: theme.palette.mode === 'dark' ? '#F1F0EF' : '#374151',
  },
  '&:active': {
    transform: 'none',
  },
}))

const ConnectionChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'connected',
})(({ theme, connected }) => ({
  height: 30,
  borderRadius: 10,
  backgroundColor: connected
    ? (theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.1) : '#F1F0EF')
    : (theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.06) : '#F9F9F8'),
  border: `1px solid ${connected
    ? (theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.15) : '#E2E1DE')
    : alpha(theme.palette.divider, 0.2)}`,
  color: theme.palette.text.secondary,
  fontWeight: 500,
  fontSize: '0.75rem',
  transition: 'all 0.2s ease',
  '& .MuiChip-icon': {
    marginLeft: 6,
  },
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.12) : '#E9E8E6',
  },
}))

const StatusDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'connected',
})(({ theme, connected }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: connected
    ? (theme.palette.mode === 'dark' ? '#82827C' : '#63635E')
    : (theme.palette.mode === 'dark' ? '#BCBBB5' : '#8D8D86'),
  boxShadow: connected
    ? `0 0 0 3px ${theme.palette.mode === 'dark' ? alpha('#82827C', 0.2) : alpha('#63635E', 0.2)}`
    : 'none',
  animation: connected ? `${pulse} 2s infinite ease-in-out` : 'none',
}))

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    // Neutral badge color - not green
    backgroundColor: theme.palette.mode === 'dark' ? '#63635E' : '#6B7280',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 600,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    boxShadow: 'none',
    animation: `${fadeIn} 0.3s ease-out`,
  },
}))

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(20px)',
    borderRadius: 14,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`,
    marginTop: theme.spacing(1),
    minWidth: 200,
  },
}))

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  borderRadius: 8,
  margin: theme.spacing(0.5, 1),
  padding: theme.spacing(1, 1.5),
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.08) : '#F1F0EF',
  },
}))

const MenuHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2, 1),
}))

const MenuLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: theme.palette.text.disabled,
}))

const ShortcutChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: '0.6875rem',
  fontFamily: 'var(--font-mono, monospace)',
  fontWeight: 500,
  backgroundColor: alpha(theme.palette.text.primary, 0.06),
  color: theme.palette.text.secondary,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 6,
}))

const HelpCard = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: alpha(theme.palette.background.paper, 0.5),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.04) : '#F9F9F8',
    borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.12) : '#E2E1DE',
  },
}))

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  },
  '& .MuiBackdrop-root': {
    backgroundColor: alpha(theme.palette.common.black, 0.5),
    backdropFilter: 'blur(4px)',
  },
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TopNav({ onMenuClick, showMenuButton, connection }) {
  const theme = useTheme()
  const { execute } = useInteraction()
  const navigate = useNavigateInteraction()
  const [anchorEl, setAnchorEl] = useState(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null)
  const downloads = useAppStore((state) => state.downloads)
  const jobsQuery = useJobsList({ limit: 5 })
  const jobs = jobsQuery?.data?.jobs || []

  const executeUI = useCallback((label, action, intent = {}) => {
    return execute({
      type: InteractionType.EXECUTE,
      label,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'topnav', ...intent },
      action,
    })
  }, [execute])

  const openMenu = useCallback((anchor) => {
    setAnchorEl(anchor)
  }, [])

  const closeMenu = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleOpenMenu = useCallback((event) => {
    const anchor = event.currentTarget
    return executeUI('Open user menu', () => openMenu(anchor))
  }, [executeUI, openMenu])

  const handleCloseMenu = useCallback(() => {
    return executeUI('Close user menu', () => closeMenu())
  }, [executeUI, closeMenu])

  const handleNavigate = useCallback((path, label) => {
    navigate(path, {
      label: label || `Open ${path}`,
      intent: { source: 'topnav', path },
    })
    closeMenu()
  }, [navigate, closeMenu])

  const handleMenuButtonClick = useCallback(() => {
    return executeUI('Open navigation menu', () => onMenuClick?.(), { target: 'sidebar' })
  }, [executeUI, onMenuClick])

  const handleOpenCommandPalette = useCallback(() => {
    return executeUI('Open command palette', () => {
      if (typeof window === 'undefined') return
      window.dispatchEvent(new CustomEvent('neura:open-command-palette'))
    })
  }, [executeUI])

  const handleOpenShortcuts = useCallback(() => executeUI('Open shortcuts', () => setShortcutsOpen(true)), [executeUI])
  const handleCloseShortcuts = useCallback(() => executeUI('Close shortcuts', () => setShortcutsOpen(false)), [executeUI])

  const handleOpenHelp = useCallback(() => executeUI('Open help', () => setHelpOpen(true)), [executeUI])
  const handleCloseHelp = useCallback(() => executeUI('Close help', () => setHelpOpen(false)), [executeUI])

  const closeNotifications = useCallback(() => {
    setNotificationsAnchorEl(null)
  }, [])

  const handleOpenNotifications = useCallback((event) => {
    const anchor = event.currentTarget
    return executeUI('Open notifications', () => setNotificationsAnchorEl(anchor))
  }, [executeUI])

  const handleCloseNotifications = useCallback(() => {
    return executeUI('Close notifications', () => closeNotifications())
  }, [executeUI, closeNotifications])

  const handleOpenJobsPanel = useCallback(() => {
    return executeUI('Open jobs panel', () => {
      if (typeof window === 'undefined') return
      window.dispatchEvent(new CustomEvent('neura:open-jobs-panel'))
      closeNotifications()
    })
  }, [executeUI, closeNotifications])

  const handleOpenDownload = useCallback((download) => {
    return executeUI('Open download', () => {
      const rawUrl = download?.pdfUrl || download?.docxUrl || download?.xlsxUrl || download?.htmlUrl || download?.url
      if (!rawUrl || typeof window === 'undefined') return
      const href = typeof rawUrl === 'string' ? withBase(rawUrl) : rawUrl
      window.open(href, '_blank', 'noopener')
      closeNotifications()
    }, { downloadId: download?.id })
  }, [executeUI, closeNotifications])

  const clearAppStorage = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith('neura') || key.startsWith('neurareport')) {
          window.localStorage.removeItem(key)
        }
      })
    } catch {
      // Ignore storage cleanup failures
    }
  }, [])

  const handleSignOut = useCallback(() => {
    return execute({
      type: InteractionType.LOGOUT,
      label: 'Sign out',
      reversibility: Reversibility.PARTIALLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'topnav' },
      action: () => {
        closeMenu()
        clearAppStorage()
        if (typeof window !== 'undefined') {
          window.location.assign('/')
        }
      },
    })
  }, [execute, closeMenu, clearAppStorage])

  const jobNotifications = useMemo(() => (
    Array.isArray(jobs) ? jobs.slice(0, 3) : []
  ), [jobs])
  const downloadNotifications = useMemo(() => (
    Array.isArray(downloads) ? downloads.slice(0, 3) : []
  ), [downloads])
  const notificationsCount = jobNotifications.length + downloadNotifications.length

  const shortcutItems = [
    { label: 'Command Palette', keys: getShortcutDisplay(SHORTCUTS.COMMAND_PALETTE).join(' + ') },
    { label: 'Close dialogs', keys: getShortcutDisplay(SHORTCUTS.CLOSE).join(' + ') },
  ]

  const helpActions = [
    { label: 'Open Setup Wizard', description: 'Connect a data source and upload templates.', path: '/setup/wizard' },
    { label: 'Manage Templates', description: 'Edit, duplicate, or export templates.', path: '/templates' },
    { label: 'Generate Reports', description: 'Run report jobs and download outputs.', path: '/reports' },
    { label: 'Analyze Documents', description: 'Extract tables and charts from files.', path: '/analyze' },
    { label: 'System Settings', description: 'View health checks and preferences.', path: '/settings' },
  ]

  const isConnected = connection?.status === 'connected'

  return (
    <StyledAppBar position="sticky" elevation={0}>
      <StyledToolbar>
        {/* Menu Button (Mobile) */}
        {showMenuButton && (
          <NavIconButton edge="start" onClick={handleMenuButtonClick} aria-label="Open menu">
            <MenuIcon sx={{ fontSize: 20 }} />
          </NavIconButton>
        )}

        {/* Breadcrumbs + Global Search */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Breadcrumbs />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <GlobalSearch variant="compact" enableShortcut={false} showShortcutHint={false} />
          </Box>
        </Box>

        {/* Connection Status */}
        {connection && (
          <Tooltip
            title={isConnected ? 'Database connected' : 'Connection issue'}
            arrow
            TransitionComponent={Zoom}
          >
            <ConnectionChip
              connected={isConnected}
              icon={<StatusDot connected={isConnected} />}
              label={connection.name || (isConnected ? 'Connected' : 'Disconnected')}
              size="small"
            />
          </Tooltip>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip
            title={`Search (${getShortcutDisplay(SHORTCUTS.COMMAND_PALETTE).join(' + ')})`}
            arrow
            TransitionComponent={Zoom}
          >
            <NavIconButton size="small" onClick={handleOpenCommandPalette} aria-label="Open search">
              <SearchIcon sx={{ fontSize: 18 }} />
            </NavIconButton>
          </Tooltip>

          <Tooltip title="Keyboard Shortcuts" arrow TransitionComponent={Zoom}>
            <NavIconButton size="small" onClick={handleOpenShortcuts} aria-label="View shortcuts">
              <KeyboardIcon sx={{ fontSize: 18 }} />
            </NavIconButton>
          </Tooltip>

          <NotificationCenter />

          <Tooltip title="Jobs & downloads" arrow TransitionComponent={Zoom}>
            <NavIconButton size="small" onClick={handleOpenNotifications} aria-label="View notifications">
              <StyledBadge badgeContent={notificationsCount} invisible={!notificationsCount}>
                <WorkIcon sx={{ fontSize: 18 }} />
              </StyledBadge>
            </NavIconButton>
          </Tooltip>

          <Tooltip title="Help" arrow TransitionComponent={Zoom}>
            <NavIconButton size="small" onClick={handleOpenHelp} aria-label="Open help">
              <HelpOutlineIcon sx={{ fontSize: 18 }} />
            </NavIconButton>
          </Tooltip>

          <NavIconButton
            size="small"
            onClick={handleOpenMenu}
            aria-label="User menu"
            sx={{ ml: 0.5 }}
          >
            <PersonOutlineIcon sx={{ fontSize: 18 }} />
          </NavIconButton>
        </Stack>

        {/* User Menu */}
        <StyledMenu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={Fade}
        >
          <StyledMenuItem onClick={() => handleNavigate('/settings')}>
            <ListItemIcon>
              <SettingsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </StyledMenuItem>
          <Divider sx={{ my: 0.5, mx: 1, borderColor: alpha(theme.palette.divider, 0.1) }} />
          <StyledMenuItem onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </StyledMenuItem>
        </StyledMenu>

        {/* Notifications Menu */}
        <StyledMenu
          anchorEl={notificationsAnchorEl}
          open={Boolean(notificationsAnchorEl)}
          onClose={handleCloseNotifications}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={Fade}
          slotProps={{ paper: { sx: { width: 320 } } }}
        >
          <MenuHeader>
            <MenuLabel>Jobs</MenuLabel>
          </MenuHeader>
          {jobNotifications.length ? jobNotifications.map((job) => (
            <StyledMenuItem
              key={job.id}
              onClick={() => {
                handleCloseNotifications()
                handleNavigate('/jobs', 'Open jobs')
              }}
            >
              <ListItemIcon>
                <WorkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary={job.template_name || job.template_id || job.id}
                secondary={`Status: ${(job.status || 'unknown').toString()}`}
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </StyledMenuItem>
          )) : (
            <MenuItem disabled sx={{ opacity: 0.5, mx: 1 }}>
              <ListItemText
                primary="No job updates yet"
                primaryTypographyProps={{ fontSize: '0.8125rem', color: 'text.secondary' }}
              />
            </MenuItem>
          )}

          <Divider sx={{ my: 1, mx: 1, borderColor: alpha(theme.palette.divider, 0.1) }} />

          <MenuHeader>
            <MenuLabel>Downloads</MenuLabel>
          </MenuHeader>
          {downloadNotifications.length ? downloadNotifications.map((download, index) => (
            <StyledMenuItem
              key={`${download.filename || download.template || 'download'}-${index}`}
              onClick={() => handleOpenDownload(download)}
            >
              <ListItemIcon>
                <DownloadIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary={download.filename || download.template || 'Recent download'}
                secondary={download.format ? download.format.toUpperCase() : 'Open file'}
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </StyledMenuItem>
          )) : (
            <MenuItem disabled sx={{ opacity: 0.5, mx: 1 }}>
              <ListItemText
                primary="No downloads yet"
                primaryTypographyProps={{ fontSize: '0.8125rem', color: 'text.secondary' }}
              />
            </MenuItem>
          )}

          <Divider sx={{ my: 1, mx: 1, borderColor: alpha(theme.palette.divider, 0.1) }} />

          <StyledMenuItem onClick={handleOpenJobsPanel}>
            <ListItemIcon>
              <OpenInNewIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Open Jobs Panel"
              primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}
            />
          </StyledMenuItem>
        </StyledMenu>

        {/* Keyboard Shortcuts Dialog */}
        <StyledDialog
          open={shortcutsOpen}
          onClose={handleCloseShortcuts}
          maxWidth="xs"
          fullWidth
          TransitionComponent={Fade}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Keyboard Shortcuts</DialogTitle>
          <DialogContent dividers sx={{ borderColor: alpha(theme.palette.divider, 0.1) }}>
            <Stack spacing={2}>
              {shortcutItems.map((item) => (
                <Box
                  key={item.label}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ fontSize: '0.875rem' }}>
                    {item.label}
                  </Typography>
                  <ShortcutChip label={item.keys} size="small" />
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, p: 2 }}>
            <Button
              onClick={handleCloseShortcuts}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
            >
              Close
            </Button>
          </DialogActions>
        </StyledDialog>

        {/* Help Dialog */}
        <StyledDialog
          open={helpOpen}
          onClose={handleCloseHelp}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Fade}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Help Center</DialogTitle>
          <DialogContent dividers sx={{ borderColor: alpha(theme.palette.divider, 0.1) }}>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 3 }}>
              Jump to common workflows or explore system settings.
            </Typography>
            <Stack spacing={1.5}>
              {helpActions.map((action) => (
                <HelpCard key={action.label}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.25 }}>
                      {action.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {action.description}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      handleCloseHelp()
                      handleNavigate(action.path, `Open ${action.label}`)
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      minWidth: 64,
                    }}
                  >
                    Open
                  </Button>
                </HelpCard>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, p: 2 }}>
            <Button
              onClick={handleCloseHelp}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
            >
              Close
            </Button>
          </DialogActions>
        </StyledDialog>
      </StyledToolbar>
    </StyledAppBar>
  )
}
