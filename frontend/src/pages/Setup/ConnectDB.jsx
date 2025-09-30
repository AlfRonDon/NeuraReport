import { useEffect, useMemo, useState } from 'react'
import {
  Box, Paper, Stack, TextField, MenuItem, Button, Typography,
  Alert, InputAdornment, IconButton, Chip, Collapse, Table, TableHead,
  TableRow, TableCell, TableBody
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { isMock } from '../../api/client'
import * as mock from '../../api/mock'
import { useMutation } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import SpeedIcon from '@mui/icons-material/Speed'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useToast } from '../../components/ToastProvider.jsx'
import HeartbeatBadge from '../../components/HeartbeatBadge.jsx'

/** ---------- validation ---------- */
const portField = yup
  .number()
  .transform((v, o) => (o === '' || o == null ? undefined : v))
  .typeError('Port must be a number')
  .integer()
  .min(1)
  .max(65535)

const schema = yup.object({
  db_type: yup.string().required('Database type is required'),
  host: yup.string().when('db_type', {
    is: (t) => t !== 'sqlite',
    then: (f) => f.required('Host is required'),
    otherwise: (f) => f.optional(),
  }),
  port: portField.when('db_type', {
    is: (t) => t !== 'sqlite',
    then: (f) => f.required('Port is required'),
    otherwise: (f) => f.optional(),
  }),
  // NOTE: in *your* UI the SQLite path lives in "Database" field
  db_name: yup.string().when('db_type', {
    is: (t) => t === 'sqlite',
    then: (f) => f.required('Database path is required (SQLite)'),
    otherwise: (f) => f.required('Database is required'),
  }),
  username: yup.string().when('db_type', {
    is: (t) => t !== 'sqlite',
    then: (f) => f.required('Username is required'),
    otherwise: (f) => f.optional(),
  }),
  password: yup.string().when('db_type', {
    is: (t) => t !== 'sqlite',
    then: (f) => f.required('Password is required'),
    otherwise: (f) => f.optional(),
  }),
  ssl: yup.boolean().default(false),
}).required()

