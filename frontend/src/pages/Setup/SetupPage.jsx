import { useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Collapse,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArticleIcon from '@mui/icons-material/Article'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ConnectDB from './ConnectDB'
import UploadVerify from './UploadVerify'
import TemplatesPane from './TemplatesPane.jsx'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import ReportGlossaryNotice from '../../components/ux/ReportGlossaryNotice.jsx'

export default function SetupPage() {
  const setupNav = useAppStore((state) => state.setupNav)
  const setSetupNav = useAppStore((state) => state.setSetupNav)
  const activeConnection = useAppStore((state) => state.activeConnection)
  const addDownload = useAppStore((state) => state.addDownload)
  const templates = useAppStore((state) => state.templates)

  const toast = useToast()

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'')
  const connectionId = activeConnection?.connection_id || null

  // Track completion status
  const hasConnection = !!connectionId
  const hasTemplates = templates?.length > 0

  const setupSteps = [
    {
      key: 'connect',
      label: 'Connect',
      fullLabel: 'Connect Data Source',
      icon: <StorageIcon fontSize="small" />,
      completed: hasConnection,
    },
    {
      key: 'generate',
      label: 'Designs',
      fullLabel: 'Upload Report Designs',
      icon: <AutoAwesomeIcon fontSize="small" />,
      completed: hasTemplates,
    },
    {
      key: 'templates',
      label: 'Run',
      fullLabel: 'Run Reports',
      icon: <ArticleIcon fontSize="small" />,
      completed: false,
    },
  ]

  const sectionInfo = {
    connect: {
      title: 'Connect Your Data Source',
      description: 'Configure a data source so reports can pull data safely.',
      steps: [
        'Choose the database engine you need',
        'Enter connection details and test the connection',
        'Save and select the active data source for reports',
      ],
    },
    generate: {
      title: 'Upload & Verify Report Designs',
      description: 'Upload PDF or Excel designs and map fields.',
      steps: [
        'Drop a design file and generate a preview',
        'Match each field to a data column',
        'Approve the design when mappings are complete',
      ],
    },
    templates: {
      title: 'Run Reports',
      description: 'Select report designs, configure parameters, and run reports.',
      steps: [
        'Choose one or more approved designs',
        'Set date range and required parameters',
        'Click Run Reports and download the generated output',
      ],
    },
  }

  const currentSection = sectionInfo[setupNav] || sectionInfo.connect
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <Box sx={{ py: 3, px: 3 }}>
      {/* Page Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect data, upload report designs, and run your first report.
          </Typography>
        </Box>
        {hasConnection && (
          <Chip
            size="small"
            label={activeConnection?.name || 'Connected'}
            color="success"
            variant="outlined"
          />
        )}
      </Stack>

      <Stack spacing={3}>
        <ReportGlossaryNotice />
        {/* Step Navigation Tabs */}
        <Surface sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <ToggleButtonGroup
              value={setupNav}
              exclusive
              onChange={(e, val) => val && setSetupNav(val)}
              aria-label="Setup steps"
              size="small"
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 0.5,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: 1.5,
                  px: 2,
                  py: 0.75,
                  textTransform: 'none',
                  fontWeight: 500,
                  gap: 1,
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    fontWeight: 600,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    '&:hover': {
                      bgcolor: 'background.paper',
                    },
                  },
                },
              }}
            >
              {setupSteps.map((step, idx) => (
                <ToggleButton key={step.key} value={step.key}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: step.completed ? 'success.main' : 'action.selected',
                      color: step.completed ? 'success.contrastText' : 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {step.completed ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : idx + 1}
                  </Box>
                  <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    {step.label}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* Status Chips */}
              <Chip
                size="small"
                label={hasConnection ? 'Data source connected' : 'No data source'}
                color={hasConnection ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${templates?.length || 0} designs`}
                color={hasTemplates ? 'success' : 'default'}
                variant="outlined"
              />
              <Button
                size="small"
                variant="text"
                onClick={() => setDetailsOpen((prev) => !prev)}
                startIcon={<InfoOutlinedIcon />}
                sx={{ textTransform: 'none', fontWeight: 500, ml: 1 }}
              >
                {detailsOpen ? 'Hide' : 'Tips'}
              </Button>
            </Stack>
          </Stack>

          {/* Section Description */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {currentSection.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentSection.description}
            </Typography>
          </Box>

          {/* Collapsible Tips */}
          <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                borderRadius: 2,
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Steps for this section:
              </Typography>
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                {currentSection.steps.map((step, idx) => (
                  <Typography
                    key={idx}
                    component="li"
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    {step}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Collapse>
        </Surface>

        {/* Connection Required Warning */}
        {setupNav !== 'connect' && !hasConnection && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setSetupNav('connect')}
              >
                Go to Connect
              </Button>
            }
          >
            Please connect to a database first to use this feature.
          </Alert>
        )}

        {/* Tab Content */}
        {setupNav === 'connect' && <ConnectDB />}

        {setupNav === 'generate' && <UploadVerify />}

        {setupNav === 'templates' && (
          <TemplatesPane
            apiBase={apiBase}
            connectionId={connectionId}
            notify={(msg, sev = 'info') => toast.show(msg, sev)}
            onAddDownload={(d) => addDownload(d)}
            disabled={!apiBase || !connectionId}
          />
        )}
      </Stack>
    </Box>
  )
}
