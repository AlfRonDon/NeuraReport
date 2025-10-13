import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'neura-step-timing:'

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const clamp = (value, min = 0) => (value < min ? min : value)

const loadFromStorage = (storageKey) => {
  if (typeof window === 'undefined') return { history: {}, order: [] }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { history: {}, order: [] }
    const parsed = JSON.parse(raw)
    return {
      history: parsed?.history && typeof parsed.history === 'object' ? parsed.history : {},
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
  if (!entry || typeof entry.totalMs !== 'number' || typeof entry.count !== 'number' || entry.count === 0) return null
  return entry.totalMs / entry.count
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
    if (!stage || !Number.isFinite(durationMs) || durationMs <= 0) return
    setHistory((prev) => {
      const current = prev?.[stage] || { totalMs: 0, count: 0 }
      return {
        ...prev,
        [stage]: {
          totalMs: current.totalMs + durationMs,
          count: current.count + 1,
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
    const currentAvg = averageDuration(averages?.[stage])
    if (currentAvg != null) {
      hasKnown = true
      remaining += clamp(currentAvg - elapsed, 0)
    } else {
      missing = true
    }

    for (let i = idx + 1; i < order.length; i += 1) {
      const step = order[i]
      if (completedSetRef.current.has(step)) continue
      const avg = averageDuration(averages?.[step])
      if (avg != null) {
        hasKnown = true
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
    if (previous && previous !== stage && stageStartRef.current != null) {
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

  const finishRun = useCallback(() => {
    const stage = currentStageRef.current
    if (stage && stageStartRef.current != null) {
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
    finishRun,
  }
}