/** ---------- helpers ---------- */
const stripQuotes = (s) => (s || '').replace(/^["']|["']$/g, '')

/** Convert the form values into a normalized object with db_url (SQLite only for now). */
function normalizeConnection(values) {
  const type = (values.db_type || '').toLowerCase()
  if (!type) throw new Error('Select a database type')

  if (type !== 'sqlite') {
    // We only wire SQLite now; others later when drivers are added
    throw new Error('Only SQLite is supported right now')
  }

  const rawPath = stripQuotes((values.db_name || '').trim())
  if (!rawPath) throw new Error('Provide a path to the SQLite .db file')

  // Build a consistent db_url for the backend (and nice display name)
  const normalizedPath = rawPath.replace(/\\/g, '/').replace(/^\.\//, '')
  let db_url
  if (normalizedPath.startsWith('sqlite:')) {
    db_url = normalizedPath
  } else if (/^[a-zA-Z]:\//.test(normalizedPath)) {
    db_url = `sqlite:///${normalizedPath}`           // Windows absolute (C:/…)
  } else if (normalizedPath.startsWith('/')) {
    db_url = `sqlite://${normalizedPath}`            // POSIX absolute (/…)
  } else {
    db_url = `sqlite:///${normalizedPath}`           // relative → sqlite:///rel/path
  }
  const displayName = `sqlite@${rawPath}`
  return { db_type: 'sqlite', path: rawPath, db_url, displayName }
}

/** The payload format we’ll send to the backend. */
function payloadFromNormalized(n) {
  // New flexible shape (backend patch below): prefer db_url
  return n.db_url ? { db_url: n.db_url } : { db_type: n.db_type, database: n.path }
}

export default function ConnectDB() {
  const {
    connection,
    setConnection,
    setSetupStep,
    savedConnections,
    addSavedConnection,
    updateSavedConnection,
    removeSavedConnection,
    activeConnectionId,
    setActiveConnectionId,
  } = useAppStore()

  const toast = useToast()
  const [showPw, setShowPw] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmSelect, setConfirmSelect] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [rowHeartbeat, setRowHeartbeat] = useState({})
  const [lastLatencyMs, setLastLatencyMs] = useState(null)
  const [apiStatus, setApiStatus] = useState('unknown')
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { db_type: 'sqlite', host: '', port: '', db_name: '', username: '', password: '', ssl: false },
  })

  const dbType = watch('db_type')
  const isSQLite = dbType?.toLowerCase() === 'sqlite'

  /** ---- API health probe (uses real backend when not mock) ---- */
  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      try {
        if (isMock) {
          await mock.health()
        } else {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`)
          if (!res.ok) throw new Error()
        }
        if (!cancelled) setApiStatus('healthy')
      } catch {
        if (!cancelled) setApiStatus('unreachable')
      }
    }
    probe()
    const id = setInterval(probe, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  /** ---- Test Connection ---- */
  const mutation = useMutation({
    mutationFn: async (formValues) => {
      const normalized = normalizeConnection(formValues)
      const payload = payloadFromNormalized(normalized)

      if (isMock) {
        const response = await mock.testConnection(payload)
        return { normalized, response }
      }

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail || 'Connection failed')
      return {
        normalized,
        response: {
          ok: true,
          details: data.details || 'Connected',
          latencyMs: typeof data.latency_ms === 'number' ? data.latency_ms : undefined,
          connection_id: data.connection_id,                // server id
          normalized: data.normalized || undefined,
        }
      }
    },
    onSuccess: ({ normalized, response }) => {
      const now = new Date().toISOString()
      const lm = response.latencyMs ?? null

      setLastLatencyMs(lm)
      setConnection({
        status: 'connected',
        lastMessage: response.details,
        details: response.details,
        latencyMs: lm,
        db_url: normalized.db_url,
        name: normalized.displayName,
        lastCheckedAt: now,
        connectionId: response.connection_id,   // keep in connection state
        normalized: response.normalized,
        saved: false,
      })

      setActiveConnectionId(response.connection_id) // NEW: use backend connection_id
      setShowDetails(true)
      setSetupStep('generate')      // or 'upload' depending on your flow
      toast.show('Connection successful', 'success')
    },
    onError: (error) => {
      const detail = error?.message || 'Connection failed'
      setConnection({ status: 'failed', lastMessage: detail, details: detail })
      setShowDetails(true)
      toast.show(detail, 'error')
    },
  })

  const onSubmit = (values) => {
    // SQLite uses the Database field as path. Host/Port/User/Pass ignored.
    mutation.mutate(values)
  }

  /** ---- Row healthcheck for saved rows ---- */
  const handleRowTest = async (row) => {
    const now = new Date().toISOString()
    try {
      const normalized = row.db_url
        ? { db_type: row.db_type, path: row.host, db_url: row.db_url }
        : normalizeConnection({ db_type: row.db_type, db_name: row.host })

      const payload = payloadFromNormalized(normalized)

      let result
      if (isMock) {
        result = await mock.testConnection(payload)
      } else {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/connections/test`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.detail || 'Healthcheck failed')
        result = {
          latencyMs: data.latency_ms,
          details: data.details || 'Connected',
          connection_id: data.connection_id,   // NEW: fresh server id
        }
      }

      const latency = result.latencyMs ?? null
      updateSavedConnection(row.id, {
        status: 'connected',
        lastConnected: now,
        lastLatencyMs: latency,
        details: result.details,
        db_url: normalized.db_url,
        backend_connection_id: result.connection_id || row.backend_connection_id, // NEW
      })
      setRowHeartbeat((prev) => ({ ...prev, [row.id]: { status: 'healthy', latencyMs: latency, ts: Date.now() } }))

      // If this row is active, refresh connection + set server id active
      if (row.id === activeConnectionId || row.backend_connection_id === activeConnectionId) {
        setConnection({
          status: 'connected',
          saved: true,
          name: row.name,
          db_url: normalized.db_url,
          latencyMs: latency,
          lastMessage: result.details,
          details: result.details,
          lastCheckedAt: now,
          connectionId: result.connection_id || row.backend_connection_id, // NEW
        })
        if (result.connection_id) setActiveConnectionId(result.connection_id) // NEW
      }
      toast.show('Healthcheck succeeded', 'success')
    } catch (error) {
      const detail = error?.message || 'Healthcheck failed'
      updateSavedConnection(row.id, { status: 'failed', details: detail })
      setRowHeartbeat((prev) => ({ ...prev, [row.id]: { status: 'unreachable', latencyMs: null, ts: Date.now() } }))
      if (row.id === activeConnectionId) {
        setConnection({ status: 'failed', lastMessage: detail, details: detail })
      }
      toast.show(detail, 'error')
    } finally {
      setTimeout(() => setRowHeartbeat((prev) => {
        const next = { ...prev }; Object.keys(next).forEach(k => {
          if (Date.now() - next[k].ts > 2500) delete next[k]
        }); return next
      }), 3000)
    }
  }

  /** ---- Save & Continue (persist in store only) ---- */
  const handleSave = () => {
    const values = watch()
    let normalized
    try {
      normalized = normalizeConnection(values)
    } catch (e) {
      toast.show(e.message, 'error'); return
    }
    if (connection.status !== 'connected' || connection.db_url !== normalized.db_url) {
      toast.show('Please test this connection before saving', 'warning'); return
    }
    const now = new Date().toISOString()
    const base = {
      name: normalized.displayName,
      db_type: normalized.db_type,
      host: normalized.path,       // show the path in the table
      db_name: values.db_name || '',
      status: 'connected',
      lastConnected: now,
      lastLatencyMs: connection.latencyMs ?? lastLatencyMs ?? null,
      db_url: normalized.db_url,
      details: connection.details || connection.lastMessage,
      backend_connection_id: connection.connectionId || null,   // NEW: persist server id
    }
    const id = editingId || `conn_${Date.now()}`
    if (editingId) updateSavedConnection(editingId, base)
    else { addSavedConnection({ id, ...base }); }
    // Set active to server id (preferred); fallback to local id if missing
    setActiveConnectionId(base.backend_connection_id || id)     // NEW

    setEditingId(null)
    setConnection({
      saved: true,
      status: 'connected',
      name: base.name,
      db_url: base.db_url,
      latencyMs: base.lastLatencyMs,
      lastMessage: base.details,
      details: base.details,
      connectionId: base.backend_connection_id,                // NEW
    })
    setSetupStep('generate')
    toast.show('Connection saved', 'success')
  }

  const hbStatus = useMemo(() => {
    if (mutation.isPending) return 'testing'
    if (connection.status === 'connected') return 'healthy'
    if (connection.status === 'failed') return 'unreachable'
    return apiStatus
  }, [mutation.isPending, connection.status, apiStatus])

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Connect Database</Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField select label="DB Type" fullWidth size="small" defaultValue={watch('db_type')} {...register('db_type')}>
            <MenuItem value="postgres">PostgreSQL</MenuItem>
            <MenuItem value="mysql">MySQL/MariaDB</MenuItem>
            <MenuItem value="mssql">SQL Server</MenuItem>
            <MenuItem value="sqlite">SQLite</MenuItem>
          </TextField>
          <TextField
            label="Host"
            fullWidth
            size="small"
            disabled={isSQLite}
            error={!!errors.host}
            helperText={isSQLite ? 'Not used for SQLite' : errors.host?.message}
            {...register('host')}
          />
          <TextField
            label="Port"
            fullWidth
            size="small"
            disabled={isSQLite}
            error={!!errors.port}
            helperText={isSQLite ? 'Not used for SQLite' : errors.port?.message}
            {...register('port')}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Database"
            placeholder={isSQLite ? 'Path to .db file' : 'Database name'}
            fullWidth size="small"
            error={!!errors.db_name}
            helperText={errors.db_name?.message}
            {...register('db_name')}
          />
          <TextField
            label="Username"
            fullWidth size="small"
            disabled={isSQLite}
            error={!!errors.username}
            helperText={isSQLite ? 'Not used for SQLite' : errors.username?.message}
            {...register('username')}
          />
          <TextField
            label="Password"
            type={showPw ? 'text' : 'password'}
            fullWidth size="small"
            disabled={isSQLite}
            error={!!errors.password}
            helperText={isSQLite ? 'Not used for SQLite' : errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPw(v => !v)} edge="end" aria-label="toggle password visibility">
                    {showPw ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...register('password')}
          />
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            disableElevation
            startIcon={<PlayArrowIcon />}
            sx={{ borderRadius: 2, px: 2.5, textTransform: 'none' }}
            type="submit"
            disabled={mutation.isPending}
          >
            Test Connection
          </Button>
          <HeartbeatBadge status={hbStatus} latencyMs={connection.latencyMs ?? lastLatencyMs ?? undefined} />

          <Button
            variant="outlined"
            color="success"
            startIcon={<ArrowForwardIcon />}
            sx={{ borderRadius: 2, px: 2.5, textTransform: 'none' }}
            disabled={connection.status !== 'connected'}
            onClick={handleSave}
          >
            Save & Continue
          </Button>

          {mutation.isPending && <Typography variant="body2" color="text.secondary">Testing…</Typography>}

          {connection.status === 'connected' && (
            <Chip color="success" label="Connected" size="small" onClick={() => setShowDetails(v => !v)} />
          )}
          {connection.status === 'failed' && (
            <Chip color="error" label="Failed" size="small" onClick={() => setShowDetails(v => !v)} />
          )}
        </Stack>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Collapse in={showDetails}>
          {connection.status === 'connected' && <Alert severity="success">{connection.lastMessage}</Alert>}
          {connection.status === 'failed' && <Alert severity="error">{connection.lastMessage}</Alert>}
        </Collapse>
      </Box>

      {savedConnections.length === 0 && (
        <Box sx={{ mt: 3, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">No saved connections yet.</Typography>
          <Typography variant="caption" color="text.secondary">Test and save a connection to keep it handy.</Typography>
        </Box>
      )}

      {savedConnections.length > 0 && (
        <Box sx={{ mt: 3, overflowX: 'auto' }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Saved Connections</Typography>
          <Table size="small" aria-label="saved connections" sx={{ '& thead th': { bgcolor: 'background.default', fontWeight: 600 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>DB Type</TableCell>
                <TableCell>Host/Path</TableCell>
                <TableCell>Database</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Latency</TableCell>
                <TableCell>Last Connected</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {savedConnections.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  selected={activeConnectionId === c.backend_connection_id || activeConnectionId === c.id}
                  sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.db_type}</TableCell>
                  <TableCell>{c.host}</TableCell>
                  <TableCell>{c.db_name || '-'}</TableCell>
                  <TableCell>
                    <HeartbeatBadge
                      withText size="small"
                      status={c.status === 'connected' ? 'healthy' : (c.status === 'failed' ? 'unreachable' : 'unknown')}
                      tooltip={c.details || c.status || 'unknown'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {c.lastLatencyMs != null
                        ? `${Math.round(c.lastLatencyMs)}ms`
                        : rowHeartbeat[c.id]?.latencyMs != null
                        ? `${Math.round(rowHeartbeat[c.id].latencyMs)}ms`
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {c.lastConnected ? new Date(c.lastConnected).toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      <Button
                        size="small" variant="text" startIcon={<CheckCircleOutlineIcon />} sx={{ textTransform: 'none' }}
                        onClick={() => {
                          if (activeConnectionId && (activeConnectionId !== c.backend_connection_id && activeConnectionId !== c.id)) {
                            setConfirmSelect(c.id)
                          } else {
                            setActiveConnectionId(c.backend_connection_id || c.id) // NEW: prefer server id
                            setConnection({
                              saved: true, name: c.name, status: c.status,
                              db_url: c.db_url, latencyMs: c.lastLatencyMs,
                              lastMessage: c.details || c.status, details: c.details,
                              connectionId: c.backend_connection_id || null,     // NEW
                            })
                            toast.show('Connection selected', 'success')
                          }
                        }}
                      >
                        Select
                      </Button>

                      <Button size="small" variant="outlined" color="info" startIcon={<SpeedIcon />} sx={{ textTransform: 'none' }}
                        onClick={() => handleRowTest(c)}>
                        Test
                      </Button>
                      {rowHeartbeat[c.id] && (
                        <HeartbeatBadge size="small" status={rowHeartbeat[c.id].status} latencyMs={rowHeartbeat[c.id].latencyMs} />
                      )}

                      <Button size="small" variant="text" startIcon={<EditIcon />} sx={{ textTransform: 'none' }}
                        onClick={() => {
                          setEditingId(c.id)
                          reset({
                            db_type: c.db_type || 'sqlite',
                            host: c.host || '',
                            port: '',
                            db_name: c.db_name || '',
                            username: '',
                            password: '',
                            ssl: false,
                          })
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}>
                        Edit
                      </Button>

                      <Button size="small" color="error" variant="text" startIcon={<DeleteOutlineIcon />} sx={{ textTransform: 'none' }}
                        onClick={() => setConfirmDelete(c.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <ConfirmDialog
        open={!!confirmSelect}
        title="Replace Active Connection?"
        message="Selecting this connection will replace the current active one. Continue?"
        confirmText="Yes, select"
        onClose={() => setConfirmSelect(null)}
        onConfirm={() => {
          const id = confirmSelect
          const selected = savedConnections.find((x) => x.id === id)
          if (selected) {
            setActiveConnectionId(selected.backend_connection_id || id) // NEW
            setConnection({
              saved: true,
              name: selected.name,
              status: selected.status,
              db_url: selected.db_url,
              latencyMs: selected.lastLatencyMs,
              lastMessage: selected.details || selected.status,
              details: selected.details,
              connectionId: selected.backend_connection_id || null, // NEW
            })
            toast.show('Connection selected', 'success')
          }
          setConfirmSelect(null)
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Connection"
        message="This will permanently remove the saved connection. Continue?"
        confirmText="Delete"
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          removeSavedConnection(confirmDelete)
          toast.show('Connection deleted', 'success')
          if (activeConnectionId === confirmDelete) {
            setActiveConnectionId(null)
            setConnection({ saved: false, status: 'disconnected', name: '', db_url: null, latencyMs: null })
          }
          setConfirmDelete(null)
        }}
      />
    </Paper>
  )
}
