/**
 * Premium Sidebar Navigation
 * Sophisticated sidebar with glassmorphism, smooth animations, and modern interactions
 */

import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useInteraction, InteractionType, Reversibility, useNavigateInteraction } from '@/components/ux/governance'
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Collapse,
  Avatar,
  alpha,
  useTheme,
  styled,
  keyframes,
} from '@mui/material'

// Icons
import StorageIcon from '@mui/icons-material/Storage'
import DescriptionIcon from '@mui/icons-material/Description'
import AssessmentIcon from '@mui/icons-material/Assessment'
import WorkIcon from '@mui/icons-material/Work'
import SettingsIcon from '@mui/icons-material/Settings'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HistoryIcon from '@mui/icons-material/History'
import TimelineIcon from '@mui/icons-material/Timeline'
import BarChartIcon from '@mui/icons-material/BarChart'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MenuIcon from '@mui/icons-material/Menu'
import AddIcon from '@mui/icons-material/Add'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import JoinInnerIcon from '@mui/icons-material/JoinInner'
import MergeIcon from '@mui/icons-material/Merge'
import ChatIcon from '@mui/icons-material/Chat'
import SummarizeIcon from '@mui/icons-material/Summarize'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SparklesIcon from '@mui/icons-material/AutoAwesome'
import EditNoteIcon from '@mui/icons-material/EditNote'
import TableChartIcon from '@mui/icons-material/TableChart'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import CableIcon from '@mui/icons-material/Cable'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SearchIcon from '@mui/icons-material/Search'
import BubbleChartIcon from '@mui/icons-material/BubbleChart'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import PaletteIcon from '@mui/icons-material/Palette'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

import { useAppStore } from '../stores'
import NotificationCenter from './NotificationCenter'

// Import Figma design tokens
import {
  figmaGrey,
  figmaAccent,
  figmaSpacing,
  fontFamilyHeading,
  fontFamilyUI,
  fontFamilyBody,
} from '@/app/theme'

