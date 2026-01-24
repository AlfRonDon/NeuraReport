import { API_BASE } from './client'

const getHealthUrl = () => `${API_BASE.replace(/\\/+$/, '')}/health`

export async function checkHealth({ timeoutMs = 5000, signal } = {}) {
  const controller = signal ? null : new AbortController()
  const effectiveSignal = signal || controller?.signal
  let timeoutId

  if (!signal && controller) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  }

  try {
    const response = await fetch(getHealthUrl(), {
      method: 'HEAD',
      signal: effectiveSignal,
      cache: 'no-store',
    })
    return response.ok
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

