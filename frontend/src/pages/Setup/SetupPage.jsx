import { Box, Typography, Stack, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArticleIcon from '@mui/icons-material/Article'
import ConnectDB from './ConnectDB'
import UploadVerify from './UploadVerify'
import TemplatesPane from './TemplatesPane.jsx'
import { useAppStore } from '../../store/useAppStore'
import HeartbeatBadge from '../../components/HeartbeatBadge.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'

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
    connection,          // UI status (badge)
    activeConnection,    // { connection_id, normalized, ... } ← ensure ConnectDB sets this after /connections/test
    addDownload,         // used by TemplatesPane when a run completes
  } = useAppStore()

  const toast = useToast()

  // pass API base so the pane can build absolute URLs
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'')
  // pass just the id (TemplatesPane should guard if falsy)
  const connectionId = activeConnection?.connection_id || null

  return (
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
          <NavItem icon={<AutoAwesomeIcon fontSize="small" />} label="Generate Templates" active={setupNav === 'generate'} onClick={() => setSetupNav('generate')} />
          <NavItem icon={<ArticleIcon fontSize="small" />} label="Generate Report" active={setupNav === 'templates'} onClick={() => setSetupNav('templates')} />
        </List>
        <Divider />
        <Stack spacing={1}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Connection</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <HeartbeatBadge
              status={connection.status === 'connected' ? 'healthy' : (connection.status === 'failed' ? 'unreachable' : 'unknown')}
              withText
              size="small"
              tooltip={connection.lastMessage || ''}
            />
            {connection.name && (
              <Typography variant="body2" color="text.secondary" noWrap>{connection.name}</Typography>
            )}
          </Stack>
        </Stack>
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
  )
}

