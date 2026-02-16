/**
 * Premium Reports Page
 * Sophisticated report generation with glassmorphism and smooth animations
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Stack,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DownloadIcon from '@mui/icons-material/Download'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import TodayIcon from '@mui/icons-material/Today'
import DateRangeIcon from '@mui/icons-material/DateRange'
import FilterListIcon from '@mui/icons-material/FilterList'
import DescriptionIcon from '@mui/icons-material/Description'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAppStore } from '@/stores'
import { useToast } from '@/components/ToastProvider'
import TemplateRecommender from '@/features/reports/components/TemplateRecommender.jsx'
import SuccessCelebration, { useCelebration } from '@/components/SuccessCelebration'
import AiUsageNotice from '@/components/ai/AiUsageNotice'
import ReportGlossaryNotice from '@/components/ux/ReportGlossaryNotice.jsx'
import { useInteraction, InteractionType, Reversibility, useNavigateInteraction } from '@/components/ux/governance'
import * as api from '@/api/client'
import * as summaryApi from '@/api/summary'
import { neutral, palette } from '@/app/theme'

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

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
`

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
}))

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  animation: `${fadeInUp} 0.5s ease-out`,
}))

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.75rem',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: theme.palette.mode === 'dark' ? neutral[100] : neutral[900],
}))

const GlassCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 8,  // Figma spec: 8px
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
  animation: `${fadeInUp} 0.6s ease-out`,
  position: 'relative',
  overflow: 'hidden',
}))

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '&::after': {
    content: '""',
    flex: 1,
    height: 1,
    backgroundColor: alpha(theme.palette.divider, 0.3),
  },
}))

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
}))

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.text.primary, 0.08)}`,
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}))

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.text.primary, 0.08)}`,
    },
  },
}))

const PresetChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'selected',
})(({ theme, selected }) => ({
  borderRadius: 10,
  fontWeight: 500,
  fontSize: '0.75rem',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  ...(selected && {
    background: theme.palette.mode === 'dark' ? neutral[700] : neutral[900],
    color: theme.palette.common.white,
    boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
    '& .MuiChip-icon': {
      color: theme.palette.common.white,
    },
  }),
  ...(!selected && {
    backgroundColor: alpha(theme.palette.action.hover, 0.5),
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.1) : neutral[100],
      transform: 'translateY(-1px)',
    },
  }),
}))

const DiscoveryChip = styled(Chip)(({ theme }) => ({
  borderRadius: 8,
  fontWeight: 600,
  fontSize: '0.75rem',
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.08) : neutral[100],
  color: theme.palette.text.secondary,
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
}))

const BatchListContainer = styled(Box)(({ theme }) => ({
  maxHeight: 200,
  overflow: 'auto',
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.4),
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.text.primary, 0.2),
    borderRadius: 8,  // Figma spec: 8px (styled component)
  },
}))

const BatchListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'selected',
})(({ theme, selected }) => ({
  padding: theme.spacing(1, 1.5),
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
  ...(selected && {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.08) : neutral[100],
  }),
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : neutral[50],
  },
  '&:last-child': {
    borderBottom: 'none',
  },
}))

const PrimaryButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  padding: theme.spacing(1.25, 3),
  background: theme.palette.mode === 'dark' ? neutral[700] : neutral[900],
  color: theme.palette.common.white,
  boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.15)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    background: theme.palette.mode === 'dark' ? neutral[500] : neutral[700],
    boxShadow: `0 6px 20px ${alpha(theme.palette.common.black, 0.2)}`,
    transform: 'translateY(-2px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&:disabled': {
    background: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    boxShadow: 'none',
  },
}))

const SecondaryButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: theme.spacing(1.25, 2.5),
  borderColor: alpha(theme.palette.divider, 0.3),
  color: theme.palette.text.primary,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.mode === 'dark' ? neutral[500] : neutral[700],
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.04) : neutral[50],
    transform: 'translateY(-1px)',
  },
}))

const TextButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.75rem',
  padding: theme.spacing(0.5, 1.5),
  color: theme.palette.text.secondary,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.08) : neutral[100],
    color: theme.palette.text.primary,
  },
}))

const OutputCard = styled(GlassCard)(({ theme }) => ({
  height: '100%',
  animationDelay: '0.1s',
}))

const RunHistoryCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'selected',
})(({ theme, selected }) => ({
  padding: theme.spacing(1.5),
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: `1px solid ${selected ? (theme.palette.mode === 'dark' ? neutral[500] : neutral[700]) : alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: selected ? (theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : neutral[50]) : 'transparent',
  '&:hover': {
    borderColor: alpha(theme.palette.divider, 0.3),
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.03) : neutral[50],
    transform: 'translateX(4px)',
    '& .view-summary-hint': {
      opacity: 1,
      color: theme.palette.text.primary,
    },
  },
}))

const SummaryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.04) : neutral[50],
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}))

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  borderRadius: 4,
  height: 6,
  backgroundColor: alpha(theme.palette.text.primary, 0.1),
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: theme.palette.mode === 'dark' ? neutral[500] : neutral[900],
  },
}))

const WarningAlert = styled(Alert)(({ theme }) => ({
  borderRadius: 12,
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : neutral[50],
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '& .MuiAlert-icon': {
    color: theme.palette.text.secondary,
  },
  '& .MuiAlert-message': {
    color: theme.palette.text.primary,
  },
}))

const SuccessAlert = styled(Alert)(({ theme }) => ({
  borderRadius: 12,
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : neutral[50],
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '& .MuiAlert-icon': {
    color: theme.palette.text.secondary,
  },
  '& .MuiAlert-message': {
    color: theme.palette.text.primary,
  },
}))

const ErrorAlert = styled(Alert)(({ theme }) => ({
  borderRadius: 12,
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : neutral[50],
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '& .MuiAlert-icon': {
    color: theme.palette.text.secondary,
  },
  '& .MuiAlert-message': {
    color: theme.palette.text.primary,
  },
}))

const AiIcon = styled(AutoAwesomeIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
}))

const DownloadButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.75rem',
  padding: theme.spacing(0.5, 1.5),
  borderColor: alpha(theme.palette.divider, 0.3),
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.mode === 'dark' ? neutral[500] : neutral[700],
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.04) : neutral[50],
  },
}))

const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: alpha(theme.palette.divider, 0.08),
  margin: theme.spacing(2, 0),
}))

// =============================================================================
// HELPERS
// =============================================================================

const formatDateForInput = (date) => date.toISOString().split('T')[0]

const getDatePresets = () => {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

  return {
    today: {
      label: 'Today',
      start: formatDateForInput(today),
      end: formatDateForInput(today),
    },
    thisWeek: {
      label: 'This Week',
      start: formatDateForInput(startOfWeek),
      end: formatDateForInput(today),
    },
    thisMonth: {
      label: 'This Month',
      start: formatDateForInput(startOfMonth),
      end: formatDateForInput(today),
    },
    lastMonth: {
      label: 'Last Month',
      start: formatDateForInput(startOfLastMonth),
      end: formatDateForInput(endOfLastMonth),
    },
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ReportsPage() {
  const theme = useTheme()
  const [searchParams] = useSearchParams()
  const navigate = useNavigateInteraction()
  const toast = useToast()
  const { execute } = useInteraction()
  const handleNavigate = useCallback(
    (path, label, intent = {}) =>
      navigate(path, { label, intent: { from: 'reports', ...intent } }),
    [navigate]
  )

  const templates = useAppStore((s) => s.templates)
  const activeConnection = useAppStore((s) => s.activeConnection)
  const setTemplates = useAppStore((s) => s.setTemplates)

  const [selectedTemplate, setSelectedTemplate] = useState(searchParams.get('template') || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [keyValues, setKeyValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [keyOptions, setKeyOptions] = useState({})
  const [discovering, setDiscovering] = useState(false)
  const [discovery, setDiscovery] = useState(null)
  const [selectedBatches, setSelectedBatches] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [runHistory, setRunHistory] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [runSummary, setRunSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [queueingSummary, setQueueingSummary] = useState(false)

  const selectedTemplateInfo = templates.find((t) => t.id === selectedTemplate)
  const outputLabel = selectedTemplateInfo?.kind?.toUpperCase() || 'PDF'
  const dateRangeLabel = startDate && endDate ? `${startDate} to ${endDate}` : 'Select dates'
  const connectionLabel = activeConnection?.name || 'No connection'

  // Success celebration
  const { celebrating, celebrate, onComplete: onCelebrationComplete } = useCelebration()

  // Refs to prevent race conditions
  const keyOptionsRequestIdRef = useRef(0)
  const summaryRequestIdRef = useRef(0)

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        const data = await api.listApprovedTemplates()
        setTemplates(data)
        if (!selectedTemplate && data.length > 0) {
          setSelectedTemplate(data[0].id)
        }
      } catch (err) {
        toast.show(err.message || 'Failed to load designs', 'error')
      } finally {
        setLoading(false)
      }
    }
    if (templates.length === 0) {
      fetchTemplates()
    }
  }, [templates.length, setTemplates, selectedTemplate, toast])

  useEffect(() => {
    const fetchKeyOptions = async () => {
      if (!selectedTemplate || !activeConnection?.id) return

      const requestId = ++keyOptionsRequestIdRef.current

      try {
        const template = templates.find((t) => t.id === selectedTemplate)
        const result = await api.fetchTemplateKeyOptions(selectedTemplate, {
          connectionId: activeConnection.id,
          kind: template?.kind || 'pdf',
        })

        if (requestId === keyOptionsRequestIdRef.current) {
          setKeyOptions(result.keys || {})
        }
      } catch (err) {
        if (requestId === keyOptionsRequestIdRef.current) {
          console.error('Failed to fetch key options:', err)
          toast.show('Could not load filter options. You can still generate reports.', 'warning')
        }
      }
    }
    fetchKeyOptions()
  }, [selectedTemplate, activeConnection?.id, templates, toast])

  const handleTemplateChange = useCallback((event) => {
    setSelectedTemplate(event.target.value)
    setKeyValues({})
    setResult(null)
    setDiscovery(null)
    setSelectedBatches([])
  }, [])

  const handleAiSelectTemplate = useCallback((template) => {
    if (template?.id) {
      setSelectedTemplate(template.id)
      setKeyValues({})
      setResult(null)
      toast.show(`Selected: ${template.name || template.id}`, 'success')
    }
  }, [toast])

  const handleKeyValueChange = useCallback((key, value) => {
    setKeyValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleDatePreset = useCallback((presetKey) => {
    setDatePreset(presetKey)
    if (presetKey !== 'custom') {
      const presets = getDatePresets()
      const preset = presets[presetKey]
      if (preset) {
        setStartDate(preset.start)
        setEndDate(preset.end)
      }
    }
  }, [])

  // Initialize dates on first render
  useEffect(() => {
    if (!startDate && !endDate && datePreset !== 'custom') {
      const presets = getDatePresets()
      const preset = presets[datePreset]
      if (preset) {
        setStartDate(preset.start)
        setEndDate(preset.end)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !activeConnection?.id) {
      toast.show('Please select a design and connect to a data source first', 'error')
      return
    }
    if (discovery && selectedBatches.length === 0) {
      toast.show('Select at least one batch to run', 'error')
      return
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.show('Start date must be before or equal to end date', 'error')
      return
    }

    await execute({
      type: InteractionType.EXECUTE,
      label: 'Generate report',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        templateId: selectedTemplate,
        connectionId: activeConnection?.id,
        action: 'run_report',
      },
      action: async () => {
        setGenerating(true)
        setError(null)
        setResult(null)

        try {
          const template = templates.find((t) => t.id === selectedTemplate)

          const batches = discovery?.batches || []
          const allSelected = batches.length > 0 && selectedBatches.length === batches.length
          const useSelectedBatches = batches.length > 0 && selectedBatches.length > 0 && !allSelected

          const reportResult = await api.runReportAsJob({
            templateId: selectedTemplate,
            templateName: template?.name,
            connectionId: activeConnection.id,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            keyValues: Object.keys(keyValues).length > 0 ? keyValues : undefined,
            batchIds: useSelectedBatches ? selectedBatches : undefined,
            kind: template?.kind || 'pdf',
          })

          setResult(reportResult)
          toast.show('Report generation started!', 'success')
          celebrate()
          return reportResult
        } catch (err) {
          setError(err.message || 'Failed to generate report')
          toast.show(err.message || 'Failed to generate report', 'error')
          throw err
        } finally {
          setGenerating(false)
        }
      },
    })
  }, [selectedTemplate, activeConnection?.id, templates, startDate, endDate, keyValues, discovery, selectedBatches, toast, celebrate, execute])

  const keyFields = Object.keys(keyOptions)

  const handleDiscover = useCallback(async () => {
    if (!selectedTemplate || !activeConnection?.id) {
      toast.show('Select a design and data source first', 'error')
      return
    }
    if (!startDate || !endDate) {
      toast.show('Provide a start and end date to discover batches', 'error')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.show('Start date must be before or equal to end date', 'error')
      return
    }
    await execute({
      type: InteractionType.ANALYZE,
      label: 'Discover batches',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        templateId: selectedTemplate,
        connectionId: activeConnection?.id,
        action: 'discover_batches',
      },
      action: async () => {
        setDiscovering(true)
        setDiscovery(null)
        try {
          const template = templates.find((t) => t.id === selectedTemplate)
          const data = await api.discoverReports({
            templateId: selectedTemplate,
            connectionId: activeConnection.id,
            startDate,
            endDate,
            keyValues: Object.keys(keyValues).length > 0 ? keyValues : undefined,
            kind: template?.kind || 'pdf',
          })
          setDiscovery(data)
          const batchIds = Array.isArray(data?.batches) ? data.batches.map((batch) => batch.id) : []
          setSelectedBatches(batchIds)
          return data
        } catch (err) {
          toast.show(err.message || 'Failed to discover batches', 'error')
          throw err
        } finally {
          setDiscovering(false)
        }
      },
    })
  }, [selectedTemplate, activeConnection?.id, startDate, endDate, keyValues, templates, toast, execute])

  const fetchRunHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const opts = { limit: 10 }
      if (selectedTemplate) opts.templateId = selectedTemplate
      const runs = await api.listReportRuns(opts)
      setRunHistory(runs)
    } catch (err) {
      console.error('Failed to load run history:', err)
      toast.show('Failed to load run history', 'warning')
    } finally {
      setHistoryLoading(false)
    }
  }, [selectedTemplate, toast])

  useEffect(() => {
    fetchRunHistory()
  }, [fetchRunHistory])

  const toggleBatch = useCallback((batchId) => {
    setSelectedBatches((prev) => {
      if (prev.includes(batchId)) {
        return prev.filter((id) => id !== batchId)
      }
      return [...prev, batchId]
    })
  }, [])

  const handleSelectRun = useCallback(async (run) => {
    setSelectedRun(run)
    setRunSummary(null)
    if (run?.id) {
      const requestId = ++summaryRequestIdRef.current

      setSummaryLoading(true)
      try {
        const summaryData = await summaryApi.getReportSummary(run.id)

        if (requestId === summaryRequestIdRef.current) {
          setRunSummary(summaryData.summary || summaryData)
        }
      } catch (err) {
        if (requestId === summaryRequestIdRef.current) {
          console.error('Failed to fetch summary:', err)
          setRunSummary(null)
        }
      } finally {
        if (requestId === summaryRequestIdRef.current) {
          setSummaryLoading(false)
        }
      }
    }
  }, [])

  const handleQueueSummary = useCallback(async () => {
    if (!selectedRun?.id) return
    await execute({
      type: InteractionType.GENERATE,
      label: 'Queue summary',
      reversibility: Reversibility.SYSTEM_MANAGED,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: {
        runId: selectedRun?.id,
        action: 'queue_report_summary',
      },
      action: async () => {
        setQueueingSummary(true)
        try {
          const response = await summaryApi.queueReportSummary(selectedRun.id)
          const jobId = response?.job_id || response?.jobId || null
          if (jobId) {
            toast.show('Summary queued. Track progress in Report Progress.', 'success')
          } else {
            toast.show('Failed to queue summary.', 'error')
          }
          return response
        } catch (err) {
          toast.show(err?.message || 'Failed to queue summary.', 'error')
          throw err
        } finally {
          setQueueingSummary(false)
        }
      },
    })
  }, [selectedRun?.id, toast, execute])

  const handleSelectAllBatches = useCallback(() => {
    const allIds = Array.isArray(discovery?.batches) ? discovery.batches.map((batch) => batch.id) : []
    setSelectedBatches(allIds)
  }, [discovery])

  const handleClearBatches = useCallback(() => {
    setSelectedBatches([])
  }, [])

  return (
    <PageContainer>
      <SuccessCelebration trigger={celebrating} onComplete={onCelebrationComplete} />
      <Container maxWidth="lg">
        <PageHeader>
          <PageTitle>Run a Report</PageTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Choose a design, set your date range, and generate a new report run.
          </Typography>
        </PageHeader>

        <ReportGlossaryNotice sx={{ mb: 3 }} />

        {!activeConnection && (
          <WarningAlert severity="warning" sx={{ mb: 3 }}>
            Please add a data source first to create reports.
          </WarningAlert>
        )}

        {/* AI Template Picker */}
        <Box sx={{ mb: 3 }}>
          <TemplateRecommender onSelectTemplate={handleAiSelectTemplate} />
        </Box>

        <Grid container spacing={3}>
          {/* Configuration Panel */}
          <Grid size={{ xs: 12, md: 8 }}>
            <GlassCard>
              <SectionLabel>
                <DescriptionIcon sx={{ fontSize: 14 }} />
                Report Settings
              </SectionLabel>

              <Stack spacing={3}>
                <Alert
                  severity="info"
                  sx={{ borderRadius: 1 }}  // Figma spec: 8px
                  action={(
                    <Button
                      size="small"
                      onClick={() => handleNavigate('/jobs', 'Open jobs')}
                      sx={{ textTransform: 'none' }}
                    >
                      View Progress
                    </Button>
                  )}
                >
                  Reports run in the background. Track progress in Report Progress and download finished files in History.
                </Alert>

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,  // Figma spec: 8px
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Outcome preview
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`Output: ${outputLabel}`} variant="outlined" />
                    <Chip size="small" label={`Connection: ${connectionLabel}`} variant="outlined" />
                    <Chip size="small" label={`Dates: ${dateRangeLabel}`} variant="outlined" />
                  </Stack>
                </Box>
                {/* Design Selection */}
                <StyledFormControl fullWidth>
                  <InputLabel>Report Design</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    label="Report Design"
                  >
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span>{template.name || template.id}</span>
                          <Chip
                            label={template.kind?.toUpperCase() || 'PDF'}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 6, fontSize: '10px', height: 20 }}
                          />
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </StyledFormControl>

                {/* Date Range */}
                <Box>
                  <SectionTitle>Time Period</SectionTitle>
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(getDatePresets()).map(([key, preset]) => (
                      <PresetChip
                        key={key}
                        label={preset.label}
                        icon={<TodayIcon sx={{ fontSize: 14 }} />}
                        onClick={() => handleDatePreset(key)}
                        selected={datePreset === key}
                        variant={datePreset === key ? 'filled' : 'outlined'}
                      />
                    ))}
                    <PresetChip
                      label="Custom"
                      icon={<DateRangeIcon sx={{ fontSize: 14 }} />}
                      onClick={() => handleDatePreset('custom')}
                      selected={datePreset === 'custom'}
                      variant={datePreset === 'custom' ? 'filled' : 'outlined'}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <StyledTextField
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        setDatePreset('custom')
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                    <StyledTextField
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        setDatePreset('custom')
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                  </Stack>
                </Box>

                {/* Key Fields */}
                {keyFields.length > 0 && (
                  <>
                    <StyledDivider />
                    <Box>
                      <SectionLabel>
                        <FilterListIcon sx={{ fontSize: 14 }} />
                        Filter Parameters
                      </SectionLabel>
                      <Stack spacing={2}>
                        {keyFields.map((key) => (
                          <StyledFormControl key={key} fullWidth size="small">
                            <InputLabel>{key}</InputLabel>
                            <Select
                              value={keyValues[key] || ''}
                              onChange={(e) => handleKeyValueChange(key, e.target.value)}
                              label={key}
                            >
                              <MenuItem value="">
                                <em>All</em>
                              </MenuItem>
                              {(keyOptions[key] || []).map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </Select>
                          </StyledFormControl>
                        ))}
                      </Stack>
                    </Box>
                  </>
                )}

                <StyledDivider />

                {/* Batch Discovery */}
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <SectionTitle sx={{ mb: 0 }}>Find Data Batches</SectionTitle>
                  <SecondaryButton
                    variant="outlined"
                    size="small"
                    onClick={handleDiscover}
                    disabled={discovering || !selectedTemplate || !activeConnection}
                  >
                    {discovering ? 'Searching...' : 'Find Batches'}
                  </SecondaryButton>
                </Stack>

                {discovering && <StyledLinearProgress />}
                {!discovering && discovery && (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <DiscoveryChip label={`${discovery.batches_count || discovery.batches?.length || 0} batches`} />
                      <DiscoveryChip label={`${discovery.rows_total || 0} rows`} />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <TextButton size="small" onClick={handleSelectAllBatches}>
                        Select all
                      </TextButton>
                      <TextButton size="small" onClick={handleClearBatches}>
                        Clear
                      </TextButton>
                    </Stack>
                    <BatchListContainer>
                      <List dense disablePadding>
                        {(discovery.batches || []).map((batch) => (
                          <BatchListItem
                            key={batch.id}
                            disableGutters
                            onClick={() => toggleBatch(batch.id)}
                            selected={selectedBatches.includes(batch.id)}
                          >
                            <Checkbox
                              checked={selectedBatches.includes(batch.id)}
                              sx={{ p: 0.5, mr: 1 }}
                            />
                            <ListItemText
                              primary={`${batch.id}`}
                              secondary={`${batch.rows || 0} rows`}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </BatchListItem>
                        ))}
                      </List>
                    </BatchListContainer>
                  </Stack>
                )}

                {error && (
                  <ErrorAlert
                    severity="error"
                    onClose={() => setError(null)}
                    action={
                      <TextButton
                        color="inherit"
                        size="small"
                        onClick={handleGenerate}
                        disabled={generating}
                      >
                        Try Again
                      </TextButton>
                    }
                  >
                    {error}
                  </ErrorAlert>
                )}

                {generating && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Generating report...
                    </Typography>
                    <StyledLinearProgress />
                  </Box>
                )}

                {/* Actions */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <SecondaryButton
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    disabled={!selectedTemplate || generating}
                    onClick={() =>
                      handleNavigate(`/schedules?template=${selectedTemplate}`, 'Open schedules', {
                        templateId: selectedTemplate,
                      })
                    }
                  >
                    Schedule
                  </SecondaryButton>
                  <PrimaryButton
                    startIcon={<PlayArrowIcon />}
                    onClick={handleGenerate}
                    disabled={!selectedTemplate || !activeConnection || generating}
                  >
                    Generate Report
                  </PrimaryButton>
                </Stack>
              </Stack>
            </GlassCard>
          </Grid>

          {/* Result Panel */}
          <Grid size={{ xs: 12, md: 4 }}>
            <OutputCard>
              <SectionLabel>Output</SectionLabel>

              {result ? (
                <Stack spacing={2}>
                  <SuccessAlert severity="success">
                    Report started! ID: {result.job_id?.slice(0, 8)}...
                  </SuccessAlert>
                  <Typography variant="body2" color="text.secondary">
                    Your report is being generated. Track it in Report Progress.
                  </Typography>
                  <SecondaryButton
                    size="small"
                    variant="outlined"
                    onClick={() => handleNavigate('/jobs', 'Open jobs')}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    View Progress
                  </SecondaryButton>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Configure your report parameters and click "Generate Report" to create a new report.
                </Typography>
              )}

              {/* AI Summary Widget */}
              {selectedRun && (
                <>
                  <StyledDivider />
                  <AiUsageNotice
                    title="AI summary"
                    description="Summaries are generated from the selected report run. Review before sharing."
                    chips={[
                      { label: 'Source: Selected run', color: 'info', variant: 'outlined' },
                      { label: 'Confidence: Review required', color: 'warning', variant: 'outlined' },
                    ]}
                    dense
                    sx={{ mb: 2 }}
                  />
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AiIcon fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        AI Summary
                      </Typography>
                    </Stack>
                    {summaryLoading && <StyledLinearProgress />}
                    {!summaryLoading && runSummary ? (
                      <SummaryCard>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {typeof runSummary === 'string' ? runSummary : runSummary.text || runSummary.content || 'No summary available'}
                        </Typography>
                        {runSummary.key_points && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" fontWeight={600} color="text.primary">
                              Key Points:
                            </Typography>
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                              {runSummary.key_points.map((point, idx) => (
                                <li key={idx}>
                                  <Typography variant="caption">{point}</Typography>
                                </li>
                              ))}
                            </ul>
                          </Box>
                        )}
                      </SummaryCard>
                    ) : !summaryLoading && (
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Click on a run below to view its AI summary.
                        </Typography>
                        <SecondaryButton
                          size="small"
                          variant="outlined"
                          startIcon={<ScheduleIcon />}
                          onClick={handleQueueSummary}
                          disabled={queueingSummary}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {queueingSummary ? 'Queueing...' : 'Queue summary'}
                        </SecondaryButton>
                      </Stack>
                    )}
                  </Stack>
                </>
              )}

              <StyledDivider />
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={600}>
                    Recent Runs
                  </Typography>
                  <TextButton
                    size="small"
                    onClick={fetchRunHistory}
                    disabled={historyLoading}
                    startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                  >
                    Refresh
                  </TextButton>
                </Stack>
                {historyLoading && <StyledLinearProgress />}
                {!historyLoading && runHistory.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedTemplate ? 'No recent runs for this design yet.' : 'No report runs yet. Generate a report to get started.'}
                  </Typography>
                )}
                <Stack spacing={1}>
                  {runHistory.map((run) => (
                    <RunHistoryCard
                      key={run.id}
                      selected={selectedRun?.id === run.id}
                      onClick={() => handleSelectRun(run)}
                      title="Click to view summary"
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600}>
                            {run.templateName || run.templateId}
                          </Typography>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            className="view-summary-hint"
                            sx={{ opacity: 0.6, transition: 'all 0.2s ease' }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              View
                            </Typography>
                            <ArrowForwardIcon sx={{ fontSize: 12 }} />
                          </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(run.createdAt).toLocaleString()} &middot; {run.startDate} to {run.endDate}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                          {run.artifacts?.pdf_url && (
                            <DownloadButton
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                              href={api.withBase(run.artifacts.pdf_url)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              PDF
                            </DownloadButton>
                          )}
                          {run.artifacts?.html_url && (
                            <DownloadButton
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                              href={api.withBase(run.artifacts.html_url)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              HTML
                            </DownloadButton>
                          )}
                          <DownloadButton
                            size="small"
                            variant="outlined"
                            startIcon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNavigate(`/agents?analyzeRunId=${run.id}`, 'Analyze with AI', { runId: run.id })
                            }}
                            data-testid={`analyze-ai-${run.id}`}
                          >
                            Analyze
                          </DownloadButton>
                        </Stack>
                      </Stack>
                    </RunHistoryCard>
                  ))}
                </Stack>
              </Stack>
            </OutputCard>
          </Grid>
        </Grid>
      </Container>
    </PageContainer>
  )
}
