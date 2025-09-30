import { Box, Grid, Paper, Typography, Stack, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArticleIcon from '@mui/icons-material/Article'
import ConnectDB from './ConnectDB'
import UploadVerify from './UploadVerify'
import TemplatesPane from './TemplatesPane.jsx'
import { useAppStore } from '../../store/useAppStore'
import HeartbeatBadge from '../../components/HeartbeatBadge.jsx'
import { useToast } from '../../components/ToastProvider.jsx'

const NavItem = ({ icon, label, active, onClick }) => (
  <ListItemButton selected={active} onClick={onClick} sx={{ borderRadius: 1 }}>
    <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
    <ListItemText primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} primary={label} />
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
    <Grid container spacing={2} alignItems="flex-start">
      <Grid item xs={12} sm={4} md={3}>
        <Paper variant="outlined" sx={{ p: 2, position: { sm: 'sticky' }, top: { sm: 16 } }}>
          <Typography variant="overline" sx={{ mb: 1, color: 'text.secondary', letterSpacing: '0.08em' }}>Setup</Typography>
          <List dense sx={{ mb: 1 }}>
            <NavItem icon={<StorageIcon fontSize="small" />} label="Connect" active={setupNav === 'connect'} onClick={() => setSetupNav('connect')} />
            <NavItem icon={<AutoAwesomeIcon fontSize="small" />} label="Generate Templates" active={setupNav === 'generate'} onClick={() => setSetupNav('generate')} />
            <NavItem icon={<ArticleIcon fontSize="small" />} label="Generate Report" active={setupNav === 'templates'} onClick={() => setSetupNav('templates')} />
          </List>
          <Divider sx={{ my: 1 }} />
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
        </Paper>
      </Grid>

      <Grid item xs={12} sm={8} md={9} sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {setupNav === 'connect' && <ConnectDB />}

          {setupNav === 'generate' && <UploadVerify />}

          {setupNav === 'templates' && (
            <TemplatesPane
              /* === new props so the pane can talk to the backend === */
              apiBase={apiBase}                     // e.g. http://localhost:8000
              connectionId={connectionId}           // from Connect step → /connections/test
              notify={(msg, sev='info') => toast.show(msg, sev)}   // use existing Toast provider
              onAddDownload={(d) => addDownload(d)} // add to “Recently Downloaded” after a run
              /* optional: hand down feature flags if you need to gate buttons */
              disabled={!apiBase || !connectionId}
            />
          )}
        </Box>
      </Grid>
    </Grid>
  )
}
