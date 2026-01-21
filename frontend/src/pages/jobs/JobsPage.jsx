import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Typography,
  Stack,
  Tooltip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CancelIcon from '@mui/icons-material/Cancel'
import DownloadIcon from '@mui/icons-material/Download'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ReplayIcon from '@mui/icons-material/Replay'
import WorkIcon from '@mui/icons-material/Work'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { DataTable } from '../../ui/DataTable'
import { ConfirmModal } from '../../ui/Modal'
import { useToast } from '../../components/ToastProvider'
import * as api from '../../api/client'
import { palette } from '../../theme'
import {
  normalizeJob,
  isActiveStatus,
  canRetryJob,
  canCancelJob,
  JobStatus,
} from '../../utils/jobStatus'

const STATUS_CONFIG = {
  pending: {
    icon: HourglassEmptyIcon,
    color: palette.yellow[400],
    bgColor: alpha(palette.yellow[400], 0.15),
    label: 'Pending',
  },
  running: {
    icon: PlayArrowIcon,
    color: palette.blue[400],
    bgColor: alpha(palette.blue[400], 0.15),
    label: 'Running',
  },
  completed: {
    icon: CheckCircleIcon,
    color: palette.green[400],
    bgColor: alpha(palette.green[400], 0.15),
    label: 'Completed',
  },
  failed: {
    icon: ErrorIcon,
    color: palette.red[400],
    bgColor: alpha(palette.red[400], 0.15),
    label: 'Failed',
  },
  cancelled: {
    icon: CancelIcon,
    color: palette.scale[500],
    bgColor: alpha(palette.scale[100], 0.08),
    label: 'Cancelled',
  },
  cancelling: {
    icon: HourglassEmptyIcon,
    color: palette.yellow[400],
    bgColor: alpha(palette.yellow[400], 0.15),
    label: 'Cancelling...',
  },
}

