import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  CircularProgress,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import DescriptionIcon from '@mui/icons-material/Description'
import AssessmentIcon from '@mui/icons-material/Assessment'
import WorkIcon from '@mui/icons-material/Work'
import AddIcon from '@mui/icons-material/Add'
import ScheduleIcon from '@mui/icons-material/Schedule'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableChartIcon from '@mui/icons-material/TableChart'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { useAppStore } from '../store/useAppStore'
import * as api from '../api/client'
import * as recommendationsApi from '../api/recommendations'
import { palette } from '../theme'

function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', onClick, trend }) {
  const colorMap = {
    primary: palette.green[400],
    success: palette.green[400],
    warning: palette.yellow[400],
    info: palette.blue[400],
    error: palette.red[400],
  }
  const accentColor = colorMap[color] || palette.green[400]

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5,
        bgcolor: palette.scale[1000],
        borderRadius: '8px',
        border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 150ms ease',
        '&:hover': onClick ? {
          borderColor: alpha(palette.scale[100], 0.15),
          bgcolor: palette.scale[900],
        } : {},
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: palette.scale[500],
              mb: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: palette.scale[100],
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: '0.6875rem', color: palette.scale[500], mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
          {trend !== undefined && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
              <TrendingUpIcon sx={{ fontSize: 12, color: trend >= 0 ? palette.green[400] : palette.red[400] }} />
              <Typography sx={{ fontSize: '0.6875rem', color: trend >= 0 ? palette.green[400] : palette.red[400] }}>
                {trend >= 0 ? '+' : ''}{trend}% this week
              </Typography>
            </Stack>
          )}
        </Box>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            bgcolor: alpha(accentColor, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 18, color: accentColor }} />
        </Box>
      </Stack>
    </Box>
  )
}

function QuickActionButton({ label, icon: Icon, onClick }) {
  return (
    <Button
      variant="outlined"
      fullWidth
      startIcon={<Icon sx={{ fontSize: 16 }} />}
      endIcon={<ArrowForwardIcon sx={{ fontSize: 14, opacity: 0.5 }} />}
      onClick={onClick}
      sx={{
        justifyContent: 'flex-start',
        color: palette.scale[300],
        borderColor: alpha(palette.scale[100], 0.1),
        bgcolor: 'transparent',
        py: 1.25,
        px: 1.5,
        '&:hover': {
          borderColor: alpha(palette.scale[100], 0.2),
          bgcolor: alpha(palette.scale[100], 0.03),
        },
        '& .MuiButton-endIcon': {
          ml: 'auto',
        },
      }}
    >
      {label}
    </Button>
  )
}

function MiniBarChart({ data }) {
  if (!data || !data.length) return null
  const max = Math.max(...data.map(d => d.total || 0), 1)

  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 60 }}>
      {data.map((item, idx) => (
        <Tooltip key={idx} title={`${item.label}: ${item.total} jobs`} arrow>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: '100%',
                maxWidth: 24,
                height: Math.max(4, (item.total / max) * 48),
                bgcolor: item.failed > 0 ? alpha(palette.red[400], 0.6) : palette.green[400],
                borderRadius: '2px 2px 0 0',
                transition: 'height 300ms ease',
              }}
            />
            <Typography sx={{ fontSize: '0.5rem', color: palette.scale[600], mt: 0.5 }}>
              {item.label}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  )
}

