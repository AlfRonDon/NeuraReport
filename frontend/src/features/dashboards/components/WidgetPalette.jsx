/**
 * Widget Palette Component
 * Draggable widget options for dashboard building.
 */
import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Divider,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  PieChart as PieChartIcon,
  DonutLarge as DonutIcon,
  StackedBarChart as StackedIcon,
  AreaChart as AreaIcon,
  ScatterPlot as ScatterIcon,
  TrendingUp as MetricIcon,
  TableChart as TableIcon,
  TextFields as TextIcon,
  FilterList as FilterIcon,
  Image as ImageIcon,
  Map as MapIcon,
  Numbers as NumberIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material'

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PaletteContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}))

const CategoryHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  padding: theme.spacing(0.5, 0),
  '&:hover': {
    opacity: 0.8,
  },
}))

const WidgetCard = styled(Card)(({ theme }) => ({
  cursor: 'grab',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
    borderColor: theme.palette.primary.main,
  },
  '&:active': {
    cursor: 'grabbing',
    transform: 'scale(0.98)',
  },
}))

const WidgetGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: theme.spacing(1),
}))

// =============================================================================
// WIDGET DEFINITIONS
// =============================================================================

const WIDGET_CATEGORIES = [
  {
    id: 'charts',
    label: 'Charts',
    widgets: [
      { type: 'chart:bar', label: 'Bar', icon: BarChartIcon, color: 'primary' },
      { type: 'chart:line', label: 'Line', icon: LineChartIcon, color: 'primary' },
      { type: 'chart:area', label: 'Area', icon: AreaIcon, color: 'primary' },
      { type: 'chart:pie', label: 'Pie', icon: PieChartIcon, color: 'primary' },
      { type: 'chart:donut', label: 'Donut', icon: DonutIcon, color: 'primary' },
      { type: 'chart:stacked', label: 'Stacked', icon: StackedIcon, color: 'primary' },
      { type: 'chart:scatter', label: 'Scatter', icon: ScatterIcon, color: 'primary' },
    ],
  },
  {
    id: 'metrics',
    label: 'Metrics',
    widgets: [
      { type: 'metric', label: 'KPI', icon: MetricIcon, color: 'success' },
      { type: 'metric:number', label: 'Number', icon: NumberIcon, color: 'success' },
      { type: 'metric:progress', label: 'Progress', icon: DonutIcon, color: 'success' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    widgets: [
      { type: 'table', label: 'Table', icon: TableIcon, color: 'info' },
      { type: 'filter', label: 'Filter', icon: FilterIcon, color: 'warning' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    widgets: [
      { type: 'text', label: 'Text', icon: TextIcon, color: 'secondary' },
      { type: 'image', label: 'Image', icon: ImageIcon, color: 'secondary' },
    ],
  },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function WidgetPalette({ onAddWidget }) {
  const theme = useTheme()
  const [expandedCategories, setExpandedCategories] = useState(
    WIDGET_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  )

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }, [])

  const handleDragStart = useCallback((e, widget) => {
    e.dataTransfer.setData('widget-type', widget.type)
    e.dataTransfer.setData('widget-label', widget.label)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleWidgetClick = useCallback((widget) => {
    onAddWidget?.(widget.type, widget.label)
  }, [onAddWidget])

  return (
    <PaletteContainer>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Add Widget
      </Typography>

      {WIDGET_CATEGORIES.map((category) => (
        <Box key={category.id}>
          <CategoryHeader onClick={() => toggleCategory(category.id)}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {category.label}
            </Typography>
            <IconButton size="small">
              {expandedCategories[category.id] ? (
                <CollapseIcon fontSize="small" />
              ) : (
                <ExpandIcon fontSize="small" />
              )}
            </IconButton>
          </CategoryHeader>

          <Collapse in={expandedCategories[category.id]}>
            <WidgetGrid>
              {category.widgets.map((widget) => (
                <WidgetCard
                  key={widget.type}
                  variant="outlined"
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget)}
                  onClick={() => handleWidgetClick(widget)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <widget.icon
                        sx={{
                          fontSize: 20,
                          color: `${widget.color}.main`,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '0.7rem', textAlign: 'center' }}
                      >
                        {widget.label}
                      </Typography>
                    </Box>
                  </CardContent>
                </WidgetCard>
              ))}
            </WidgetGrid>
          </Collapse>
        </Box>
      ))}
    </PaletteContainer>
  )
}

/**
 * Parse widget type to get category and subtype
 */
export function parseWidgetType(type) {
  const [category, subtype] = type.split(':')
  return { category, subtype: subtype || category }
}

/**
 * Get widget definition by type
 */
export function getWidgetDefinition(type) {
  for (const category of WIDGET_CATEGORIES) {
    const widget = category.widgets.find((w) => w.type === type)
    if (widget) return widget
  }
  return null
}

/**
 * All available widget types
 */
export const ALL_WIDGET_TYPES = WIDGET_CATEGORIES.flatMap((c) => c.widgets)
