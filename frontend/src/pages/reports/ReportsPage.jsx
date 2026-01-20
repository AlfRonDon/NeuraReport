import { useState, useCallback, useMemo, useEffect } from 'react'
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
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DownloadIcon from '@mui/icons-material/Download'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import TemplateRecommender from '../../components/TemplateRecommender'
import * as api from '../../api/client'

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
  const [keyValues, setKeyValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [keyOptions, setKeyOptions] = useState({})

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
        toast.show(err.message || 'Failed to load templates', 'error')
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
      try {
        const template = templates.find((t) => t.id === selectedTemplate)
        const result = await api.fetchTemplateKeyOptions(selectedTemplate, {
          connectionId: activeConnection.id,
          kind: template?.kind || 'pdf',
        })
        setKeyOptions(result.keys || {})
      } catch (err) {
        console.error('Failed to fetch key options:', err)
      }
    }
    fetchKeyOptions()
  }, [selectedTemplate, activeConnection?.id, templates])

  const handleTemplateChange = useCallback((event) => {
    setSelectedTemplate(event.target.value)
    setKeyValues({})
    setResult(null)
  }, [])

  const handleAiSelectTemplate = useCallback((template) => {
    if (template?.id) {
      setSelectedTemplate(template.id)
      setKeyValues({})
      setResult(null)
      toast.show(`Selected template: ${template.name || template.id}`, 'success')
    }
  }, [toast])

  const handleKeyValueChange = useCallback((key, value) => {
    setKeyValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !activeConnection?.id) {
      toast.show('Please select a template and ensure you have an active connection', 'error')
      return
    }

    setGenerating(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      const template = templates.find((t) => t.id === selectedTemplate)

      const reportResult = await api.runReportAsJob({
        templateId: selectedTemplate,
        templateName: template?.name,
        connectionId: activeConnection.id,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        keyValues: Object.keys(keyValues).length > 0 ? keyValues : undefined,
        kind: template?.kind || 'pdf',
      })

      setResult(reportResult)
      toast.show('Report generation started!', 'success')
    } catch (err) {
      setError(err.message || 'Failed to generate report')
      toast.show(err.message || 'Failed to generate report', 'error')
    } finally {
      setGenerating(false)
      setProgress(100)
    }
  }, [selectedTemplate, activeConnection?.id, templates, startDate, endDate, keyValues, toast])

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate)
  const keyFields = Object.keys(keyOptions)

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
          Generate Reports
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select a template and configure parameters to generate your report.
        </Typography>

        {!activeConnection && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Please connect to a database first to generate reports.
          </Alert>
        )}

        {/* AI Template Picker */}
        <Box sx={{ mb: 3 }}>
          <TemplateRecommender onSelectTemplate={handleAiSelectTemplate} />
        </Box>

        <Grid container spacing={3}>
          {/* Configuration Panel */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
                Report Configuration
              </Typography>

              <Stack spacing={3}>
                {/* Template Selection */}
                <FormControl fullWidth>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    label="Template"
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Stack>

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

                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
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
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, border: 1, borderColor: 'divider', height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Output
              </Typography>

              {result ? (
                <Stack spacing={2}>
                  <Alert severity="success">
                    Report job created: {result.job_id?.slice(0, 8)}...
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Your report is being generated. Check the Jobs page for progress.
                  </Typography>
                  {result.artifacts?.html_url && (
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      href={result.artifacts.html_url}
                      target="_blank"
                    >
                      Download Report
                    </Button>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Configure your report parameters and click "Generate Report" to create a new report.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
