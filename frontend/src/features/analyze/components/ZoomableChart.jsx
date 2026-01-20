import { useCallback, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Brush,
  Cell,
  ReferenceArea,
} from 'recharts'
import { Box, IconButton, Stack, Typography, Chip } from '@mui/material'
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap'
import ZoomInIcon from '@mui/icons-material/ZoomIn'

const CHART_COLORS = [
  '#4f46e5',
  '#22c55e',
  '#0ea5e9',
  '#f97316',
  '#ec4899',
  '#a855f7',
  '#06b6d4',
  '#eab308',
]

const CHART_MARGINS = { top: 8, right: 16, bottom: 24, left: 8 }

export default function ZoomableChart({
  data = [],
  spec = {},
  height = 350,
  showBrush = true,
  showZoomControls = true,
}) {
  const [zoomState, setZoomState] = useState({
    refAreaLeft: null,
    refAreaRight: null,
    startIndex: 0,
    endIndex: null,
    isZoomed: false,
  })

  const { type = 'bar', xField, yFields = [], title } = spec

  const displayData = useMemo(() => {
    if (!data || data.length === 0) return []

    if (zoomState.isZoomed && zoomState.startIndex !== null) {
      const end = zoomState.endIndex ?? data.length
      return data.slice(zoomState.startIndex, end + 1)
    }
    return data
  }, [data, zoomState])

  const handleMouseDown = useCallback((e) => {
    if (!e?.activeLabel) return
    setZoomState((prev) => ({
      ...prev,
      refAreaLeft: e.activeLabel,
      refAreaRight: null,
    }))
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!zoomState.refAreaLeft || !e?.activeLabel) return
    setZoomState((prev) => ({
      ...prev,
      refAreaRight: e.activeLabel,
    }))
  }, [zoomState.refAreaLeft])

  const handleMouseUp = useCallback(() => {
    if (!zoomState.refAreaLeft || !zoomState.refAreaRight) {
      setZoomState((prev) => ({
        ...prev,
        refAreaLeft: null,
        refAreaRight: null,
      }))
      return
    }

    let left = zoomState.refAreaLeft
    let right = zoomState.refAreaRight

    const leftIndex = data.findIndex((d) => d[xField] === left)
    const rightIndex = data.findIndex((d) => d[xField] === right)

    if (leftIndex > rightIndex) {
      [left, right] = [right, left]
    }

    const startIdx = Math.min(leftIndex, rightIndex)
    const endIdx = Math.max(leftIndex, rightIndex)

    if (endIdx - startIdx < 1) {
      setZoomState((prev) => ({
        ...prev,
        refAreaLeft: null,
        refAreaRight: null,
      }))
      return
    }

    setZoomState({
      refAreaLeft: null,
      refAreaRight: null,
      startIndex: startIdx,
      endIndex: endIdx,
      isZoomed: true,
    })
  }, [zoomState.refAreaLeft, zoomState.refAreaRight, data, xField])

  const handleResetZoom = useCallback(() => {
    setZoomState({
      refAreaLeft: null,
      refAreaRight: null,
      startIndex: 0,
      endIndex: null,
      isZoomed: false,
    })
  }, [])

  const handleBrushChange = useCallback((range) => {
    if (!range) return
    const { startIndex, endIndex } = range
    if (startIndex !== undefined && endIndex !== undefined) {
      setZoomState((prev) => ({
        ...prev,
        startIndex,
        endIndex,
        isZoomed: startIndex > 0 || endIndex < data.length - 1,
      }))
    }
  }, [data.length])

  const renderChart = () => {
    if (!xField || yFields.length === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
          <Typography color="text.secondary">Invalid chart configuration</Typography>
        </Box>
      )
    }

    if (!displayData || displayData.length === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      )
    }

    const commonProps = {
      data: displayData,
      margin: CHART_MARGINS,
      onMouseDown: type !== 'pie' ? handleMouseDown : undefined,
      onMouseMove: type !== 'pie' ? handleMouseMove : undefined,
      onMouseUp: type !== 'pie' ? handleMouseUp : undefined,
    }

    const zoomArea =
      zoomState.refAreaLeft && zoomState.refAreaRight ? (
        <ReferenceArea
          x1={zoomState.refAreaLeft}
          x2={zoomState.refAreaRight}
          strokeOpacity={0.3}
          fill="#4f46e5"
          fillOpacity={0.3}
        />
      ) : null

    const brush = showBrush && type !== 'pie' && data.length > 10 ? (
      <Brush
        dataKey={xField}
        height={24}
        stroke="#4f46e5"
        travellerWidth={8}
        onChange={handleBrushChange}
        startIndex={zoomState.startIndex}
        endIndex={zoomState.endIndex ?? data.length - 1}
      />
    ) : null

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {yFields.map((field, idx) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
            {zoomArea}
            {brush}
          </LineChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={displayData}
              dataKey={yFields[0]}
              nameKey={xField}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="75%"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#666', strokeWidth: 1 }}
            >
              {displayData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} name={xField} tick={{ fontSize: 11 }} />
            <YAxis dataKey={yFields[0]} name={yFields[0]} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter
              name={yFields[0]}
              data={displayData}
              fill={CHART_COLORS[0]}
            />
            {zoomArea}
            {brush}
          </ScatterChart>
        )

      case 'bar':
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {yFields.map((field, idx) => (
              <Bar
                key={field}
                dataKey={field}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
            {zoomArea}
            {brush}
          </BarChart>
        )
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {title && (
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
          )}
          <Chip label={type.toUpperCase()} size="small" variant="outlined" />
          {zoomState.isZoomed && (
            <Chip label="Zoomed" size="small" color="primary" />
          )}
        </Stack>

        {showZoomControls && type !== 'pie' && (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={handleResetZoom}
              disabled={!zoomState.isZoomed}
              title="Reset zoom"
            >
              <ZoomOutMapIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Drag to zoom
            </Typography>
          </Stack>
        )}
      </Stack>

      <Box sx={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>

      {spec.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {spec.description}
        </Typography>
      )}
    </Box>
  )
}
