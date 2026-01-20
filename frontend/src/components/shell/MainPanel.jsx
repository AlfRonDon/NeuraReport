import { useRef, useEffect, useCallback } from 'react'
import { Box } from '@mui/material'

export default function MainPanel({
  header,
  children,
  footer,
  autoScroll = false,
  onScroll,
}) {
  const contentRef = useRef(null)
  const isAtBottomRef = useRef(true)

  // Track if user is at bottom
  const handleScroll = useCallback(
    (e) => {
      const el = e.target
      const threshold = 100
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      isAtBottomRef.current = atBottom
      onScroll?.(e)
    },
    [onScroll]
  )

  // Auto-scroll to bottom when content changes (if user was at bottom)
  useEffect(() => {
    if (!autoScroll || !contentRef.current) return

    const observer = new MutationObserver(() => {
      if (isAtBottomRef.current && contentRef.current) {
        contentRef.current.scrollTo({
          top: contentRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    })

    observer.observe(contentRef.current, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [autoScroll])

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Workspace Header */}
      {header}

      {/* Scrollable Content */}
      <Box
        ref={contentRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflow: 'auto',
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 4,
            '&:hover': {
              bgcolor: 'action.disabled',
            },
          },
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Fixed Action Bar */}
      {footer}
    </Box>
  )
}