// =============================================================================
// FIGMA DESIGN CONSTANTS (EXACT from Figma specs)
// =============================================================================
const FIGMA_SIDEBAR = {
  width: figmaSpacing.sidebarWidth,  // 250px
  background: figmaGrey[200],         // #F9F9F8
  padding: { horizontal: 16, vertical: 20 },
  borderRadius: 8,
  itemHeight: 40,
  itemGap: 12,
  iconSize: 20,
}

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
`

// =============================================================================
// NAVIGATION STRUCTURE
// =============================================================================

// Simplified, user-friendly navigation structure
// Reduced from 30+ items to essential items with clear labels
const NAV_ITEMS = [
  {
    section: 'Home',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon, path: '/', description: 'Overview & quick actions' },
    ],
  },
  {
    section: 'Reports',
    items: [
      { key: 'reports', label: 'My Reports', icon: AssessmentIcon, path: '/reports', description: 'View and download reports' },
      { key: 'templates', label: 'Templates', icon: DescriptionIcon, path: '/templates', description: 'Report designs & layouts' },
      { key: 'jobs', label: 'Running Jobs', icon: WorkIcon, path: '/jobs', badge: true, description: 'Report generation progress' },
      { key: 'schedules', label: 'Schedules', icon: ScheduleIcon, path: '/schedules', description: 'Automated report runs' },
    ],
  },
  {
    section: 'Data',
    items: [
      { key: 'connections', label: 'Data Sources', icon: StorageIcon, path: '/connections', description: 'Database connections' },
      { key: 'search', label: 'Search', icon: SearchIcon, path: '/search', description: 'Find anything' },
    ],
  },
  {
    section: 'AI Assistant',
    collapsible: true,
    items: [
      { key: 'docqa', label: 'Chat with Docs', icon: ChatIcon, path: '/docqa', highlight: true, description: 'Ask questions about your documents' },
      { key: 'agents', label: 'AI Agents', icon: SmartToyIcon, path: '/agents', description: 'Research, analyze, write' },
      { key: 'knowledge', label: 'Knowledge Base', icon: LibraryBooksIcon, path: '/knowledge', description: 'Document library' },
    ],
  },
  {
    section: 'Create',
    collapsible: true,
    items: [
      { key: 'documents', label: 'Documents', icon: EditNoteIcon, path: '/documents', description: 'Write with AI help' },
      { key: 'spreadsheets', label: 'Spreadsheets', icon: TableChartIcon, path: '/spreadsheets', description: 'Data & formulas' },
      { key: 'dashboard-builder', label: 'Dashboards', icon: DashboardCustomizeIcon, path: '/dashboard-builder', description: 'Visual analytics' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { key: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings', description: 'Preferences & account' },
    ],
  },
]

// Legacy routes map for backward compatibility - these redirect to main sections
const LEGACY_ROUTES = {
  '/connectors': '/connections',
  '/ingestion': '/connections',
  '/design': '/templates',
  '/query': '/connections',
  '/enrichment': '/connections',
  '/federation': '/connections',
  '/synthesis': '/knowledge',
  '/summary': '/docqa',
  '/analyze': '/reports',
  '/history': '/reports',
  '/stats': '/settings',
  '/ops': '/settings',
  '/activity': '/settings',
  '/visualization': '/dashboard-builder',
  '/workflows': '/dashboard-builder',
}

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const SidebarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: FIGMA_SIDEBAR.width,  // 250px from Figma
  // Sidebar background from Figma - Grey/200
  backgroundColor: theme.palette.mode === 'dark' ? '#1A1A1A' : figmaGrey[200],
  borderRight: 'none',  // No border per Figma design
  borderRadius: FIGMA_SIDEBAR.borderRadius,  // 8px from Figma
  padding: `${FIGMA_SIDEBAR.padding.vertical}px ${FIGMA_SIDEBAR.padding.horizontal}px`,
  position: 'relative',
}))

const LogoContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'collapsed',
})(({ theme, collapsed }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: collapsed ? 'center' : 'space-between',
  padding: theme.spacing(2.5, 2),
  minHeight: 64,
  borderBottom: 'none',
}))

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 6,
  overflow: 'hidden',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}))

const NewReportButton = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  borderRadius: 0,
  height: 40,
  // Match nav item style from Figma
  backgroundColor: 'transparent',
  color: theme.palette.mode === 'dark' ? figmaGrey[900] : figmaGrey[1100],
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',

  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.04)
      : figmaGrey[300],  // Grey/300
  },
}))

const SectionHeader = styled(Box, {
  shouldForwardProp: (prop) => !['collapsed', 'collapsible'].includes(prop),
})(({ theme, collapsed, collapsible }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 2, 0.75),
  cursor: collapsible ? 'pointer' : 'default',

  ...(collapsible && {
    '&:hover': {
      '& .expand-icon': {
        color: theme.palette.text.secondary,
      },
    },
  }),
}))

// FIGMA NAV ITEM BUTTON (EXACT from Figma sidebar navigation specs)
// Height: 40px, Gap: 8px (icon to text), Border-radius: 8px
// Active: #E9E8E6 background, Text: Inter Medium 16px
const NavItemButton = styled(Box, {
  shouldForwardProp: (prop) => !['active', 'collapsed', 'highlight'].includes(prop),
})(({ theme, active, collapsed, highlight }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,  // 8px gap from Figma
  padding: '10px 12px',
  margin: 0,
  borderRadius: 8,  // 8px from Figma
  cursor: 'pointer',
  position: 'relative',
  transition: 'all 0.15s ease',
  justifyContent: collapsed ? 'center' : 'flex-start',
  height: FIGMA_SIDEBAR.itemHeight,  // 40px from Figma
  fontFamily: fontFamilyUI,  // Inter from Figma

  // Active state from Figma - Grey/400 background
  ...(active && {
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.08)
      : figmaGrey[400],  // #E9E8E6 from Figma
    color: theme.palette.mode === 'dark'
      ? figmaGrey[300]
      : figmaGrey[1200],  // #21201C from Figma
  }),

  // Inactive state - Grey/1100 text
  ...(!active && {
    color: theme.palette.mode === 'dark'
      ? figmaGrey[900]  // #8D8D86
      : figmaGrey[1100],  // #63635E from Figma

    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.04)
        : figmaGrey[300],  // #F1F0EF on hover
      color: theme.palette.mode === 'dark'
        ? figmaGrey[300]
        : figmaGrey[1200],  // #21201C on hover
    },
  }),

  // Highlight items - same as regular, no special treatment
  ...(highlight && !active && {
    backgroundColor: 'transparent',

    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.04)
        : figmaGrey[300],
    },
  }),
}))

// FIGMA NAV ICON (EXACT from Figma: 20x20px)
const NavIcon = styled(Box, {
  shouldForwardProp: (prop) => !['active', 'highlight'].includes(prop),
})(({ theme, active, highlight }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: FIGMA_SIDEBAR.iconSize,  // 20px from Figma
  height: FIGMA_SIDEBAR.iconSize,  // 20px from Figma
  flexShrink: 0,
  transition: 'transform 0.2s ease',

  '& svg': {
    fontSize: FIGMA_SIDEBAR.iconSize,  // 20px from Figma
    // Icon color from Figma - Grey/900 for inactive, Grey/1100 for active
    color: active
      ? (theme.palette.mode === 'dark' ? figmaGrey[300] : figmaGrey[1100])
      : (theme.palette.mode === 'dark' ? figmaGrey[900] : figmaGrey[900]),
  },
}))

const CollapseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: -12,
  top: 72,
  width: 24,
  height: 24,
  backgroundColor: theme.palette.mode === 'dark' ? figmaGrey[1200] : '#fff',
  border: `1px solid ${theme.palette.mode === 'dark' ? figmaGrey[1100] : figmaGrey[500]}`,  // Grey/500
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  transition: 'all 0.2s ease',
  zIndex: 1,
  color: theme.palette.mode === 'dark' ? figmaGrey[900] : figmaGrey[1100],

  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? figmaGrey[1100] : figmaGrey[400],  // Grey/400
    color: theme.palette.mode === 'dark' ? figmaGrey[300] : figmaGrey[1200],  // Grey/1200
  },

  '& svg': {
    fontSize: 14,
  },
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Sidebar({ width, collapsed, mobileOpen, onClose, onToggle }) {
  const { execute } = useInteraction()
  const navigate = useNavigateInteraction()
  const location = useLocation()
  const theme = useTheme()
  const [expandedSections, setExpandedSections] = useState({
    Create: true,
    Setup: true,
    'AI Tools': true,
  })

  const activeJobs = useAppStore((s) => {
    const jobs = s.jobs || []
    return jobs.filter((j) => j.status === 'running' || j.status === 'pending').length
  })

  const handleNavigate = useCallback((path, label) => {
    const resolvedLabel = label || `Open ${path}`
    navigate(path, {
      label: resolvedLabel,
      intent: { source: 'sidebar', path },
    })
    onClose?.()
  }, [navigate, onClose])

  const executeUI = useCallback((label, action, intent = {}) => {
    return execute({
      type: InteractionType.EXECUTE,
      label,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'sidebar', ...intent },
      action,
    })
  }, [execute])

  const handleToggleSection = useCallback((section) => {
    const isExpanded = expandedSections[section] !== false
    const nextLabel = isExpanded ? 'Collapse' : 'Expand'
    return executeUI(
      `${nextLabel} ${section} section`,
      () => setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section],
      })),
      { section, expanded: !isExpanded }
    )
  }, [executeUI, expandedSections])

  const handleToggleSidebar = useCallback(() => {
    return executeUI(
      collapsed ? 'Expand sidebar' : 'Collapse sidebar',
      () => onToggle?.(),
      { collapsed: !collapsed }
    )
  }, [executeUI, collapsed, onToggle])

  const handleCloseSidebar = useCallback(() => {
    return executeUI('Close sidebar', () => onClose?.())
  }, [executeUI, onClose])

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  const sidebarContent = (
    <SidebarContainer>
      {/* Logo/Header */}
      <LogoContainer collapsed={collapsed}>
        {!collapsed && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
            }}
            onClick={() => handleNavigate('/')}
          >
            <LogoBox>
              <img src="/logo.png" alt="NeuraReport" />
            </LogoBox>
            <Typography
              sx={{
                // FIGMA: Section Title - Tomorrow Medium 20px
                fontFamily: fontFamilyHeading,
                fontSize: '20px',
                fontWeight: 500,
                lineHeight: 'normal',
                letterSpacing: 0,
                color: theme.palette.mode === 'dark' ? figmaGrey[300] : figmaGrey[1200],
              }}
            >
              NeuraReport
            </Typography>
          </Box>
        )}

        {collapsed && (
          <LogoBox onClick={() => handleNavigate('/')} sx={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="NeuraReport" />
          </LogoBox>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!collapsed && <NotificationCenter />}
        </Box>
      </LogoContainer>

      {/* Collapse Button */}
      <CollapseButton size="small" onClick={handleToggleSidebar}>
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </CollapseButton>

      {/* New Report Button */}
      <Box sx={{ p: 1.5, pt: 2 }}>
        <Tooltip title={collapsed ? 'New Report' : ''} placement="right" arrow>
          <NewReportButton
            onClick={() => handleNavigate('/setup/wizard')}
            sx={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
            {!collapsed && (
              <Typography variant="body2" fontWeight={500}>
                New Report
              </Typography>
            )}
          </NewReportButton>
        </Tooltip>
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.text.primary, 0.1),
            borderRadius: 1,  // Figma spec: 8px
          },
        }}
      >
        {NAV_ITEMS.map((section, sectionIndex) => {
          const isExpanded = expandedSections[section.section] !== false

          return (
            <Box key={section.section}>
              {/* Section Header */}
              {!collapsed && (
                  <SectionHeader
                    collapsed={collapsed}
                    collapsible={section.collapsible}
                    onClick={() => section.collapsible && handleToggleSection(section.section)}
                  >
                  <Typography
                    sx={{
                      // FIGMA: Small Text style - Inter Medium
                      fontFamily: fontFamilyUI,
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: theme.palette.mode === 'dark' ? figmaGrey[900] : figmaGrey[1100],
                    }}
                  >
                    {section.section}
                  </Typography>
                  {section.collapsible && (
                    <ExpandMoreIcon
                      className="expand-icon"
                      sx={{
                        fontSize: 16,
                        color: 'text.disabled',
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  )}
                </SectionHeader>
              )}

              {/* Section Items */}
              <Collapse in={collapsed || isExpanded}>
                <Box sx={{ py: 0.5 }}>
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon
                    const active = isActive(item.path)
                    const badgeContent = item.badge ? activeJobs : 0

                    return (
                      <Tooltip
                        key={item.key}
                        title={collapsed ? item.label : ''}
                        placement="right"
                        arrow
                      >
                        <NavItemButton
                          active={active}
                          collapsed={collapsed}
                          highlight={item.highlight}
                          onClick={() => handleNavigate(item.path)}
                          sx={{
                            animation: `${slideIn} 0.2s ease-out ${itemIndex * 30}ms both`,
                          }}
                        >
                          <NavIcon active={active} highlight={item.highlight}>
                            <Badge
                              badgeContent={badgeContent}
                              invisible={!badgeContent}
                              sx={{
                                '& .MuiBadge-badge': {
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.1) : figmaGrey[400],
                                  color: 'text.secondary',
                                },
                              }}
                              sx={{
                                '& .MuiBadge-badge': {
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  minWidth: 14,
                                  height: 14,
                                  padding: '0 3px',
                                },
                              }}
                            >
                              <Icon />
                            </Badge>
                          </NavIcon>

                          {!collapsed && (
                            <Typography
                              sx={{
                                // FIGMA: Navigation Item - Inter Medium 16px
                                fontFamily: fontFamilyUI,
                                fontSize: '16px',
                                fontWeight: 500,
                                lineHeight: 'normal',
                                flex: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.label}
                            </Typography>
                          )}

                          {/* Removed sparkle icons - not in Figma design */}
                        </NavItemButton>
                      </Tooltip>
                    )
                  })}
                </Box>
              </Collapse>

              {/* Section Divider */}
              {sectionIndex < NAV_ITEMS.length - 1 && (
                <Box
                  sx={{
                    height: 1,
                    mx: 2,
                    my: 1.5,
                    bgcolor: alpha(theme.palette.divider, 0.08),
                  }}
                />
              )}
            </Box>
          )
        })}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: 'none',
        }}
      >
        {!collapsed ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : figmaGrey[400],
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: theme.palette.mode === 'dark' ? figmaGrey[1100] : figmaGrey[900],
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              U
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: theme.palette.mode === 'dark' ? figmaGrey[300] : figmaGrey[1200],
                }}
                noWrap
              >
                NeuraReport
              </Typography>
              <Typography
                sx={{
                  fontSize: '10px',
                  color: theme.palette.mode === 'dark' ? figmaGrey[900] : figmaGrey[1100],
                  display: 'block'
                }}
              >
                v1.0
              </Typography>
            </Box>
          </Box>
        ) : (
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: theme.palette.mode === 'dark' ? figmaGrey[1100] : figmaGrey[900],
              fontSize: '0.75rem',
              fontWeight: 600,
              mx: 'auto',
            }}
          >
            U
          </Avatar>
        )}
      </Box>
    </SidebarContainer>
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
            transition: theme.transitions.create('width', {
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
        onClose={handleCloseSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
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
