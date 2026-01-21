import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
  alpha,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Button,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import BarChartIcon from '@mui/icons-material/BarChart'
import PieChartIcon from '@mui/icons-material/PieChart'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import ScheduleIcon from '@mui/icons-material/Schedule'
import WorkIcon from '@mui/icons-material/Work'
import StorageIcon from '@mui/icons-material/Storage'
import DownloadIcon from '@mui/icons-material/Download'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts'
import { useToast } from '../../components/ToastProvider'
import * as api from '../../api/client'
import { palette } from '../../theme'

const CHART_COLORS = [
  palette.green[400],
  palette.blue[400],
  palette.yellow[400],
  palette.red[400],
  palette.purple?.[400] || '#a855f7',
  palette.scale[400],
]

const STATUS_COLORS = {
  completed: palette.green[400],
  failed: palette.red[400],
  pending: palette.yellow[400],
  running: palette.blue[400],
  cancelled: palette.scale[500],
}

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
]

function StatCard({ title, value, subtitle, icon: Icon, trend, color, onClick }) {
  const trendPositive = trend > 0
  const TrendIcon = trendPositive ? TrendingUpIcon : TrendingDownIcon
  const trendColor = trendPositive ? palette.green[400] : palette.red[400]

  return (
    <Card
      onClick={onClick}
      sx={{
        bgcolor: palette.scale[1000],
        border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        borderRadius: '12px',
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 150ms ease',
        '&:hover': onClick ? {
          borderColor: alpha(palette.scale[100], 0.15),
          bgcolor: palette.scale[900],
        } : {},
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: palette.scale[500],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.75rem',
                fontWeight: 600,
                color: color || palette.scale[100],
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: palette.scale[500],
                  mt: 0.5,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: alpha(color || palette.scale[400], 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ fontSize: 20, color: color || palette.scale[400] }} />
          </Box>
        </Stack>
        {trend !== undefined && trend !== null && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5 }}>
            <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
            <Typography sx={{ fontSize: '0.75rem', color: trendColor, fontWeight: 500 }}>
              {Math.abs(trend)}%
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: palette.scale[500] }}>
              vs previous period
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, subtitle, children, height = 280, actions }) {
  return (
    <Card
      sx={{
        bgcolor: palette.scale[1000],
        border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        borderRadius: '12px',
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: palette.scale[200],
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: palette.scale[500],
                  mt: 0.25,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions}
        </Stack>
        <Box sx={{ flex: 1, minHeight: height }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box
      sx={{
        bgcolor: palette.scale[900],
        border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
        borderRadius: '6px',
        p: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: palette.scale[200], mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((entry, index) => (
        <Stack key={index} direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: entry.color,
            }}
          />
          <Typography sx={{ fontSize: '0.6875rem', color: palette.scale[400] }}>
            {entry.name}: {entry.value}
          </Typography>
        </Stack>
      ))}
    </Box>
  )
}

const TAB_MAP = { overview: 0, jobs: 1, templates: 2 }
const TAB_NAMES = ['overview', 'jobs', 'templates']

export default function UsageStatsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const didLoadRef = useRef(false)

  // Get tab from URL or default to 0
  const tabParam = searchParams.get('tab') || 'overview'
  const activeTab = TAB_MAP[tabParam] ?? 0

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(searchParams.get('period') || 'week')

  const [dashboardData, setDashboardData] = useState(null)
  const [usageData, setUsageData] = useState(null)
  const [historyData, setHistoryData] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboard, usage, history] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getUsageStatistics(period),
        api.getReportHistory({ limit: 100 }),
      ])
      setDashboardData(dashboard)
      setUsageData(usage)
      setHistoryData(history)
    } catch (err) {
      toast.show(err.message || 'Failed to load statistics', 'error')
    } finally {
      setLoading(false)
    }
  }, [period, toast])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!didLoadRef.current) return
    fetchData()
  }, [period, fetchData])

  const summary = dashboardData?.summary || {}
  const metrics = dashboardData?.metrics || {}
  const jobsTrend = dashboardData?.jobsTrend || []
  const topTemplates = dashboardData?.topTemplates || []

  const statusData = useMemo(() => {
    const byStatus = usageData?.byStatus || {}
    return Object.entries(byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLORS[name] || palette.scale[400],
    }))
  }, [usageData])

  const kindData = useMemo(() => {
    const byKind = usageData?.byKind || {}
    return Object.entries(byKind).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: name === 'pdf' ? palette.red[400] : palette.green[400],
    }))
  }, [usageData])

  const templateBreakdown = useMemo(() => {
    const breakdown = usageData?.templateBreakdown || []
    if (breakdown.length > 0) return breakdown
    return topTemplates.slice(0, 6).map((t) => ({
      name: t.name || t.id?.slice(0, 12),
      count: t.runCount || 0,
      kind: t.kind || 'pdf',
    }))
  }, [usageData, topTemplates])

  const historyByDay = useMemo(() => {
    const history = historyData?.history || []
    const byDay = {}
    history.forEach((item) => {
      const date = item.createdAt?.split('T')[0]
      if (!date) return
      if (!byDay[date]) {
        byDay[date] = { date, completed: 0, failed: 0, total: 0 }
      }
      byDay[date].total += 1
      if (item.status === 'completed') byDay[date].completed += 1
      else if (item.status === 'failed') byDay[date].failed += 1
    })
    return Object.values(byDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
  }, [historyData])

  const handleExportStats = useCallback(async () => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        period,
        dashboard: dashboardData,
        usage: usageData,
        historyCount: historyData?.total || 0,
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `neurareport-stats-${period}-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.show('Statistics exported', 'success')
    } catch (err) {
      toast.show('Failed to export statistics', 'error')
    }
  }, [period, dashboardData, usageData, historyData, toast])

  if (loading && !dashboardData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography sx={{ mt: 2, color: palette.scale[500] }}>Loading statistics...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} color={palette.scale[100]}>
            Usage Statistics
          </Typography>
          <Typography variant="body2" color={palette.scale[500]}>
            Detailed analytics and insights for your workspace
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ color: palette.scale[500] }}>Time Period</InputLabel>
            <Select
              value={period}
              onChange={(e) => {
                const newPeriod = e.target.value
                setPeriod(newPeriod)
                const newParams = new URLSearchParams(searchParams)
                newParams.set('period', newPeriod)
                setSearchParams(newParams, { replace: true })
              }}
              label="Time Period"
              sx={{
                color: palette.scale[200],
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(palette.scale[100], 0.15),
                },
              }}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExportStats}
            sx={{ textTransform: 'none' }}
          >
            Export
          </Button>
          <IconButton
            onClick={fetchData}
            disabled={loading}
            sx={{ color: palette.scale[400] }}
          >
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {/* Overview Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Jobs"
            value={summary.totalJobs || 0}
            subtitle={`${metrics.jobsThisWeek || 0} this week`}
            icon={WorkIcon}
            color={palette.blue[400]}
            onClick={() => navigate('/jobs')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={`${(metrics.successRate || 0).toFixed(1)}%`}
            subtitle={`${summary.completedJobs || 0} completed`}
            icon={CheckCircleIcon}
            color={palette.green[400]}
            onClick={() => navigate('/history')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Templates"
            value={summary.totalTemplates || 0}
            subtitle={`${summary.approvedTemplates || 0} approved`}
            icon={DescriptionIcon}
            color={palette.yellow[400]}
            onClick={() => navigate('/templates')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Connections"
            value={summary.totalConnections || 0}
            subtitle={`${summary.activeConnections || 0} active`}
            icon={StorageIcon}
            color={palette.purple?.[400] || '#a855f7'}
            onClick={() => navigate('/connections')}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('tab', TAB_NAMES[v])
            setSearchParams(newParams, { replace: true })
          }}
          sx={{
            '& .MuiTab-root': {
              color: palette.scale[500],
              textTransform: 'none',
              minWidth: 100,
              '&.Mui-selected': {
                color: palette.green[400],
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: palette.green[400],
            },
          }}
        >
          <Tab label="Overview" icon={<BarChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Jobs" icon={<WorkIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Templates" icon={<DescriptionIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={2}>
          {/* Jobs Trend Chart */}
          <Grid item xs={12} lg={8}>
            <ChartCard title="Jobs Trend" subtitle="Daily job completions over the past week">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(palette.scale[100], 0.1)} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: palette.scale[500], fontSize: 11 }}
                    axisLine={{ stroke: alpha(palette.scale[100], 0.1) }}
                  />
                  <YAxis
                    tick={{ fill: palette.scale[500], fontSize: 11 }}
                    axisLine={{ stroke: alpha(palette.scale[100], 0.1) }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completed" name="Completed" fill={palette.green[400]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill={palette.red[400]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Status Distribution */}
          <Grid item xs={12} lg={4}>
            <ChartCard title="Job Status" subtitle="Distribution by status">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: palette.scale[300], fontSize: '0.75rem' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Template Type Distribution */}
          <Grid item xs={12} md={6}>
            <ChartCard title="Template Types" subtitle="PDF vs Excel usage">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kindData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: palette.scale[500] }}
                  >
                    {kindData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Top Templates */}
          <Grid item xs={12} md={6}>
            <ChartCard title="Top Templates" subtitle="Most used templates">
              {templateBreakdown.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: palette.scale[500], fontSize: '0.875rem' }}>
                    No template usage data
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {templateBreakdown.map((template, index) => (
                    <Box key={index}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                            {template.name}
                          </Typography>
                          <Chip
                            label={template.kind?.toUpperCase()}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.5625rem',
                              bgcolor: alpha(
                                template.kind === 'excel' ? palette.green[400] : palette.red[400],
                                0.15
                              ),
                              color: template.kind === 'excel' ? palette.green[400] : palette.red[400],
                            }}
                          />
                        </Stack>
                        <Typography sx={{ fontSize: '0.75rem', color: palette.scale[400] }}>
                          {template.count} runs
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={
                          templateBreakdown[0]?.count
                            ? (template.count / templateBreakdown[0].count) * 100
                            : 0
                        }
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(palette.scale[100], 0.08),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: CHART_COLORS[index % CHART_COLORS.length],
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </ChartCard>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={2}>
          {/* Jobs Over Time */}
          <Grid item xs={12}>
            <ChartCard title="Jobs History" subtitle="Job executions over the past 2 weeks" height={320}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyByDay}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.green[400]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={palette.green[400]} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.red[400]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={palette.red[400]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(palette.scale[100], 0.1)} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: palette.scale[500], fontSize: 10 }}
                    axisLine={{ stroke: alpha(palette.scale[100], 0.1) }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fill: palette.scale[500], fontSize: 11 }}
                    axisLine={{ stroke: alpha(palette.scale[100], 0.1) }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke={palette.green[400]}
                    fill="url(#colorCompleted)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke={palette.red[400]}
                    fill="url(#colorFailed)"
                    strokeWidth={2}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: palette.scale[300], fontSize: '0.75rem' }}>{value}</span>
                    )}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          {/* Job Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Jobs Today"
              value={metrics.jobsToday || 0}
              icon={ScheduleIcon}
              color={palette.blue[400]}
              onClick={() => navigate('/jobs')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Jobs This Week"
              value={metrics.jobsThisWeek || 0}
              icon={WorkIcon}
              color={palette.green[400]}
              onClick={() => navigate('/jobs')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Jobs This Month"
              value={metrics.jobsThisMonth || 0}
              icon={BarChartIcon}
              color={palette.yellow[400]}
              onClick={() => navigate('/jobs')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Failed Jobs"
              value={summary.failedJobs || 0}
              icon={ErrorIcon}
              color={palette.red[400]}
              onClick={() => navigate('/history?status=failed')}
            />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={2}>
          {/* Template Stats */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Templates"
              value={summary.totalTemplates || 0}
              icon={DescriptionIcon}
              color={palette.blue[400]}
              onClick={() => navigate('/templates')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="PDF Templates"
              value={summary.pdfTemplates || 0}
              icon={DescriptionIcon}
              color={palette.red[400]}
              onClick={() => navigate('/templates?kind=pdf')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Excel Templates"
              value={summary.excelTemplates || 0}
              icon={DescriptionIcon}
              color={palette.green[400]}
              onClick={() => navigate('/templates?kind=excel')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Schedules"
              value={summary.activeSchedules || 0}
              icon={ScheduleIcon}
              color={palette.yellow[400]}
              onClick={() => navigate('/schedules')}
            />
          </Grid>

          {/* Template Usage */}
          <Grid item xs={12}>
            <ChartCard title="Template Usage Breakdown" subtitle="Jobs per template" height={400}>
              {templateBreakdown.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <DescriptionIcon sx={{ fontSize: 48, color: palette.scale[700], mb: 2 }} />
                  <Typography sx={{ color: palette.scale[500], fontSize: '0.875rem' }}>
                    No template usage data available
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={templateBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(palette.scale[100], 0.1)} />
                    <XAxis
                      type="number"
                      tick={{ fill: palette.scale[500], fontSize: 11 }}
                      axisLine={{ stroke: alpha(palette.scale[100], 0.1) }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: palette.scale[400], fontSize: 11 }}
                      axisLine={{ stroke: alpha(palette.scale[100], 0.1) }}
                      width={120}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Jobs" fill={palette.green[400]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
