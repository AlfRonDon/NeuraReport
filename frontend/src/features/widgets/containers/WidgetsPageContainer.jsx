/**
 * WidgetsPageContainer — Dynamic Widget Intelligence page.
 *
 * Analyzes the active database connection using data-driven scoring
 * and recommends optimal widget visualizations. No hardcoded catalog —
 * widgets are dynamically selected based on the connected DB schema.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  alpha,
  styled,
} from '@mui/material'
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Storage as DbIcon,
  Speed as KpiIcon,
  ShowChart as TrendIcon,
  CompareArrows as CompareIcon,
  PieChart as DistributionIcon,
  Layers as CompositionIcon,
  BarChart as BarIcon,
  Warning as AlertsIcon,
  Timeline as TimelineIcon,
  ViewList as EventLogIcon,
  Notes as NarrativeIcon,
  AccountTree as SankeyIcon,
  GridView as HeatmapIcon,
  Build as DiagnosticIcon,
  HelpOutline as UncertaintyIcon,
  People as PeopleIcon,
  Hexagon as HexIcon,
  Hub as NetworkIcon,
  Devices as DeviceIcon,
  Public as GlobeIcon,
  Chat as ChatIcon,
  SmartToy as AgentIcon,
  Lock as VaultIcon,
  AreaChart as CumulativeIcon,
  LinkOff as NoConnectionIcon,
} from '@mui/icons-material'
import PageHeader from '@/components/layout/PageHeader'
import WidgetRenderer from '@/features/dashboards/components/WidgetRenderer'
import { recommendWidgets } from '@/api/widgets'
import { useAppStore } from '@/stores'
import {
  SCENARIO_VARIANTS,
  VARIANT_CONFIG,
} from '@/features/dashboards/constants/widgetVariants'

// ── Icon mapping ─────────────────────────────────────────────────────────

const SCENARIO_ICONS = {
  kpi: KpiIcon,
  trend: TrendIcon,
  'trend-multi-line': TrendIcon,
  'trends-cumulative': CumulativeIcon,
  comparison: CompareIcon,
  distribution: DistributionIcon,
  composition: CompositionIcon,
  'category-bar': BarIcon,
  alerts: AlertsIcon,
  timeline: TimelineIcon,
  eventlogstream: EventLogIcon,
  narrative: NarrativeIcon,
  'flow-sankey': SankeyIcon,
  'matrix-heatmap': HeatmapIcon,
  diagnosticpanel: DiagnosticIcon,
  uncertaintypanel: UncertaintyIcon,
  peopleview: PeopleIcon,
  peoplehexgrid: HexIcon,
  peoplenetwork: NetworkIcon,
  edgedevicepanel: DeviceIcon,
  supplychainglobe: GlobeIcon,
  chatstream: ChatIcon,
  agentsview: AgentIcon,
  vaultview: VaultIcon,
}

// ── Styled ────────────────────────────────────────────────────────────────

const WidgetPreview = styled(Box)(({ theme }) => ({
  height: 220,
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.04)
      : alpha(theme.palette.primary.main, 0.02),
}))

// ── Component ─────────────────────────────────────────────────────────────

export default function WidgetsPageContainer() {
  const [widgets, setWidgets] = useState([])
  const [grid, setGrid] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('overview')
  const [selectedScenario, setSelectedScenario] = useState(null)

  const connectionId = useAppStore((s) => s.activeConnectionId)
  const activeConnection = useAppStore((s) => s.activeConnection)
  const connectionName = activeConnection?.name || connectionId || ''

  const loadRecommendations = useCallback(() => {
    if (!connectionId) return
    setLoading(true)
    setError(null)
    recommendWidgets({ connectionId, query, maxWidgets: 12 })
      .then((res) => {
        setWidgets(res.widgets || [])
        setGrid(res.grid || null)
        setProfile(res.profile || null)
      })
      .catch((err) => {
        console.error('[WidgetsPage] Recommendation failed:', err)
        setError(err.userMessage || err.message || 'Failed to get widget recommendations')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [connectionId, query])

  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  const handleQuerySubmit = useCallback(
    (e) => {
      e.preventDefault()
      loadRecommendations()
    },
    [loadRecommendations]
  )

  // ── No connection state ──────────────────────────────────────────────

  if (!connectionId) {
    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        <PageHeader
          title="Widget Intelligence"
          description="Dynamic data-driven widget recommendations"
        />
        <Box
          sx={{
            py: 10,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            borderStyle: 'dashed',
          }}
        >
          <NoConnectionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No database connected
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Connect a database from the Connections page to see intelligent widget
            recommendations tailored to your data.
          </Typography>
        </Box>
      </Box>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────

  if (loading && widgets.length === 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        <PageHeader
          title="Widget Intelligence"
          description={`Analyzing ${connectionName}...`}
        />
        <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Analyzing database schema and recommending widgets...
          </Typography>
        </Box>
      </Box>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────

  if (error && widgets.length === 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        <PageHeader
          title="Widget Intelligence"
          description={connectionName}
        />
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Recommendation failed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Chip label="Retry" onClick={loadRecommendations} color="primary" clickable />
        </Box>
      </Box>
    )
  }

  // ── Profile summary ──────────────────────────────────────────────────

  const profileChips = profile
    ? [
        `${profile.table_count} tables`,
        `${profile.numeric_columns} numeric columns`,
        profile.has_timeseries ? 'timeseries detected' : 'no timeseries',
      ]
    : []

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Widget Intelligence"
        description={`${widgets.length} widgets recommended for ${connectionName}`}
      />

      {/* Profile summary chips */}
      {profileChips.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<DbIcon />}
            label={connectionName}
            size="small"
            color="primary"
            variant="outlined"
          />
          {profileChips.map((label) => (
            <Chip key={label} label={label} size="small" variant="outlined" />
          ))}
        </Box>
      )}

      {/* Query input + refresh */}
      <Box
        component="form"
        onSubmit={handleQuerySubmit}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
      >
        <TextField
          size="small"
          placeholder="Describe what you want to see... (e.g. 'show trends and alerts')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <Tooltip title="Refresh recommendations">
          <IconButton onClick={loadRecommendations} disabled={loading} size="small">
            <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Widget Grid */}
      <Grid container spacing={2}>
        {widgets.map((widget) => {
          const { scenario, variant, question, relevance } = widget
          const Icon = SCENARIO_ICONS[scenario] || TrendIcon
          const vConfig = VARIANT_CONFIG[variant]
          const variants = SCENARIO_VARIANTS[scenario] || []
          const isSelected = selectedScenario === scenario

          return (
            <Grid item xs={12} sm={6} md={4} key={widget.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() =>
                  setSelectedScenario((prev) => (prev === scenario ? null : scenario))
                }
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Live preview */}
                  <WidgetPreview>
                    <WidgetRenderer
                      scenario={scenario}
                      variant={variant}
                      connectionId={connectionId}
                      showSourceBadge
                    />
                  </WidgetPreview>

                  {/* Info */}
                  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {vConfig?.label || variant || scenario}
                    </Typography>
                    <Chip
                      label={`${Math.round(relevance * 100)}%`}
                      size="small"
                      color={relevance > 0.8 ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '10px', ml: 'auto' }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {question}
                  </Typography>

                  {/* Variant count + scenario badge */}
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                    <Chip
                      label={scenario}
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ height: 18, fontSize: '10px' }}
                    />
                    {variants.length > 1 && (
                      <Chip
                        label={`${variants.length} variants`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '10px' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {widgets.length === 0 && !loading && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No widgets recommended for this database.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Try a different query or check your database connection.
          </Typography>
        </Box>
      )}

      {/* Expanded variant list when a scenario card is clicked */}
      {selectedScenario && (
        <Box sx={{ mt: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {selectedScenario} variants
          </Typography>
          <Grid container spacing={2}>
            {(SCENARIO_VARIANTS[selectedScenario] || [selectedScenario]).map((v) => {
              const vc = VARIANT_CONFIG[v]
              return (
                <Grid item xs={12} sm={6} md={4} key={v}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5 }}>
                      <WidgetPreview sx={{ height: 140 }}>
                        <WidgetRenderer
                          scenario={selectedScenario}
                          variant={v}
                          connectionId={connectionId}
                          showSourceBadge
                        />
                      </WidgetPreview>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                        {vc?.label || v}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {vc?.description || ''}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      )}

      {/* Grid utilization info */}
      {grid && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption" color="text.disabled">
            Grid: {grid.total_cols}x{grid.total_rows} &middot; {grid.utilization_pct}% utilization
          </Typography>
        </Box>
      )}
    </Box>
  )
}
