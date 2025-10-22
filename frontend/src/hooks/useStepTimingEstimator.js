import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'neura-step-timing:'

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const clamp = (value, min = 0) => (value < min ? min : value)

const MAX_SAMPLES_PER_STAGE = 12
const MAX_VALID_DURATION_MS = 30 * 60 * 1000 // cap at 30 minutes to discard extreme outliers
const MIN_VALID_DURATION_MS = 1 // treat sub-millisecond stages as 1ms so we still learn their order
const TRIM_RATIO = 0.2
const MIN_CONFIDENT_SAMPLES = 3

const sanitizeDuration = (value) => {
  if (!Number.isFinite(value)) return null
  let sanitized = value
  if (sanitized <= 0) sanitized = MIN_VALID_DURATION_MS
  if (sanitized > MAX_VALID_DURATION_MS) sanitized = MAX_VALID_DURATION_MS
  if (sanitized < MIN_VALID_DURATION_MS) sanitized = MIN_VALID_DURATION_MS
  return sanitized
}

const computeAverageFromSamples = (samples) => {
  if (!Array.isArray(samples) || samples.length === 0) return null
  if (samples.length === 1) return samples[0]
  const sorted = [...samples].sort((a, b) => a - b)
  const maxTrim = Math.floor((sorted.length - 1) / 2)
  const trim = Math.min(Math.floor(sorted.length * TRIM_RATIO), maxTrim)
  const start = trim
  const end = sorted.length - trim
  const window = sorted.slice(start, end > start ? end : sorted.length)
  const total = window.reduce((sum, value) => sum + value, 0)
  return window.length ? total / window.length : null
}

const normalizeHistoryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return { samples: [], avgMs: null, count: 0, lastMs: null }
  }

  const samples = []
  if (Array.isArray(entry.samples)) {
    entry.samples.forEach((value) => {
      const sanitized = sanitizeDuration(value)
      if (sanitized != null) samples.push(sanitized)
    })
  }

  if (!samples.length && typeof entry.lastMs === 'number') {
    const sanitized = sanitizeDuration(entry.lastMs)
    if (sanitized != null) samples.push(sanitized)
  }

  if (!samples.length && typeof entry.avgMs === 'number') {
    const sanitized = sanitizeDuration(entry.avgMs)
    if (sanitized != null) samples.push(sanitized)
  }

  if (!samples.length && typeof entry.totalMs === 'number' && typeof entry.count === 'number' && entry.count > 0) {
    const avg = sanitizeDuration(entry.totalMs / entry.count)
    if (avg != null) samples.push(avg)
  }

  const cappedSamples = samples.slice(-MAX_SAMPLES_PER_STAGE)
  const avgMs = computeAverageFromSamples(cappedSamples)
  const lastMs = cappedSamples.length ? cappedSamples[cappedSamples.length - 1] : null
  const count = Number.isFinite(entry.count) ? Math.max(entry.count, cappedSamples.length) : cappedSamples.length

  return {
    samples: cappedSamples,
    avgMs: avgMs ?? null,
    count,
    lastMs,
  }
}

const normalizeHistory = (history) => {
  if (!history || typeof history !== 'object') return {}
  return Object.entries(history).reduce((acc, [stage, entry]) => {
    acc[stage] = normalizeHistoryEntry(entry)
    return acc
  }, {})
}

const getSampleCount = (entry) => {
  if (!entry || typeof entry !== 'object') return 0
  if (Array.isArray(entry.samples)) return entry.samples.length
  if (typeof entry.count === 'number') return entry.count
  return 0
}

const loadFromStorage = (storageKey) => {
  if (typeof window === 'undefined') return { history: {}, order: [] }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { history: {}, order: [] }
    const parsed = JSON.parse(raw)
    return {
      history: normalizeHistory(parsed?.history),
      order: Array.isArray(parsed?.order) ? parsed.order : [],
    }
  } catch {
    return { history: {}, order: [] }
  }
}

const persistToStorage = (storageKey, history, order) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ history, order }))
  } catch {
    /* ignore persistence errors */
  }
}

const averageDuration = (entry) => {
  if (!entry || typeof entry !== 'object') return null
  if (typeof entry.avgMs === 'number' && !Number.isNaN(entry.avgMs)) return entry.avgMs
  if (Array.isArray(entry.samples) && entry.samples.length) return computeAverageFromSamples(entry.samples)
  if (typeof entry.totalMs === 'number' && typeof entry.count === 'number' && entry.count > 0) {
    return entry.totalMs / entry.count
  }
  return null
}

