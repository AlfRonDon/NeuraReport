/**
 * Premium Settings Page
 * System configuration with theme-based styling
 */
import { useState, useCallback, useEffect, useRef } from 'react'
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
  Button,
  useTheme,
  alpha,
  styled,
  keyframes,
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
import { useInteraction, InteractionType, Reversibility } from '../../components/ux/governance'
import { useAppStore } from '../../store/useAppStore'
import * as api from '../../api/client'
import {
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  emitPreferencesChanged,
} from '../../utils/preferences'

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1000,
  margin: '0 auto',
  width: '100%',
  minHeight: '100vh',
  background: theme.palette.mode === 'dark'
    ? `radial-gradient(ellipse at 20% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 50%),
       radial-gradient(ellipse at 80% 100%, ${alpha(theme.palette.secondary.dark, 0.1)} 0%, transparent 50%),
       ${theme.palette.background.default}`
    : `radial-gradient(ellipse at 20% 0%, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 50%),
       radial-gradient(ellipse at 80% 100%, ${alpha(theme.palette.secondary.light, 0.05)} 0%, transparent 50%),
       ${theme.palette.background.default}`,
}))

const HeaderContainer = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  animation: `${fadeInUp} 0.5s ease-out`,
}))

const GlassCard = styled(Card)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 16,
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
  animation: `${fadeInUp} 0.5s ease-out`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: `0 12px 48px ${alpha(theme.palette.common.black, 0.12)}`,
  },
}))

const IconContainer = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const RefreshButton = styled(IconButton)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    transform: 'rotate(180deg)',
  },
}))

const ExportButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 500,
  borderColor: alpha(theme.palette.divider, 0.2),
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.success.main,
    backgroundColor: alpha(theme.palette.success.main, 0.08),
  },
}))

// =============================================================================
// HELPERS
// =============================================================================

function getPreferences() {
  return readPreferences()
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
    emitPreferencesChanged(prefs)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Storage quota exceeded or unavailable' }
  }
}

// =============================================================================
// SUB COMPONENTS
// =============================================================================

function StatusChip({ status }) {
  const theme = useTheme()
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
      sx={{ textTransform: 'capitalize', fontSize: '0.75rem', borderRadius: 2 }}
    />
  )
}

function SettingCard({ icon: Icon, title, children }) {
  const theme = useTheme()

  return (
    <GlassCard>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <IconContainer
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.15),
            }}
          >
            <Icon sx={{ color: theme.palette.success.main, fontSize: 16 }} />
          </IconContainer>
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: theme.palette.text.primary }}>
            {title}
          </Typography>
        </Stack>
        {children}
      </CardContent>
    </GlassCard>
  )
}

