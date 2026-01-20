import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  alpha,
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import DescriptionIcon from '@mui/icons-material/Description'
import AssessmentIcon from '@mui/icons-material/Assessment'
import WorkIcon from '@mui/icons-material/Work'
import SettingsIcon from '@mui/icons-material/Settings'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ScheduleIcon from '@mui/icons-material/Schedule'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import MenuIcon from '@mui/icons-material/Menu'
import AddIcon from '@mui/icons-material/Add'
import { useAppStore } from '../store/useAppStore'
import { palette } from '../theme'

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon, path: '/' },
    ],
  },
  {
    section: 'Data',
    items: [
      { key: 'connections', label: 'Connections', icon: StorageIcon, path: '/connections' },
      { key: 'templates', label: 'Templates', icon: DescriptionIcon, path: '/templates' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { key: 'reports', label: 'Reports', icon: AssessmentIcon, path: '/reports' },
      { key: 'schedules', label: 'Schedules', icon: ScheduleIcon, path: '/schedules' },
      { key: 'jobs', label: 'Jobs', icon: WorkIcon, path: '/jobs', badge: true },
      { key: 'analyze', label: 'Analyze', icon: AutoAwesomeIcon, path: '/analyze' },
    ],
  },
  {
    section: 'System',
    items: [
      { key: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings' },
    ],
  },
]

export default function Sidebar({ width, collapsed, mobileOpen, onClose, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const activeJobs = useAppStore((s) => {
    const jobs = s.jobs || []
    return jobs.filter((j) => j.status === 'running' || j.status === 'pending').length
  })

  const handleNavigate = useCallback((path) => {
    navigate(path)
    onClose?.()
  }, [navigate, onClose])

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: palette.scale[1000],
        borderRight: `1px solid ${alpha(palette.scale[100], 0.08)}`,
      }}
    >
      {/* Logo/Header */}
      <Box
        sx={{
          px: collapsed ? 1.5 : 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 56,
          borderBottom: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        }}
      >
        {!collapsed && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              transition: 'opacity 150ms ease',
              '&:hover': { opacity: 0.8 },
            }}
            onClick={() => handleNavigate('/')}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                bgcolor: palette.green[400],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: palette.scale[1100],
                fontWeight: 700,
                fontSize: '0.6875rem',
                letterSpacing: '-0.02em',
              }}
            >
              NR
            </Box>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: palette.scale[100],
                letterSpacing: '-0.01em',
              }}
            >
              NeuraReport
            </Typography>
          </Box>
        )}
        <IconButton
          size="small"
          onClick={onToggle}
          sx={{
            color: palette.scale[500],
            p: 0.75,
            '&:hover': {
              color: palette.scale[100],
              bgcolor: alpha(palette.scale[100], 0.08),
            },
          }}
        >
          {collapsed ? <MenuIcon sx={{ fontSize: 18 }} /> : <ChevronLeftIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ p: collapsed ? 1 : 1.5 }}>
        <Tooltip title={collapsed ? 'New Report' : ''} placement="right" arrow>
          <ListItemButton
            onClick={() => handleNavigate('/setup/wizard')}
            sx={{
              borderRadius: '6px',
              border: `1px dashed ${alpha(palette.scale[100], 0.15)}`,
              color: palette.scale[400],
              justifyContent: collapsed ? 'center' : 'flex-start',
              py: 1,
              px: collapsed ? 1 : 1.5,
              transition: 'all 150ms ease',
              '&:hover': {
                borderColor: palette.green[400],
                bgcolor: alpha(palette.green[400], 0.08),
                color: palette.scale[100],
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed ? 0 : 32,
                color: 'inherit',
              }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="New Report"
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'inherit',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08), mx: 1.5 }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {NAV_ITEMS.map((section, sectionIndex) => (
          <Box key={section.section}>
            {!collapsed && (
              <Typography
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: palette.scale[600],
                }}
              >
                {section.section}
              </Typography>
            )}
            <List disablePadding sx={{ px: 1 }}>
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                const badgeContent = item.badge ? activeJobs : 0

                return (
                  <ListItem key={item.key} disablePadding sx={{ mb: 0.25 }}>
                    <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                      <ListItemButton
                        onClick={() => handleNavigate(item.path)}
                        selected={active}
                        sx={{
                          borderRadius: '6px',
                          py: 0.875,
                          px: collapsed ? 1.25 : 1.5,
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          transition: 'all 150ms ease',
                          color: active ? palette.scale[100] : palette.scale[400],
                          bgcolor: active ? alpha(palette.scale[100], 0.08) : 'transparent',
                          '&:hover': {
                            bgcolor: alpha(palette.scale[100], 0.05),
                            color: palette.scale[100],
                          },
                          '&.Mui-selected': {
                            bgcolor: alpha(palette.scale[100], 0.08),
                            '&:hover': {
                              bgcolor: alpha(palette.scale[100], 0.1),
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32 }}>
                          <Badge
                            badgeContent={badgeContent}
                            color="primary"
                            invisible={!badgeContent}
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
                            <Icon
                              sx={{
                                fontSize: 18,
                                color: active ? palette.green[400] : palette.scale[500],
                                transition: 'color 150ms ease',
                              }}
                            />
                          </Badge>
                        </ListItemIcon>
                        {!collapsed && (
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              fontSize: '0.8125rem',
                              fontWeight: active ? 500 : 400,
                              color: 'inherit',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                )
              })}
            </List>
            {sectionIndex < NAV_ITEMS.length - 1 && (
              <Divider sx={{ my: 1, mx: 1.5, borderColor: alpha(palette.scale[100], 0.06) }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        }}
      >
        {!collapsed && (
          <Typography
            sx={{
              fontSize: '0.6875rem',
              color: palette.scale[600],
              letterSpacing: '0.02em',
            }}
          >
            NeuraReport v1.0
          </Typography>
        )}
      </Box>
    </Box>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            borderRight: 'none',
            bgcolor: 'transparent',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: 200,
              }),
          },
        }}
        open
      >
        {sidebarContent}
      </Drawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
            bgcolor: 'transparent',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    </>
  )
}
