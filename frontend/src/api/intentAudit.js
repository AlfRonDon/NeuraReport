import { API_BASE } from './client'

const buildIntentHeaders = (intent, idempotencyKey) => ({
  'Content-Type': 'application/json',
  'Idempotency-Key': idempotencyKey,
  'X-Idempotency-Key': idempotencyKey,
  'X-Intent-Id': intent.id,
  'X-Intent-Type': intent.type,
  'X-Intent-Label': encodeURIComponent(intent.label || ''),
  'X-Correlation-Id': intent.correlationId,
  'X-Session-Id': intent.sessionId,
})

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  const rand = Math.random().toString(36).slice(2)
  return `idem-${Date.now().toString(36)}-${rand}`
}

export async function recordIntent(intent) {
  const idempotencyKey = generateIdempotencyKey()
  const response = await fetch(`${API_BASE}/api/audit/intent`, {
    method: 'POST',
    headers: buildIntentHeaders(intent, idempotencyKey),
    body: JSON.stringify(intent),
  })

  if (!response.ok) {
    throw new Error(`Failed to record intent: ${response.status}`)
  }
}

export async function updateIntent(intent, status, result) {
  const idempotencyKey = generateIdempotencyKey()
  const response = await fetch(`${API_BASE}/api/audit/intent/${intent.id}`, {
    method: 'PATCH',
    headers: buildIntentHeaders(intent, idempotencyKey),
    body: JSON.stringify({ status, result }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update intent: ${response.status}`)
  }
}

