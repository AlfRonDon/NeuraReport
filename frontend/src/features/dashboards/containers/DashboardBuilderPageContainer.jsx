/**
 * Dashboard Builder Page Container
 * Drag-and-drop dashboard builder with widgets and analytics.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Dashboard as DashboardIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Code as EmbedIcon,
  BarChart as ChartIcon,
  TableChart as TableIcon,
  TextFields as TextIcon,
  FilterList as FilterIcon,
  AutoAwesome as AIIcon,
  TrendingUp as TrendIcon,
  Warning as AnomalyIcon,
  Link as CorrelationIcon,
  CameraAlt as SnapshotIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material'
import useDashboardStore from '@/stores/dashboardStore'
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

const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
}))

const DashboardArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
}))

const WidgetPalette = styled(Box)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  padding: theme.spacing(2),
  overflow: 'auto',
}))

const Canvas = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  overflow: 'auto',
  backgroundColor: theme.palette.background.default,
}))

const WidgetCard = styled(Card)(({ theme }) => ({
  cursor: 'grab',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
}))

const DashboardWidget = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 12,
}))

const WidgetHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}))

const WidgetContent = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
}))

const EmptyState = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
}))

// =============================================================================
// WIDGET TYPES
// =============================================================================

const WIDGET_TYPES = [
  { type: 'chart', label: 'Chart', icon: ChartIcon, color: 'primary' },
  { type: 'metric', label: 'Metric', icon: TrendIcon, color: 'success' },
  { type: 'table', label: 'Table', icon: TableIcon, color: 'info' },
  { type: 'text', label: 'Text', icon: TextIcon, color: 'secondary' },
  { type: 'filter', label: 'Filter', icon: FilterIcon, color: 'warning' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardBuilderPage() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    dashboards,
    currentDashboard,
    widgets,
    insights,
    loading,
    saving,
    refreshing,
    error,
    fetchDashboards,
    createDashboard,
    getDashboard,
    updateDashboard,
    deleteDashboard,
    addWidget,
    updateWidget,
    deleteWidget,
    refreshDashboard,
    generateInsights,
    predictTrends,
    detectAnomalies,
    createSnapshot,
    generateEmbedToken,
    reset,
  } = useDashboardStore()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false)
  const [selectedWidgetType, setSelectedWidgetType] = useState(null)
  const [widgetTitle, setWidgetTitle] = useState('')
  const [aiMenuAnchor, setAiMenuAnchor] = useState(null)

  useEffect(() => {
    fetchDashboards()
    return () => reset()
  }, [fetchDashboards, reset])

  const executeUI = useCallback((label, action, intent = {}) => {
    return execute({
      type: InteractionType.EXECUTE,
      label,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'dashboards', ...intent },
      action,
    })
  }, [execute])

  const handleOpenCreateDialog = useCallback(() => {
    return executeUI('Open create dashboard', () => setCreateDialogOpen(true))
  }, [executeUI])

  const handleCloseCreateDialog = useCallback(() => {
    return executeUI('Close create dashboard', () => setCreateDialogOpen(false))
  }, [executeUI])

  const handleOpenAddWidgetDialog = useCallback((type) => {
    return executeUI('Open add widget', () => {
      setSelectedWidgetType(type)
      setAddWidgetDialogOpen(true)
    }, { widgetType: type })
  }, [executeUI])

  const handleCloseAddWidgetDialog = useCallback(() => {
    return executeUI('Close add widget', () => setAddWidgetDialogOpen(false))
  }, [executeUI])

  const handleOpenAiMenu = useCallback((event) => {
    const anchor = event.currentTarget
    return executeUI('Open AI analytics', () => setAiMenuAnchor(anchor))
  }, [executeUI])

  const handleCloseAiMenu = useCallback(() => {
    return executeUI('Close AI analytics', () => setAiMenuAnchor(null))
  }, [executeUI])

  const handleSelectDashboard = useCallback((dashboardId) => {
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Open dashboard',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'dashboards', dashboardId },
      action: async () => {
        await getDashboard(dashboardId)
      },
    })
  }, [execute, getDashboard])

  const handleCreateDashboard = useCallback(() => {
    if (!newDashboardName) return undefined
    return execute({
      type: InteractionType.CREATE,
      label: 'Create dashboard',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'dashboards', name: newDashboardName },
      action: async () => {
        const dashboard = await createDashboard({
          name: newDashboardName,
          widgets: [],
          filters: [],
        })
        if (dashboard) {
          setCreateDialogOpen(false)
          setNewDashboardName('')
          toast.show('Dashboard created', 'success')
        }
        return dashboard
      },
    })
  }, [createDashboard, execute, newDashboardName, toast])

  const handleAddWidget = useCallback(() => {
    if (!currentDashboard || !selectedWidgetType || !widgetTitle) return undefined
    return execute({
      type: InteractionType.UPDATE,
      label: 'Add widget',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'dashboards', dashboardId: currentDashboard.id, widgetType: selectedWidgetType },
      action: async () => {
        const widget = await addWidget(currentDashboard.id, {
          config: {
            type: selectedWidgetType,
            title: widgetTitle,
            options: {},
          },
          x: 0,
          y: widgets.length * 4,
          w: 4,
          h: 3,
        })
        if (widget) {
          setAddWidgetDialogOpen(false)
          setSelectedWidgetType(null)
          setWidgetTitle('')
          toast.show('Widget added', 'success')
        }
        return widget
      },
    })
  }, [addWidget, currentDashboard, execute, selectedWidgetType, toast, widgetTitle, widgets.length])

  const handleDeleteWidget = useCallback((widgetId) => {
    if (!currentDashboard) return undefined
    return execute({
      type: InteractionType.DELETE,
      label: 'Remove widget',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'dashboards', dashboardId: currentDashboard.id, widgetId },
      action: async () => {
        await deleteWidget(currentDashboard.id, widgetId)
        toast.show('Widget removed', 'success')
      },
    })
  }, [currentDashboard, deleteWidget, execute, toast])

  const handleRefresh = useCallback(() => {
    if (!currentDashboard) return undefined
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Refresh dashboard',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'dashboards', dashboardId: currentDashboard.id },
      action: async () => {
        await refreshDashboard(currentDashboard.id)
        toast.show('Dashboard refreshed', 'success')
      },
    })
  }, [currentDashboard, execute, refreshDashboard, toast])

  const handleAIAction = useCallback((action) => {
    handleCloseAiMenu()
    if (!currentDashboard) return undefined

    const sampleData = [{ x: 1, y: 10 }, { x: 2, y: 20 }]
    const labelMap = {
      insights: 'Generate insights',
      trends: 'Predict trends',
      anomalies: 'Detect anomalies',
    }

    return execute({
      type: InteractionType.ANALYZE,
      label: labelMap[action] || 'Run AI analytics',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      intent: { source: 'dashboards', dashboardId: currentDashboard.id, action },
      action: async () => {
        switch (action) {
          case 'insights':
            await generateInsights(sampleData)
            toast.show('Insights generated', 'success')
            break
          case 'trends':
            await predictTrends(sampleData, 'x', 'y', 6)
            toast.show('Trends predicted', 'success')
            break
          case 'anomalies':
            await detectAnomalies(sampleData, ['y'])
            toast.show('Anomalies detected', 'success')
            break
        }
      },
    })
  }, [currentDashboard, detectAnomalies, execute, generateInsights, handleCloseAiMenu, predictTrends, toast])

  const handleSnapshot = useCallback(() => {
    if (!currentDashboard) return undefined
    return execute({
      type: InteractionType.DOWNLOAD,
      label: 'Create snapshot',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'dashboards', dashboardId: currentDashboard.id },
      action: async () => {
        const result = await createSnapshot(currentDashboard.id, 'png')
        if (result) {
          toast.show('Snapshot created', 'success')
        }
        return result
      },
    })
  }, [createSnapshot, currentDashboard, execute, toast])

  const handleEmbed = useCallback(() => {
    if (!currentDashboard) return undefined
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Generate embed link',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'dashboards', dashboardId: currentDashboard.id },
      action: async () => {
        const result = await generateEmbedToken(currentDashboard.id)
        if (result) {
          navigator.clipboard.writeText(result.embed_url)
          toast.show('Embed URL copied to clipboard', 'success')
        }
        return result
      },
    })
  }, [currentDashboard, execute, generateEmbedToken, toast])

  const handleDismissError = useCallback(() => {
    return executeUI('Dismiss dashboard error', () => reset())
  }, [executeUI, reset])

  return (
    <PageContainer>
      {/* Toolbar */}
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DashboardIcon sx={{ color: 'secondary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {currentDashboard?.name || 'Dashboards'}
          </Typography>
          {currentDashboard && (
            <Chip
              size="small"
              label={`${widgets.length} widgets`}
              sx={{ borderRadius: 1 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentDashboard ? (
            <>
              <ActionButton
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                Refresh
              </ActionButton>
              <ActionButton
                size="small"
                startIcon={<AIIcon />}
                onClick={handleOpenAiMenu}
              >
                AI Analytics
              </ActionButton>
              <ActionButton
                size="small"
                startIcon={<SnapshotIcon />}
                onClick={handleSnapshot}
              >
                Snapshot
              </ActionButton>
              <ActionButton
                size="small"
                startIcon={<EmbedIcon />}
                onClick={handleEmbed}
              >
                Embed
              </ActionButton>
              <ActionButton
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                disabled={saving}
              >
                Save
              </ActionButton>
            </>
          ) : (
            <ActionButton
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              New Dashboard
            </ActionButton>
          )}
        </Box>
      </Toolbar>

      <DashboardArea>
        {currentDashboard ? (
          <>
            {/* Widget Palette */}
            <WidgetPalette>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Add Widget
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {WIDGET_TYPES.map((wt) => (
                  <WidgetCard
                    key={wt.type}
                    variant="outlined"
                    onClick={() => handleOpenAddWidgetDialog(wt.type)}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <wt.icon color={wt.color} fontSize="small" />
                        <Typography variant="body2">{wt.label}</Typography>
                      </Box>
                    </CardContent>
                  </WidgetCard>
                ))}
              </Box>

              {insights.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    AI Insights
                  </Typography>
                  {insights.map((insight, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {insight.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {insight.description}
                      </Typography>
                    </Paper>
                  ))}
                </>
              )}
            </WidgetPalette>

            {/* Canvas */}
            <Canvas>
              {widgets.length > 0 ? (
                <Grid container spacing={2}>
                  {widgets.map((widget) => (
                    <Grid item xs={12} md={6} lg={4} key={widget.id}>
                      <DashboardWidget sx={{ minHeight: 200 }}>
                        <WidgetHeader>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {widget.config?.title || 'Untitled Widget'}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteWidget(widget.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </WidgetHeader>
                        <WidgetContent>
                          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                            {widget.config?.type === 'chart' && <ChartIcon sx={{ fontSize: 48 }} />}
                            {widget.config?.type === 'metric' && <TrendIcon sx={{ fontSize: 48 }} />}
                            {widget.config?.type === 'table' && <TableIcon sx={{ fontSize: 48 }} />}
                            {widget.config?.type === 'text' && <TextIcon sx={{ fontSize: 48 }} />}
                            {widget.config?.type === 'filter' && <FilterIcon sx={{ fontSize: 48 }} />}
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              {widget.config?.type?.charAt(0).toUpperCase() + widget.config?.type?.slice(1)} Widget
                            </Typography>
                          </Box>
                        </WidgetContent>
                      </DashboardWidget>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                    borderRadius: 3,
                  }}
                >
                  <Typography color="text.secondary">
                    Add widgets from the palette to build your dashboard
                  </Typography>
                </Box>
              )}
            </Canvas>
          </>
        ) : (
          <EmptyState sx={{ width: '100%' }}>
            <DashboardIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              No Dashboard Selected
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create a new dashboard to visualize your data.
            </Typography>
            <ActionButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Dashboard
            </ActionButton>

            {dashboards.length > 0 && (
              <Box sx={{ mt: 4, width: '100%', maxWidth: 400 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Recent Dashboards
                </Typography>
                {dashboards.slice(0, 5).map((db) => (
                  <Paper
                    key={db.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                    }}
                    variant="outlined"
                    onClick={() => handleSelectDashboard(db.id)}
                  >
                    <DashboardIcon color="secondary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {db.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {db.widgets?.length || 0} widgets
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </EmptyState>
        )}
      </DashboardArea>

      {/* AI Menu */}
      <Menu
        anchorEl={aiMenuAnchor}
        open={Boolean(aiMenuAnchor)}
        onClose={handleCloseAiMenu}
      >
        <MenuItem onClick={() => handleAIAction('insights')}>
          <ListItemIcon><AIIcon /></ListItemIcon>
          <ListItemText>Generate Insights</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('trends')}>
          <ListItemIcon><TrendIcon /></ListItemIcon>
          <ListItemText>Predict Trends</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('anomalies')}>
          <ListItemIcon><AnomalyIcon /></ListItemIcon>
          <ListItemText>Detect Anomalies</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Dashboard Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Dashboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Dashboard Name"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateDashboard}
            disabled={!newDashboardName || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Widget Dialog */}
      <Dialog
        open={addWidgetDialogOpen}
        onClose={handleCloseAddWidgetDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add {selectedWidgetType?.charAt(0).toUpperCase()}{selectedWidgetType?.slice(1)} Widget</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Widget Title"
            value={widgetTitle}
            onChange={(e) => setWidgetTitle(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddWidgetDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddWidget}
            disabled={!widgetTitle}
          >
            Add Widget
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert
          severity="error"
          onClose={handleDismissError}
          sx={{ position: 'fixed', bottom: 16, right: 16, maxWidth: 400 }}
        >
          {error}
        </Alert>
      )}
    </PageContainer>
  )
}
