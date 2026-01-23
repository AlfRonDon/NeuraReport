import { useState, useCallback, useEffect } from 'react'
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  CardActionArea,
  Radio,
  Button,
  Alert,
  Collapse,
  Divider,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import StorageIcon from '@mui/icons-material/Storage'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAppStore } from '../../../store/useAppStore'
import { useToast } from '../../../components/ToastProvider'
import { useInteraction, InteractionType, Reversibility } from '../../../components/ux/governance'
import { Drawer } from '../../../ui/Drawer'
import ConnectionForm from '../../connections/ConnectionForm'
import * as api from '../../../api/client'

export default function StepConnection({ wizardState, updateWizardState, onComplete, setLoading }) {
  const toast = useToast()
  const { execute } = useInteraction()
  const savedConnections = useAppStore((s) => s.savedConnections)
  const setSavedConnections = useAppStore((s) => s.setSavedConnections)
  const addSavedConnection = useAppStore((s) => s.addSavedConnection)
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)
  const activeConnection = useAppStore((s) => s.activeConnection)

  const [selectedId, setSelectedId] = useState(wizardState.connectionId || activeConnection?.id || null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const state = await api.bootstrapState()
        if (state?.connections) {
          setSavedConnections(state.connections)
        }
      } catch (err) {
        console.error('Failed to fetch connections:', err)
        toast.show('Failed to load saved connections', 'warning')
      }
    }
    if (savedConnections.length === 0) {
      fetchConnections()
    }
  }, [savedConnections.length, setSavedConnections, toast])

  const handleSelect = useCallback((connectionId) => {
    setSelectedId(connectionId)
    updateWizardState({ connectionId })
    setActiveConnectionId(connectionId)
  }, [updateWizardState, setActiveConnectionId])

  const handleAddConnection = useCallback(() => {
    setDrawerOpen(true)
  }, [])

  const handleSaveConnection = useCallback(async (connectionData) => {
    setFormLoading(true)
    try {
      await execute({
        type: InteractionType.CREATE,
        label: `Add connection "${connectionData?.name || connectionData?.db_url || 'connection'}"`,
        reversibility: Reversibility.FULLY_REVERSIBLE,
        suppressSuccessToast: true,
        suppressErrorToast: true,
        blocksNavigation: false,
        intent: {
          connectionName: connectionData?.name,
          dbType: connectionData?.db_type,
        },
        action: async () => {
          try {
            const result = await api.testConnection(connectionData)
            if (!result.ok) {
              throw new Error(result.detail || 'Connection test failed')
            }

            const savedConnection = await api.upsertConnection({
              id: result.connection_id,
              name: connectionData.name,
              dbType: connectionData.db_type,
              dbUrl: connectionData.db_url,
              database: connectionData.database,
              status: 'connected',
              latencyMs: result.latency_ms,
            })

            addSavedConnection(savedConnection)
            handleSelect(savedConnection.id)
            toast.show('Connection added', 'success')
            setDrawerOpen(false)
            return savedConnection
          } catch (err) {
            toast.show(err.message || 'Failed to save connection', 'error')
            throw err
          }
        },
      })
    } finally {
      setFormLoading(false)
    }
  }, [addSavedConnection, handleSelect, toast, execute])

  const handleContinue = useCallback(() => {
    if (selectedId) {
      onComplete()
    }
  }, [selectedId, onComplete])

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
        Select a Database Connection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose an existing connection or create a new one to fetch data for your reports.
      </Typography>

      {savedConnections.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No connections found. Create a new connection to get started.
        </Alert>
      ) : (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {savedConnections.map((conn) => (
            <Card
              key={conn.id}
              variant="outlined"
              sx={{
                border: 2,
                borderColor: selectedId === conn.id ? 'primary.main' : 'divider',
                transition: 'border-color 0.2s',
              }}
            >
              <CardActionArea onClick={() => handleSelect(conn.id)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Radio
                    checked={selectedId === conn.id}
                    sx={{ p: 0 }}
                  />
                  <StorageIcon sx={{ color: 'text.secondary' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={500}>
                      {conn.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {conn.db_type} • {conn.summary || conn.database}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={conn.status === 'connected' ? 'Connected' : 'Disconnected'}
                      color={conn.status === 'connected' ? 'success' : 'default'}
                      variant="outlined"
                    />
                    {selectedId === conn.id && (
                      <CheckCircleIcon sx={{ color: 'primary.main' }} />
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddConnection}
        fullWidth
        sx={{
          py: 1.5,
          borderStyle: 'dashed',
        }}
      >
        Add New Connection
      </Button>

      {/* Connection Form Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Connection"
        subtitle="Configure your database connection"
        width={520}
      >
        <ConnectionForm
          onSave={handleSaveConnection}
          onCancel={() => setDrawerOpen(false)}
          loading={formLoading}
        />
      </Drawer>
    </Box>
  )
}