export const formatDuration = (ms) => {
  if (ms == null || Number.isNaN(ms)) return ''
  const totalSeconds = Math.ceil(clamp(ms, 0) / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const hours = Math.floor(totalSeconds / 3600)
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

export function useStepTimingEstimator(cacheKey) {
  const storageKey = `${STORAGE_PREFIX}${cacheKey}`
  const initialRef = useRef(null)
  if (!initialRef.current) {
    initialRef.current = loadFromStorage(storageKey)
  }
  const [history, setHistory] = useState(initialRef.current.history)
  const historyRef = useRef(history)

  useEffect(() => { historyRef.current = history }, [history])

  const [orderVersion, setOrderVersion] = useState(0)
  const knownOrderRef = useRef(initialRef.current.order.slice())
  const runOrderRef = useRef([])
  const completedSetRef = useRef(new Set())
  const currentStageRef = useRef(null)
  const stageStartRef = useRef(null)
  const [active, setActive] = useState(false)
  const [eta, setEta] = useState({ ms: null, reliable: false })

  const ensureStageInOrder = useCallback((stage) => {
    if (!stage) return
    const knownOrder = knownOrderRef.current
    if (!knownOrder.includes(stage)) {
      knownOrder.push(stage)
      setOrderVersion((v) => v + 1)
    }
  }, [])

  const resetRunState = useCallback(() => {
    runOrderRef.current = []
    completedSetRef.current = new Set()
    currentStageRef.current = null
    stageStartRef.current = null
    setEta({ ms: null, reliable: false })
    setActive(false)
  }, [])

  const startRun = useCallback(() => {
    resetRunState()
  }, [resetRunState])

  const updateHistory = useCallback((stage, durationMs) => {
    if (!stage) return
    const sanitized = sanitizeDuration(durationMs)
    if (sanitized == null) return
    setHistory((prev) => {
      const previous = prev?.[stage]
      const samples = previous?.samples ? previous.samples.slice() : []
      samples.push(sanitized)
      if (samples.length > MAX_SAMPLES_PER_STAGE) {
        samples.splice(0, samples.length - MAX_SAMPLES_PER_STAGE)
      }
      const avgMs = computeAverageFromSamples(samples)
      const lastMs = samples.length ? samples[samples.length - 1] : null
      const prevCount = Number.isFinite(previous?.count) ? previous.count : samples.length - 1
      const count = Math.min((prevCount || 0) + 1, 1000)
      return {
        ...prev,
        [stage]: {
          samples,
          avgMs,
          lastMs,
          count,
        },
      }
    })
  }, [])

  const recomputeEta = useCallback(() => {
    const stage = currentStageRef.current
    if (!stage) {
      setEta({ ms: null, reliable: false })
      return
    }
    const order = knownOrderRef.current.length ? knownOrderRef.current : runOrderRef.current
    const idx = order.indexOf(stage)
    if (idx === -1) {
      setEta({ ms: null, reliable: false })
      return
    }

    let remaining = 0
    let hasKnown = false
    let missing = false
    const averages = historyRef.current

    const elapsed = stageStartRef.current != null ? nowMs() - stageStartRef.current : 0
    const currentEntry = averages?.[stage]
    const currentAvg = averageDuration(currentEntry)
    const currentSamples = getSampleCount(currentEntry)
    if (currentAvg != null) {
      hasKnown = true
      if (currentSamples < MIN_CONFIDENT_SAMPLES) missing = true
      remaining += clamp(currentAvg - elapsed, 0)
    } else {
      missing = true
    }

    for (let i = idx + 1; i < order.length; i += 1) {
      const step = order[i]
      if (completedSetRef.current.has(step)) continue
      const entry = averages?.[step]
      const avg = averageDuration(entry)
      const sampleCount = getSampleCount(entry)
      if (avg != null) {
        hasKnown = true
        if (sampleCount < MIN_CONFIDENT_SAMPLES) missing = true
        remaining += avg
      } else {
        missing = true
      }
    }

    if (!hasKnown) {
      setEta({ ms: null, reliable: false })
      return
    }
    setEta({ ms: remaining, reliable: !missing })
  }, [])

  const noteStage = useCallback((stage) => {
    if (!stage) return
    const now = nowMs()
    const previous = currentStageRef.current
    if (
      previous
      && previous !== stage
      && stageStartRef.current != null
      && !completedSetRef.current.has(previous)
    ) {
      const duration = now - stageStartRef.current
      completedSetRef.current.add(previous)
      updateHistory(previous, duration)
    }
    if (!previous || previous !== stage) {
      currentStageRef.current = stage
      stageStartRef.current = now
      ensureStageInOrder(stage)
      if (!runOrderRef.current.includes(stage)) {
        runOrderRef.current.push(stage)
      }
    }
    setActive(true)
    recomputeEta()
  }, [ensureStageInOrder, recomputeEta, updateHistory])

  const completeStage = useCallback((stage, durationMs) => {
    if (!stage) return
    const now = nowMs()
    const isCurrent = currentStageRef.current === stage
    let duration = durationMs
    if (!Number.isFinite(duration) || duration <= 0) {
      if (isCurrent && stageStartRef.current != null) {
        duration = now - stageStartRef.current
      } else {
        return
      }
    }
    ensureStageInOrder(stage)
    if (!runOrderRef.current.includes(stage)) {
      runOrderRef.current.push(stage)
    }
    completedSetRef.current.add(stage)
    updateHistory(stage, duration)
    if (isCurrent) {
      currentStageRef.current = null
      stageStartRef.current = null
    }
    setActive(true)
    recomputeEta()
  }, [ensureStageInOrder, recomputeEta, updateHistory])

  const finishRun = useCallback(() => {
    const stage = currentStageRef.current
    if (stage && stageStartRef.current != null && !completedSetRef.current.has(stage)) {
      const duration = nowMs() - stageStartRef.current
      updateHistory(stage, duration)
    }
    if (runOrderRef.current.length) {
      const merged = []
      runOrderRef.current.forEach((step) => {
        if (step && !merged.includes(step)) merged.push(step)
      })
      knownOrderRef.current.forEach((step) => {
        if (step && !merged.includes(step)) merged.push(step)
      })
      knownOrderRef.current = merged
      setOrderVersion((v) => v + 1)
    }
    setEta({ ms: 0, reliable: true })
    setActive(false)
    currentStageRef.current = null
    stageStartRef.current = null
    completedSetRef.current = new Set()
    runOrderRef.current = []
  }, [updateHistory])

  useEffect(() => {
    if (!active) return undefined
    const id = window.setInterval(recomputeEta, 500)
    return () => window.clearInterval(id)
  }, [active, recomputeEta])

  useEffect(() => {
    persistToStorage(storageKey, historyRef.current, knownOrderRef.current)
  }, [storageKey, history, orderVersion])

  return {
    eta,
    startRun,
    noteStage,
    completeStage,
    finishRun,
  }
}
