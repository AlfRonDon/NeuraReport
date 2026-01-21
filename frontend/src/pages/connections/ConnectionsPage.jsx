import { useState, useCallback, useMemo } from 'react'
import { Box, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, alpha } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import StorageIcon from '@mui/icons-material/Storage'
import TableViewIcon from '@mui/icons-material/TableView'
import { DataTable } from '../../ui/DataTable'
import { ConfirmModal } from '../../ui/Modal'
import { Drawer } from '../../ui/Drawer'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import * as api from '../../api/client'
import ConnectionForm from './ConnectionForm'
import ConnectionSchemaDrawer from './ConnectionSchemaDrawer'
import { palette } from '../../theme'

export default function ConnectionsPage() {
  const toast = useToast()
  const savedConnections = useAppStore((s) => s.savedConnections)
  const setSavedConnections = useAppStore((s) => s.setSavedConnections)
  const addSavedConnection = useAppStore((s) => s.addSavedConnection)
  const removeSavedConnection = useAppStore((s) => s.removeSavedConnection)
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)

  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingConnection, setDeletingConnection] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuConnection, setMenuConnection] = useState(null)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [schemaConnection, setSchemaConnection] = useState(null)

  const handleOpenMenu = useCallback((event, connection) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuConnection(connection)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null)
    setMenuConnection(null)
  }, [])

  const handleAddConnection = useCallback(() => {
    setEditingConnection(null)
    setDrawerOpen(true)
  }, [])

  const handleEditConnection = useCallback(() => {
    setEditingConnection(menuConnection)
    setDrawerOpen(true)
    handleCloseMenu()
  }, [menuConnection, handleCloseMenu])

  const handleDeleteClick = useCallback(() => {
    setDeletingConnection(menuConnection)
    setDeleteConfirmOpen(true)
    handleCloseMenu()
  }, [menuConnection, handleCloseMenu])

  const handleSchemaInspect = useCallback(async () => {
    if (!menuConnection) return
    handleCloseMenu()

    // Check connection health before opening schema drawer
    try {
      setLoading(true)
      const result = await api.healthcheckConnection(menuConnection.id)
      if (result.status !== 'ok') {
        toast.show('Connection is unavailable. Please verify connection settings.', 'error')
        return
      }
      setSchemaConnection(menuConnection)
      setSchemaOpen(true)
    } catch (err) {
      toast.show(
        err.message || 'Unable to connect to database. Please verify the connection is active.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [menuConnection, handleCloseMenu, toast])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingConnection) return
    setLoading(true)
    try {
      await api.deleteConnection(deletingConnection.id)
      removeSavedConnection(deletingConnection.id)
      toast.show('Connection deleted', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to delete connection', 'error')
    } finally {
      setLoading(false)
      setDeleteConfirmOpen(false)
      setDeletingConnection(null)
    }
  }, [deletingConnection, removeSavedConnection, toast])

  const handleSaveConnection = useCallback(async (connectionData) => {
    setLoading(true)
    try {
      const result = await api.testConnection(connectionData)
      if (!result.ok) {
        throw new Error(result.detail || 'Connection test failed')
      }

      const savedConnection = await api.upsertConnection({
        id: editingConnection?.id || result.connection_id,
        name: connectionData.name,
        dbType: connectionData.db_type,
        dbUrl: connectionData.db_url,
        database: connectionData.database,
        status: 'connected',
        latencyMs: result.latency_ms,
      })

      addSavedConnection(savedConnection)
      toast.show(editingConnection ? 'Connection updated' : 'Connection added', 'success')
      setDrawerOpen(false)
    } catch (err) {
      toast.show(err.message || 'Failed to save connection', 'error')
    } finally {
      setLoading(false)
    }
  }, [editingConnection, addSavedConnection, toast])

  const handleTestConnection = useCallback(async (connection) => {
    setLoading(true)
    try {
      const result = await api.healthcheckConnection(connection.id)
      if (result.status === 'ok') {
        toast.show(`Connected (${result.latency_ms}ms)`, 'success')
      }
    } catch (err) {
      toast.show(err.message || 'Connection test failed', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleRowClick = useCallback((row) => {
    setActiveConnectionId(row.id)
    toast.show(`Selected: ${row.name}`, 'info')
  }, [setActiveConnectionId, toast])

  const columns = useMemo(() => [
    {
      field: 'name',
      headerName: 'Name',
      renderCell: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              bgcolor: alpha(palette.green[400], 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StorageIcon sx={{ color: palette.green[400], fontSize: 16 }} />
          </Box>
          <Box>
            <Box sx={{ fontWeight: 500, fontSize: '0.8125rem', color: palette.scale[100] }}>{value}</Box>
            <Box sx={{ fontSize: '0.75rem', color: palette.scale[500] }}>
              {row.summary || row.db_type}
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      field: 'db_type',
      headerName: 'Type',
      width: 120,
      renderCell: (value) => (
        <Chip
          label={value || 'Unknown'}
          size="small"
          sx={{
            bgcolor: alpha(palette.scale[100], 0.08),
            color: palette.scale[300],
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (value) => (
        <Chip
          icon={value === 'connected'
            ? <CheckCircleIcon sx={{ fontSize: 14 }} />
            : <ErrorIcon sx={{ fontSize: 14 }} />
          }
          label={value || 'Unknown'}
          size="small"
          color={value === 'connected' ? 'success' : 'error'}
          sx={{
            fontSize: '0.75rem',
            textTransform: 'capitalize',
          }}
        />
      ),
    },
    {
      field: 'lastLatencyMs',
      headerName: 'Latency',
      width: 100,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value ? `${value}ms` : '-'}
        </Box>
      ),
    },
    {
      field: 'lastConnected',
      headerName: 'Last Connected',
      width: 180,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </Box>
      ),
    },
  ], [])

  const filters = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'connected', label: 'Connected' },
        { value: 'disconnected', label: 'Disconnected' },
        { value: 'error', label: 'Error' },
      ],
    },
    {
      key: 'db_type',
      label: 'Type',
      options: [
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'mssql', label: 'SQL Server' },
        { value: 'sqlite', label: 'SQLite' },
      ],
    },
  ], [])

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <DataTable
        title="Connections"
        subtitle="Manage your database connections"
        columns={columns}
        data={savedConnections}
        loading={loading}
        searchPlaceholder="Search connections..."
        filters={filters}
        actions={[
          {
            label: 'Add Connection',
            icon: <AddIcon sx={{ fontSize: 18 }} />,
            variant: 'contained',
            onClick: handleAddConnection,
          },
        ]}
        onRowClick={handleRowClick}
        rowActions={(row) => (
          <IconButton
            size="small"
            onClick={(e) => handleOpenMenu(e, row)}
            sx={{
              color: palette.scale[500],
              '&:hover': {
                color: palette.scale[100],
                bgcolor: alpha(palette.scale[100], 0.08),
              },
            }}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        emptyState={{
          icon: StorageIcon,
          title: 'No connections yet',
          description: 'Add a database connection to start generating reports.',
          actionLabel: 'Add Connection',
          onAction: handleAddConnection,
        }}
      />

      {/* Row Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: {
              bgcolor: palette.scale[900],
              border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
              minWidth: 160,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => { handleTestConnection(menuConnection); handleCloseMenu() }}
          sx={{ color: palette.scale[200] }}
        >
          <ListItemIcon><RefreshIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Test Connection</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSchemaInspect} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><TableViewIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Inspect Schema</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditConnection} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><EditIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: palette.red[400] }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: palette.red[400] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Connection Form Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingConnection ? 'Edit Connection' : 'New Connection'}
        subtitle="Configure your database connection settings"
        width={520}
      >
        <ConnectionForm
          connection={editingConnection}
          onSave={handleSaveConnection}
          onCancel={() => setDrawerOpen(false)}
          loading={loading}
        />
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Connection"
        message={`Are you sure you want to delete "${deletingConnection?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
        loading={loading}
      />

      <ConnectionSchemaDrawer
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        connection={schemaConnection}
      />
    </Box>
  )
}
