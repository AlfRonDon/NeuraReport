import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DownloadIcon from '@mui/icons-material/Download'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import TodayIcon from '@mui/icons-material/Today'
import DateRangeIcon from '@mui/icons-material/DateRange'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import TemplateRecommender from '../../components/TemplateRecommender'
import SuccessCelebration, { useCelebration } from '../../components/SuccessCelebration'
import * as api from '../../api/client'
import * as summaryApi from '../../api/summary'

// Date preset helpers
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

export default function ReportsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

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

      // Increment request ID to track this specific request
      const requestId = ++keyOptionsRequestIdRef.current

      try {
        const template = templates.find((t) => t.id === selectedTemplate)
        const result = await api.fetchTemplateKeyOptions(selectedTemplate, {
          connectionId: activeConnection.id,
          kind: template?.kind || 'pdf',
        })

        // Only update state if this is still the latest request
        if (requestId === keyOptionsRequestIdRef.current) {
          setKeyOptions(result.keys || {})
        }
      } catch (err) {
        // Only show error if this is still the latest request
        if (requestId === keyOptionsRequestIdRef.current) {
          console.error('Failed to fetch key options:', err)
          // Show user-friendly feedback but don't block workflow
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
    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.show('Start date must be before or equal to end date', 'error')
      return
    }

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
      celebrate() // Trigger celebration animation
    } catch (err) {
      setError(err.message || 'Failed to generate report')
      toast.show(err.message || 'Failed to generate report', 'error')
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplate, activeConnection?.id, templates, startDate, endDate, keyValues, toast])

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
    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      toast.show('Start date must be before or equal to end date', 'error')
      return
    }
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
    } catch (err) {
      toast.show(err.message || 'Failed to discover batches', 'error')
    } finally {
      setDiscovering(false)
    }
  }, [selectedTemplate, activeConnection?.id, startDate, endDate, keyValues, templates, toast])

  const fetchRunHistory = useCallback(async () => {
    if (!selectedTemplate) {
      setRunHistory([])
      return
    }
    setHistoryLoading(true)
    try {
      const runs = await api.listReportRuns({ templateId: selectedTemplate, limit: 6 })
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
      // Increment request ID to track this specific request
      const requestId = ++summaryRequestIdRef.current

      setSummaryLoading(true)
      try {
        const summaryData = await summaryApi.getReportSummary(run.id)

        // Only update state if this is still the latest request
        if (requestId === summaryRequestIdRef.current) {
          setRunSummary(summaryData.summary || summaryData)
        }
      } catch (err) {
        // Only update state if this is still the latest request
        if (requestId === summaryRequestIdRef.current) {
          console.error('Failed to fetch summary:', err)
          setRunSummary(null)
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (requestId === summaryRequestIdRef.current) {
          setSummaryLoading(false)
        }
      }
    }
  }, [])

  const handleQueueSummary = useCallback(async () => {
    if (!selectedRun?.id) return
    setQueueingSummary(true)
    try {
      const response = await summaryApi.queueReportSummary(selectedRun.id)
      const jobId = response?.job_id || response?.jobId || null
      if (jobId) {
        toast.show('Summary queued. Track progress in Report Progress.', 'success')
      } else {
        toast.show('Failed to queue summary.', 'error')
      }
    } catch (err) {
      toast.show(err?.message || 'Failed to queue summary.', 'error')
    } finally {
      setQueueingSummary(false)
    }
  }, [selectedRun?.id, toast])

  const handleSelectAllBatches = useCallback(() => {
    const allIds = Array.isArray(discovery?.batches) ? discovery.batches.map((batch) => batch.id) : []
    setSelectedBatches(allIds)
  }, [discovery])

  const handleClearBatches = useCallback(() => {
    setSelectedBatches([])
  }, [])

  return (
    <Box sx={{ py: 3 }}>
      <SuccessCelebration trigger={celebrating} onComplete={onCelebrationComplete} />
      <Container maxWidth="lg">
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
          Create a Report
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose a design, set your date range, and generate a new report.
        </Typography>

        {!activeConnection && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Please add a data source first to create reports.
          </Alert>
        )}

        {/* AI Template Picker */}
        <Box sx={{ mb: 3 }}>
          <TemplateRecommender onSelectTemplate={handleAiSelectTemplate} />
        </Box>

        <Grid container spacing={3}>
          {/* Configuration Panel */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
                Report Settings
              </Typography>

              <Stack spacing={3}>
                {/* Design Selection */}
                <FormControl fullWidth>
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
                          />
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Date Range */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    Time Period
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(getDatePresets()).map(([key, preset]) => (
                      <Chip
                        key={key}
                        label={preset.label}
                        icon={<TodayIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleDatePreset(key)}
                        color={datePreset === key ? 'primary' : 'default'}
                        variant={datePreset === key ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                    <Chip
                      label="Custom"
                      icon={<DateRangeIcon sx={{ fontSize: 16 }} />}
                      onClick={() => handleDatePreset('custom')}
                      color={datePreset === 'custom' ? 'primary' : 'default'}
                      variant={datePreset === 'custom' ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
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
                    <TextField
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
                    <Divider />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Filter Parameters
                    </Typography>
                    <Stack spacing={2}>
                      {keyFields.map((key) => (
                        <FormControl key={key} fullWidth size="small">
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
                        </FormControl>
                      ))}
                    </Stack>
                  </>
                )}

                <Divider />
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={600}>
                    Find Data Batches
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleDiscover}
                    disabled={discovering || !selectedTemplate || !activeConnection}
                  >
                    {discovering ? 'Searching...' : 'Find Batches'}
                  </Button>
                </Stack>

                {discovering && <LinearProgress />}
                {!discovering && discovery && (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`${discovery.batches_count || discovery.batches?.length || 0} batches`} />
                      <Chip label={`${discovery.rows_total || 0} rows`} />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="text" onClick={handleSelectAllBatches}>
                        Select all
                      </Button>
                      <Button size="small" variant="text" onClick={handleClearBatches}>
                        Clear
                      </Button>
                    </Stack>
                    <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <List dense>
                        {(discovery.batches || []).map((batch) => (
                          <ListItem
                            key={batch.id}
                            disableGutters
                            onClick={() => toggleBatch(batch.id)}
                            sx={{ px: 1, cursor: 'pointer' }}
                          >
                            <Checkbox checked={selectedBatches.includes(batch.id)} />
                            <ListItemText
                              primary={`${batch.id}`}
                              secondary={`${batch.rows || 0} rows`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Stack>
                )}

                {error && (
                  <Alert
                    severity="error"
                    onClose={() => setError(null)}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleGenerate}
                        disabled={generating}
                      >
                        Try Again
                      </Button>
                    }
                  >
                    {error}
                  </Alert>
                )}

                {generating && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Generating report...
                    </Typography>
                    <LinearProgress />
                  </Box>
                )}

                {/* Actions */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    disabled={!selectedTemplate || generating}
                    onClick={() => navigate(`/schedules?template=${selectedTemplate}`)}
                  >
                    Schedule
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleGenerate}
                    disabled={!selectedTemplate || !activeConnection || generating}
                  >
                    Generate Report
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* Result Panel */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, border: 1, borderColor: 'divider', height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Output
              </Typography>

              {result ? (
                <Stack spacing={2}>
                  <Alert severity="success">
                    Report started! ID: {result.job_id?.slice(0, 8)}...
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Your report is being generated. Track it in Report Progress.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/jobs')}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    View Progress
                  </Button>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Configure your report parameters and click "Generate Report" to create a new report.
                </Typography>
              )}

              {/* AI Summary Widget */}
              {selectedRun && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesomeIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        AI Summary
                      </Typography>
                    </Stack>
                    {summaryLoading && <LinearProgress />}
                    {!summaryLoading && runSummary ? (
                      <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {typeof runSummary === 'string' ? runSummary : runSummary.text || runSummary.content || 'No summary available'}
                        </Typography>
                        {runSummary.key_points && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" fontWeight={600}>Key Points:</Typography>
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                              {runSummary.key_points.map((point, idx) => (
                                <li key={idx}>
                                  <Typography variant="caption">{point}</Typography>
                                </li>
                              ))}
                            </ul>
                          </Box>
                        )}
                      </Paper>
                    ) : !summaryLoading && (
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Click on a run below to view its AI summary.
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ScheduleIcon />}
                          onClick={handleQueueSummary}
                          disabled={queueingSummary}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {queueingSummary ? 'Queueing...' : 'Queue summary'}
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={600}>
                    Recent Runs
                  </Typography>
                  <Button size="small" variant="text" onClick={fetchRunHistory} disabled={historyLoading}>
                    Refresh
                  </Button>
                </Stack>
                {historyLoading && <LinearProgress />}
                {!historyLoading && runHistory.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No recent runs for this template yet.
                  </Typography>
                )}
                <Stack spacing={1}>
                  {runHistory.map((run) => (
                    <Paper
                      key={run.id}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: selectedRun?.id === run.id ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'primary.light',
                          '& .run-history-hint': { color: 'text.primary' },
                        },
                      }}
                      onClick={() => handleSelectRun(run)}
                      title="Click to view summary"
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(run.createdAt).toLocaleString()}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5} className="run-history-hint">
                            <Typography variant="caption" color="text.secondary">
                              View summary
                            </Typography>
                            <ArrowForwardIcon sx={{ fontSize: 12, color: 'inherit' }} />
                          </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {run.startDate} to {run.endDate}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          {run.artifacts?.pdf_url && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadIcon />}
                              href={api.withBase(run.artifacts.pdf_url)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              PDF
                            </Button>
                          )}
                          {run.artifacts?.html_url && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadIcon />}
                              href={api.withBase(run.artifacts.html_url)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              HTML
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