function ConfigRow({ label, value, mono = false }) {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.primary,
          ...(mono && { fontFamily: 'monospace', fontSize: '0.8125rem' }),
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SettingsPage() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const setDemoMode = useAppStore((s) => s.setDemoMode)
  const demoMode = useAppStore((s) => s.demoMode)
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [preferences, setPreferences] = useState(getPreferences)
  const [tokenUsage, setTokenUsage] = useState(null)
  const [exporting, setExporting] = useState(false)
  const lastPrefChangeRef = useRef(0)

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

  const loadPreferences = useCallback(async () => {
    const startedAt = Date.now()
    try {
      const data = await api.getUserPreferences()
      if (lastPrefChangeRef.current > startedAt) return
      const nextPrefs = data?.preferences || {}
      setPreferences(nextPrefs)
      savePreferences(nextPrefs)
      if (typeof nextPrefs.demoMode === 'boolean') {
        setDemoMode(nextPrefs.demoMode)
      }
    } catch (err) {
      toast.show(err.message || 'Failed to load preferences', 'warning')
    }
  }, [setDemoMode, toast])

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
    loadPreferences()
  }, [fetchHealth, loadPreferences])

  const handlePrefChange = useCallback((key) => async (event) => {
    const nextValue = event.target.checked
    const nextPrefs = { ...preferences, [key]: nextValue }
    lastPrefChangeRef.current = Date.now()
    setPreferences(nextPrefs)
    const cacheResult = savePreferences(nextPrefs)
    if (!cacheResult.success) {
      toast.show(`Failed to cache preferences locally: ${cacheResult.error}`, 'warning')
    }
    await execute({
      type: InteractionType.UPDATE,
      label: 'Update preference',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        preferenceKey: key,
        action: 'update_preference',
      },
      action: async () => {
        try {
          const result = await api.setUserPreference(key, nextValue)
          if (result?.preferences) {
            const merged = { ...nextPrefs, ...result.preferences }
            setPreferences(merged)
            savePreferences(merged)
          }
          toast.show('Preferences saved', 'success')
          return result
        } catch (err) {
          toast.show(err.message || 'Failed to save preferences', 'error')
          throw err
        }
      },
    })
  }, [preferences, toast, execute])

  const handleDemoModeChange = useCallback(async (event) => {
    const enabled = event.target.checked
    setDemoMode(enabled)
    const nextPrefs = { ...preferences, demoMode: enabled }
    lastPrefChangeRef.current = Date.now()
    setPreferences(nextPrefs)
    const cacheResult = savePreferences(nextPrefs)
    if (!cacheResult.success) {
      toast.show(`Failed to cache preferences locally: ${cacheResult.error}`, 'warning')
    }
    await execute({
      type: InteractionType.UPDATE,
      label: 'Toggle demo mode',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        preferenceKey: 'demoMode',
        action: 'toggle_demo_mode',
      },
      action: async () => {
        try {
          const result = await api.setUserPreference('demoMode', enabled)
          if (result?.preferences) {
            const merged = { ...nextPrefs, ...result.preferences }
            setPreferences(merged)
            savePreferences(merged)
          }
          toast.show(enabled ? 'Demo mode enabled - sample data loaded' : 'Demo mode disabled', 'success')
          return result
        } catch (err) {
          toast.show(err.message || 'Failed to save preferences', 'error')
          throw err
        }
      },
    })
  }, [preferences, setDemoMode, toast, execute])

  const config = health?.checks?.configuration || {}
  const openai = health?.checks?.openai || {}
  const memory = health?.checks?.memory || {}
  const uploadsDir = health?.checks?.uploads_dir || {}
  const stateDir = health?.checks?.state_dir || {}

  return (
    <PageContainer>
      {/* Header */}
      <HeaderContainer direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.text.primary }}>
            Settings
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            System configuration and preferences
          </Typography>
        </Box>
        <RefreshButton
          onClick={fetchHealth}
          disabled={loading}
          sx={{ color: theme.palette.text.secondary }}
        >
          {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
        </RefreshButton>
      </HeaderContainer>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* System Status */}
        <SettingCard icon={SpeedIcon} title="System Status">
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
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
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Uploads Directory
              </Typography>
              <StatusChip status={uploadsDir.status} />
            </Box>
            {uploadsDir.writable !== undefined && (
              <ConfigRow label="Writable" value={uploadsDir.writable ? 'Yes' : 'No'} />
            )}
            <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.08) }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                State Directory
              </Typography>
              <StatusChip status={stateDir.status} />
            </Box>
            {memory.rss_mb && (
              <>
                <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.08) }} />
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
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
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
              <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.08) }} />
              <ConfigRow
                label="Estimated Cost"
                value={`$${(tokenUsage.estimated_cost_usd || 0).toFixed(4)}`}
                mono
              />
              <ConfigRow
                label="API Requests"
                value={(tokenUsage.request_count || 0).toLocaleString()}
              />
              <Typography variant="caption" sx={{ color: theme.palette.text.disabled, mt: 1 }}>
                Usage statistics are tracked since server start.
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Token usage data unavailable
            </Typography>
          )}
        </SettingCard>

        {/* Export Configuration */}
        <SettingCard icon={DownloadIcon} title="Export & Backup">
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            Export your configuration for backup or migration purposes.
          </Typography>
          <ExportButton
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportConfig}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Configuration'}
          </ExportButton>
        </SettingCard>

        {/* User Preferences */}
        <SettingCard icon={SettingsIcon} title="Preferences">
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            These preferences are synced with the server and cached locally.
          </Typography>
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={demoMode}
                  onChange={handleDemoModeChange}
                  size="small"
                />
              }
              label={
                <Stack>
                  <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                    Demo Mode
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Explore with sample data (no real database required)
                  </Typography>
                </Stack>
              }
            />
            <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.06) }} />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.autoRefreshJobs ?? true}
                  onChange={handlePrefChange('autoRefreshJobs')}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
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
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
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
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
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
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                  Use compact table view
                </Typography>
              }
            />
          </Stack>
        </SettingCard>
      </Stack>
    </PageContainer>
  )
}
