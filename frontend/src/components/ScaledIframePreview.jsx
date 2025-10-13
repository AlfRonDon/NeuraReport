import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'

import { DEFAULT_PAGE_DIMENSIONS } from '../utils/preview'

const MIN_SCALE = 0.01

const getDevicePixelRatio = () =>
  (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1

const roundScaleForDpr = (scale) => {
  if (!Number.isFinite(scale) || scale <= 0) return 1
  const dpr = getDevicePixelRatio()
  const factor = Math.max(100, Math.round(dpr * 100))
  return Math.max(MIN_SCALE, Math.round(scale * factor) / factor)
}

/**
 * Keeps A4-style HTML previews crisp by measuring the iframe content and scaling it
 * to the available container box. We read the iframe body (when same-origin) after
 * load, and fall back to a default A4 size when cross-origin prevents inspection.
 * Scale recalculates on iframe load, container resize, and window resize/zoom.
 */
export default function ScaledIframePreview({
  src,
  title,
  pageWidth = DEFAULT_PAGE_DIMENSIONS.width,
  pageHeight = DEFAULT_PAGE_DIMENSIONS.height,
  sx,
  loading = 'lazy',
  background = 'white',
}) {
  const containerRef = useRef(null)
  const iframeRef = useRef(null)
  const rafRef = useRef(null)
  const timeoutRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [contentSize, setContentSize] = useState({
    width: pageWidth,
    height: pageHeight,
  })
  const contentSizeRef = useRef(contentSize)

  const schedule = useCallback((cb) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      cb()
    })
  }, [])

  const updateScale = useCallback(
    (dims) => {
      const target = dims || contentSizeRef.current
      const container = containerRef.current
      if (!container || !target.width || !target.height) return

      const rect = container.getBoundingClientRect()
      const availableWidth = rect.width || container.clientWidth || target.width
      const availableHeightRaw = rect.height || container.clientHeight || target.height
      const widthRatio = availableWidth / target.width
      const heightRatio = availableHeightRaw > 0 ? availableHeightRaw / target.height : widthRatio
      const rawScale = Math.min(widthRatio, heightRatio)
      const nextScale = roundScaleForDpr(rawScale)

      setScale((prev) => (Math.abs(prev - nextScale) < 0.002 ? prev : nextScale))
    },
    [setScale],
  )

  const applyContentSize = useCallback(
    (dims) => {
      const safe = {
        width: Math.max(1, Math.ceil(dims?.width || pageWidth)),
        height: Math.max(1, Math.ceil(dims?.height || pageHeight)),
      }
      contentSizeRef.current = safe
      setContentSize(safe)
      schedule(() => updateScale(safe))
    },
    [pageHeight, pageWidth, schedule, updateScale],
  )

  const measureIframeContent = useCallback(() => {
    const fallback = { width: pageWidth, height: pageHeight }
    const iframe = iframeRef.current
    if (!iframe) return fallback

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return fallback
      const body = doc.body
      const html = doc.documentElement
      if (body) {
        body.style.overflow = 'hidden'
      }
      if (html) {
        html.style.overflow = 'hidden'
      }
      const measuredWidth = Math.max(
        body?.scrollWidth || 0,
        body?.offsetWidth || 0,
        html?.scrollWidth || 0,
        html?.offsetWidth || 0,
        fallback.width,
      )
      const measuredHeight = Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        html?.scrollHeight || 0,
        html?.offsetHeight || 0,
        fallback.height,
      )
      return {
        width: Math.ceil(measuredWidth),
        height: Math.ceil(measuredHeight),
      }
    } catch (err) {
      // Cross-origin frames cannot be inspected; fall back to declared dimensions.
      return fallback
    }
  }, [pageHeight, pageWidth])

  const refreshContentSize = useCallback(() => {
    const dims = measureIframeContent()
    applyContentSize(dims)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    // re-measure shortly after load in case fonts/styles settle asynchronously
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      const postDims = measureIframeContent()
      applyContentSize(postDims)
    }, 150)
  }, [applyContentSize, measureIframeContent])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return undefined
    const handleLoad = () => refreshContentSize()
    iframe.addEventListener('load', handleLoad)
    return () => {
      iframe.removeEventListener('load', handleLoad)
    }
  }, [refreshContentSize, src])

  useEffect(() => {
    applyContentSize({ width: pageWidth, height: pageHeight })
  }, [applyContentSize, pageHeight, pageWidth, src])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const container = containerRef.current
    if (!container) return undefined
    const observer = new ResizeObserver(() => schedule(() => updateScale()))
    observer.observe(container)
    return () => observer.disconnect()
  }, [schedule, updateScale])

  useEffect(() => {
    const handleWindowResize = () => schedule(() => updateScale())
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [schedule, updateScale])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const scaledHeight = contentSize.height * scale

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', ...sx }}>
      <Box
        sx={{
          width: contentSize.width,
          height: contentSize.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto',
          bgcolor: background,
        }}
      >
        {/* key is handled by parent; iframe width/height stay at intrinsic size */}
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          loading={loading}
          style={{
            width: contentSize.width,
            height: contentSize.height,
            border: 0,
            display: 'block',
            background,
          }}
        />
      </Box>
      <Box sx={{ width: '100%', height: scaledHeight, visibility: 'hidden', pointerEvents: 'none' }} />
    </Box>
  )
}
