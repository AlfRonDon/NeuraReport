import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  alpha,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import WorkIcon from '@mui/icons-material/Work'
import DownloadIcon from '@mui/icons-material/Download'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import Breadcrumbs from './Breadcrumbs'
import { useAppStore } from '../store/useAppStore'
import { useJobsList } from '../hooks/useJobs'
import { getShortcutDisplay, SHORTCUTS } from '../hooks/useKeyboardShortcuts'
import { withBase } from '../api/client'
import GlobalSearch from '../components/GlobalSearch'
import NotificationCenter from '../components/notifications/NotificationCenter'
import { palette } from '../theme'

export default function TopNav({ onMenuClick, showMenuButton, connection }) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null)
  const downloads = useAppStore((state) => state.downloads)
  const jobsQuery = useJobsList({ limit: 5 })
  const jobs = jobsQuery?.data?.jobs || []

  const handleOpenMenu = useCallback((event) => {
    setAnchorEl(event.currentTarget)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleNavigate = useCallback((path) => {
    navigate(path)
    handleCloseMenu()
  }, [navigate, handleCloseMenu])

  const handleOpenCommandPalette = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('neura:open-command-palette'))
  }, [])

  const handleOpenShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const handleCloseShortcuts = useCallback(() => setShortcutsOpen(false), [])

  const handleOpenHelp = useCallback(() => setHelpOpen(true), [])
  const handleCloseHelp = useCallback(() => setHelpOpen(false), [])

  const handleOpenNotifications = useCallback((event) => {
    setNotificationsAnchorEl(event.currentTarget)
  }, [])

  const handleCloseNotifications = useCallback(() => {
    setNotificationsAnchorEl(null)
  }, [])

  const handleOpenJobsPanel = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('neura:open-jobs-panel'))
    handleCloseNotifications()
  }, [handleCloseNotifications])

  const handleOpenDownload = useCallback((download) => {
    const rawUrl = download?.pdfUrl || download?.docxUrl || download?.xlsxUrl || download?.htmlUrl || download?.url
    if (!rawUrl || typeof window === 'undefined') return
    const href = typeof rawUrl === 'string' ? withBase(rawUrl) : rawUrl
    window.open(href, '_blank', 'noopener')
    handleCloseNotifications()
  }, [handleCloseNotifications])

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
    handleCloseMenu()
    clearAppStorage()
    if (typeof window !== 'undefined') {
      window.location.assign('/')
    }
  }, [handleCloseMenu, clearAppStorage])

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

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: palette.scale[1100],
        borderBottom: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Toolbar
        sx={{
          gap: 2,
          minHeight: 56,
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Menu Button (Mobile) */}
        {showMenuButton && (
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{
              color: palette.scale[400],
              mr: 1,
              '&:hover': {
                bgcolor: alpha(palette.scale[100], 0.08),
                color: palette.scale[100],
              },
            }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>
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
          <Chip
            icon={
              connection.status === 'connected' ? (
                <CheckCircleIcon sx={{ fontSize: 14, color: palette.green[400] }} />
              ) : (
                <ErrorOutlineIcon sx={{ fontSize: 14, color: palette.yellow[400] }} />
              )
            }
            label={
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                {connection.name || 'Connected'}
              </Typography>
            }
            size="small"
            sx={{
              height: 26,
              bgcolor: connection.status === 'connected'
                ? alpha(palette.green[400], 0.1)
                : alpha(palette.yellow[400], 0.1),
              border: `1px solid ${
                connection.status === 'connected'
                  ? alpha(palette.green[400], 0.2)
                  : alpha(palette.yellow[400], 0.2)
              }`,
              color: connection.status === 'connected'
                ? palette.green[400]
                : palette.yellow[400],
              '& .MuiChip-icon': {
                ml: 0.5,
              },
            }}
          />
        )}

        {/* Actions */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={`Search (${getShortcutDisplay(SHORTCUTS.COMMAND_PALETTE).join(' + ')})`} arrow>
            <IconButton
              size="small"
              onClick={handleOpenCommandPalette}
              sx={{
                color: palette.scale[500],
                p: 1,
                '&:hover': {
                  bgcolor: alpha(palette.scale[100], 0.08),
                  color: palette.scale[100],
                },
              }}
            >
              <SearchIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Keyboard Shortcuts" arrow>
            <IconButton
              size="small"
              onClick={handleOpenShortcuts}
              sx={{
                color: palette.scale[500],
                p: 1,
                '&:hover': {
                  bgcolor: alpha(palette.scale[100], 0.08),
                  color: palette.scale[100],
                },
              }}
            >
              <KeyboardIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <NotificationCenter />

          <Tooltip title="Jobs & downloads" arrow>
            <IconButton
              size="small"
              onClick={handleOpenNotifications}
              sx={{
                color: palette.scale[500],
                p: 1,
                '&:hover': {
                  bgcolor: alpha(palette.scale[100], 0.08),
                  color: palette.scale[100],
                },
              }}
            >
              <Badge
                badgeContent={notificationsCount}
                color="primary"
                invisible={!notificationsCount}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: palette.green[400],
                    color: palette.scale[1100],
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    minWidth: 16,
                    height: 16,
                  },
                }}
              >
                <WorkIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Help" arrow>
            <IconButton
              size="small"
              onClick={handleOpenHelp}
              sx={{
                color: palette.scale[500],
                p: 1,
                '&:hover': {
                  bgcolor: alpha(palette.scale[100], 0.08),
                  color: palette.scale[100],
                },
              }}
            >
              <HelpOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <IconButton
            size="small"
            onClick={handleOpenMenu}
            sx={{
              color: palette.scale[500],
              p: 1,
              ml: 0.5,
              '&:hover': {
                bgcolor: alpha(palette.scale[100], 0.08),
                color: palette.scale[100],
              },
            }}
          >
            <PersonOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>

        {/* User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                width: 200,
                mt: 1,
                bgcolor: palette.scale[900],
                border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              },
            },
          }}
        >
          <MenuItem
            onClick={() => handleNavigate('/settings')}
            sx={{
              color: palette.scale[200],
              '&:hover': {
                bgcolor: alpha(palette.scale[100], 0.05),
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon sx={{ fontSize: 16, color: palette.scale[500] }} />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            />
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: alpha(palette.scale[100], 0.08) }} />
          <MenuItem
            onClick={handleSignOut}
            sx={{
              color: palette.scale[200],
              '&:hover': {
                bgcolor: alpha(palette.scale[100], 0.05),
              },
            }}
          >
            <ListItemIcon>
              <LogoutIcon sx={{ fontSize: 16, color: palette.scale[500] }} />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            />
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchorEl}
          open={Boolean(notificationsAnchorEl)}
          onClose={handleCloseNotifications}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                width: 300,
                mt: 1,
                bgcolor: palette.scale[900],
                border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              },
            },
          }}
        >
          <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: palette.scale[600],
              }}
            >
              Jobs
            </Typography>
          </Box>
          {jobNotifications.length ? jobNotifications.map((job) => (
            <MenuItem
              key={job.id}
              onClick={() => {
                handleCloseNotifications()
                navigate('/jobs')
              }}
              sx={{ color: palette.scale[200] }}
            >
              <ListItemIcon>
                <WorkIcon sx={{ fontSize: 16, color: palette.scale[500] }} />
              </ListItemIcon>
              <ListItemText
                primary={job.template_name || job.template_id || job.id}
                secondary={`Status: ${(job.status || 'unknown').toString()}`}
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem', color: palette.scale[500] }}
              />
            </MenuItem>
          )) : (
            <MenuItem disabled sx={{ opacity: 0.6 }}>
              <ListItemText
                primary="No job updates yet"
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
              />
            </MenuItem>
          )}

          <Divider sx={{ my: 0.5, borderColor: alpha(palette.scale[100], 0.08) }} />

          <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: palette.scale[600],
              }}
            >
              Downloads
            </Typography>
          </Box>
          {downloadNotifications.length ? downloadNotifications.map((download, index) => (
            <MenuItem
              key={`${download.filename || download.template || 'download'}-${index}`}
              onClick={() => handleOpenDownload(download)}
              sx={{ color: palette.scale[200] }}
            >
              <ListItemIcon>
                <DownloadIcon sx={{ fontSize: 16, color: palette.scale[500] }} />
              </ListItemIcon>
              <ListItemText
                primary={download.filename || download.template || 'Recent download'}
                secondary={download.format ? download.format.toUpperCase() : 'Open file'}
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem', color: palette.scale[500] }}
              />
            </MenuItem>
          )) : (
            <MenuItem disabled sx={{ opacity: 0.6 }}>
              <ListItemText
                primary="No downloads yet"
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
              />
            </MenuItem>
          )}

          <Divider sx={{ my: 0.5, borderColor: alpha(palette.scale[100], 0.08) }} />

          <MenuItem onClick={handleOpenJobsPanel} sx={{ color: palette.scale[200] }}>
            <ListItemIcon>
              <WorkIcon sx={{ fontSize: 16, color: palette.scale[500] }} />
            </ListItemIcon>
            <ListItemText
              primary="Open Jobs Panel"
              primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}
            />
          </MenuItem>
        </Menu>

        {/* Keyboard Shortcuts Dialog */}
        <Dialog
          open={shortcutsOpen}
          onClose={handleCloseShortcuts}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: palette.scale[900],
              border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
            },
          }}
        >
          <DialogTitle sx={{ color: palette.scale[100] }}>Keyboard Shortcuts</DialogTitle>
          <DialogContent dividers sx={{ borderColor: alpha(palette.scale[100], 0.1) }}>
            <Stack spacing={1.5}>
              {shortcutItems.map((item) => (
                <Box
                  key={item.label}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                    {item.label}
                  </Typography>
                  <Chip
                    label={item.keys}
                    size="small"
                    sx={{
                      fontFamily: 'var(--font-mono)',
                      bgcolor: alpha(palette.scale[100], 0.08),
                      color: palette.scale[200],
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}` }}>
            <Button onClick={handleCloseShortcuts} sx={{ textTransform: 'none' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Help Dialog */}
        <Dialog
          open={helpOpen}
          onClose={handleCloseHelp}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: palette.scale[900],
              border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
            },
          }}
        >
          <DialogTitle sx={{ color: palette.scale[100] }}>Help Center</DialogTitle>
          <DialogContent dividers sx={{ borderColor: alpha(palette.scale[100], 0.1) }}>
            <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[400], mb: 2 }}>
              Jump to common workflows or explore system settings.
            </Typography>
            <Stack spacing={1.25}>
              {helpActions.map((action) => (
                <Box
                  key={action.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
                    bgcolor: alpha(palette.scale[100], 0.02),
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200], fontWeight: 600 }}>
                      {action.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: palette.scale[500] }}>
                      {action.description}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      handleCloseHelp()
                      navigate(action.path)
                    }}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Open
                  </Button>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}` }}>
            <Button onClick={handleCloseHelp} sx={{ textTransform: 'none' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Toolbar>
    </AppBar>
  )
}
