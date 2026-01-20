import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { Box, Fab, Zoom, alpha } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

const ScrollArea = forwardRef(function ScrollArea(
  {
    children,
    autoScroll = false,
    showScrollButton = true,
    scrollButtonThreshold = 200,
    maxHeight,
    sx,
    ...props
  },
  ref
) {
  const containerRef = useRef(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const isAtBottomRef = useRef(true)

  // Expose scroll methods via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior = 'smooth') => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior,
        })
      }
    },
    scrollToTop: (behavior = 'smooth') => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior,
        })
      }
    },
    getScrollElement: () => containerRef.current,
  }))

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const atBottom = distanceFromBottom < scrollButtonThreshold

    isAtBottomRef.current = atBottom
    setShowScrollToBottom(!atBottom && showScrollButton)
  }, [scrollButtonThreshold, showScrollButton])

  // Auto-scroll when content changes
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return

    const observer = new MutationObserver(() => {
      if (isAtBottomRef.current && containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [autoScroll])

  const handleScrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [])

  return (
    <Box sx={{ position: 'relative', ...sx }} {...props}>
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{
          overflow: 'auto',
          maxHeight,
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.15),
            borderRadius: 4,
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.25),
            },
          },
        }}
      >
        {children}
      </Box>

      {/* Scroll to bottom button */}
      <Zoom in={showScrollToBottom}>
        <Fab
          size="small"
          onClick={handleScrollToBottom}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      </Zoom>
    </Box>
  )
})

export default ScrollArea
