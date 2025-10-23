import { Box, Typography, Stack, List, ListItemButton, ListItemIcon, ListItemText, Chip } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArticleIcon from '@mui/icons-material/Article'
import ConnectDB from './ConnectDB'
import UploadVerify from './UploadVerify'
import TemplatesPane from './TemplatesPane.jsx'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import PageHeader from '../../components/layout/PageHeader.jsx'

const NavItem = ({ icon, label, active, onClick }) => (
  <ListItemButton
    selected={active}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    role="tab"
    aria-selected={active}
    sx={{
      color: 'text.primary',
      borderRadius: 1,
      px: 2,
      py: 1.5,
      gap: 1.5,
      alignItems: 'center',
      minHeight: 48,
      transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
      '&.Mui-selected': {
        bgcolor: 'primary.main !important',
        color: 'primary.contrastText !important',
        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
        transform: 'translateX(4px)',
        '& .MuiListItemIcon-root': {
          color: 'inherit',
        },
        '& .MuiListItemText-primary': {
          color: 'inherit',
        },
      },
      '&:hover': {
        bgcolor: active ? 'primary.main' : 'action.hover',
      },
    }}
  >
    <ListItemIcon
      sx={{
        minWidth: 32,
        color: active ? 'primary.contrastText' : 'text.secondary',
        transition: 'color 160ms ease',
      }}
    >
      {icon}
    </ListItemIcon>
    <ListItemText
      primaryTypographyProps={{ fontWeight: active ? 700 : 500, sx: { color: 'inherit' } }}
      primary={label}
    />
  </ListItemButton>
)

export default function SetupPage() {
  // pull everything the pane will need from the store
  const {
    setupNav, setSetupNav,
    activeConnection,    // { connection_id, normalized, ... } ← ensure ConnectDB sets this after /connections/test
    addDownload,         // used by TemplatesPane when a run completes
  } = useAppStore()

  const toast = useToast()

  // pass API base so the pane can build absolute URLs
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'')
  // pass just the id (TemplatesPane should guard if falsy)
  const connectionId = activeConnection?.connection_id || null

  const setupProgress = [
    { key: 'connect', label: 'Connect', active: setupNav === 'connect' },
    { key: 'generate', label: 'Upload & Verify', active: setupNav === 'generate' },
    { key: 'templates', label: 'Run Reports', active: setupNav === 'templates' },
  ]

  const sectionSummaries = {
    connect: [
      'Add a new database or pick an existing one, then choose its engine (Postgres, MySQL, SQL Server, or SQLite).',
      'Fill in host, database, and credential details and run Test Connection until it succeeds.',
      'Save the connection and click Select Connection so this data source becomes the active one for the rest of the setup.',
    ],
    generate: [
      'Drop in a PDF or Excel template, keep the intended data source selected, then hit Verify Template to generate the photocopy preview.',
      'Open Review Mapping, work through each token, inspect its requirements, bind it to the appropriate mapping in the dropdown, and provide SQL expressions if needed.',
      'Before approval, supply correction notes in the Preview dialog and verify the template looks right. Then provide narrative instructions if prompted and run Approve Template.',
    ],
    templates: [
      'Choose one or more approved templates and, if needed, filter them by tags or name.',
      'Set the start and end date, fill in any required key token values, and click Find Reports to confirm which batches are available.',
      'Run Reports to generate output, monitor progress, and download the PDF or HTML canvases once each run finishes.',
    ],
  }

  const sectionHeadings = {
    connect: 'Connect Your Data Source',
    generate: 'Upload & Verify Templates',
    templates: 'Run & Download Reports',
  }

  const activeSummary = sectionSummaries[setupNav] || [
    'Select a setup step to view the focused checklist for that part of the pipeline.',
  ]
  const activeHeading = sectionHeadings[setupNav] || 'Get Started'

  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <PageHeader
        title={activeHeading}
        description={null}
        disablePadding
        sx={{ pb: { xs: 0.5, sm: 0.75 } }}>
        <Stack spacing={2} sx={{ width: '100%' }}>
          <Box
            component="section"
            aria-label="Step instructions"
            sx={{ color: 'text.secondary' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              What to do in this step
            </Typography>
            <Box
              component="ol"
              sx={{
                mt: 0.75,
                pl: 3,
                display: 'grid',
                gap: 0.5,
              }}
            >
              {activeSummary.map((item, index) => (
                <Typography
                  key={`${setupNav || 'setup'}-summary-${index}`}
                  component="li"
                  variant="body2"
                  sx={{ display: 'list-item', color: 'text.secondary' }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" aria-label="Setup progress">
            {setupProgress.map((step) => (
              <Chip
                key={step.key}
                label={step.label}
                variant={step.active ? 'filled' : 'outlined'}
                color={step.active ? 'primary' : 'default'}
                size="small"
                sx={{ fontWeight: step.active ? 600 : 500 }}
              />
            ))}
          </Stack>
        </Stack>
      </PageHeader>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 4 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) minmax(0, 2.5fr)' },
          alignItems: 'flex-start',
        }}
      >
        <Surface
          component="nav"
          aria-label="Setup navigation"
          sx={{
            position: { sm: 'sticky' },
            top: { sm: 32 },
            alignSelf: 'flex-start',
            gap: 3,
          }}
        >
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Setup</Typography>
          <List dense disablePadding role="tablist" aria-label="Setup flow" sx={{ display: 'grid', gap: 1 }}>
            <NavItem icon={<StorageIcon fontSize="small" />} label="Connect" active={setupNav === 'connect'} onClick={() => setSetupNav('connect')} />
            <NavItem icon={<AutoAwesomeIcon fontSize="small" />} label="Upload & Verify" active={setupNav === 'generate'} onClick={() => setSetupNav('generate')} />
            <NavItem icon={<ArticleIcon fontSize="small" />} label="Run Reports" active={setupNav === 'templates'} onClick={() => setSetupNav('templates')} />
          </List>
        </Surface>

        <Box sx={{ minWidth: 0, display: 'grid', gap: { xs: 2.5, md: 3 } }}>
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
        </Box>
      </Box>
    </Stack>
  )
}









