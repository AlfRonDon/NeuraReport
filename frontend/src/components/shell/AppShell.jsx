import { useState, useCallback, useEffect } from 'react'
import { Box, useMediaQuery, useTheme, Drawer } from '@mui/material'
import Sidebar from './Sidebar'
import { SIDEBAR_WIDTH } from './constants'

export default function AppShell({ children }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('neura.sidebar.collapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev
        localStorage.setItem('neura.sidebar.collapsed', String(next))
        return next
      })
    }
  }, [isMobile])

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  // Register global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        handleToggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleSidebar])

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleCloseMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Sidebar
            collapsed={false}
            onToggleCollapse={handleCloseMobile}
          />
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 200ms ease',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
