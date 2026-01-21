import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Button,
  Tooltip,
  alpha,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import HistoryIcon from '@mui/icons-material/History'
import DownloadIcon from '@mui/icons-material/Download'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableChartIcon from '@mui/icons-material/TableChart'
import ArticleIcon from '@mui/icons-material/Article'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CancelIcon from '@mui/icons-material/Cancel'
import { DataTable } from '../../ui/DataTable'
import { useToast } from '../../components/ToastProvider'
import { useAppStore } from '../../store/useAppStore'
import * as api from '../../api/client'
import { palette } from '../../theme'

const STATUS_CONFIG = {
  completed: { icon: CheckCircleIcon, color: 'success', label: 'Completed' },
  failed: { icon: ErrorIcon, color: 'error', label: 'Failed' },
  running: { icon: HourglassEmptyIcon, color: 'info', label: 'Running' },
  pending: { icon: HourglassEmptyIcon, color: 'warning', label: 'Pending' },
  cancelled: { icon: CancelIcon, color: 'default', label: 'Cancelled' },
}

const KIND_CONFIG = {
  pdf: { icon: PictureAsPdfIcon, color: palette.red[400] },
  excel: { icon: TableChartIcon, color: palette.green[400] },
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const templates = useAppStore((s) => s.templates)
  const didLoadRef = useRef(false)

  const initialStatus = searchParams.get('status') || ''
  const initialTemplate = searchParams.get('template') || ''

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [templateFilter, setTemplateFilter] = useState(initialTemplate)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getReportHistory({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        status: statusFilter || undefined,
        templateId: templateFilter || undefined,
      })
      setHistory(data?.history || [])
      setTotal(data?.total || 0)
    } catch (err) {
      toast.show(err.message || 'Failed to load report history', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, statusFilter, templateFilter, toast])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    const nextStatus = searchParams.get('status') || ''
    const nextTemplate = searchParams.get('template') || ''
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
    if (nextTemplate !== templateFilter) setTemplateFilter(nextTemplate)
  }, [searchParams, statusFilter, templateFilter])

  useEffect(() => {
    if (!didLoadRef.current) return
    fetchHistory()
  }, [page, rowsPerPage, statusFilter, templateFilter, fetchHistory])

  const syncParams = useCallback((nextStatus, nextTemplate) => {
    const next = new URLSearchParams(searchParams)
    if (nextStatus) next.set('status', nextStatus)
    else next.delete('status')
    if (nextTemplate) next.set('template', nextTemplate)
    else next.delete('template')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleDownload = useCallback((report, format) => {
    const artifacts = report.artifacts || {}
    let url = null

    if (format === 'pdf' && artifacts.pdf_url) url = artifacts.pdf_url
    else if (format === 'html' && artifacts.html_url) url = artifacts.html_url
    else if (format === 'docx' && artifacts.docx_url) url = artifacts.docx_url
    else if (format === 'xlsx' && artifacts.xlsx_url) url = artifacts.xlsx_url

    if (url) {
      window.open(url, '_blank')
    } else {
      toast.show('Download not available', 'warning')
    }
  }, [toast])

  const handleRowClick = useCallback((row) => {
    // Open HTML preview if available, otherwise show first available artifact
    const artifacts = row.artifacts || {}
    if (artifacts.html_url) {
      window.open(artifacts.html_url, '_blank')
    } else if (artifacts.pdf_url) {
      window.open(artifacts.pdf_url, '_blank')
    } else {
      navigate('/jobs')
    }
  }, [navigate])

  const columns = [
    {
      field: 'templateName',
      headerName: 'Template',
      renderCell: (value, row) => {
        const kind = row.templateKind || 'pdf'
        const cfg = KIND_CONFIG[kind] || KIND_CONFIG.pdf
        const Icon = cfg.icon
        return (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '6px',
                bgcolor: alpha(cfg.color, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ fontSize: 16, color: cfg.color }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: palette.scale[200] }}>
                {value || 'Unknown'}
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: palette.scale[500] }}>
                {kind.toUpperCase()}
              </Typography>
            </Box>
          </Stack>
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (value) => {
        const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.pending
        return (
          <Chip
            icon={<cfg.icon sx={{ fontSize: 14 }} />}
            label={cfg.label}
            size="small"
            color={cfg.color}
            sx={{ fontSize: '0.6875rem' }}
          />
        )
      },
    },
    {
      field: 'createdAt',
      headerName: 'Started',
      width: 160,
      renderCell: (value) => (
        <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[400] }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'completedAt',
      headerName: 'Completed',
      width: 160,
      renderCell: (value) => (
        <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[400] }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'artifacts',
      headerName: 'Downloads',
      width: 140,
      renderCell: (value, row) => {
        const artifacts = value || {}
        const hasAny = artifacts.pdf_url || artifacts.html_url || artifacts.docx_url || artifacts.xlsx_url
        if (!hasAny) {
          return (
            <Typography sx={{ fontSize: '0.75rem', color: palette.scale[600] }}>
              {row.status === 'completed' ? 'No files' : '-'}
            </Typography>
          )
        }
        return (
          <Stack direction="row" spacing={0.5}>
            {artifacts.pdf_url && (
              <Tooltip title="Download PDF">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleDownload(row, 'pdf') }}
                  sx={{ color: palette.red[400] }}
                >
                  <PictureAsPdfIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {artifacts.html_url && (
              <Tooltip title="View HTML">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleDownload(row, 'html') }}
                  sx={{ color: palette.blue[400] }}
                >
                  <VisibilityIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {artifacts.docx_url && (
              <Tooltip title="Download DOCX">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleDownload(row, 'docx') }}
                  sx={{ color: palette.blue[400] }}
                >
                  <ArticleIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {artifacts.xlsx_url && (
              <Tooltip title="Download XLSX">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleDownload(row, 'xlsx') }}
                  sx={{ color: palette.green[400] }}
                >
                  <TableChartIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )
      },
    },
  ]

  const filters = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'running', label: 'Running' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
  ]

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} color={palette.scale[100]}>
            Report History
          </Typography>
          <Typography variant="body2" color={palette.scale[500]}>
            View and download previously generated reports
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={fetchHistory}
            disabled={loading}
            sx={{ color: palette.scale[400] }}
          >
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
          <Button
            variant="contained"
            onClick={() => navigate('/reports')}
            sx={{ px: 2 }}
          >
            Generate New
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: palette.scale[500] }}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              const nextStatus = e.target.value
              setStatusFilter(nextStatus)
              setPage(0)
              syncParams(nextStatus, templateFilter)
            }}
            label="Status"
            sx={{
              color: palette.scale[200],
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(palette.scale[100], 0.15),
              },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="running">Running</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: palette.scale[500] }}>Template</InputLabel>
          <Select
            value={templateFilter}
            onChange={(e) => {
              const nextTemplate = e.target.value
              setTemplateFilter(nextTemplate)
              setPage(0)
              syncParams(statusFilter, nextTemplate)
            }}
            label="Template"
            sx={{
              color: palette.scale[200],
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(palette.scale[100], 0.15),
              },
            }}
          >
            <MenuItem value="">All Templates</MenuItem>
            {templates.map((tpl) => (
              <MenuItem key={tpl.id} value={tpl.id}>
                {tpl.name || tpl.id.slice(0, 12)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* History Table */}
      <Box
        sx={{
          bgcolor: palette.scale[1000],
          borderRadius: '8px',
          border: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          overflow: 'hidden',
        }}
      >
        {loading && history.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : history.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 48, color: palette.scale[700], mb: 2 }} />
            <Typography sx={{ fontSize: '0.875rem', color: palette.scale[500] }}>
              No report history found
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: palette.scale[600], mt: 0.5 }}>
              Generate reports to see them here
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/reports')}
              sx={{ mt: 2 }}
            >
              Generate Report
            </Button>
          </Box>
        ) : (
          <DataTable
            columns={columns}
            data={history}
            loading={loading}
            searchPlaceholder="Search reports..."
            onRowClick={handleRowClick}
            pagination={{
              page,
              rowsPerPage,
              total,
              onPageChange: setPage,
              onRowsPerPageChange: (val) => { setRowsPerPage(val); setPage(0) },
            }}
          />
        )}
      </Box>
    </Box>
  )
}
