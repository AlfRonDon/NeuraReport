import { useState, useCallback, useRef } from 'react'
import { Box, Typography, Stack, Chip, IconButton, Tooltip } from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadIcon from '@mui/icons-material/Download'
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceArea,
} from 'recharts'

const COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#ec4899']

function ChartContent({ type, data, xField, yFields, zoomDomain, onZoom }) {
  const [refAreaLeft, setRefAreaLeft] = useState(null)
  const [refAreaRight, setRefAreaRight] = useState(null)

  const handleMouseDown = useCallback((e) => {
    if (e?.activeLabel) {
      setRefAreaLeft(e.activeLabel)
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (refAreaLeft && e?.activeLabel) {
      setRefAreaRight(e.activeLabel)
    }
  }, [refAreaLeft])

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft && refAreaRight) {
      const [left, right] = [refAreaLeft, refAreaRight].sort()
      onZoom?.({ left, right })
    }
    setRefAreaLeft(null)
    setRefAreaRight(null)
  }, [refAreaLeft, refAreaRight, onZoom])

  const commonProps = {
    data,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
  }

  const renderLines = () =>
    yFields.map((field, idx) => (
      <Line
        key={field}
        type="monotone"
        dataKey={field}
        stroke={COLORS[idx % COLORS.length]}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
      />
    ))

  const renderBars = () =>
    yFields.map((field, idx) => (
      <Bar
        key={field}
        dataKey={field}
        fill={COLORS[idx % COLORS.length]}
        radius={[4, 4, 0, 0]}
      />
    ))

  const Chart = type === 'bar' ? BarChart : LineChart

  return (
    <ResponsiveContainer width="100%" height={300}>
      <Chart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey={xField}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
          domain={zoomDomain ? [zoomDomain.left, zoomDomain.right] : ['auto', 'auto']}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
        <Legend />
        {type === 'bar' ? renderBars() : renderLines()}
        <Brush dataKey={xField} height={30} stroke="#4f46e5" />
        {refAreaLeft && refAreaRight && (
          <ReferenceArea
            x1={refAreaLeft}
            x2={refAreaRight}
            strokeOpacity={0.3}
            fill="#4f46e5"
            fillOpacity={0.2}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  )
}

export default function ChartBlock({ data }) {
  const { title, type = 'line', chartData = [], xField, yFields = [], description } = data || {}
  const [zoomDomain, setZoomDomain] = useState(null)
  const chartContainerRef = useRef(null)

  const handleZoom = useCallback((domain) => {
    setZoomDomain(domain)
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomDomain(null)
  }, [])

  const handleDownload = useCallback(() => {
    if (!chartContainerRef.current) return

    // Find the SVG element inside the chart container
    const svgElement = chartContainerRef.current.querySelector('svg')
    if (!svgElement) return

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true)

    // Set explicit dimensions
    const svgRect = svgElement.getBoundingClientRect()
    clonedSvg.setAttribute('width', svgRect.width)
    clonedSvg.setAttribute('height', svgRect.height)

    // Add white background for PNG
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    background.setAttribute('width', '100%')
    background.setAttribute('height', '100%')
    background.setAttribute('fill', 'white')
    clonedSvg.insertBefore(background, clonedSvg.firstChild)

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    // Create an image to convert SVG to PNG
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = svgRect.width * 2 // 2x for better quality
      canvas.height = svgRect.height * 2
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)

      // Trigger download
      const link = document.createElement('a')
      link.download = `${title || 'chart'}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(svgUrl)
    }
    img.src = svgUrl
  }, [title])

  if (!chartData.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No chart data available</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" fontWeight={600}>
            {title || 'Chart'}
          </Typography>
          <Chip
            size="small"
            label={type}
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Reset zoom">
            <span>
              <IconButton size="small" onClick={handleResetZoom} disabled={!zoomDomain} aria-label="Reset zoom">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download chart as PNG">
            <IconButton size="small" onClick={handleDownload} aria-label="Download chart as PNG">
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Chart */}
      <Box ref={chartContainerRef}>
      <ChartContent
        type={type}
        data={chartData}
        xField={xField}
        yFields={yFields}
        zoomDomain={zoomDomain}
        onZoom={handleZoom}
      />
      </Box>

      {/* Description */}
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {description}
        </Typography>
      )}
    </Box>
  )
}
