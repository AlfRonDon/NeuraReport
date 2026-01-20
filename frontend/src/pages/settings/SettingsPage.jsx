import { useState, useCallback, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  alpha,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import SettingsIcon from '@mui/icons-material/Settings'
import StorageIcon from '@mui/icons-material/Storage'
import SecurityIcon from '@mui/icons-material/Security'
import SpeedIcon from '@mui/icons-material/Speed'
import CloudIcon from '@mui/icons-material/Cloud'
import { useToast } from '../../components/ToastProvider'
import * as api from '../../api/client'
import { palette } from '../../theme'

const STORAGE_KEY = 'neurareport_preferences'

function getPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Ignore storage errors
  }
}

function StatusChip({ status }) {
  const config = {
    healthy: { color: 'success', icon: CheckCircleIcon },
    configured: { color: 'success', icon: CheckCircleIcon },
    ready: { color: 'success', icon: CheckCircleIcon },
    ok: { color: 'success', icon: CheckCircleIcon },
    warning: { color: 'warning', icon: WarningIcon },
    degraded: { color: 'warning', icon: WarningIcon },
    error: { color: 'error', icon: ErrorIcon },
    not_configured: { color: 'default', icon: WarningIcon },
    unknown: { color: 'default', icon: WarningIcon },
  }
  const cfg = config[status] || config.unknown
  const Icon = cfg.icon

  return (
    <Chip
      size="small"
      icon={<Icon sx={{ fontSize: 14 }} />}
      label={status?.replace(/_/g, ' ') || 'unknown'}
      color={cfg.color}
      sx={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
    />
  )
}

function SettingCard({ icon: Icon, title, children }) {
  return (
    <Card
      sx={{
        bgcolor: palette.scale[950],
        border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: alpha(palette.green[400], 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ color: palette.green[400], fontSize: 16 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={600} color={palette.scale[100]}>
            {title}
          </Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

function ConfigRow({ label, value, mono = false }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
      <Typography variant="body2" color={palette.scale[400]}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        color={palette.scale[200]}
        sx={mono ? { fontFamily: 'monospace', fontSize: '0.8125rem' } : {}}
      >
        {value}
      </Typography>
    </Box>
  )
}

export default function SettingsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [preferences, setPreferences] = useState(getPreferences)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSystemHealth()
      setHealth(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch system health')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  const handlePrefChange = useCallback((key) => (event) => {
    const newPrefs = { ...preferences, [key]: event.target.checked }
    setPreferences(newPrefs)
    savePreferences(newPrefs)
    toast.show('Preferences saved', 'success')
  }, [preferences, toast])

  const config = health?.checks?.configuration || {}
  const openai = health?.checks?.openai || {}
  const memory = health?.checks?.memory || {}
  const uploadsDir = health?.checks?.uploads_dir || {}
  const stateDir = health?.checks?.state_dir || {}

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} color={palette.scale[100]}>
            Settings
          </Typography>
          <Typography variant="body2" color={palette.scale[500]}>
            System configuration and preferences
          </Typography>
        </Box>
        <IconButton
          onClick={fetchHealth}
          disabled={loading}
          sx={{
            color: palette.scale[400],
            '&:hover': { color: palette.scale[100], bgcolor: alpha(palette.scale[100], 0.08) },
          }}
        >
          {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* System Status */}
        <SettingCard icon={SpeedIcon} title="System Status">
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
              <Typography variant="body2" color={palette.scale[400]}>
                Overall Status
              </Typography>
              <StatusChip status={health?.status} />
            </Box>
            <ConfigRow label="API Version" value={health?.version || '-'} />
            <ConfigRow label="Response Time" value={health?.response_time_ms ? `${health.response_time_ms}ms` : '-'} />
            {health?.timestamp && (
              <ConfigRow
                label="Last Checked"
                value={new Date(health.timestamp).toLocaleString()}
              />
            )}
          </Stack>
        </SettingCard>

        {/* Storage Status */}
        <SettingCard icon={StorageIcon} title="Storage">
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
              <Typography variant="body2" color={palette.scale[400]}>
                Uploads Directory
              </Typography>
              <StatusChip status={uploadsDir.status} />
            </Box>
            {uploadsDir.writable !== undefined && (
              <ConfigRow label="Writable" value={uploadsDir.writable ? 'Yes' : 'No'} />
            )}
            <Divider sx={{ my: 1, borderColor: alpha(palette.scale[100], 0.08) }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
              <Typography variant="body2" color={palette.scale[400]}>
                State Directory
              </Typography>
              <StatusChip status={stateDir.status} />
            </Box>
            {memory.rss_mb && (
              <>
                <Divider sx={{ my: 1, borderColor: alpha(palette.scale[100], 0.08) }} />
                <ConfigRow label="Memory Usage (RSS)" value={`${memory.rss_mb.toFixed(1)} MB`} />
              </>
            )}
          </Stack>
        </SettingCard>

        {/* API Configuration */}
        <SettingCard icon={SecurityIcon} title="API Configuration">
          <Stack spacing={1}>
            <ConfigRow
              label="API Key"
              value={config.api_key_configured ? 'Configured' : 'Not Set'}
            />
            <ConfigRow
              label="Rate Limiting"
              value={config.rate_limiting_enabled ? `Enabled (${config.rate_limit})` : 'Disabled'}
            />
            <ConfigRow
              label="Request Timeout"
              value={config.request_timeout ? `${config.request_timeout}s` : '-'}
            />
            <ConfigRow
              label="Max Upload Size"
              value={config.max_upload_size_mb ? `${config.max_upload_size_mb} MB` : '-'}
            />
            <ConfigRow label="Debug Mode" value={config.debug_mode ? 'Enabled' : 'Disabled'} />
          </Stack>
        </SettingCard>

        {/* OpenAI Integration */}
        <SettingCard icon={CloudIcon} title="OpenAI Integration">
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
              <Typography variant="body2" color={palette.scale[400]}>
                Connection Status
              </Typography>
              <StatusChip status={openai.status} />
            </Box>
            {openai.message && (
              <ConfigRow label="Details" value={openai.message} />
            )}
            {openai.key_prefix && (
              <ConfigRow label="API Key" value={openai.key_prefix} mono />
            )}
          </Stack>
        </SettingCard>

        {/* User Preferences */}
        <SettingCard icon={SettingsIcon} title="Preferences">
          <Typography variant="body2" color={palette.scale[500]} sx={{ mb: 2 }}>
            These preferences are stored locally in your browser.
          </Typography>
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.autoRefreshJobs ?? true}
                  onChange={handlePrefChange('autoRefreshJobs')}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color={palette.scale[200]}>
                  Auto-refresh jobs list
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.showNotifications ?? true}
                  onChange={handlePrefChange('showNotifications')}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color={palette.scale[200]}>
                  Show desktop notifications
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.confirmDelete ?? true}
                  onChange={handlePrefChange('confirmDelete')}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color={palette.scale[200]}>
                  Confirm before deleting items
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.compactTables ?? false}
                  onChange={handlePrefChange('compactTables')}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color={palette.scale[200]}>
                  Use compact table view
                </Typography>
              }
            />
          </Stack>
        </SettingCard>
      </Stack>
    </Box>
  )
}
