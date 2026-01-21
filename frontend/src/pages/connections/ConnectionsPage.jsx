/**
 * Premium Connections Page
 * Data source management with theme-based styling
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
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
import FavoriteButton from '../../components/FavoriteButton'
import * as api from '../../api/client'
import ConnectionForm from './ConnectionForm'
import ConnectionSchemaDrawer from './ConnectionSchemaDrawer'

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1400,
  margin: '0 auto',
  width: '100%',
  minHeight: '100vh',
  background: theme.palette.mode === 'dark'
    ? `radial-gradient(ellipse at 20% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 50%),
       radial-gradient(ellipse at 80% 100%, ${alpha(theme.palette.secondary.dark, 0.1)} 0%, transparent 50%),
       ${theme.palette.background.default}`
    : `radial-gradient(ellipse at 20% 0%, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 50%),
       radial-gradient(ellipse at 80% 100%, ${alpha(theme.palette.secondary.light, 0.05)} 0%, transparent 50%),
       ${theme.palette.background.default}`,
  animation: `${fadeInUp} 0.5s ease-out`,
}))

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    borderRadius: 12,
    boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
    minWidth: 160,
    animation: `${fadeInUp} 0.2s ease-out`,
  },
}))

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  borderRadius: 8,
  margin: theme.spacing(0.5, 1),
  padding: theme.spacing(1, 1.5),
  fontSize: '0.8125rem',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}))

const IconContainer = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
}))

const ActionButton = styled(IconButton)(({ theme }) => ({
  borderRadius: 10,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    transform: 'scale(1.05)',
  },
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ConnectionsPage() {
  const theme = useTheme()
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
  const [favorites, setFavorites] = useState(new Set())
  const didLoadFavoritesRef = useRef(false)

  useEffect(() => {
    if (didLoadFavoritesRef.current) return
    didLoadFavoritesRef.current = true
    api.getFavorites()
      .then((data) => {
        const favIds = (data.connections || []).map((c) => c.id)
        setFavorites(new Set(favIds))
      })
      .catch((err) => {
        console.error('Failed to load favorites:', err)
        // Non-critical - don't block UI but log for debugging
      })
  }, [])

  const handleFavoriteToggle = useCallback((connectionId, isFavorite) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFavorite) {
        next.add(connectionId)
      } else {
        next.delete(connectionId)
      }
      return next
    })
  }, [])

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
    const connectionToDelete = deletingConnection
    const connectionData = savedConnections.find((c) => c.id === connectionToDelete.id)

    // Optimistically remove from UI
    removeSavedConnection(connectionToDelete.id)
    setDeleteConfirmOpen(false)
    setDeletingConnection(null)

    // Set up delayed actual delete
    let undone = false
    const deleteTimeout = setTimeout(async () => {
      if (undone) return
      try {
        await api.deleteConnection(connectionToDelete.id)
      } catch (err) {
        // If delete fails, restore the connection
        if (connectionData) {
          setSavedConnections((prev) => [...prev, connectionData])
        }
        toast.show(err.message || 'Failed to delete connection', 'error')
      }
    }, 5000)

    // Show undo toast
    toast.showWithUndo(
      `"${connectionToDelete.name}" removed`,
      () => {
        undone = true
        clearTimeout(deleteTimeout)
        // Restore connection
        if (connectionData) {
          setSavedConnections((prev) => [...prev, connectionData])
        }
        toast.show('Data source restored', 'success')
      },
      { severity: 'info' }
    )
  }, [deletingConnection, savedConnections, removeSavedConnection, setSavedConnections, toast])

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
      toast.show(editingConnection ? 'Data source updated' : 'Data source added', 'success')
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FavoriteButton
            entityType="connections"
            entityId={row.id}
            initialFavorite={favorites.has(row.id)}
            onToggle={(isFav) => handleFavoriteToggle(row.id, isFav)}
          />
          <IconContainer
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.15),
            }}
          >
            <StorageIcon sx={{ color: theme.palette.success.main, fontSize: 16 }} />
          </IconContainer>
          <Box>
            <Box sx={{ fontWeight: 500, fontSize: '0.8125rem', color: theme.palette.text.primary }}>
              {value}
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
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
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            borderRadius: 2,
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
            borderRadius: 2,
          }}
        />
      ),
    },
    {
      field: 'lastLatencyMs',
      headerName: 'Latency',
      width: 100,
      renderCell: (value) => (
        <Box sx={{ color: theme.palette.text.secondary, fontSize: '0.8125rem' }}>
          {value ? `${value}ms` : '-'}
        </Box>
      ),
    },
    {
      field: 'lastConnected',
      headerName: 'Last Connected',
      width: 180,
      renderCell: (value) => (
        <Box sx={{ color: theme.palette.text.secondary, fontSize: '0.8125rem' }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </Box>
      ),
    },
  ], [favorites, handleFavoriteToggle, theme])

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
        { value: 'sqlite', label: 'SQLite' },
      ],
    },
  ], [])

  return (
    <PageContainer>
      <DataTable
        title="Data Sources"
        subtitle="Connect to your databases and data files"
        columns={columns}
        data={savedConnections}
        loading={loading}
        searchPlaceholder="Search connections..."
        filters={filters}
        actions={[
          {
            label: 'Add Data Source',
            icon: <AddIcon sx={{ fontSize: 18 }} />,
            variant: 'contained',
            onClick: handleAddConnection,
          },
        ]}
        onRowClick={handleRowClick}
        rowActions={(row) => (
          <Tooltip title="More actions">
            <ActionButton
              size="small"
              onClick={(e) => handleOpenMenu(e, row)}
              aria-label="More actions"
              sx={{ color: theme.palette.text.secondary }}
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </ActionButton>
          </Tooltip>
        )}
        emptyState={{
          icon: StorageIcon,
          title: 'No data sources yet',
          description: 'Connect to a database to start pulling data for your reports.',
          actionLabel: 'Add Data Source',
          onAction: handleAddConnection,
        }}
      />

      {/* Row Actions Menu */}
      <StyledMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <StyledMenuItem
          onClick={() => { handleTestConnection(menuConnection); handleCloseMenu() }}
        >
          <ListItemIcon>
            <RefreshIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>
            Test Connection
          </ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleSchemaInspect}>
          <ListItemIcon>
            <TableViewIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>
            Inspect Schema
          </ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleEditConnection}>
          <ListItemIcon>
            <EditIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>
            Edit
          </ListItemText>
        </StyledMenuItem>
        <StyledMenuItem
          onClick={handleDeleteClick}
          sx={{ color: theme.palette.error.main }}
        >
          <ListItemIcon>
            <DeleteIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>
            Delete
          </ListItemText>
        </StyledMenuItem>
      </StyledMenu>

      {/* Connection Form Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingConnection ? 'Edit Data Source' : 'Add Data Source'}
        subtitle="Enter your database details to connect"
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
        title="Remove Data Source"
        message={`Are you sure you want to remove "${deletingConnection?.name}"? You can undo this within a few seconds.`}
        confirmLabel="Remove"
        severity="error"
        loading={loading}
      />

      <ConnectionSchemaDrawer
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        connection={schemaConnection}
      />
    </PageContainer>
  )
}
