import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
}

export default function JobsPage() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancellingJob, setCancellingJob] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuJob, setMenuJob] = useState(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [detailsJob, setDetailsJob] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const pollIntervalRef = useRef(null)

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.listJobs({ limit: 50 })
      setJobs(data.jobs || [])
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchJobs().finally(() => setLoading(false))

    pollIntervalRef.current = setInterval(fetchJobs, 5000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
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
    toast.show('Jobs refreshed', 'info')
  }, [fetchJobs, toast])

  const handleCancelClick = useCallback(() => {
    setCancellingJob(menuJob)
    setCancelConfirmOpen(true)
    handleCloseMenu()
  }, [menuJob, handleCloseMenu])

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingJob) return
    try {
      await api.cancelJob(cancellingJob.id)
      toast.show('Job cancelled', 'success')
      fetchJobs()
    } catch (err) {
      toast.show(err.message || 'Failed to cancel job', 'error')
    } finally {
      setCancelConfirmOpen(false)
      setCancellingJob(null)
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

  const handleRetry = useCallback(async () => {
    if (!menuJob) return
    setRetrying(true)
    try {
      // Re-run the job with the same parameters
      const kind = menuJob.template_kind || 'pdf'
      await api.runReportAsJob({
        templateId: menuJob.template_id,
        templateName: menuJob.template_name,
        connectionId: menuJob.connection_id,
        startDate: menuJob.start_date,
        endDate: menuJob.end_date,
        keyValues: menuJob.key_values,
        kind,
      })
      toast.show('Job restarted successfully', 'success')
      fetchJobs()
    } catch (err) {
      toast.show(err.message || 'Failed to retry job', 'error')
    } finally {
      setRetrying(false)
      handleCloseMenu()
    }
  }, [menuJob, toast, fetchJobs, handleCloseMenu])

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
      field: 'template_name',
      headerName: 'Template',
      renderCell: (value, row) => (
        <Box sx={{ color: palette.scale[200], fontSize: '0.8125rem' }}>
          {value || row.template_id?.slice(0, 12) || '-'}
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
        if (row.status === 'completed') {
          return (
            <Typography sx={{ fontSize: '0.75rem', color: palette.green[400] }}>
              100%
            </Typography>
          )
        }
        if (row.status === 'failed' || row.status === 'cancelled') {
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
      field: 'created_at',
      headerName: 'Started',
      width: 180,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </Box>
      ),
    },
    {
      field: 'completed_at',
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
        { value: 'report', label: 'Report' },
        { value: 'batch', label: 'Batch' },
        { value: 'schedule', label: 'Schedule' },
      ],
    },
  ], [])

  const activeJobsCount = useMemo(() =>
    jobs.filter((j) => j.status === 'running' || j.status === 'pending').length
  , [jobs])

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <DataTable
        title="Jobs"
        subtitle={activeJobsCount > 0 ? `${activeJobsCount} active job${activeJobsCount > 1 ? 's' : ''}` : 'All jobs completed'}
        columns={columns}
        data={jobs}
        loading={loading}
        searchPlaceholder="Search jobs..."
        filters={filters}
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
          icon: WorkIcon,
          title: 'No jobs yet',
          description: 'Jobs will appear here when you generate reports.',
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
        {menuJob?.status === 'completed' && menuJob?.artifacts?.html_url && (
          <MenuItem onClick={handleDownload} sx={{ color: palette.scale[200] }}>
            <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Download</ListItemText>
          </MenuItem>
        )}
        {menuJob?.status === 'failed' && (
          <MenuItem onClick={handleRetry} disabled={retrying} sx={{ color: palette.scale[200] }}>
            <ListItemIcon><ReplayIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>
              {retrying ? 'Retrying...' : 'Retry'}
            </ListItemText>
          </MenuItem>
        )}
        {(menuJob?.status === 'pending' || menuJob?.status === 'running') && (
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
          <IconButton size="small" onClick={() => setDetailsDialogOpen(false)} sx={{ color: palette.scale[500] }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
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
                  {detailsJob.template_name || detailsJob.template_id || '-'}
                </Typography>
              </Box>
              {detailsJob.connection_id && (
                <>
                  <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.scale[500] }}>Connection ID</Typography>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: palette.scale[300] }}>
                      {detailsJob.connection_id}
                    </Typography>
                  </Box>
                </>
              )}
              <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
              <Box>
                <Typography variant="caption" sx={{ color: palette.scale[500] }}>Created</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                  {detailsJob.created_at ? new Date(detailsJob.created_at).toLocaleString() : '-'}
                </Typography>
              </Box>
              {detailsJob.completed_at && (
                <>
                  <Divider sx={{ borderColor: alpha(palette.scale[100], 0.08) }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.scale[500] }}>Completed</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}>
                      {new Date(detailsJob.completed_at).toLocaleString()}
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
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}`, px: 2, py: 1.5 }}>
          {detailsJob?.status === 'completed' && detailsJob?.artifacts?.html_url && (
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
          <Button onClick={() => setDetailsDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
