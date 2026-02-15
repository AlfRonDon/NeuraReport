/**
 * Visualization Page Container
 * Diagram and chart generation interface.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { sanitizeSVG } from '@/utils/sanitize'
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  AccountTree as FlowchartIcon,
  Hub as MindmapIcon,
  Groups as OrgChartIcon,
  Timeline as TimelineIcon,
  ViewKanban as KanbanIcon,
  BubbleChart as NetworkIcon,
  FormatListNumbered as GanttIcon,
  SwapVert as SequenceIcon,
  Cloud as WordcloudIcon,
  BarChart as ChartIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material'
import useVisualizationStore from '@/stores/visualizationStore'
import useSharedData from '@/hooks/useSharedData'
import useCrossPageActions from '@/hooks/useCrossPageActions'
import ConnectionSelector from '@/components/common/ConnectionSelector'
import SendToMenu from '@/components/common/SendToMenu'
import { OutputType, FeatureKey } from '@/utils/crossPageTypes'
import { useToast } from '@/components/ToastProvider'
import { useInteraction, InteractionType, Reversibility } from '@/components/ux/governance'
import { figmaGrey } from '@/app/theme'

// =============================================================================
// SANITIZATION HELPERS
// =============================================================================

const sanitizeSvg = (svg) => {
  if (!svg) return ''
  // Remove script tags, event handlers, and foreignObject
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
}

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

const Sidebar = styled(Box)(({ theme }) => ({
  width: 300,
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  padding: theme.spacing(2),
  overflow: 'auto',
}))

const PreviewArea = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.background.default,
  overflow: 'auto',
}))

const DiagramTypeCard = styled(Card)(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginBottom: theme.spacing(1),
  border: selected ? `2px solid ${theme.palette.mode === 'dark' ? figmaGrey[1000] : figmaGrey[1100]}` : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : figmaGrey[200],
  },
}))

const PreviewCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '100%',
  maxHeight: '70vh',
  overflow: 'auto',
  backgroundColor: theme.palette.background.paper,
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
}))

// =============================================================================
// DIAGRAM TYPES
// =============================================================================

const DIAGRAM_TYPES = [
  { type: 'flowchart', name: 'Flowchart', description: 'Process and decision flows', icon: FlowchartIcon, color: 'primary' },
  { type: 'mindmap', name: 'Mind Map', description: 'Hierarchical idea mapping', icon: MindmapIcon, color: 'secondary' },
  { type: 'org_chart', name: 'Org Chart', description: 'Organizational structure', icon: OrgChartIcon, color: 'info' },
  { type: 'timeline', name: 'Timeline', description: 'Chronological events', icon: TimelineIcon, color: 'warning' },
  { type: 'gantt', name: 'Gantt Chart', description: 'Project scheduling', icon: GanttIcon, color: 'success' },
  { type: 'kanban', name: 'Kanban Board', description: 'Task management', icon: KanbanIcon, color: 'error' },
  { type: 'network', name: 'Network Graph', description: 'Connections and relationships', icon: NetworkIcon, color: 'primary' },
  { type: 'sequence', name: 'Sequence Diagram', description: 'Process interactions', icon: SequenceIcon, color: 'secondary' },
  { type: 'wordcloud', name: 'Word Cloud', description: 'Text frequency visualization', icon: WordcloudIcon, color: 'info' },
]

// Sample data for each diagram type
const SAMPLE_DATA = {
  flowchart: `Start Application
Validate Input
Check Database?
Process Request
Return Response
End`,
  mindmap: `Product Strategy
  Market Research
    Competitor Analysis
    Customer Interviews
  Product Development
    Feature Planning
    Technical Design
  Go-to-Market
    Pricing Strategy
    Launch Campaign`,
  org_chart: `[
  {"name": "Sarah Chen", "role": "CEO", "id": "ceo"},
  {"name": "John Smith", "role": "CTO", "reports_to": "ceo", "id": "cto"},
  {"name": "Lisa Wong", "role": "CFO", "reports_to": "ceo", "id": "cfo"},
  {"name": "Mike Johnson", "role": "VP Engineering", "reports_to": "cto", "id": "vp-eng"},
  {"name": "Amy Liu", "role": "VP Finance", "reports_to": "cfo", "id": "vp-fin"}
]`,
  timeline: `2023-01: Project Kickoff
2023-03: Requirements Complete
2023-06: Design Phase Complete
2023-09: Development Complete
2023-11: Beta Launch
2024-01: Public Release`,
  gantt: `[
  {"id": "design", "name": "Design Phase", "start": "2024-01-01", "end": "2024-01-31", "progress": 100},
  {"id": "dev", "name": "Development", "start": "2024-02-01", "end": "2024-04-15", "progress": 60, "dependencies": ["design"]},
  {"id": "test", "name": "Testing", "start": "2024-04-01", "end": "2024-05-01", "progress": 20, "dependencies": ["dev"]},
  {"id": "launch", "name": "Launch", "start": "2024-05-01", "end": "2024-05-15", "progress": 0, "dependencies": ["test"]}
]`,
  kanban: `To Do: Research competitors
To Do: Define user personas
In Progress: Design landing page
In Progress: Set up analytics
Review: API documentation
Done: Project kickoff
Done: Team onboarding`,
  network: `Marketing -> Sales
Sales -> Support
Support -> Product
Product -> Engineering
Engineering -> QA
QA -> Product
Marketing -> Product`,
  sequence: `User -> Frontend: Click Login
Frontend -> Auth Service: POST /login
Auth Service -> Database: Query User
Database -> Auth Service: User Data
Auth Service -> Frontend: JWT Token
Frontend -> User: Redirect to Dashboard`,
  wordcloud: `innovation technology growth digital transformation customer experience data analytics cloud computing artificial intelligence machine learning automation efficiency productivity collaboration strategy innovation digital growth`,
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function VisualizationPageContainer() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    diagrams,
    currentDiagram,
    loading,
    generating,
    error,
    generateFlowchart,
    generateMindmap,
    generateOrgChart,
    generateTimeline,
    generateGantt,
    generateKanban,
    generateNetworkGraph,
    generateSequenceDiagram,
    generateWordcloud,
    exportAsMermaid,
    exportAsSvg,
    exportAsPng,
    reset,
  } = useVisualizationStore()

  const { connections, activeConnectionId } = useSharedData()
  const { registerOutput } = useCrossPageActions(FeatureKey.VISUALIZATION)
  const [selectedConnectionId, setSelectedConnectionId] = useState(activeConnectionId || '')

  const [selectedType, setSelectedType] = useState(DIAGRAM_TYPES[0])
  const [inputData, setInputData] = useState('')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState({})

  useEffect(() => {
    return () => reset()
  }, [reset])

  const getPlaceholder = () => {
    switch (selectedType.type) {
      case 'flowchart':
        return 'Enter steps separated by newlines:\nStart\nProcess Data\nDecision Point\nEnd'
      case 'mindmap':
        return 'Enter hierarchical data:\nMain Topic\n  Subtopic 1\n    Detail A\n  Subtopic 2'
      case 'org_chart':
        return 'Enter org structure (JSON):\n[{"name": "CEO", "children": [{"name": "CTO"}, {"name": "CFO"}]}]'
      case 'timeline':
        return 'Enter events (one per line):\n2020-01: Project Started\n2021-06: Phase 1 Complete\n2022-12: Launch'
      case 'gantt':
        return 'Enter tasks (JSON):\n[{"task": "Design", "start": "2024-01-01", "end": "2024-01-15"}]'
      case 'kanban':
        return 'Enter tasks with status:\nTodo: Task 1\nIn Progress: Task 2\nDone: Task 3'
      case 'network':
        return 'Enter connections:\nA -> B\nB -> C\nC -> A'
      case 'sequence':
        return 'Enter interactions:\nUser -> Server: Request\nServer -> Database: Query\nDatabase -> Server: Response'
      case 'wordcloud':
        return 'Enter text to analyze or word frequencies:\nword1 word2 word3\nor\n{"innovation": 50, "technology": 40, "growth": 30}'
      default:
        return 'Enter data...'
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!inputData.trim()) {
      toast.show('Please enter data', 'warning')
      return
    }

    const generateAction = async () => {
      let result = null
      const opts = { title, ...options }

      try {
        switch (selectedType.type) {
          case 'flowchart':
            result = await generateFlowchart({ steps: inputData.split('\n').filter(Boolean) }, opts)
            break
          case 'mindmap':
            result = await generateMindmap({ text: inputData }, opts)
            break
          case 'org_chart':
            result = await generateOrgChart(JSON.parse(inputData), opts)
            break
          case 'timeline':
            result = await generateTimeline({ events: inputData.split('\n').filter(Boolean) }, opts)
            break
          case 'gantt':
            result = await generateGantt(JSON.parse(inputData), opts)
            break
          case 'kanban':
            result = await generateKanban({ tasks: inputData }, opts)
            break
          case 'network':
            result = await generateNetworkGraph({ connections: inputData.split('\n').filter(Boolean) }, opts)
            break
          case 'sequence':
            result = await generateSequenceDiagram({ interactions: inputData.split('\n').filter(Boolean) }, opts)
            break
          case 'wordcloud':
            try {
              const parsed = JSON.parse(inputData)
              result = await generateWordcloud({ frequencies: parsed }, opts)
            } catch {
              result = await generateWordcloud({ text: inputData }, opts)
            }
            break
          default:
            break
        }

        if (result) {
          registerOutput({
            type: OutputType.DIAGRAM,
            title: `${selectedType.name}: ${title || 'Untitled'}`,
            summary: `${selectedType.name} diagram`,
            data: { id: result.id, svg: result.svg, mermaid: result.mermaid_code, content: result.content },
            format: 'diagram',
          })
          toast.show('Diagram generated', 'success')
        }
        return result
      } catch (err) {
        toast.show(`Error: ${err.message}`, 'error')
        throw err
      }
    }

    return execute({
      type: InteractionType.CREATE,
      label: `Generate ${selectedType.name}`,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      intent: { source: 'visualization', type: selectedType.type },
      action: generateAction,
    })
  }, [execute, generateFlowchart, generateGantt, generateKanban, generateMindmap, generateNetworkGraph, generateOrgChart, generateSequenceDiagram, generateTimeline, generateWordcloud, inputData, options, selectedType, title, toast])

  const handleExport = useCallback(async (format) => {
    if (!currentDiagram?.id) return

    let result
    switch (format) {
      case 'mermaid':
        result = await exportAsMermaid(currentDiagram.id)
        if (result) {
          navigator.clipboard.writeText(result.code)
          toast.show('Mermaid code copied', 'success')
        }
        break
      case 'svg':
        result = await exportAsSvg(currentDiagram.id)
        break
      case 'png':
        result = await exportAsPng(currentDiagram.id)
        if (result) {
          const url = URL.createObjectURL(result)
          const a = document.createElement('a')
          a.href = url
          a.download = `${title || 'diagram'}.png`
          a.click()
          URL.revokeObjectURL(url)
          toast.show('PNG downloaded', 'success')
        }
        break
      default:
        break
    }
  }, [currentDiagram?.id, exportAsMermaid, exportAsPng, exportAsSvg, title, toast])

  return (
    <PageContainer>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ChartIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Visualization Studio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate diagrams, charts, and visualizations
              </Typography>
            </Box>
          </Box>
          {currentDiagram && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <SendToMenu
                outputType={OutputType.DIAGRAM}
                payload={{
                  title: `${selectedType.name}: ${title || 'Diagram'}`,
                  data: { id: currentDiagram.id, svg: currentDiagram.svg, mermaid: currentDiagram.mermaid_code },
                }}
                sourceFeature={FeatureKey.VISUALIZATION}
              />
              <Tooltip title="Copy Mermaid Code">
                <IconButton onClick={() => handleExport('mermaid')}>
                  <CodeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PNG">
                <IconButton onClick={() => handleExport('png')}>
                  <ImageIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Header>

      <ContentArea>
        {/* Sidebar - Diagram Types & Input */}
        <Sidebar>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Diagram Type
          </Typography>
          {DIAGRAM_TYPES.map((type) => (
            <DiagramTypeCard
              key={type.type}
              selected={selectedType.type === type.type}
              onClick={() => {
                setSelectedType(type)
                setInputData('')
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette[type.color].main, 0.1),
                    }}
                  >
                    <type.icon color={type.color} fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {type.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </DiagramTypeCard>
          ))}

          {/* Input Section */}
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <ConnectionSelector
              value={selectedConnectionId}
              onChange={setSelectedConnectionId}
              label="Data Source"
              size="small"
              showStatus
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button
                size="small"
                onClick={() => {
                  setInputData(SAMPLE_DATA[selectedType.type] || '')
                  setTitle(`Sample ${selectedType.name}`)
                }}
                sx={{ textTransform: 'none' }}
              >
                Use Example Data
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Data Input"
              placeholder={getPlaceholder()}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              sx={{ mb: 2 }}
            />
            <ActionButton
              variant="contained"
              fullWidth
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PreviewIcon />}
              onClick={handleGenerate}
              disabled={!inputData.trim() || generating}
            >
              {generating ? 'Generating...' : 'Generate'}
            </ActionButton>
          </Box>
        </Sidebar>

        {/* Preview Area */}
        <PreviewArea>
          {currentDiagram ? (
            <PreviewCard elevation={2}>
              {currentDiagram.svg ? (
                <Box
                  dangerouslySetInnerHTML={{ __html: sanitizeSVG(currentDiagram.svg) }}
                  sx={{ '& svg': { maxWidth: '100%', height: 'auto' } }}
                />
              ) : currentDiagram.content ? (
                <Typography
                  component="pre"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                  {typeof currentDiagram.content === 'string'
                    ? currentDiagram.content
                    : JSON.stringify(currentDiagram.content, null, 2)}
                </Typography>
              ) : (
                <Typography color="text.secondary">Diagram preview</Typography>
              )}
            </PreviewCard>
          ) : (
            <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
              <ChartIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Create Your First Diagram
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a diagram type from the sidebar, enter your data, and click Generate.
                Not sure how to format your data?
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setInputData(SAMPLE_DATA[selectedType.type] || '')
                  setTitle(`Sample ${selectedType.name}`)
                }}
                sx={{ textTransform: 'none' }}
              >
                Try with Example Data
              </Button>
            </Box>
          )}
        </PreviewArea>
      </ContentArea>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
    </PageContainer>
  )
}
