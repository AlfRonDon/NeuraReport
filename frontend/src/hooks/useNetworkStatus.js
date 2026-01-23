import { useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../api/client'

/**
 * Hook to detect network connectivity status
 * Returns online status and a function to manually check connectivity
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [lastChecked, setLastChecked] = useState(null)
  const healthUrl = `${API_BASE.replace(/\/+$/, '')}/health`

  // Check connectivity by making a lightweight request
  const checkConnectivity = useCallback(async () => {
    let timeoutId
    try {
      // Use a simple HEAD request to check connectivity
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch(healthUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      })
      setIsOnline(true)
      setLastChecked(new Date())
      return true
    } catch {
      // If fetch fails, check navigator.onLine as fallback
      const online = typeof navigator !== 'undefined' ? navigator.onLine : false
      setIsOnline(online)
      setLastChecked(new Date())
      return online
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [healthUrl])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastChecked(new Date())
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastChecked(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    checkConnectivity()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkConnectivity])

  return {
    isOnline,
    lastChecked,
    checkConnectivity,
  }
}

export default useNetworkStatus
