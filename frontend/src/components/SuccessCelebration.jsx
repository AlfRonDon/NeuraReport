import { useState, useEffect, useCallback } from 'react'
import { Box, keyframes } from '@mui/material'

// Subtle pulse animation for success indicator
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
`

/**
 * SuccessCelebration - Shows a subtle success pulse animation
 * Usage: <SuccessCelebration trigger={showCelebration} onComplete={() => setShowCelebration(false)} />
 */
export default function SuccessCelebration({ trigger, onComplete }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!trigger) {
      setActive(false)
      return
    }

    setActive(true)

    // Clean up after animation
    const timer = setTimeout(() => {
      setActive(false)
      onComplete?.()
    }, 1500)

    return () => clearTimeout(timer)
  }, [trigger, onComplete])

  if (!active) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 80,
        height: 80,
        borderRadius: '50%',
        bgcolor: '#21201C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: `${pulse} 1.5s ease-out forwards`,
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 0 40px rgba(33, 32, 28, 0.4)',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 24 24"
        sx={{ width: 40, height: 40, color: 'white' }}
      >
        <path
          fill="currentColor"
          d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
        />
      </Box>
    </Box>
  )
}

// Hook for easy celebration triggering
export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false)

  const celebrate = useCallback(() => {
    setCelebrating(true)
  }, [])

  const onComplete = useCallback(() => {
    setCelebrating(false)
  }, [])

  return {
    celebrating,
    celebrate,
    onComplete,
  }
}
