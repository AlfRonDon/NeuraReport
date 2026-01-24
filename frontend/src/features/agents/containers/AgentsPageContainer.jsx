/**
 * AI Agents Page Container
 * Interface for running AI agents (research, data analysis, email, content, proofreading).
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  Science as ResearchIcon,
  Analytics as DataIcon,
  Email as EmailIcon,
  Transform as ContentIcon,
  Spellcheck as ProofreadIcon,
  PlayArrow as RunIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  SmartToy as AgentIcon,
} from '@mui/icons-material'
import useAgentStore from '@/stores/agentStore'
import { useToast } from '@/components/ToastProvider'
import { useInteraction, InteractionType, Reversibility } from '@/components/ux/governance'

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 64px)',
  backgroundColor: theme.palette.background.default,
}))

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
}))

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
}))

const MainPanel = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  overflow: 'auto',
}))

const Sidebar = styled(Box)(({ theme }) => ({
  width: 350,
  borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  display: 'flex',
  flexDirection: 'column',
}))

const AgentCard = styled(Card)(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
}))

const ResultCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: alpha(theme.palette.success.main, 0.05),
  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
}))

// =============================================================================
// AGENT CONFIGS
// =============================================================================

const AGENTS = [
  {
    type: 'research',
    name: 'Research Agent',
    description: 'Deep-dive research and report compilation on any topic',
    icon: ResearchIcon,
    color: 'primary',
    fields: [
      { name: 'topic', label: 'Research Topic', type: 'text', required: true, multiline: true },
      { name: 'depth', label: 'Depth', type: 'select', options: ['quick', 'standard', 'comprehensive', 'exhaustive'], default: 'comprehensive' },
      { name: 'maxSections', label: 'Max Sections', type: 'number', default: 5, min: 1, max: 10 },
    ],
  },
  {
    type: 'data_analyst',
    name: 'Data Analyst',
    description: 'Analyze data and answer questions with insights',
    icon: DataIcon,
    color: 'info',
    fields: [
      { name: 'question', label: 'What do you want to know?', type: 'text', required: true, multiline: true, placeholder: 'e.g., What are the top 5 products by revenue? Which month had the highest sales?' },
      { name: 'dataSource', label: 'Data Source', type: 'select', options: ['paste_spreadsheet', 'sample_sales', 'sample_inventory', 'custom_json'], default: 'paste_spreadsheet' },
      { name: 'data', label: 'Paste your data here (from Excel or Google Sheets)', type: 'spreadsheet', required: true, multiline: true, rows: 8, placeholder: 'Tip: Copy cells from Excel or Google Sheets and paste here. We\'ll convert it automatically!' },
    ],
  },
  {
    type: 'email_draft',
    name: 'Email Draft',
    description: 'Compose professional emails based on context',
    icon: EmailIcon,
    color: 'warning',
    fields: [
      { name: 'context', label: 'Context', type: 'text', required: true, multiline: true },
      { name: 'purpose', label: 'Purpose', type: 'text', required: true },
      { name: 'tone', label: 'Tone', type: 'select', options: ['professional', 'friendly', 'formal', 'casual'], default: 'professional' },
      { name: 'recipientInfo', label: 'Recipient Info', type: 'text' },
    ],
  },
  {
    type: 'content_repurpose',
    name: 'Content Repurpose',
    description: 'Transform content into multiple formats',
    icon: ContentIcon,
    color: 'secondary',
    fields: [
      { name: 'content', label: 'Original Content', type: 'text', required: true, multiline: true, rows: 6 },
      { name: 'sourceFormat', label: 'Source Format', type: 'select', options: ['blog', 'article', 'report', 'notes', 'transcript'], default: 'blog' },
      { name: 'targetFormats', label: 'Target Formats', type: 'multiselect', options: ['tweet_thread', 'linkedin_post', 'blog_summary', 'slides', 'email_newsletter', 'video_script'] },
    ],
  },
  {
    type: 'proofreading',
    name: 'Proofreading',
    description: 'Grammar, style, and clarity improvements',
    icon: ProofreadIcon,
    color: 'success',
    fields: [
      { name: 'text', label: 'Text to Proofread', type: 'text', required: true, multiline: true, rows: 8 },
      { name: 'styleGuide', label: 'Style Guide', type: 'select', options: ['AP', 'Chicago', 'MLA', 'APA', 'None'], default: 'None' },
    ],
  },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AgentsPageContainer() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    tasks,
    currentTask,
    agentTypes,
    repurposeFormats,
    loading,
    executing,
    error,
    runResearch,
    runDataAnalysis,
    runEmailDraft,
    runContentRepurpose,
    runProofreading,
    fetchTasks,
    fetchAgentTypes,
    fetchRepurposeFormats,
    reset,
  } = useAgentStore()

  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0])
  const [formData, setFormData] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchAgentTypes()
    fetchRepurposeFormats()
    fetchTasks()
    return () => reset()
  }, [fetchAgentTypes, fetchRepurposeFormats, fetchTasks, reset])

  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent)
    setFormData({})
    setResult(null)
  }, [])

  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }, [])

  const handleRun = useCallback(async () => {
    if (!selectedAgent) return

    const runAction = async () => {
      let taskResult = null

      switch (selectedAgent.type) {
        case 'research':
          taskResult = await runResearch(formData.topic, {
            depth: formData.depth || 'comprehensive',
            maxSections: formData.maxSections || 5,
          })
          break
        case 'data_analyst':
          try {
            let data
            const dataSource = formData.dataSource || 'paste_spreadsheet'

            // Handle different data sources
            if (dataSource === 'sample_sales') {
              data = [
                { product: 'Widget A', revenue: 15000, units: 300, month: 'January' },
                { product: 'Widget B', revenue: 22000, units: 440, month: 'January' },
                { product: 'Widget A', revenue: 18000, units: 360, month: 'February' },
                { product: 'Widget B', revenue: 25000, units: 500, month: 'February' },
                { product: 'Widget C', revenue: 12000, units: 200, month: 'February' },
              ]
            } else if (dataSource === 'sample_inventory') {
              data = [
                { item: 'SKU-001', stock: 150, reorder_point: 50, supplier: 'Acme Corp' },
                { item: 'SKU-002', stock: 25, reorder_point: 30, supplier: 'Beta Inc' },
                { item: 'SKU-003', stock: 200, reorder_point: 75, supplier: 'Acme Corp' },
                { item: 'SKU-004', stock: 10, reorder_point: 20, supplier: 'Gamma Ltd' },
              ]
            } else if (dataSource === 'custom_json') {
              // User provided raw JSON
              data = JSON.parse(formData.data)
            } else {
              // paste_spreadsheet - parse tab/comma separated values
              const rawData = formData.data || ''
              const lines = rawData.trim().split('\n')
              if (lines.length < 2) {
                toast.show('Please paste data with at least a header row and one data row', 'warning')
                return null
              }
              // Detect delimiter (tab or comma)
              const delimiter = lines[0].includes('\t') ? '\t' : ','
              const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
              data = lines.slice(1).map(line => {
                const values = line.split(delimiter).map(v => {
                  const trimmed = v.trim().replace(/^["']|["']$/g, '')
                  // Try to parse as number
                  const num = parseFloat(trimmed)
                  return isNaN(num) ? trimmed : num
                })
                const row = {}
                headers.forEach((header, i) => {
                  row[header] = values[i] ?? ''
                })
                return row
              }).filter(row => Object.values(row).some(v => v !== ''))
            }

            if (!data || !data.length) {
              toast.show('No valid data found. Please check your input.', 'warning')
              return null
            }

            taskResult = await runDataAnalysis(formData.question, data)
          } catch (parseError) {
            toast.show('Could not parse data. For custom JSON, ensure it\'s valid JSON format.', 'error')
            return null
          }
          break
        case 'email_draft':
          taskResult = await runEmailDraft(formData.context, formData.purpose, {
            tone: formData.tone || 'professional',
            recipientInfo: formData.recipientInfo,
          })
          break
        case 'content_repurpose':
          taskResult = await runContentRepurpose(
            formData.content,
            formData.sourceFormat || 'blog',
            formData.targetFormats || ['blog_summary'],
          )
          break
        case 'proofreading':
          taskResult = await runProofreading(formData.text, {
            styleGuide: formData.styleGuide !== 'None' ? formData.styleGuide : null,
          })
          break
        default:
          break
      }

      if (taskResult) {
        setResult(taskResult)
        toast.show('Agent completed successfully', 'success')
      }
      return taskResult
    }

    return execute({
      type: InteractionType.EXECUTE,
      label: `Run ${selectedAgent.name}`,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      intent: { source: 'agents', agentType: selectedAgent.type },
      action: runAction,
    })
  }, [execute, formData, runContentRepurpose, runDataAnalysis, runEmailDraft, runProofreading, runResearch, selectedAgent, toast])

  const handleCopyResult = useCallback(() => {
    if (result?.output) {
      navigator.clipboard.writeText(typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2))
      toast.show('Copied to clipboard', 'success')
    }
  }, [result, toast])

  const handleToggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
  }, [])

  const isFormValid = () => {
    if (!selectedAgent) return false
    return selectedAgent.fields
      .filter((f) => f.required)
      .every((f) => formData[f.name]?.toString().trim())
  }

  return (
    <PageContainer>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AgentIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                AI Agents
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Specialized AI agents for research, analysis, writing, and more
              </Typography>
            </Box>
          </Box>
          <ActionButton
            startIcon={<HistoryIcon />}
            onClick={handleToggleHistory}
            variant={showHistory ? 'contained' : 'outlined'}
          >
            History ({tasks.length})
          </ActionButton>
        </Box>
      </Header>

      <ContentArea>
        <MainPanel>
          {/* Agent Selection */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Select Agent
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {AGENTS.map((agent) => (
              <Grid item xs={12} sm={6} md={4} key={agent.type}>
                <AgentCard
                  selected={selectedAgent?.type === agent.type}
                  onClick={() => handleSelectAgent(agent)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette[agent.color].main, 0.1),
                        }}
                      >
                        <agent.icon color={agent.color} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {agent.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {agent.description}
                    </Typography>
                  </CardContent>
                </AgentCard>
              </Grid>
            ))}
          </Grid>

          {/* Agent Form */}
          {selectedAgent && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                {selectedAgent.name} Configuration
              </Typography>
              <Paper sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {selectedAgent.fields.map((field) => {
                    // For data_analyst, hide data field if using sample data
                    if (selectedAgent.type === 'data_analyst' && field.name === 'data') {
                      const dataSource = formData.dataSource || 'paste_spreadsheet'
                      if (dataSource === 'sample_sales' || dataSource === 'sample_inventory') {
                        return (
                          <Grid item xs={12} key={field.name}>
                            <Alert severity="info" sx={{ mt: 1 }}>
                              Using sample {dataSource === 'sample_sales' ? 'sales' : 'inventory'} data. Just enter your question above!
                            </Alert>
                          </Grid>
                        )
                      }
                    }

                    return (
                      <Grid item xs={12} md={field.multiline ? 12 : 6} key={field.name}>
                        {field.type === 'select' ? (
                          <FormControl fullWidth>
                            <InputLabel>{field.label}</InputLabel>
                            <Select
                              value={formData[field.name] || field.default || ''}
                              label={field.label}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            >
                              {field.options.map((opt) => {
                                // More user-friendly labels for data source options
                                let label = opt.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                                if (opt === 'paste_spreadsheet') label = 'Paste from Spreadsheet (Recommended)'
                                if (opt === 'sample_sales') label = 'Use Sample Sales Data'
                                if (opt === 'sample_inventory') label = 'Use Sample Inventory Data'
                                if (opt === 'custom_json') label = 'Enter Raw JSON (Advanced)'
                                return (
                                  <MenuItem key={opt} value={opt}>
                                    {label}
                                  </MenuItem>
                                )
                              })}
                            </Select>
                          </FormControl>
                        ) : field.type === 'multiselect' ? (
                          <FormControl fullWidth>
                            <InputLabel>{field.label}</InputLabel>
                            <Select
                              multiple
                              value={formData[field.name] || []}
                              label={field.label}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value.replace(/_/g, ' ')} size="small" />
                                  ))}
                                </Box>
                              )}
                            >
                              {field.options.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                  {opt.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : field.type === 'number' ? (
                          <TextField
                            fullWidth
                            type="number"
                            label={field.label}
                            value={formData[field.name] ?? field.default ?? ''}
                            onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
                            inputProps={{ min: field.min, max: field.max }}
                            required={field.required}
                          />
                        ) : field.type === 'spreadsheet' ? (
                          <TextField
                            fullWidth
                            label={formData.dataSource === 'custom_json' ? 'JSON Data' : field.label}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            multiline
                            rows={field.rows || 4}
                            required={field.required}
                            placeholder={formData.dataSource === 'custom_json'
                              ? '[{"name": "John", "value": 100}, {"name": "Jane", "value": 200}]'
                              : field.placeholder || 'Copy from Excel/Sheets and paste here...'}
                            helperText={formData.dataSource === 'custom_json'
                              ? 'Enter valid JSON array of objects'
                              : 'Supports tab-separated (Excel) or comma-separated (CSV) data'}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            label={field.label}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            multiline={field.multiline}
                            rows={field.rows || 4}
                            required={field.required}
                            placeholder={field.placeholder}
                          />
                        )}
                      </Grid>
                    )
                  })}
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <ActionButton
                    variant="contained"
                    size="large"
                    startIcon={executing ? <CircularProgress size={20} color="inherit" /> : <RunIcon />}
                    onClick={handleRun}
                    disabled={!isFormValid() || executing}
                  >
                    {executing ? 'Running...' : `Run ${selectedAgent.name}`}
                  </ActionButton>
                </Box>
              </Paper>

              {/* Result */}
              {result && (
                <ResultCard>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Result
                    </Typography>
                    <Box>
                      <IconButton size="small" onClick={handleCopyResult}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      p: 2,
                      borderRadius: 1,
                      maxHeight: 400,
                      overflow: 'auto',
                    }}
                  >
                    {typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}
                  </Typography>
                </ResultCard>
              )}
            </>
          )}
        </MainPanel>

        {/* History Sidebar */}
        {showHistory && (
          <Sidebar>
            <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Task History
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {tasks.length > 0 ? (
                <List>
                  {tasks.map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemText
                        primary={task.agent_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        secondary={
                          <>
                            <Chip
                              size="small"
                              label={task.status}
                              color={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'default'}
                              sx={{ mr: 1 }}
                            />
                            {new Date(task.created_at).toLocaleString()}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No tasks yet</Typography>
                </Box>
              )}
            </Box>
          </Sidebar>
        )}
      </ContentArea>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
    </PageContainer>
  )
}
