import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Button,
  alpha,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import DeleteIcon from '@mui/icons-material/Delete'
import HistoryIcon from '@mui/icons-material/History'
import DescriptionIcon from '@mui/icons-material/Description'
import StorageIcon from '@mui/icons-material/Storage'
import WorkIcon from '@mui/icons-material/Work'
import ScheduleIcon from '@mui/icons-material/Schedule'
import StarIcon from '@mui/icons-material/Star'
import SettingsIcon from '@mui/icons-material/Settings'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useToast } from '../../components/ToastProvider'
import { ConfirmModal } from '../../ui/Modal'
import * as api from '../../api/client'
import { palette } from '../../theme'

// Map entity types to their navigation routes
const ENTITY_ROUTES = {
  template: (id) => `/templates/${id}/edit`,
  connection: () => '/connections',
  job: () => '/jobs',
  schedule: () => '/schedules',
}

const ACTION_ICONS = {
  template: DescriptionIcon,
  connection: StorageIcon,
  job: WorkIcon,
  schedule: ScheduleIcon,
  favorite: StarIcon,
  settings: SettingsIcon,
  default: HistoryIcon,
}

const ACTION_COLORS = {
  created: palette.green[400],
  deleted: palette.red[400],
  updated: palette.blue[400],
  completed: palette.green[400],
  failed: palette.red[400],
  started: palette.yellow[400],
  favorite_added: palette.yellow[400],
  favorite_removed: palette.scale[400],
  default: palette.scale[400],
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatAction(action) {
  return (action || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function ActivityItem({ activity, onNavigate }) {
  const entityType = activity.entity_type || 'default'
  const action = activity.action || ''
  const Icon = ACTION_ICONS[entityType] || ACTION_ICONS.default
  const accentColor = ACTION_COLORS[action] || ACTION_COLORS.default

  // Determine if this item is navigable (not deleted items)
  const isNavigable = action !== 'deleted' && ENTITY_ROUTES[entityType]

  const handleClick = () => {
    if (isNavigable && onNavigate) {
      const routeFn = ENTITY_ROUTES[entityType]
      const route = routeFn(activity.entity_id)
      onNavigate(route)
    }
  }

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        py: 2,
        borderBottom: `1px solid ${alpha(palette.scale[100], 0.06)}`,
        '&:last-child': { borderBottom: 'none' },
        cursor: isNavigable ? 'pointer' : 'default',
        borderRadius: 1,
        mx: -1,
        px: 1,
        transition: 'background-color 150ms ease',
        '&:hover': isNavigable ? {
          bgcolor: alpha(palette.scale[100], 0.04),
        } : {},
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          bgcolor: alpha(accentColor, 0.15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 16, color: accentColor }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: palette.scale[200],
            }}
          >
            {formatAction(action)}
          </Typography>
          <Chip
            label={entityType}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.625rem',
              bgcolor: alpha(palette.scale[100], 0.08),
              color: palette.scale[400],
            }}
          />
        </Stack>
        {activity.entity_name && (
          <Typography
            sx={{
              fontSize: '0.8125rem',
              color: palette.scale[300],
              mb: 0.5,
            }}
          >
            {activity.entity_name}
          </Typography>
        )}
        {activity.entity_id && !activity.entity_name && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: palette.scale[500],
              fontFamily: 'monospace',
              mb: 0.5,
            }}
          >
            {activity.entity_id.slice(0, 20)}...
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: '0.6875rem',
            color: palette.scale[600],
          }}
        >
          {formatRelativeTime(activity.timestamp)}
        </Typography>
      </Box>
      {isNavigable && (
        <OpenInNewIcon
          sx={{
            fontSize: 14,
            color: palette.scale[600],
            opacity: 0,
            transition: 'opacity 150ms',
            '.MuiBox-root:hover > &': { opacity: 1 },
          }}
        />
      )}
    </Box>
  )
}

export default function ActivityPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const didLoadRef = useRef(false)

  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getActivityLog({
        limit: 100,
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
      })
      setActivities(data?.activities || [])
    } catch (err) {
      toast.show(err.message || 'Failed to load activity log', 'error')
    } finally {
      setLoading(false)
    }
  }, [entityTypeFilter, actionFilter, toast])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    if (!didLoadRef.current) return
    fetchActivities()
  }, [entityTypeFilter, actionFilter, fetchActivities])

  const handleClearLog = useCallback(async () => {
    setClearing(true)
    try {
      const result = await api.clearActivityLog()
      setActivities([])
      toast.show(`Cleared ${result.cleared} activity entries`, 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to clear activity log', 'error')
    } finally {
      setClearing(false)
      setClearConfirmOpen(false)
    }
  }, [toast])

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} color={palette.scale[100]}>
            Activity Log
          </Typography>
          <Typography variant="body2" color={palette.scale[500]}>
            Track actions and events in your workspace
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={fetchActivities}
            disabled={loading}
            sx={{ color: palette.scale[400] }}
          >
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
          <IconButton
            onClick={() => setClearConfirmOpen(true)}
            disabled={activities.length === 0}
            sx={{ color: palette.scale[400] }}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: palette.scale[500] }}>Entity Type</InputLabel>
          <Select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            label="Entity Type"
            sx={{
              color: palette.scale[200],
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(palette.scale[100], 0.15),
              },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="template">Template</MenuItem>
            <MenuItem value="connection">Connection</MenuItem>
            <MenuItem value="job">Job</MenuItem>
            <MenuItem value="schedule">Schedule</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: palette.scale[500] }}>Action</InputLabel>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            label="Action"
            sx={{
              color: palette.scale[200],
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(palette.scale[100], 0.15),
              },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="created">Created</MenuItem>
            <MenuItem value="updated">Updated</MenuItem>
            <MenuItem value="deleted">Deleted</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Activity List */}
      <Box
        sx={{
          bgcolor: palette.scale[1000],
          borderRadius: '8px',
          border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          p: 2,
        }}
      >
        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : activities.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 48, color: palette.scale[700], mb: 2 }} />
            <Typography sx={{ fontSize: '0.875rem', color: palette.scale[500] }}>
              No activity recorded yet
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: palette.scale[600], mt: 0.5 }}>
              Actions like creating templates, running jobs, and more will appear here
            </Typography>
          </Box>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} onNavigate={navigate} />
          ))
        )}
      </Box>

      {/* Clear Confirmation */}
      <ConfirmModal
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleClearLog}
        title="Clear Activity Log"
        message="Are you sure you want to clear all activity log entries? This action cannot be undone."
        confirmLabel="Clear All"
        severity="warning"
        loading={clearing}
      />
    </Box>
  )
}
