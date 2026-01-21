import { useCallback, useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Stack,
  Divider,
  Alert,
  TextField,
  CircularProgress,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Avatar,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CancelIcon from '@mui/icons-material/Cancel'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import BarChartIcon from '@mui/icons-material/BarChart'
import TableChartIcon from '@mui/icons-material/TableChart'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import DownloadIcon from '@mui/icons-material/Download'
import ShareIcon from '@mui/icons-material/Share'
import CommentIcon from '@mui/icons-material/Comment'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SendIcon from '@mui/icons-material/Send'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SecurityIcon from '@mui/icons-material/Security'
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral'

import DocumentUpload from '../components/DocumentUpload'
import ZoomableChart from '../components/ZoomableChart'
import Surface from '../../../components/layout/Surface'
import { useToast } from '../../../components/ToastProvider'
import {
  uploadAndAnalyzeEnhanced,
  askQuestion,
  generateCharts,
  exportAnalysis,
  getSuggestedQuestions,
} from '../services/enhancedAnalyzeApi'

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

// Metric card component
function MetricCard({ metric }) {
  return (
    <Card sx={{ minWidth: 200, bgcolor: 'background.paper' }}>
      <CardContent sx={{ py: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          {metric.name}
        </Typography>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          {metric.raw_value}
        </Typography>
        {metric.change && (
          <Typography
            variant="body2"
            color={metric.change > 0 ? 'success.main' : 'error.main'}
          >
            {metric.change > 0 ? '+' : ''}{metric.change}%
            {metric.comparison_base && ` ${metric.comparison_base}`}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// Insight card component
function InsightCard({ insight, type = 'insight' }) {
  const colorMap = {
    insight: { bg: 'info.50', border: 'info.main', icon: <LightbulbIcon /> },
    risk: { bg: 'error.50', border: 'error.main', icon: <WarningAmberIcon /> },
    opportunity: { bg: 'success.50', border: 'success.main', icon: <TrendingUpIcon /> },
    action: { bg: 'warning.50', border: 'warning.main', icon: <PlaylistAddCheckIcon /> },
  }

  const colors = colorMap[type] || colorMap.insight

  return (
    <Card
      sx={{
        bgcolor: colors.bg,
        borderLeft: 4,
        borderColor: colors.border,
        mb: 1.5,
      }}
    >
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <Box sx={{ color: colors.border, mt: 0.5 }}>{colors.icon}</Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {insight.title}
              </Typography>
              <Chip
                label={insight.priority || 'medium'}
                size="small"
                color={
                  insight.priority === 'critical' || insight.priority === 'high'
                    ? 'error'
                    : insight.priority === 'low'
                    ? 'default'
                    : 'warning'
                }
                sx={{ height: 20, fontSize: 10 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {insight.description}
            </Typography>
            {insight.suggested_actions?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" fontWeight={600}>
                  Suggested Actions:
                </Typography>
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                  {insight.suggested_actions.map((action, i) => (
                    <li key={i}>
                      <Typography variant="caption">{action}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// Sentiment indicator component
function SentimentIndicator({ sentiment }) {
  if (!sentiment) return null

  const getSentimentIcon = (level) => {
    if (level.includes('positive')) return <SentimentSatisfiedIcon color="success" />
    if (level.includes('negative')) return <SentimentDissatisfiedIcon color="error" />
    return <SentimentNeutralIcon color="warning" />
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {getSentimentIcon(sentiment.overall_sentiment)}
      <Typography variant="body2">
        {sentiment.overall_sentiment.replace('_', ' ')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        (score: {(sentiment.overall_score * 100).toFixed(0)}%)
      </Typography>
    </Stack>
  )
}

export default function EnhancedAnalyzePageContainer() {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [progressStage, setProgressStage] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])

  // Q&A state
  const [question, setQuestion] = useState('')
  const [isAskingQuestion, setIsAskingQuestion] = useState(false)
  const [qaHistory, setQaHistory] = useState([])

  // Chart generation state
  const [chartQuery, setChartQuery] = useState('')
  const [isGeneratingCharts, setIsGeneratingCharts] = useState(false)
  const [generatedCharts, setGeneratedCharts] = useState([])

  // Export state
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  // Preferences state
  const [preferences, setPreferences] = useState({
    analysis_depth: 'standard',
    focus_areas: [],
    output_format: 'executive',
    industry: null,
    enable_predictions: true,
    auto_chart_generation: true,
    max_charts: 10,
  })

  const abortControllerRef = useRef(null)
  const toast = useToast()

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file)
    setError(null)
    setAnalysisResult(null)
    setSuggestedQuestions([])
    setQaHistory([])
    setGeneratedCharts([])
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return

    abortControllerRef.current = new AbortController()

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setProgressStage('Starting analysis...')
    setError(null)

    try {
      const result = await uploadAndAnalyzeEnhanced({
        file: selectedFile,
        preferences,
        signal: abortControllerRef.current?.signal,
        onProgress: (event) => {
          if (event.event === 'stage') {
            setAnalysisProgress(event.progress || 0)
            setProgressStage(event.detail || event.stage || 'Processing...')
          }
        },
      })

      if (result.event === 'result') {
        setAnalysisResult(result)
        setSuggestedQuestions(result.suggested_questions || [])
        setGeneratedCharts(result.chart_suggestions || [])
        setActiveTab(0)
        toast.show('Analysis complete', 'success')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.show('Analysis cancelled', 'info')
      } else {
        setError(err.message || 'Analysis failed')
      }
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(100)
      abortControllerRef.current = null
    }
  }, [selectedFile, preferences, toast])

  const handleCancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsAnalyzing(false)
      setAnalysisProgress(0)
      setProgressStage('')
    }
  }, [])

  const handleAskQuestion = useCallback(async () => {
    if (!analysisResult?.analysis_id || !question.trim()) return

    setIsAskingQuestion(true)
    try {
      const response = await askQuestion(analysisResult.analysis_id, {
        question: question.trim(),
        includeSources: true,
      })

      setQaHistory((prev) => [
        ...prev,
        {
          question: question.trim(),
          answer: response.answer,
          sources: response.sources,
          suggested_followups: response.suggested_followups,
          timestamp: new Date(),
        },
      ])
      setQuestion('')

      // Update suggested questions with follow-ups
      if (response.suggested_followups?.length) {
        setSuggestedQuestions(response.suggested_followups)
      }
    } catch (err) {
      toast.show(err.message || 'Failed to get answer', 'error')
    } finally {
      setIsAskingQuestion(false)
    }
  }, [analysisResult?.analysis_id, question, toast])

  const handleGenerateCharts = useCallback(async () => {
    if (!analysisResult?.analysis_id || !chartQuery.trim()) return

    setIsGeneratingCharts(true)
    try {
      const response = await generateCharts(analysisResult.analysis_id, {
        query: chartQuery.trim(),
        includeTrends: true,
        includeForecasts: false,
      })

      if (response.charts?.length) {
        setGeneratedCharts((prev) => [...response.charts, ...prev])
        setChartQuery('')
        toast.show(`Generated ${response.charts.length} chart(s)`, 'success')
      }
    } catch (err) {
      toast.show(err.message || 'Failed to generate charts', 'error')
    } finally {
      setIsGeneratingCharts(false)
    }
  }, [analysisResult?.analysis_id, chartQuery, toast])

  const handleExport = useCallback(async (format) => {
    if (!analysisResult?.analysis_id) return

    setExportMenuAnchor(null)
    setIsExporting(true)

    try {
      const blob = await exportAnalysis(analysisResult.analysis_id, { format })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis_${analysisResult.analysis_id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.show(`Exported as ${format.toUpperCase()}`, 'success')
    } catch (err) {
      toast.show(err.message || 'Export failed', 'error')
    } finally {
      setIsExporting(false)
    }
  }, [analysisResult?.analysis_id, toast])

  const handleReset = useCallback(() => {
    setSelectedFile(null)
    setAnalysisResult(null)
    setError(null)
    setSuggestedQuestions([])
    setQaHistory([])
    setGeneratedCharts([])
    setActiveTab(0)
  }, [])

  // Compute stats
  const stats = analysisResult
    ? {
        tables: analysisResult.total_tables || analysisResult.tables?.length || 0,
        metrics: analysisResult.total_metrics || analysisResult.metrics?.length || 0,
        entities: analysisResult.total_entities || analysisResult.entities?.length || 0,
        insights: analysisResult.insights?.length || 0,
        risks: analysisResult.risks?.length || 0,
        opportunities: analysisResult.opportunities?.length || 0,
        charts: generatedCharts.length,
      }
    : null

  return (
    <Box sx={{ py: 3, px: 3 }}>
      {/* Page Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Enhanced Document Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-powered extraction, analysis, visualization, and insights
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {analysisResult && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                disabled={isExporting}
                sx={{ textTransform: 'none' }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={() => setExportMenuAnchor(null)}
              >
                {['json', 'excel', 'pdf', 'csv', 'markdown', 'html'].map((fmt) => (
                  <MenuItem key={fmt} onClick={() => handleExport(fmt)}>
                    {fmt.toUpperCase()}
                  </MenuItem>
                ))}
              </Menu>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                sx={{ textTransform: 'none' }}
              >
                New Analysis
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* Status Summary */}
      {stats && (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip icon={<TableChartIcon />} label={`${stats.tables} Tables`} color="primary" variant="outlined" />
          <Chip icon={<AssessmentIcon />} label={`${stats.metrics} Metrics`} color="success" variant="outlined" />
          <Chip icon={<LightbulbIcon />} label={`${stats.insights} Insights`} color="info" variant="outlined" />
          <Chip icon={<WarningAmberIcon />} label={`${stats.risks} Risks`} color="error" variant="outlined" />
          <Chip icon={<TrendingUpIcon />} label={`${stats.opportunities} Opportunities`} color="warning" variant="outlined" />
          <Chip icon={<BarChartIcon />} label={`${stats.charts} Charts`} color="secondary" variant="outlined" />
        </Stack>
      )}

      {/* Upload Section */}
      {!analysisResult && (
        <Surface sx={{ p: 3, mb: 3 }}>
          <DocumentUpload
            onFileSelect={handleFileSelect}
            isUploading={isAnalyzing}
            progress={analysisProgress}
            progressStage={progressStage}
            error={error}
            disabled={isAnalyzing}
          />

          {selectedFile && !isAnalyzing && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Stack direction="row" justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleAnalyze}
                  startIcon={<AutoAwesomeIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                  }}
                >
                  Analyze with AI
                </Button>
              </Stack>
            </Stack>
          )}

          {isAnalyzing && (
            <Stack alignItems="center" sx={{ mt: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                {progressStage}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analysisProgress}
                sx={{ width: '100%', maxWidth: 400, mt: 2, height: 8, borderRadius: 4 }}
              />
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<CancelIcon />}
                onClick={handleCancelAnalysis}
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Cancel
              </Button>
            </Stack>
          )}
        </Surface>
      )}

      {/* Results Section */}
      {analysisResult && (
        <>
          {/* Tabs */}
          <Surface sx={{ mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" icon={<InsightsOutlinedIcon />} iconPosition="start" />
              <Tab label="Q&A" icon={<QuestionAnswerIcon />} iconPosition="start" />
              <Tab label="Charts" icon={<BarChartIcon />} iconPosition="start" />
              <Tab label="Data" icon={<TableChartIcon />} iconPosition="start" />
              <Tab label="Insights" icon={<LightbulbIcon />} iconPosition="start" />
            </Tabs>
          </Surface>

          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              {/* Executive Summary */}
              <Grid item xs={12} md={8}>
                <Surface sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Executive Summary
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {analysisResult.summaries?.executive?.content ||
                      analysisResult.summaries?.comprehensive?.content ||
                      'Summary not available'}
                  </Typography>

                  {analysisResult.summaries?.executive?.bullet_points?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Key Points
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {analysisResult.summaries.executive.bullet_points.map((point, i) => (
                          <li key={i}>
                            <Typography variant="body2">{point}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Surface>
              </Grid>

              {/* Sentiment & Quick Stats */}
              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  {analysisResult.sentiment && (
                    <Surface sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Document Sentiment
                      </Typography>
                      <SentimentIndicator sentiment={analysisResult.sentiment} />
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Tone: {analysisResult.sentiment.emotional_tone}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Urgency: {analysisResult.sentiment.urgency_level}
                      </Typography>
                    </Surface>
                  )}

                  {analysisResult.data_quality && (
                    <Surface sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Data Quality
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CircularProgress
                          variant="determinate"
                          value={analysisResult.data_quality.quality_score * 100}
                          size={40}
                          color={analysisResult.data_quality.quality_score > 0.8 ? 'success' : 'warning'}
                        />
                        <Typography variant="h6" fontWeight={600}>
                          {(analysisResult.data_quality.quality_score * 100).toFixed(0)}%
                        </Typography>
                      </Stack>
                      {analysisResult.data_quality.recommendations?.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          {analysisResult.data_quality.recommendations[0]}
                        </Typography>
                      )}
                    </Surface>
                  )}
                </Stack>
              </Grid>

              {/* Key Metrics */}
              <Grid item xs={12}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Key Metrics
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    {analysisResult.metrics?.slice(0, 8).map((metric) => (
                      <MetricCard key={metric.id} metric={metric} />
                    ))}
                  </Stack>
                </Surface>
              </Grid>

              {/* Top Insights Preview */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Top Insights
                  </Typography>
                  {analysisResult.insights?.slice(0, 3).map((insight) => (
                    <InsightCard key={insight.id} insight={insight} type="insight" />
                  ))}
                </Surface>
              </Grid>

              {/* Risks & Opportunities Preview */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Risks & Opportunities
                  </Typography>
                  {analysisResult.risks?.slice(0, 2).map((risk) => (
                    <InsightCard key={risk.id} insight={risk} type="risk" />
                  ))}
                  {analysisResult.opportunities?.slice(0, 2).map((opp) => (
                    <InsightCard key={opp.id} insight={opp} type="opportunity" />
                  ))}
                </Surface>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Q&A Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Ask Questions About Your Document
                  </Typography>

                  {/* Question Input */}
                  <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      placeholder="e.g., What was the total revenue? What risks are mentioned?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                      disabled={isAskingQuestion}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || isAskingQuestion}
                      startIcon={isAskingQuestion ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                      sx={{ minWidth: 120, textTransform: 'none' }}
                    >
                      Ask
                    </Button>
                  </Stack>

                  {/* Q&A History */}
                  <Stack spacing={2}>
                    {qaHistory.map((qa, idx) => (
                      <Box key={idx}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                            Q: {qa.question}
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, ml: 2 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {qa.answer}
                          </Typography>
                          {qa.sources?.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" fontWeight={600}>
                                Sources:
                              </Typography>
                              {qa.sources.map((source, i) => (
                                <Typography key={i} variant="caption" display="block" color="text.secondary">
                                  - {source.content_preview}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    ))}
                  </Stack>
                </Surface>
              </Grid>

              {/* Suggested Questions */}
              <Grid item xs={12} md={4}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Suggested Questions
                  </Typography>
                  <Stack spacing={1}>
                    {suggestedQuestions.map((q, idx) => (
                      <Button
                        key={idx}
                        variant="outlined"
                        size="small"
                        onClick={() => setQuestion(q)}
                        sx={{
                          textTransform: 'none',
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                        }}
                      >
                        {q}
                      </Button>
                    ))}
                  </Stack>
                </Surface>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Charts Tab */}
          <TabPanel value={activeTab} index={2}>
            <Surface sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Generate Charts with Natural Language
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  placeholder="e.g., Show revenue by quarter as a line chart, Compare categories..."
                  value={chartQuery}
                  onChange={(e) => setChartQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateCharts()}
                  disabled={isGeneratingCharts}
                />
                <Button
                  variant="contained"
                  onClick={handleGenerateCharts}
                  disabled={!chartQuery.trim() || isGeneratingCharts}
                  startIcon={isGeneratingCharts ? <CircularProgress size={16} color="inherit" /> : <BarChartIcon />}
                  sx={{ minWidth: 160, textTransform: 'none' }}
                >
                  Generate
                </Button>
              </Stack>
            </Surface>

            <Grid container spacing={3}>
              {generatedCharts.map((chart, idx) => (
                <Grid item xs={12} md={6} key={chart.id || idx}>
                  <Surface sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {chart.title}
                    </Typography>
                    {chart.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {chart.description}
                      </Typography>
                    )}
                    <ZoomableChart chart={chart} data={chart.data} height={300} />
                    {chart.ai_insights?.length > 0 && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          AI Insights:
                        </Typography>
                        {chart.ai_insights.map((insight, i) => (
                          <Typography key={i} variant="caption" display="block">
                            • {insight}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Data Tab */}
          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={3}>
              {/* Tables */}
              <Grid item xs={12}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Extracted Tables ({analysisResult.tables?.length || 0})
                  </Typography>
                  {analysisResult.tables?.map((table) => (
                    <Accordion key={table.id} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <TableChartIcon color="primary" />
                          <Typography fontWeight={600}>{table.title || table.id}</Typography>
                          <Chip label={`${table.row_count} rows`} size="small" />
                          <Chip label={`${table.column_count} cols`} size="small" />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {table.headers.map((header, i) => (
                                  <th
                                    key={i}
                                    style={{
                                      padding: '8px 12px',
                                      textAlign: 'left',
                                      borderBottom: '2px solid #e0e0e0',
                                      backgroundColor: '#f5f5f5',
                                    }}
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.slice(0, 10).map((row, i) => (
                                <tr key={i}>
                                  {row.map((cell, j) => (
                                    <td
                                      key={j}
                                      style={{
                                        padding: '8px 12px',
                                        borderBottom: '1px solid #e0e0e0',
                                      }}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {table.rows.length > 10 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                              Showing 10 of {table.rows.length} rows
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Surface>
              </Grid>

              {/* Entities */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Extracted Entities ({analysisResult.entities?.length || 0})
                  </Typography>
                  <Stack spacing={1}>
                    {analysisResult.entities?.slice(0, 20).map((entity) => (
                      <Stack key={entity.id} direction="row" alignItems="center" spacing={1}>
                        <Chip
                          label={entity.type}
                          size="small"
                          color={
                            entity.type === 'money'
                              ? 'success'
                              : entity.type === 'date'
                              ? 'primary'
                              : 'default'
                          }
                        />
                        <Typography variant="body2">{entity.value}</Typography>
                        {entity.normalized_value && entity.normalized_value !== entity.value && (
                          <Typography variant="caption" color="text.secondary">
                            ({entity.normalized_value})
                          </Typography>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Surface>
              </Grid>

              {/* Invoices & Contracts */}
              <Grid item xs={12} md={6}>
                {analysisResult.invoices?.length > 0 && (
                  <Surface sx={{ p: 3, mb: 2 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Invoices Detected
                    </Typography>
                    {analysisResult.invoices.map((invoice) => (
                      <Box key={invoice.id} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">{invoice.vendor_name}</Typography>
                        <Typography variant="body2">
                          Invoice #{invoice.invoice_number} | {invoice.invoice_date}
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {invoice.currency} {invoice.grand_total}
                        </Typography>
                      </Box>
                    ))}
                  </Surface>
                )}

                {analysisResult.contracts?.length > 0 && (
                  <Surface sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Contracts Detected
                    </Typography>
                    {analysisResult.contracts.map((contract) => (
                      <Box key={contract.id}>
                        <Typography variant="subtitle2">{contract.contract_type}</Typography>
                        <Typography variant="body2">
                          {contract.effective_date} - {contract.expiration_date}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Parties: {contract.parties?.map((p) => p.name).join(', ')}
                        </Typography>
                      </Box>
                    ))}
                  </Surface>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          {/* Insights Tab */}
          <TabPanel value={activeTab} index={4}>
            <Grid container spacing={3}>
              {/* Insights */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Key Insights ({analysisResult.insights?.length || 0})
                  </Typography>
                  {analysisResult.insights?.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} type="insight" />
                  ))}
                </Surface>
              </Grid>

              {/* Risks */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Risks ({analysisResult.risks?.length || 0})
                  </Typography>
                  {analysisResult.risks?.map((risk) => (
                    <InsightCard key={risk.id} insight={risk} type="risk" />
                  ))}
                </Surface>
              </Grid>

              {/* Opportunities */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Opportunities ({analysisResult.opportunities?.length || 0})
                  </Typography>
                  {analysisResult.opportunities?.map((opp) => (
                    <InsightCard key={opp.id} insight={opp} type="opportunity" />
                  ))}
                </Surface>
              </Grid>

              {/* Action Items */}
              <Grid item xs={12} md={6}>
                <Surface sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Action Items ({analysisResult.action_items?.length || 0})
                  </Typography>
                  {analysisResult.action_items?.map((action) => (
                    <InsightCard key={action.id} insight={action} type="action" />
                  ))}
                </Surface>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}

      {/* Error Display */}
      {error && !isAnalyzing && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Help Text */}
      <Box sx={{ textAlign: 'center', py: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Supported formats: PDF, Excel (XLSX, XLS), CSV, Images • Max file size: 50MB
        </Typography>
        <Typography variant="caption" color="text.disabled">
          AI-powered extraction with intelligent analysis, Q&A, and visualization
        </Typography>
      </Box>
    </Box>
  )
}