function getStatusIcon(status) {
  switch (status) {
    case 'completed':
      return <CheckCircleOutlineIcon sx={{ fontSize: 16, color: palette.green[400] }} />
    case 'running':
      return <PlayArrowIcon sx={{ fontSize: 16, color: palette.blue[400] }} />
    case 'pending':
      return <HourglassEmptyIcon sx={{ fontSize: 16, color: palette.yellow[400] }} />
    case 'failed':
      return <ErrorOutlineIcon sx={{ fontSize: 16, color: palette.red[400] }} />
    default:
      return <HourglassEmptyIcon sx={{ fontSize: 16, color: palette.scale[500] }} />
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'completed': return 'success'
    case 'running': return 'info'
    case 'pending': return 'warning'
    case 'failed': return 'error'
    default: return 'default'
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const didLoadRef = useRef(false)

  const templates = useAppStore((s) => s.templates)
  const savedConnections = useAppStore((s) => s.savedConnections)
  const activeConnection = useAppStore((s) => s.activeConnection)

  const [jobs, setJobs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [favorites, setFavorites] = useState({ templates: [], connections: [] })
  const [recommendations, setRecommendations] = useState([])
  const [recLoading, setRecLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('neurareport_onboarding_dismissed') !== 'true'
  })

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [state, jobsData, analyticsData, favData] = await Promise.all([
        api.bootstrapState(),
        api.listJobs({ limit: 5 }),
        api.getDashboardAnalytics().catch(() => null),
        api.getFavorites().catch(() => ({ templates: [], connections: [] })),
      ])

      if (state?.templates) {
        useAppStore.setState({ templates: state.templates })
      }
      if (state?.connections) {
        useAppStore.setState({ savedConnections: state.connections })
      }
      setJobs(jobsData?.jobs || [])
      setAnalytics(analyticsData)
      setFavorites(favData)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    fetchData()
  }, [fetchData])

  const handleRefresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  const fetchRecommendations = useCallback(async () => {
    if (recLoading) return
    setRecLoading(true)
    try {
      const catalog = await recommendationsApi.getCatalog()
      // Get top recommendations from the catalog
      const templates = catalog?.templates || catalog?.recommendations || []
      setRecommendations(templates.slice(0, 4))
    } catch {
      // Fallback to existing templates as recommendations
      const topTpls = templates.slice(0, 4).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || `${t.kind?.toUpperCase() || 'PDF'} template`,
        kind: t.kind,
        matchScore: 0.85,
      }))
      setRecommendations(topTpls)
    } finally {
      setRecLoading(false)
    }
  }, [recLoading, templates])

  useEffect(() => {
    if (recommendations.length === 0 && templates.length > 0 && !recLoading) {
      fetchRecommendations()
    }
  }, [templates.length, recommendations.length, recLoading, fetchRecommendations])

  const summary = analytics?.summary || {}
  const metrics = analytics?.metrics || {}
  const topTemplates = analytics?.topTemplates || []
  const jobsTrend = analytics?.jobsTrend || []
  const needsOnboarding = showOnboarding && (templates.length === 0 || savedConnections.length === 0)

  const handleDismissOnboarding = () => {
    setShowOnboarding(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('neurareport_onboarding_dismissed', 'true')
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: palette.scale[100],
              letterSpacing: '-0.02em',
              mb: 0.5,
            }}
          >
            Welcome to NeuraReport
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: palette.scale[500],
            }}
          >
            Generate intelligent reports from your data
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ color: palette.scale[400] }}
          >
            {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/setup/wizard')}
            sx={{ px: 2.5, py: 1 }}
          >
            New Report
          </Button>
        </Stack>
      </Stack>

      {needsOnboarding && (
        <Box
          sx={{
            mb: 3,
            p: 2.5,
            bgcolor: palette.scale[1000],
            borderRadius: '8px',
            border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          }}
        >
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: palette.scale[100] }}>
              Get started with NeuraReport
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500] }}>
              Connect a data source, upload a template, then generate your first report.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                onClick={() => navigate('/setup/wizard')}
                sx={{ textTransform: 'none' }}
              >
                Run setup wizard
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/connections')}
                sx={{ textTransform: 'none' }}
              >
                Add a connection
              </Button>
              <Button
                variant="text"
                onClick={handleDismissOnboarding}
                sx={{ textTransform: 'none', color: palette.scale[400] }}
              >
                Dismiss
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          title="Connections"
          value={summary.totalConnections ?? savedConnections.length}
          subtitle={`${summary.activeConnections ?? 0} active`}
          icon={StorageIcon}
          color="primary"
          onClick={() => navigate('/connections')}
        />
        <StatCard
          title="Templates"
          value={summary.totalTemplates ?? templates.length}
          subtitle={`${summary.pdfTemplates ?? 0} PDF, ${summary.excelTemplates ?? 0} Excel`}
          icon={DescriptionIcon}
          color="success"
          onClick={() => navigate('/templates')}
        />
        <StatCard
          title="Jobs Today"
          value={metrics.jobsToday ?? 0}
          subtitle={`${metrics.jobsThisWeek ?? 0} this week`}
          icon={WorkIcon}
          color="warning"
          onClick={() => navigate('/jobs')}
        />
        <StatCard
          title="Success Rate"
          value={`${metrics.successRate ?? 0}%`}
          subtitle={`${summary.completedJobs ?? 0} completed`}
          icon={AssessmentIcon}
          color="info"
          onClick={() => navigate('/stats')}
        />
        <StatCard
          title="Schedules"
          value={summary.totalSchedules ?? 0}
          subtitle={`${summary.activeSchedules ?? 0} active`}
          icon={ScheduleIcon}
          color="primary"
          onClick={() => navigate('/schedules')}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '340px 1fr 280px' },
          gap: 3,
        }}
      >
        {/* Quick Actions */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: palette.scale[1000],
            borderRadius: '8px',
            border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
            height: 'fit-content',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: palette.scale[100],
              mb: 2,
            }}
          >
            Quick Actions
          </Typography>
          <Stack spacing={1}>
            <QuickActionButton
              label="Manage Connections"
              icon={StorageIcon}
              onClick={() => navigate('/connections')}
            />
            <QuickActionButton
              label="View Templates"
              icon={DescriptionIcon}
              onClick={() => navigate('/templates')}
            />
            <QuickActionButton
              label="Generate Report"
              icon={AssessmentIcon}
              onClick={() => navigate('/reports')}
            />
            <QuickActionButton
              label="Manage Schedules"
              icon={ScheduleIcon}
              onClick={() => navigate('/schedules')}
            />
          </Stack>

          {/* Job Trend Chart */}
          {jobsTrend.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: palette.scale[400],
                  mb: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Jobs This Week
              </Typography>
              <MiniBarChart data={jobsTrend} />
            </Box>
          )}
        </Box>

        {/* Recent Jobs */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: palette.scale[1000],
            borderRadius: '8px',
            border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: palette.scale[100],
              }}
            >
              Recent Jobs
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/jobs')}
              sx={{
                color: palette.scale[400],
                fontSize: '0.75rem',
                '&:hover': {
                  color: palette.scale[100],
                  bgcolor: 'transparent',
                },
              }}
            >
              View All
            </Button>
          </Stack>

          {loading ? (
            <LinearProgress
              sx={{
                bgcolor: palette.scale[800],
                '& .MuiLinearProgress-bar': {
                  bgcolor: palette.green[400],
                },
              }}
            />
          ) : jobs.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <WorkIcon sx={{ fontSize: 32, color: palette.scale[700], mb: 1 }} />
              <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500] }}>
                No jobs yet. Generate your first report to get started.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {jobs.slice(0, 5).map((job, index) => (
                <ListItem
                  key={job.id}
                  sx={{
                    px: 0,
                    py: 1.5,
                    borderBottom: index < jobs.length - 1 ? `1px solid ${alpha(palette.scale[100], 0.06)}` : 'none',
                  }}
                >
                  <Box sx={{ mr: 1.5 }}>
                    {getStatusIcon(job.status)}
                  </Box>
                  <ListItemText
                    primary={job.template_name || job.templateName || job.template_id?.slice(0, 12)}
                    secondary={new Date(job.created_at || job.createdAt).toLocaleString()}
                    primaryTypographyProps={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: palette.scale[200],
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: palette.scale[500],
                    }}
                  />
                  <Chip
                    label={job.status}
                    size="small"
                    color={getStatusColor(job.status)}
                    sx={{
                      height: 22,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Top Templates & Favorites */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top Templates */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: palette.scale[1000],
              borderRadius: '8px',
              border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: palette.scale[100],
                mb: 2,
              }}
            >
              Top Templates
            </Typography>
            {topTemplates.length === 0 ? (
              <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500] }}>
                No template usage data yet
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {topTemplates.slice(0, 4).map((tpl) => (
                  <Stack
                    key={tpl.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 },
                    }}
                    onClick={() => navigate(`/reports?template=${tpl.id}`)}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        bgcolor: alpha(tpl.kind === 'excel' ? palette.green[400] : palette.red[400], 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {tpl.kind === 'excel' ? (
                        <TableChartIcon sx={{ fontSize: 14, color: palette.green[400] }} />
                      ) : (
                        <PictureAsPdfIcon sx={{ fontSize: 14, color: palette.red[400] }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        noWrap
                        sx={{ fontSize: '0.8125rem', fontWeight: 500, color: palette.scale[200] }}
                      >
                        {tpl.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.6875rem', color: palette.scale[500] }}>
                        {tpl.runCount} runs
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          {/* Favorites */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: palette.scale[1000],
              borderRadius: '8px',
              border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <StarIcon sx={{ fontSize: 16, color: palette.yellow[400] }} />
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: palette.scale[100],
                }}
              >
                Favorites
              </Typography>
            </Stack>
            {favorites.templates.length === 0 && favorites.connections.length === 0 ? (
              <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500] }}>
                No favorites yet. Star templates or connections for quick access.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {favorites.templates.slice(0, 3).map((tpl) => (
                  <Stack
                    key={tpl.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    onClick={() => navigate(`/reports?template=${tpl.id}`)}
                  >
                    <DescriptionIcon sx={{ fontSize: 14, color: palette.scale[500] }} />
                    <Typography noWrap sx={{ fontSize: '0.8125rem', color: palette.scale[300] }}>
                      {tpl.name}
                    </Typography>
                  </Stack>
                ))}
                {favorites.connections.slice(0, 2).map((conn) => (
                  <Stack
                    key={conn.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    onClick={() => navigate('/connections')}
                  >
                    <StorageIcon sx={{ fontSize: 14, color: palette.scale[500] }} />
                    <Typography noWrap sx={{ fontSize: '0.8125rem', color: palette.scale[300] }}>
                      {conn.name}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </Box>

      {/* Recommendations Panel */}
      <Box
        sx={{
          mt: 3,
          p: 2.5,
          bgcolor: palette.scale[1000],
          borderRadius: '8px',
          border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: alpha(palette.purple?.[400] || palette.blue[400], 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 16, color: palette.purple?.[400] || palette.blue[400] }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: palette.scale[100],
                }}
              >
                AI Recommendations
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: palette.scale[500] }}>
                Smart template suggestions for your data
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            startIcon={<LightbulbIcon sx={{ fontSize: 14 }} />}
            onClick={fetchRecommendations}
            disabled={recLoading}
            sx={{
              color: palette.scale[400],
              fontSize: '0.75rem',
              '&:hover': { color: palette.scale[100] },
            }}
          >
            {recLoading ? 'Loading...' : 'Get Suggestions'}
          </Button>
        </Stack>

        {recLoading ? (
          <LinearProgress
            sx={{
              bgcolor: palette.scale[800],
              '& .MuiLinearProgress-bar': { bgcolor: palette.blue[400] },
            }}
          />
        ) : recommendations.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <LightbulbIcon sx={{ fontSize: 32, color: palette.scale[700], mb: 1 }} />
            <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500], mb: 1 }}>
              No recommendations yet
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchRecommendations}
              sx={{ textTransform: 'none' }}
            >
              Get AI Recommendations
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            {recommendations.map((rec) => (
              <Box
                key={rec.id}
                onClick={() => navigate(`/reports?template=${rec.id}`)}
                sx={{
                  p: 2,
                  borderRadius: '8px',
                  border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
                  bgcolor: alpha(palette.scale[100], 0.02),
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  '&:hover': {
                    borderColor: alpha(palette.scale[100], 0.15),
                    bgcolor: alpha(palette.scale[100], 0.05),
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '6px',
                      bgcolor: alpha(rec.kind === 'excel' ? palette.green[400] : palette.red[400], 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {rec.kind === 'excel' ? (
                      <TableChartIcon sx={{ fontSize: 12, color: palette.green[400] }} />
                    ) : (
                      <PictureAsPdfIcon sx={{ fontSize: 12, color: palette.red[400] }} />
                    )}
                  </Box>
                  {rec.matchScore && (
                    <Chip
                      label={`${Math.round((rec.matchScore || 0) * 100)}%`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: alpha(palette.green[400], 0.15),
                        color: palette.green[400],
                      }}
                    />
                  )}
                </Stack>
                <Typography
                  noWrap
                  sx={{ fontSize: '0.8125rem', fontWeight: 500, color: palette.scale[200] }}
                >
                  {rec.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    color: palette.scale[500],
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {rec.description}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Connection Status */}
      {activeConnection && (
        <Box
          sx={{
            mt: 3,
            p: 2.5,
            bgcolor: palette.scale[1000],
            borderRadius: '8px',
            border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                bgcolor: alpha(palette.green[400], 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StorageIcon sx={{ fontSize: 20, color: palette.green[400] }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: palette.scale[100],
                }}
              >
                Connected to {activeConnection.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: palette.scale[500],
                }}
              >
                {activeConnection.db_type} {activeConnection.summary && `\u2022 ${activeConnection.summary}`}
              </Typography>
            </Box>
            <Chip
              label="Active"
              size="small"
              color="success"
              sx={{
                height: 22,
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            />
          </Stack>
        </Box>
      )}
    </Box>
  )
}
