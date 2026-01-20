import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, alpha } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionIcon from '@mui/icons-material/Description'
import TableChartIcon from '@mui/icons-material/TableChart'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import { DataTable } from '../../ui/DataTable'
import { ConfirmModal } from '../../ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import * as api from '../../api/client'
import { palette } from '../../theme'

const KIND_CONFIG = {
  pdf: {
    icon: PictureAsPdfIcon,
    color: palette.red[400],
    bgColor: alpha(palette.red[400], 0.15),
  },
  excel: {
    icon: TableChartIcon,
    color: palette.green[400],
    bgColor: alpha(palette.green[400], 0.15),
  },
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const templates = useAppStore((s) => s.templates)
  const setTemplates = useAppStore((s) => s.setTemplates)
  const removeTemplate = useAppStore((s) => s.removeTemplate)

  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuTemplate, setMenuTemplate] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const didLoadRef = useRef(false)

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        const data = await api.listApprovedTemplates()
        setTemplates(data)
      } catch (err) {
        toast.show(err.message || 'Failed to load templates', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [setTemplates, toast])

  const handleOpenMenu = useCallback((event, template) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuTemplate(template)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null)
    setMenuTemplate(null)
  }, [])

  const handleAddTemplate = useCallback(() => {
    navigate('/setup')
  }, [navigate])

  const handleEditTemplate = useCallback(() => {
    if (menuTemplate) {
      navigate(`/templates/${menuTemplate.id}/edit`)
    }
    handleCloseMenu()
  }, [menuTemplate, navigate, handleCloseMenu])

  const handleDeleteClick = useCallback(() => {
    setDeletingTemplate(menuTemplate)
    setDeleteConfirmOpen(true)
    handleCloseMenu()
  }, [menuTemplate, handleCloseMenu])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingTemplate) return
    setLoading(true)
    try {
      await api.deleteTemplate(deletingTemplate.id)
      removeTemplate(deletingTemplate.id)
      toast.show('Template deleted', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to delete template', 'error')
    } finally {
      setLoading(false)
      setDeleteConfirmOpen(false)
      setDeletingTemplate(null)
    }
  }, [deletingTemplate, removeTemplate, toast])

  const handleExport = useCallback(async () => {
    if (!menuTemplate) return
    try {
      await api.exportTemplateZip(menuTemplate.id)
      toast.show('Template exported', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to export template', 'error')
    }
    handleCloseMenu()
  }, [menuTemplate, toast, handleCloseMenu])

  const handleDuplicate = useCallback(async () => {
    if (!menuTemplate) return
    setDuplicating(true)
    handleCloseMenu()
    try {
      const result = await api.duplicateTemplate(menuTemplate.id)
      const duplicatedName = result?.name || (menuTemplate.name ? `${menuTemplate.name} (Copy)` : 'Template (Copy)')
      // Refresh templates list to include the new copy
      const data = await api.listApprovedTemplates()
      setTemplates(data)
      toast.show(`Template duplicated as "${duplicatedName}"`, 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to duplicate template', 'error')
    } finally {
      setDuplicating(false)
    }
  }, [menuTemplate, toast, handleCloseMenu, setTemplates])

  const handleRowClick = useCallback((row) => {
    navigate(`/reports?template=${row.id}`)
  }, [navigate])

  const columns = useMemo(() => [
    {
      field: 'name',
      headerName: 'Template',
      renderCell: (value, row) => {
        const config = KIND_CONFIG[row.kind] || KIND_CONFIG.pdf
        const Icon = config.icon
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: config.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ color: config.color, fontSize: 18 }} />
            </Box>
            <Box>
              <Box sx={{ fontWeight: 500, fontSize: '0.8125rem', color: palette.scale[100] }}>
                {value || row.id}
              </Box>
              <Box sx={{ fontSize: '0.75rem', color: palette.scale[500] }}>
                {row.description || `${row.kind?.toUpperCase() || 'PDF'} Template`}
              </Box>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'kind',
      headerName: 'Type',
      width: 100,
      renderCell: (value) => {
        const config = KIND_CONFIG[value] || KIND_CONFIG.pdf
        return (
          <Chip
            label={value?.toUpperCase() || 'PDF'}
            size="small"
            sx={{
              bgcolor: config.bgColor,
              color: config.color,
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          />
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (value) => (
        <Chip
          label={value || 'approved'}
          size="small"
          color={value === 'approved' ? 'success' : 'default'}
          sx={{
            fontSize: '0.6875rem',
            textTransform: 'capitalize',
          }}
        />
      ),
    },
    {
      field: 'tokens_count',
      headerName: 'Fields',
      width: 80,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value || '-'}
        </Box>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 150,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Box>
      ),
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      width: 150,
      renderCell: (value) => (
        <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Box>
      ),
    },
  ], [])

  const filters = useMemo(() => [
    {
      key: 'kind',
      label: 'Type',
      options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'excel', label: 'Excel' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'pending', label: 'Pending' },
        { value: 'draft', label: 'Draft' },
      ],
    },
  ], [])

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <DataTable
        title="Templates"
        subtitle="Manage your report templates"
        columns={columns}
        data={templates}
        loading={loading}
        searchPlaceholder="Search templates..."
        filters={filters}
        actions={[
          {
            label: 'Upload Template',
            icon: <AddIcon sx={{ fontSize: 18 }} />,
            variant: 'contained',
            onClick: handleAddTemplate,
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
          icon: DescriptionIcon,
          title: 'No templates yet',
          description: 'Upload a PDF or Excel template to start generating reports.',
          actionLabel: 'Upload Template',
          onAction: handleAddTemplate,
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
        <MenuItem onClick={handleEditTemplate} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><EditIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExport} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Export</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate} disabled={duplicating} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><ContentCopyIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>{duplicating ? 'Duplicating...' : 'Duplicate'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: palette.red[400] }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: palette.red[400] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete "${deletingTemplate?.name || deletingTemplate?.id}"? This action cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
        loading={loading}
      />
    </Box>
  )
}
