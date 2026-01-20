import { useEffect, useCallback } from 'react'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)

function parseShortcut(shortcut) {
  const parts = shortcut.toLowerCase().split('+')
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
  }
}

function matchesShortcut(event, parsed) {
  const modKey = isMac ? event.metaKey : event.ctrlKey

  // Handle cmd/ctrl as the primary modifier
  const modMatch = parsed.meta || parsed.ctrl ? modKey : !modKey

  return (
    event.key.toLowerCase() === parsed.key &&
    modMatch &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift
  )
}

export function useKeyboard(shortcuts, deps = []) {
  const handleKeyDown = useCallback(
    (event) => {
      // Skip if user is typing in an input
      const target = event.target
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape to work in inputs
        if (event.key !== 'Escape') {
          return
        }
      }

      for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const parsed = parseShortcut(shortcut)
        if (matchesShortcut(event, parsed)) {
          event.preventDefault()
          handler(event)
          return
        }
      }
    },
    [shortcuts, ...deps]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const SHORTCUTS = {
  COMMAND_PALETTE: 'cmd+k',
  NEW_SESSION: 'cmd+shift+n',
  TOGGLE_SIDEBAR: 'cmd+b',
  CLOSE: 'escape',
  SEND: 'cmd+enter',
}