export default function JobsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancellingJob, setCancellingJob] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuJob, setMenuJob] = useState(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [detailsJob, setDetailsJob] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const pollIntervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const isUserActionInProgressRef = useRef(false)
  const abortControllerRef = useRef(null)

  const fetchJobs = useCallback(async (force = false) => {
    // Skip polling if a user action is in progress (unless forced)
    if (!force && isUserActionInProgressRef.current) {
      return
    }

    // Cancel any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const data = await api.listJobs({ limit: 50 })
      // Only update state if component is still mounted and no user action started
      if (isMountedRef.current && (force || !isUserActionInProgressRef.current)) {
        const normalized = Array.isArray(data.jobs) ? data.jobs.map((job) => normalizeJob(job)) : []
        setJobs(normalized)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch jobs:', err)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    setLoading(true)
    fetchJobs(true).finally(() => setLoading(false))

    pollIntervalRef.current = setInterval(() => fetchJobs(false), 5000)

    return () => {
      isMountedRef.current = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchJobs])

  const handleOpenMenu = useCallback((event, job) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuJob(job)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null)
    setMenuJob(null)
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await fetchJobs()
    setLoading(false)
    toast.show('Progress updated', 'info')
  }, [fetchJobs, toast])

  const handleCancelClick = useCallback(() => {
    setCancellingJob(menuJob)
    setCancelConfirmOpen(true)
    handleCloseMenu()
  }, [menuJob, handleCloseMenu])

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingJob) return

    // Prevent polling from overwriting our optimistic update
    isUserActionInProgressRef.current = true

    // Immediately update local state to show "cancelling" status
    setJobs((prev) =>
      prev.map((job) =>
        job.id === cancellingJob.id ? { ...job, status: JobStatus.CANCELLING } : job
      )
    )
    setCancelConfirmOpen(false)

    try {
      await api.cancelJob(cancellingJob.id)
      toast.show('Job cancelled', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to cancel job', 'error')
    } finally {
      setCancellingJob(null)
      isUserActionInProgressRef.current = false
      // Force refresh after action completes
      fetchJobs(true)
    }
  }, [cancellingJob, toast, fetchJobs])

  const handleDownload = useCallback(() => {
    if (menuJob?.artifacts?.html_url) {
      window.open(menuJob.artifacts.html_url, '_blank')
    }
    handleCloseMenu()
  }, [menuJob, handleCloseMenu])

  const handleViewDetails = useCallback(() => {
    setDetailsJob(menuJob)
    setDetailsDialogOpen(true)
    handleCloseMenu()
  }, [menuJob, handleCloseMenu])

  const handleRowClick = useCallback((row) => {
    setDetailsJob(row)
    setDetailsDialogOpen(true)
  }, [])

  const handleRetry = useCallback(async () => {
    if (!menuJob) return
    isUserActionInProgressRef.current = true
    setRetrying(true)
    handleCloseMenu()
    try {
      // Use the dedicated retry endpoint
      await api.retryJob(menuJob.id)
      toast.show('Job restarted successfully', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to retry job', 'error')
    } finally {
      setRetrying(false)
      isUserActionInProgressRef.current = false
      fetchJobs(true)
    }
  }, [menuJob, toast, fetchJobs, handleCloseMenu])

  const handleBulkCancelOpen = useCallback(() => {
    if (!selectedIds.length) return
    const hasActive = selectedIds.some((id) => {
      const job = jobs.find((item) => item.id === id)
      return isActiveStatus(job?.status)
    })
    if (!hasActive) {
      toast.show('Select running or pending jobs to cancel', 'warning')
      return
    }
    setBulkCancelOpen(true)
  }, [jobs, selectedIds, toast])

  const handleBulkCancelConfirm = useCallback(async () => {
    const activeIds = selectedIds.filter((id) => {
      const job = jobs.find((item) => item.id === id)
      return isActiveStatus(job?.status)
    })
    if (!activeIds.length) {
      toast.show('Select running or pending jobs to cancel', 'warning')
      setBulkCancelOpen(false)
      return
    }

    // Prevent polling from overwriting our optimistic update
    isUserActionInProgressRef.current = true

    // Immediately update local state to show "cancelling" status
    const activeIdSet = new Set(activeIds)
    setJobs((prev) =>
      prev.map((job) =>
        activeIdSet.has(job.id) ? { ...job, status: JobStatus.CANCELLING } : job
      )
    )
    setBulkCancelOpen(false)
    setBulkActionLoading(true)

    try {
      const result = await api.bulkCancelJobs(activeIds)
      const cancelledCount = result?.cancelledCount ?? result?.cancelled?.length ?? 0
      const failedCount = result?.failedCount ?? result?.failed?.length ?? 0
      if (failedCount > 0) {
        toast.show(
          `Cancelled ${cancelledCount} job${cancelledCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          'warning'
        )
      } else {
        toast.show(`Cancelled ${cancelledCount} job${cancelledCount !== 1 ? 's' : ''}`, 'success')
      }
    } catch (err) {
      toast.show(err.message || 'Failed to cancel jobs', 'error')
    } finally {
      setBulkActionLoading(false)
      isUserActionInProgressRef.current = false
      fetchJobs(true)
    }
  }, [selectedIds, jobs, toast, fetchJobs])

  const handleBulkDeleteOpen = useCallback(() => {
    if (!selectedIds.length) return
    setBulkDeleteOpen(true)
  }, [selectedIds])

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!selectedIds.length) {
      setBulkDeleteOpen(false)
      return
    }
    isUserActionInProgressRef.current = true
    setBulkActionLoading(true)
    try {
      const result = await api.bulkDeleteJobs(selectedIds)
      const deletedCount = result?.deletedCount ?? result?.deleted?.length ?? 0
      const failedCount = result?.failedCount ?? result?.failed?.length ?? 0
      if (failedCount > 0) {
        toast.show(
          `Deleted ${deletedCount} job${deletedCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          'warning'
        )
      } else {
        toast.show(`Deleted ${deletedCount} job${deletedCount !== 1 ? 's' : ''}`, 'success')
      }
    } catch (err) {
      toast.show(err.message || 'Failed to delete jobs', 'error')
    } finally {
      setBulkActionLoading(false)
      setBulkDeleteOpen(false)
      isUserActionInProgressRef.current = false
      fetchJobs(true)
    }
  }, [selectedIds, toast, fetchJobs])

  const columns = useMemo(() => [
    {
      field: 'id',
      headerName: 'Job ID',
      width: 160,
      renderCell: (value) => (
        <Typography
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: palette.scale[300],
          }}
        >
          {value?.slice(0, 12)}...
        </Typography>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (value) => (
        <Chip
          label={value || 'report'}
          size="small"
          sx={{
            bgcolor: alpha(palette.scale[100], 0.08),
            color: palette.scale[300],
            fontSize: '0.6875rem',
            textTransform: 'capitalize',
          }}
        />
      ),
    },
    {
      field: 'templateName',
      headerName: 'Design',
      renderCell: (value, row) => (
        <Box sx={{ color: palette.scale[200], fontSize: '0.8125rem' }}>
          {value || row.templateId?.slice(0, 12) || '-'}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (value) => {
        const config = STATUS_CONFIG[value] || STATUS_CONFIG.pending
        const Icon = config.icon

        return (
          <Chip
            icon={<Icon sx={{ fontSize: 14, color: config.color }} />}
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.bgColor,
              color: config.color,
              fontSize: '0.6875rem',
              fontWeight: 600,
              '& .MuiChip-icon': {
                ml: 0.5,
              },
            }}
          />
        )
      },
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 150,
      renderCell: (value, row) => {
        if (row.status === JobStatus.COMPLETED) {
          return (
            <Typography sx={{ fontSize: '0.75rem', color: palette.green[400] }}>
              100%
            </Typography>
          )
        }
        if (row.status === JobStatus.FAILED || row.status === JobStatus.CANCELLED) {
          return (
            <Typography sx={{ fontSize: '0.75rem', color: palette.scale[600] }}>
              -
            </Typography>
          )
        }
        const progress = value || 0
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: palette.scale[800],
                '& .MuiLinearProgress-bar': {
                  bgcolor: palette.green[400],
                  borderRadius: 2,
                },
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: palette.scale[400], minWidth: 32 }}>
              {progress}%
            </Typography>
          </Box>
        )
      },
    },
    {
      field: 'createdAt',
      headerName: 'Started',
      width: 180,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </Box>
      ),
    },
    {
      field: 'finishedAt',
      headerName: 'Completed',
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
        { value: 'pending', label: 'Pending' },
        { value: 'running', label: 'Running' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'run_report', label: 'Report' },
        { value: 'verify_template', label: 'Verify Template' },
        { value: 'verify_excel', label: 'Verify Excel' },
        { value: 'recommend_templates', label: 'Recommendations' },
        { value: 'summary_generate', label: 'Summary' },
        { value: 'summary_report', label: 'Report Summary' },
        { value: 'chart_analyze', label: 'Chart Analyze' },
        { value: 'chart_generate', label: 'Chart Generate' },
      ],
    },
  ], [])

  const activeSelectedCount = useMemo(() => {
    const activeSet = new Set(['running', 'pending'])
    const jobLookup = new Map(jobs.map((job) => [job.id, job.status]))
    return selectedIds.filter((id) => activeSet.has(jobLookup.get(id))).length
  }, [jobs, selectedIds])

  const bulkActions = useMemo(() => ([
    {
      label: 'Cancel',
      icon: <CancelIcon sx={{ fontSize: 16 }} />,
      onClick: handleBulkCancelOpen,
      disabled: bulkActionLoading,
    },
  ]), [bulkActionLoading, handleBulkCancelOpen])

  const activeJobsCount = useMemo(() =>
    jobs.filter((j) => isActiveStatus(j.status)).length
  , [jobs])

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <DataTable
        title="Report Progress"
        subtitle={activeJobsCount > 0 ? `${activeJobsCount} report${activeJobsCount > 1 ? 's' : ''} generating` : 'All reports complete'}
        columns={columns}
        data={jobs}
        loading={loading}
        searchPlaceholder="Search reports..."
        filters={filters}
        selectable
        onSelectionChange={setSelectedIds}
        onRowClick={handleRowClick}
        bulkActions={bulkActions}
        onBulkDelete={handleBulkDeleteOpen}
        actions={[
          {
            label: 'Refresh',
            icon: <RefreshIcon sx={{ fontSize: 18 }} />,
            variant: 'outlined',
            onClick: handleRefresh,
          },
        ]}
        onRefresh={handleRefresh}
        rowActions={(row) => (
          <Tooltip title="More actions">
            <IconButton
              size="small"
              onClick={(e) => handleOpenMenu(e, row)}
              aria-label="More actions"
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
          </Tooltip>
        )}
        emptyState={{
          icon: WorkIcon,
          title: 'No reports in progress',
          description: 'When you create a report, you can track its progress here.',
          actionLabel: 'Create Report',
          onAction: () => navigate('/reports'),
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
        <MenuItem onClick={handleViewDetails} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><VisibilityIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>View Details</ListItemText>
        </MenuItem>
        {menuJob?.status === JobStatus.COMPLETED && menuJob?.artifacts?.html_url && (
          <MenuItem onClick={handleDownload} sx={{ color: palette.scale[200] }}>
            <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Download</ListItemText>
          </MenuItem>
        )}
        {canRetryJob(menuJob?.status) && (
          <MenuItem onClick={handleRetry} disabled={retrying} sx={{ color: palette.scale[200] }}>
            <ListItemIcon><ReplayIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>
              {retrying ? 'Retrying...' : 'Retry'}
            </ListItemText>
          </MenuItem>
        )}
        {canCancelJob(menuJob?.status) && (
          <MenuItem onClick={handleCancelClick} sx={{ color: palette.red[400] }}>
            <ListItemIcon><CancelIcon sx={{ fontSize: 16, color: palette.red[400] }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Cancel</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Cancel Confirmation */}
      <ConfirmModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Job"
        message={`Are you sure you want to cancel this job? This action cannot be undone.`}
        confirmLabel="Cancel Job"
        severity="warning"
      />

      <ConfirmModal
        open={bulkCancelOpen}
        onClose={() => setBulkCancelOpen(false)}
        onConfirm={handleBulkCancelConfirm}
        title="Cancel Jobs"
        message={`Cancel ${activeSelectedCount} running job${activeSelectedCount !== 1 ? 's' : ''}?`}
        confirmLabel="Cancel Jobs"
        severity="warning"
        loading={bulkActionLoading}
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Jobs"
        message={(() => {
          const selectedJobs = jobs.filter((j) => selectedIds.includes(j.id))
          const names = selectedJobs.slice(0, 3).map((j) => j.templateName || j.id?.slice(0, 8) || 'Unknown')
          const namesList = names.join(', ')
          const remaining = selectedIds.length - 3
          const suffix = remaining > 0 ? ` and ${remaining} more` : ''
          return `Delete ${selectedIds.length} job${selectedIds.length !== 1 ? 's' : ''} (${namesList}${suffix}) from history? This action cannot be undone.`
        })()}
        confirmLabel="Delete Jobs"
        severity="error"
        loading={bulkActionLoading}
      />

      {/* Job Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: palette.scale[900],
            border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: palette.scale[100] }}>
          Job Details
          <Tooltip title="Close">
            <IconButton size="small" onClick={() => setDetailsDialogOpen(false)} aria-label="Close dialog" sx={{ color: palette.scale[500] }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: alpha(palette.scale[100], 0.1) }}>
          {detailsJob && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ color: palette.scale[500] }}>Job ID</Typography>
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: palette.scale[200] }}>
                  {detailsJob.id}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
              <Box>
                <Typography variant="caption" sx={{ color: palette.scale[500] }}>Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {(() => {
                    const config = STATUS_CONFIG[detailsJob.status] || STATUS_CONFIG.pending
                    const Icon = config.icon
                    return (
                      <Chip
                        icon={<Icon sx={{ fontSize: 14, color: config.color }} />}
                        label={config.label}
                        size="small"
                        sx={{
                          bgcolor: config.bgColor,
                          color: config.color,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                        }}
                      />
                    )
                  })()}
                </Box>
              </Box>
              <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
              <Box>
                <Typography variant="caption" sx={{ color: palette.scale[500] }}>Template</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                  {detailsJob.templateName || detailsJob.templateId || detailsJob.template_id || '-'}
                </Typography>
              </Box>
              {(detailsJob.connectionId || detailsJob.connection_id) && (
                <>
                  <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.scale[500] }}>Connection ID</Typography>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: palette.scale[300] }}>
                      {detailsJob.connectionId || detailsJob.connection_id}
                    </Typography>
                  </Box>
                </>
              )}
              <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
              <Box>
                <Typography variant="caption" sx={{ color: palette.scale[500] }}>Created</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                  {detailsJob.createdAt ? new Date(detailsJob.createdAt).toLocaleString() : '-'}
                </Typography>
              </Box>
              {(detailsJob.finishedAt || detailsJob.completed_at) && (
                <>
                  <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.scale[500] }}>Completed</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                      {new Date(detailsJob.finishedAt || detailsJob.completed_at).toLocaleString()}
                    </Typography>
                  </Box>
                </>
              )}
              {detailsJob.error && (
                <>
                  <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
                  <Alert severity="error" sx={{ bgcolor: alpha(palette.red[400], 0.1), color: palette.red[300] }}>
                    {detailsJob.error}
                  </Alert>
                </>
              )}
              {(() => {
                const resultPayload = detailsJob?.result && Object.keys(detailsJob.result || {}).length
                  ? detailsJob.result
                  : null
                if (!resultPayload) return null
                const summaryText = typeof resultPayload.summary === 'string' ? resultPayload.summary : null
                const bodyText = summaryText || JSON.stringify(resultPayload, null, 2)
                return (
                  <>
                    <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: palette.scale[500] }}>Result</Typography>
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: alpha(palette.scale[100], 0.06),
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          color: palette.scale[200],
                          maxHeight: 260,
                          overflow: 'auto',
                        }}
                      >
                        {bodyText}
                      </Box>
                    </Box>
                  </>
                )
              })()}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}`, px: 2, py: 1.5 }}>
          {detailsJob?.status === JobStatus.COMPLETED && detailsJob?.artifacts?.html_url && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={() => window.open(detailsJob.artifacts.html_url, '_blank')}
              sx={{ textTransform: 'none' }}
            >
              Download
            </Button>
          )}
          {canRetryJob(detailsJob?.status) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}
              disabled={retrying}
              onClick={async () => {
                setRetrying(true)
                try {
                  await api.retryJob(detailsJob.id)
                  toast.show('Job restarted successfully', 'success')
                  setDetailsDialogOpen(false)
                  fetchJobs()
                } catch (err) {
                  toast.show(err.message || 'Failed to retry job', 'error')
                } finally {
                  setRetrying(false)
                }
              }}
              sx={{ textTransform: 'none' }}
            >
              {retrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
          <Button onClick={() => setDetailsDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
