/**
 * Navigation Components - Premium Shell & Navigation
 * Sophisticated navigation components inspired by Linear, Notion, and Vercel
 */

import { forwardRef, useState, cloneElement } from 'react'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  Collapse,
  Divider,
  alpha,
  useTheme,
  styled,
  keyframes,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey'

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { transform: translateX(-8px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0); }
`

// =============================================================================
// NAV ITEM - Single navigation link
// =============================================================================

const NavItemRoot = styled(Box, {
  shouldForwardProp: (prop) => !['active', 'collapsed', 'depth'].includes(prop),
})(({ theme, active, collapsed, depth = 0 }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, collapsed ? 1.5 : 2),
  marginLeft: theme.spacing(depth * 2),
  borderRadius: theme.shape.borderRadius * 1.5,
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',

  ...(active
    ? {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,

        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '20%',
          bottom: '20%',
          width: 3,
          borderRadius: '0 3px 3px 0',
          backgroundColor: theme.palette.primary.main,
        },
      }
    : {
        color: theme.palette.text.secondary,

        '&:hover': {
          backgroundColor: alpha(theme.palette.action.hover, 0.8),
          color: theme.palette.text.primary,
        },
      }),

  ...(collapsed && {
    justifyContent: 'center',
    padding: theme.spacing(1.5),
  }),
}))

const NavItemIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  flexShrink: 0,
  transition: 'transform 0.15s ease',

  '& svg': {
    fontSize: 20,
  },
}))

const NavItemBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    fontSize: '0.65rem',
    height: 16,
    minWidth: 16,
    padding: '0 4px',
    fontWeight: 600,
  },
}))

export const NavItem = forwardRef(function NavItem(props, ref) {
  const {
    icon,
    label,
    active = false,
    collapsed = false,
    badge,
    badgeColor = 'primary',
    shortcut,
    children,
    onClick,
    depth = 0,
    sx,
    ...other
  } = props

  const theme = useTheme()
  const [expanded, setExpanded] = useState(active)
  const hasChildren = Boolean(children)

  const handleClick = (e) => {
    if (hasChildren) {
      setExpanded(!expanded)
    }
    onClick?.(e)
  }

  const content = (
    <>
      <NavItemRoot
        ref={ref}
        active={active}
        collapsed={collapsed}
        depth={depth}
        onClick={handleClick}
        sx={sx}
        {...other}
      >
        {icon && (
          <NavItemIcon>
            {badge ? (
              <NavItemBadge badgeContent={badge} color={badgeColor}>
                {icon}
              </NavItemBadge>
            ) : (
              icon
            )}
          </NavItemIcon>
        )}

        {!collapsed && (
          <>
            <Typography
              variant="body2"
              fontWeight={active ? 600 : 500}
              sx={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </Typography>

            {shortcut && (
              <Typography
                variant="caption"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.75,
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  backgroundColor: alpha(theme.palette.text.primary, 0.05),
                  color: 'text.tertiary',
                }}
              >
                {shortcut}
              </Typography>
            )}

            {hasChildren && (
              <ChevronRightIcon
                sx={{
                  fontSize: 16,
                  color: 'text.tertiary',
                  transition: 'transform 0.2s ease',
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            )}
          </>
        )}
      </NavItemRoot>

      {hasChildren && !collapsed && (
        <Collapse in={expanded}>
          <Box sx={{ py: 0.5 }}>{children}</Box>
        </Collapse>
      )}
    </>
  )

  if (collapsed && label) {
    return (
      <Tooltip title={label} placement="right" arrow>
        {content}
      </Tooltip>
    )
  }

  return content
})

// =============================================================================
// NAV GROUP - Section group with label
// =============================================================================

const NavGroupRoot = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}))

const NavGroupLabel = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1.5, 2, 0.75),
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: theme.palette.text.tertiary,
}))

export const NavGroup = forwardRef(function NavGroup(props, ref) {
  const { label, children, collapsed = false, sx, ...other } = props

  return (
    <NavGroupRoot ref={ref} sx={sx} {...other}>
      {!collapsed && label && <NavGroupLabel>{label}</NavGroupLabel>}
      <Stack spacing={0.25}>{children}</Stack>
    </NavGroupRoot>
  )
})

// =============================================================================
// SIDEBAR - Full sidebar container
// =============================================================================

const SidebarRoot = styled(Box, {
  shouldForwardProp: (prop) => !['collapsed', 'width'].includes(prop),
})(({ theme, collapsed, width = 260 }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: collapsed ? 72 : width,
  minWidth: collapsed ? 72 : width,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : theme.palette.background.paper,
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  zIndex: theme.zIndex.drawer,

  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: theme.palette.mode === 'dark'
      ? `radial-gradient(ellipse at top left, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 70%)`
      : 'none',
    pointerEvents: 'none',
  },
}))

const SidebarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
}))

const SidebarContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: theme.spacing(1.5),

  // Custom scrollbar
  '&::-webkit-scrollbar': {
    width: 4,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    borderRadius: 2,
    '&:hover': {
      backgroundColor: alpha(theme.palette.text.primary, 0.2),
    },
  },
}))

const SidebarFooter = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
}))

const CollapseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: -12,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 24,
  height: 24,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
  boxShadow: theme.palette.mode === 'dark'
    ? `0 2px 8px ${alpha('#000', 0.3)}`
    : `0 2px 8px ${alpha('#000', 0.08)}`,
  transition: 'all 0.15s ease',
  zIndex: 1,

  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    transform: 'translateY(-50%) scale(1.1)',
  },

  '& svg': {
    fontSize: 14,
  },
}))

export const Sidebar = forwardRef(function Sidebar(props, ref) {
  const {
    collapsed = false,
    onCollapse,
    width = 260,
    logo,
    header,
    footer,
    children,
    showCollapseButton = true,
    sx,
    ...other
  } = props

  const theme = useTheme()

  return (
    <SidebarRoot
      ref={ref}
      collapsed={collapsed}
      width={width}
      sx={sx}
      {...other}
    >
      {header && (
        <SidebarHeader>
          {header}
        </SidebarHeader>
      )}

      <SidebarContent>
        {children}
      </SidebarContent>

      {footer && (
        <SidebarFooter>
          {footer}
        </SidebarFooter>
      )}

      {showCollapseButton && onCollapse && (
        <CollapseButton onClick={() => onCollapse(!collapsed)} size="small">
          <ChevronRightIcon
            sx={{
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </CollapseButton>
      )}
    </SidebarRoot>
  )
})

// =============================================================================
// TOP BAR - Header navigation bar
// =============================================================================

const TopBarRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 56,
  padding: theme.spacing(0, 2.5),
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(12px)',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar,
}))

const SearchBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.5),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: alpha(theme.palette.action.hover, 0.5),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  minWidth: 200,

  '&:hover': {
    backgroundColor: alpha(theme.palette.action.hover, 0.8),
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },

  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}))

const ShortcutHint = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: theme.spacing(0.25, 0.75),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.text.primary, 0.05),
  fontSize: '0.65rem',
  fontWeight: 500,
  fontFamily: 'monospace',
  color: theme.palette.text.tertiary,
}))

export const TopBar = forwardRef(function TopBar(props, ref) {
  const {
    title,
    breadcrumbs,
    onMenuClick,
    onSearchClick,
    searchPlaceholder = 'Search...',
    showSearch = true,
    actions,
    user,
    notifications,
    sx,
    ...other
  } = props

  const theme = useTheme()

  return (
    <TopBarRoot ref={ref} sx={sx} {...other}>
      {/* Left section */}
      <Stack direction="row" alignItems="center" spacing={2}>
        {onMenuClick && (
          <IconButton
            size="small"
            onClick={onMenuClick}
            sx={{ display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {breadcrumbs || (
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
        )}
      </Stack>

      {/* Center - Search */}
      {showSearch && (
        <SearchBox onClick={onSearchClick}>
          <SearchIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
          <Typography
            variant="body2"
            color="text.tertiary"
            sx={{ flex: 1 }}
          >
            {searchPlaceholder}
          </Typography>
          <ShortcutHint>
            <KeyboardCommandKeyIcon sx={{ fontSize: 10 }} />K
          </ShortcutHint>
        </SearchBox>
      )}

      {/* Right section */}
      <Stack direction="row" alignItems="center" spacing={1}>
        {actions}

        {notifications !== undefined && (
          <Tooltip title="Notifications">
            <IconButton size="small" aria-label="Notifications">
              <Badge
                badgeContent={notifications}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                <NotificationsOutlinedIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Settings">
          <IconButton size="small" aria-label="Settings">
            <SettingsOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {user && (
          <Avatar
            src={user.avatar}
            alt={user.name}
            sx={{
              width: 32,
              height: 32,
              ml: 1,
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            {user.name?.[0]}
          </Avatar>
        )}
      </Stack>
    </TopBarRoot>
  )
})

// =============================================================================
// BREADCRUMBS - Navigation breadcrumbs
// =============================================================================

const BreadcrumbsRoot = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}))

const BreadcrumbItem = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  fontSize: '0.875rem',
  fontWeight: active ? 600 : 400,
  color: active ? theme.palette.text.primary : theme.palette.text.secondary,
  cursor: active ? 'default' : 'pointer',
  transition: 'color 0.15s ease',

  ...(!active && {
    '&:hover': {
      color: theme.palette.primary.main,
    },
  }),
}))

const BreadcrumbSeparator = styled(ChevronRightIcon)(({ theme }) => ({
  fontSize: 16,
  color: theme.palette.text.tertiary,
}))

export const Breadcrumbs = forwardRef(function Breadcrumbs(props, ref) {
  const { items = [], sx, ...other } = props

  return (
    <BreadcrumbsRoot ref={ref} sx={sx} {...other}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
          {i > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem
            active={i === items.length - 1}
            onClick={item.onClick}
          >
            {item.label}
          </BreadcrumbItem>
        </Stack>
      ))}
    </BreadcrumbsRoot>
  )
})

// =============================================================================
// TABS - Premium tab navigation
// =============================================================================

const TabsRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: alpha(theme.palette.action.hover, 0.4),
}))

const TabItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(0.75, 1.5),
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',

  ...(active
    ? {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: theme.palette.mode === 'dark'
          ? `0 2px 8px ${alpha('#000', 0.2)}`
          : `0 2px 8px ${alpha('#000', 0.08)}`,
      }
    : {
        color: theme.palette.text.secondary,

        '&:hover': {
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.action.hover, 0.5),
        },
      }),
}))

export const Tabs = forwardRef(function Tabs(props, ref) {
  const { value, onChange, items = [], sx, ...other } = props

  return (
    <TabsRoot ref={ref} sx={sx} {...other}>
      {items.map((item, i) => (
        <TabItem
          key={item.value || i}
          active={value === (item.value || i)}
          onClick={() => onChange?.(item.value || i)}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                px: 0.75,
                py: 0.125,
                borderRadius: 1,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: value === (item.value || i)
                  ? 'primary.main'
                  : 'action.selected',
                color: value === (item.value || i)
                  ? 'primary.contrastText'
                  : 'text.secondary',
              }}
            >
              {item.count}
            </Typography>
          )}
        </TabItem>
      ))}
    </TabsRoot>
  )
})

export default {
  NavItem,
  NavGroup,
  Sidebar,
  TopBar,
  Breadcrumbs,
  Tabs,
}
