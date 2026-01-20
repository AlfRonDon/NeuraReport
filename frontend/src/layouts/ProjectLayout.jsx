import { useState, useCallback } from 'react'
import { Box, useMediaQuery, useTheme, alpha } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Sidebar from '../navigation/Sidebar'
import TopNav from '../navigation/TopNav'
import { useAppStore } from '../store/useAppStore'
import { palette } from '../theme'

const SIDEBAR_WIDTH = 220
const SIDEBAR_COLLAPSED_WIDTH = 56

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
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: palette.scale[1100],
      }}
    >
      {/* Sidebar */}
      <Sidebar
        width={sidebarWidth}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onClose={handleCloseMobile}
        onToggle={handleToggleSidebar}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: isMobile ? 0 : `${sidebarWidth}px`,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: 200,
          }),
        }}
      >
        {/* Top Navigation */}
        <TopNav
          onMenuClick={handleToggleSidebar}
          showMenuButton={isMobile}
          connection={activeConnection}
        />

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            bgcolor: palette.scale[1100],
          }}
        >
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  )
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH }
