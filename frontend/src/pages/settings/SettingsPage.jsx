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
  Button,
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
import DownloadIcon from '@mui/icons-material/Download'
import TokenIcon from '@mui/icons-material/Toll'
import { useToast } from '../../components/ToastProvider'
import { useAppStore } from '../../store/useAppStore'
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
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Storage quota exceeded or unavailable' }
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
  const setDemoMode = useAppStore((s) => s.setDemoMode)
  const demoMode = useAppStore((s) => s.demoMode)
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [preferences, setPreferences] = useState(getPreferences)
  const [tokenUsage, setTokenUsage] = useState(null)
  const [exporting, setExporting] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthData, usageData] = await Promise.all([
        api.getSystemHealth(),
        api.getTokenUsage().catch(() => null),
      ])
      setHealth(healthData)
      setTokenUsage(usageData?.usage || null)
    } catch (err) {
      setError(err.message || 'Failed to fetch system health')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleExportConfig = useCallback(async () => {
    setExporting(true)
    try {
      const data = await api.exportConfiguration()
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data.config || data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `neurareport-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.show('Configuration exported successfully', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to export configuration', 'error')
    } finally {
      setExporting(false)
    }
  }, [toast])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  const handlePrefChange = useCallback((key) => (event) => {
    const newPrefs = { ...preferences, [key]: event.target.checked }
    setPreferences(newPrefs)
    const result = savePreferences(newPrefs)
    if (result.success) {
      toast.show('Preferences saved', 'success')
    } else {
      toast.show(`Failed to save preferences: ${result.error}`, 'error')
    }
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

        {/* Token Usage Statistics */}
        <SettingCard icon={TokenIcon} title="Token Usage">
          {tokenUsage ? (
            <Stack spacing={1}>
              <ConfigRow
                label="Total Tokens"
                value={(tokenUsage.total_tokens || 0).toLocaleString()}
              />
              <ConfigRow
                label="Input Tokens"
                value={(tokenUsage.total_input_tokens || 0).toLocaleString()}
              />
              <ConfigRow
                label="Output Tokens"
                value={(tokenUsage.total_output_tokens || 0).toLocaleString()}
              />
              <Divider sx={{ my: 1, borderColor: alpha(palette.scale[100], 0.08) }} />
              <ConfigRow
                label="Estimated Cost"
                value={`$${(tokenUsage.estimated_cost_usd || 0).toFixed(4)}`}
                mono
              />
              <ConfigRow
                label="API Requests"
                value={(tokenUsage.request_count || 0).toLocaleString()}
              />
              <Typography variant="caption" color={palette.scale[600]} sx={{ mt: 1 }}>
                Usage statistics are tracked since server start.
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color={palette.scale[500]}>
              Token usage data unavailable
            </Typography>
          )}
        </SettingCard>

        {/* Export Configuration */}
        <SettingCard icon={DownloadIcon} title="Export & Backup">
          <Typography variant="body2" color={palette.scale[500]} sx={{ mb: 2 }}>
            Export your configuration for backup or migration purposes.
          </Typography>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportConfig}
            disabled={exporting}
            sx={{
              textTransform: 'none',
              borderColor: alpha(palette.scale[100], 0.2),
              color: palette.scale[200],
              '&:hover': {
                borderColor: palette.green[400],
                bgcolor: alpha(palette.green[400], 0.08),
              },
            }}
          >
            {exporting ? 'Exporting...' : 'Export Configuration'}
          </Button>
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
                  checked={demoMode}
                  onChange={(e) => {
                    const enabled = e.target.checked
                    setDemoMode(enabled)
                    // Also persist to preferences
                    const newPrefs = { ...preferences, demoMode: enabled }
                    setPreferences(newPrefs)
                    savePreferences(newPrefs)
                    toast.show(enabled ? 'Demo mode enabled - sample data loaded' : 'Demo mode disabled', 'success')
                  }}
                  size="small"
                />
              }
              label={
                <Stack>
                  <Typography variant="body2" color={palette.scale[200]}>
                    Demo Mode
                  </Typography>
                  <Typography variant="caption" color={palette.scale[500]}>
                    Explore with sample data (no real database required)
                  </Typography>
                </Stack>
              }
            />
            <Divider sx={{ my: 1, borderColor: alpha(palette.scale[100], 0.06) }} />
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
