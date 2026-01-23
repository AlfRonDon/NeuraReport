import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Stack,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Avatar,
  Badge,
  alpha,
} from '@mui/material'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import HistoryIcon from '@mui/icons-material/History'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { useAppStore } from '../../stores'
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './constants'

const NAV_ITEMS = [
  {
    id: 'setup',
    path: '/',
    label: 'Setup',
    icon: StorageOutlinedIcon,
    description: 'Connect database & templates',
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reports',
    icon: PlayArrowOutlinedIcon,
    description: 'Create reports',
  },
  {
    id: 'analyze',
    path: '/analyze',
    label: 'Analyze',
    icon: DocumentScannerOutlinedIcon,
    description: 'AI document analysis',
  },
]

function NavItem({ item, isActive, isCollapsed, onClick }) {
  const Icon = item.icon

  const content = (
    <ListItemButton
      onClick={onClick}
      selected={isActive}
      sx={{
        borderRadius: 2,
        mx: 1,
        mb: 0.5,
        minHeight: 44,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        px: isCollapsed ? 1.5 : 2,
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          '& .MuiListItemIcon-root': {
            color: 'inherit',
          },
        },
        '&:hover': {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: isCollapsed ? 0 : 36,
          justifyContent: 'center',
        }}
      >
        <Icon fontSize="small" />
      </ListItemIcon>
      {!isCollapsed && (
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
          }}
        />
      )}
    </ListItemButton>
  )

  if (isCollapsed) {
    return (
      <Tooltip title={item.label} placement="right" arrow>
        {content}
      </Tooltip>
    )
  }

  return content
}

function RecentItem({ item, isCollapsed, onClick }) {
  const content = (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: 1.5,
        mx: 1,
        mb: 0.25,
        minHeight: 36,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        px: isCollapsed ? 1 : 1.5,
        py: 0.5,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 28 }}>
        <FolderOutlinedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
      </ListItemIcon>
      {!isCollapsed && (
        <ListItemText
          primary={item.name}
          primaryTypographyProps={{
            fontSize: '0.8125rem',
            noWrap: true,
          }}
        />
      )}
    </ListItemButton>
  )

  if (isCollapsed) {
    return (
      <Tooltip title={item.name} placement="right">
        {content}
      </Tooltip>
    )
  }

  return content
}

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()
  const templates = useAppStore((s) => s.templates)
  const connection = useAppStore((s) => s.connection)

  const recentTemplates = templates
    .filter((t) => t.status === 'approved')
    .slice(0, 5)

  const handleNavClick = useCallback(
    (path) => {
      navigate(path)
    },
    [navigate]
  )

  const getActiveNavItem = () => {
    const path = location.pathname
    if (path === '/') return 'setup'
    if (path.startsWith('/reports')) return 'reports'
    if (path.startsWith('/analyze')) return 'analyze'
    if (path.startsWith('/templates')) return 'reports'
    return 'setup'
  }

  const activeItem = getActiveNavItem()
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <Box
      component="aside"
      sx={{
        width,
        minWidth: width,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        transition: 'width 200ms ease, min-width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {!collapsed && (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              NR
            </Box>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              NeuraReport
            </Typography>
          </Stack>
        )}
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          sx={{ color: 'text.secondary' }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      {/* New Report Button */}
      <Box sx={{ p: 1.5 }}>
        {collapsed ? (
          <Tooltip title="New Report" placement="right">
            <IconButton
              color="primary"
              sx={{
                width: 40,
                height: 40,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                },
              }}
              onClick={() => navigate('/reports')}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <ListItemButton
            onClick={() => navigate('/reports')}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              borderStyle: 'dashed',
              justifyContent: 'center',
              py: 1,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <AddIcon sx={{ mr: 1, fontSize: 18 }} />
            <Typography variant="body2" fontWeight={600}>
              New Report
            </Typography>
          </ListItemButton>
        )}
      </Box>

      {/* Main Navigation */}
      <List sx={{ px: 0.5, py: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeItem === item.id}
            isCollapsed={collapsed}
            onClick={() => handleNavClick(item.path)}
          />
        ))}
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Recent Templates */}
      {!collapsed && recentTemplates.length > 0 && (
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1 }}>
            <HistoryIcon sx={{ fontSize: 16, mr: 1, opacity: 0.6 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              RECENT TEMPLATES
            </Typography>
          </Stack>
          <Box sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
            <List dense disablePadding>
              {recentTemplates.map((template) => (
                <RecentItem
                  key={template.id}
                  item={template}
                  isCollapsed={collapsed}
                  onClick={() => navigate(`/templates/${template.id}/edit`)}
                />
              ))}
            </List>
          </Box>
        </Box>
      )}

      {collapsed && recentTemplates.length > 0 && (
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {recentTemplates.slice(0, 3).map((template) => (
            <RecentItem
              key={template.id}
              item={template}
              isCollapsed={collapsed}
              onClick={() => navigate(`/templates/${template.id}/edit`)}
            />
          ))}
        </Box>
      )}

      {/* Footer */}
      <Box
        sx={{
          mt: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          p: 1.5,
        }}
      >
        {collapsed ? (
          <Stack spacing={1} alignItems="center">
            <Tooltip title="Settings" placement="right">
              <IconButton size="small" onClick={() => navigate('/settings')} aria-label="Settings">
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Badge
              variant="dot"
              color={connection?.status === 'connected' ? 'success' : 'default'}
              overlap="circular"
            >
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>U</Avatar>
            </Badge>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Badge
                variant="dot"
                color={connection?.status === 'connected' ? 'success' : 'default'}
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>U</Avatar>
              </Badge>
              <Box>
                <Typography variant="body2" fontWeight={600} noWrap>
                  User
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {connection?.status === 'connected' ? 'Connected' : 'Not connected'}
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => navigate('/settings')} aria-label="Settings">
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
