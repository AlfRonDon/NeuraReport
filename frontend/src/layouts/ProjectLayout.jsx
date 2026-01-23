/**
 * Premium Project Layout
 * Sophisticated shell with glassmorphism effects and smooth transitions
 */

import { useState, useCallback } from 'react'
import {
  Box,
  useMediaQuery,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
import { Outlet } from 'react-router-dom'
import Sidebar from '../navigation/Sidebar'
import TopNav from '../navigation/TopNav'
import OfflineBanner from '../components/OfflineBanner'
import { useAppStore } from '../stores'

// =============================================================================
// CONSTANTS
// =============================================================================

const SIDEBAR_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 64

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  position: 'relative',

  // Sophisticated background pattern
  '&::before': {
    content: '""',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.palette.mode === 'dark'
      ? `
        radial-gradient(ellipse at 0% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%),
        radial-gradient(ellipse at 100% 0%, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 50%)
      `
      : `
        radial-gradient(ellipse at 0% 0%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%),
        radial-gradient(ellipse at 100% 100%, ${alpha(theme.palette.secondary.main, 0.03)} 0%, transparent 50%)
      `,
    pointerEvents: 'none',
    zIndex: 0,
  },
}))

const MainContent = styled(Box, {
  shouldForwardProp: (prop) => !['sidebarWidth', 'isMobile'].includes(prop),
})(({ theme, sidebarWidth, isMobile }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  marginLeft: isMobile ? 0 : sidebarWidth,
  transition: theme.transitions.create(['margin'], {
    easing: theme.transitions.easing.easeInOut,
    duration: 250,
  }),
  position: 'relative',
  zIndex: 1,
}))

const PageContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  backgroundColor: 'transparent',
  animation: `${fadeIn} 0.3s ease-out`,

  // Custom scrollbar styling
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    borderRadius: 4,
    '&:hover': {
      backgroundColor: alpha(theme.palette.text.primary, 0.2),
    },
  },
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProjectLayout({ children }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeConnection = useAppStore((s) => s.activeConnection)

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => !prev)
    }
  }, [isMobile])

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <LayoutRoot>
      {/* Sidebar */}
      <Sidebar
        width={sidebarWidth}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onClose={handleCloseMobile}
        onToggle={handleToggleSidebar}
      />

      {/* Main Content */}
      <MainContent sidebarWidth={sidebarWidth} isMobile={isMobile}>
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Top Navigation */}
        <TopNav
          onMenuClick={handleToggleSidebar}
          showMenuButton={isMobile}
          connection={activeConnection}
        />

        {/* Page Content */}
        <PageContent>
          {children || <Outlet />}
        </PageContent>
      </MainContent>
    </LayoutRoot>
  )
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH }
