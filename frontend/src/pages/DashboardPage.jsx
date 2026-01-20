import { useEffect, useState } from 'react'
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
import { useAppStore } from '../store/useAppStore'
import * as api from '../api/client'
import { palette } from '../theme'

function StatCard({ title, value, icon: Icon, color = 'primary', onClick }) {
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

  const templates = useAppStore((s) => s.templates)
  const savedConnections = useAppStore((s) => s.savedConnections)
  const activeConnection = useAppStore((s) => s.activeConnection)

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [state, jobsData] = await Promise.all([
          api.bootstrapState(),
          api.listJobs({ limit: 5 }),
        ])

        if (state?.templates) {
          useAppStore.setState({ templates: state.templates })
        }
        if (state?.connections) {
          useAppStore.setState({ savedConnections: state.connections })
        }
        setJobs(jobsData?.jobs || [])
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'pending').length
  const completedJobs = jobs.filter((j) => j.status === 'completed').length

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
        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/setup/wizard')}
          sx={{
            px: 2.5,
            py: 1,
          }}
        >
          New Report
        </Button>
      </Stack>

      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          title="Connections"
          value={savedConnections.length}
          icon={StorageIcon}
          color="primary"
          onClick={() => navigate('/connections')}
        />
        <StatCard
          title="Templates"
          value={templates.length}
          icon={DescriptionIcon}
          color="success"
          onClick={() => navigate('/templates')}
        />
        <StatCard
          title="Active Jobs"
          value={activeJobs}
          icon={WorkIcon}
          color="warning"
          onClick={() => navigate('/jobs')}
        />
        <StatCard
          title="Completed"
          value={completedJobs}
          icon={AssessmentIcon}
          color="info"
          onClick={() => navigate('/jobs')}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '340px 1fr' },
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
              label="View Jobs"
              icon={ScheduleIcon}
              onClick={() => navigate('/jobs')}
            />
          </Stack>
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
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
              }}
            >
              <WorkIcon sx={{ fontSize: 32, color: palette.scale[700], mb: 1 }} />
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: palette.scale[500],
                }}
              >
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
                    primary={job.template_name || job.template_id?.slice(0, 12)}
                    secondary={new Date(job.created_at).toLocaleString()}
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
                {activeConnection.db_type} {activeConnection.summary && `• ${activeConnection.summary}`}
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
