import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SettingsIcon from '@mui/icons-material/Settings'
import DescriptionIcon from '@mui/icons-material/Description'
import TableChartIcon from '@mui/icons-material/TableChart'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ArchiveIcon from '@mui/icons-material/Archive'
import LabelIcon from '@mui/icons-material/Label'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { DataTable } from '../../ui/DataTable'
import { ConfirmModal } from '../../ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import FavoriteButton from '../../components/FavoriteButton'
import * as api from '../../api/client'
import * as recommendationsApi from '../../api/recommendations'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const templates = useAppStore((s) => s.templates)
  const setTemplates = useAppStore((s) => s.setTemplates)
  const removeTemplate = useAppStore((s) => s.removeTemplate)
  const updateTemplate = useAppStore((s) => s.updateTemplate)

  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuTemplate, setMenuTemplate] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [metadataTemplate, setMetadataTemplate] = useState(null)
  const [metadataForm, setMetadataForm] = useState({ name: '', description: '', tags: '', status: 'approved' })
  const [metadataSaving, setMetadataSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importName, setImportName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [allTags, setAllTags] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('approved')
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false)
  const [bulkTags, setBulkTags] = useState('')
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const didLoadRef = useRef(false)
  const [similarOpen, setSimilarOpen] = useState(false)
  const [similarTemplate, setSimilarTemplate] = useState(null)
  const [similarTemplates, setSimilarTemplates] = useState([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [favorites, setFavorites] = useState(new Set())

  const kindFilter = searchParams.get('kind') || ''
  const statusParam = searchParams.get('status') || ''

  const filteredTemplates = useMemo(() => {
    let data = templates
    if (kindFilter) {
      data = data.filter((tpl) => (tpl.kind || '').toLowerCase() === kindFilter.toLowerCase())
    }
    if (statusParam) {
      data = data.filter((tpl) => (tpl.status || '').toLowerCase() === statusParam.toLowerCase())
    }
    return data
  }, [templates, kindFilter, statusParam])

  const clearQuickFilter = useCallback((key) => {
    const next = new URLSearchParams(searchParams)
    next.delete(key)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const fetchTemplatesData = useCallback(async () => {
    setLoading(true)
    try {
      const [templatesData, tagsData, favoritesData] = await Promise.all([
        api.listApprovedTemplates(),
        api.getAllTemplateTags(),
        api.getFavorites().catch(() => ({ templates: [] })),
      ])
      setTemplates(templatesData)
      setAllTags(tagsData.tags || [])
      const favIds = (favoritesData.templates || []).map((t) => t.id)
      setFavorites(new Set(favIds))
    } catch (err) {
      toast.show(err.message || 'Failed to load designs', 'error')
    } finally {
      setLoading(false)
    }
  }, [setTemplates, toast])

  const handleFavoriteToggle = useCallback((templateId, isFavorite) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFavorite) {
        next.add(templateId)
      } else {
        next.delete(templateId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    fetchTemplatesData()
  }, [fetchTemplatesData])

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
    navigate('/setup/wizard')
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
    const templateToDelete = deletingTemplate
    const templateData = templates.find((t) => t.id === templateToDelete.id)

    // Optimistically remove from UI
    removeTemplate(templateToDelete.id)
    setDeleteConfirmOpen(false)
    setDeletingTemplate(null)

    // Set up delayed actual delete
    let undone = false
    const deleteTimeout = setTimeout(async () => {
      if (undone) return
      try {
        await api.deleteTemplate(templateToDelete.id)
      } catch (err) {
        // If delete fails, restore the template
        if (templateData) {
          setTemplates((prev) => [...prev, templateData])
        }
        toast.show(err.message || 'Failed to delete template', 'error')
      }
    }, 5000)

    // Show undo toast
    toast.showWithUndo(
      `"${templateToDelete.name || templateToDelete.id}" removed`,
      () => {
        undone = true
        clearTimeout(deleteTimeout)
        // Restore template
        if (templateData) {
          setTemplates((prev) => [...prev, templateData])
        }
        toast.show('Design restored', 'success')
      },
      { severity: 'info' }
    )
  }, [deletingTemplate, templates, removeTemplate, setTemplates, toast])

  const handleExport = useCallback(async () => {
    if (!menuTemplate) return
    try {
      await api.exportTemplateZip(menuTemplate.id)
      toast.show('Design exported', 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to export design', 'error')
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
      toast.show(`Design copied as "${duplicatedName}"`, 'success')
    } catch (err) {
      toast.show(err.message || 'Failed to copy design', 'error')
    } finally {
      setDuplicating(false)
    }
  }, [menuTemplate, toast, handleCloseMenu, setTemplates])

  const handleEditMetadata = useCallback(() => {
    if (!menuTemplate) return
    setMetadataTemplate(menuTemplate)
    setMetadataForm({
      name: menuTemplate.name || '',
      description: menuTemplate.description || '',
      tags: Array.isArray(menuTemplate.tags) ? menuTemplate.tags.join(', ') : '',
      status: menuTemplate.status || 'approved',
    })
    setMetadataOpen(true)
    handleCloseMenu()
  }, [menuTemplate, handleCloseMenu])

  const handleViewSimilar = useCallback(async () => {
    if (!menuTemplate) return
    setSimilarTemplate(menuTemplate)
    setSimilarOpen(true)
    setSimilarLoading(true)
    setSimilarTemplates([])
    handleCloseMenu()
    try {
      const response = await api.getSimilarTemplates(menuTemplate.id)
      setSimilarTemplates(response.similar || [])
    } catch (err) {
      console.error('Failed to fetch similar designs:', err)
      toast.show('Failed to load similar designs', 'error')
    } finally {
      setSimilarLoading(false)
    }
  }, [menuTemplate, handleCloseMenu, toast])

  const handleSelectSimilarTemplate = useCallback((template) => {
    setSimilarOpen(false)
    navigate(`/reports?template=${template.id}`)
  }, [navigate])

  const handleMetadataSave = useCallback(async () => {
    if (!metadataTemplate) return
    const trimmedName = metadataForm.name.trim()
    if (!trimmedName) {
      toast.show('Design name is required', 'error')
      return
    }
    if (trimmedName.length > 200) {
      toast.show('Design name must be 200 characters or less', 'error')
      return
    }
    // Validate tags (max 50 chars each per backend requirement)
    const tags = metadataForm.tags
      ? metadataForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : []
    const invalidTag = tags.find((tag) => tag.length > 50)
    if (invalidTag) {
      toast.show(`Tag "${invalidTag.slice(0, 20)}..." exceeds 50 character limit`, 'error')
      return
    }
    setMetadataSaving(true)
    const payload = {
      name: trimmedName,
      description: metadataForm.description.trim() || undefined,
      status: metadataForm.status,
      tags,
    }
    try {
      const result = await api.updateTemplateMetadata(metadataTemplate.id, payload)
      const updated = result?.template || { ...metadataTemplate, ...payload }
      updateTemplate(metadataTemplate.id, (tpl) => ({ ...tpl, ...updated }))
      toast.show('Design details updated', 'success')
      setMetadataOpen(false)
    } catch (err) {
      toast.show(err.message || 'Failed to update design details', 'error')
    } finally {
      setMetadataSaving(false)
    }
  }, [metadataTemplate, metadataForm, updateTemplate, toast])

  const handleOpenImport = useCallback(() => {
    setImportOpen(true)
  }, [])

  const handleImport = useCallback(async () => {
    if (!importFile) {
      toast.show('Select a design backup file first', 'error')
      return
    }
    // Validate file extension
    const fileName = importFile.name || ''
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext !== 'zip') {
      toast.show('Invalid file type. Please select a .zip file', 'error')
      return
    }
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (importFile.size > maxSize) {
      toast.show('File too large. Maximum size is 50MB', 'error')
      return
    }
    setImporting(true)
    setImportProgress(0)
    try {
      await api.importTemplateZip({
        file: importFile,
        name: importName.trim() || undefined,
        onUploadProgress: (percent) => setImportProgress(percent),
      })
      const data = await api.listApprovedTemplates()
      setTemplates(data)
      toast.show('Design imported', 'success')
      setImportOpen(false)
      setImportFile(null)
      setImportName('')
    } catch (err) {
      toast.show(err.message || 'Failed to import design', 'error')
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }, [importFile, importName, toast, setTemplates])

  const handleBulkDeleteOpen = useCallback(() => {
    if (!selectedIds.length) return
    setBulkDeleteOpen(true)
  }, [selectedIds])

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!selectedIds.length) {
      setBulkDeleteOpen(false)
      return
    }
    setBulkActionLoading(true)
    try {
      const result = await api.bulkDeleteTemplates(selectedIds)
      const deletedCount = result?.deletedCount ?? result?.deleted?.length ?? 0
      const failedCount = result?.failedCount ?? result?.failed?.length ?? 0
      if (failedCount > 0) {
        toast.show(
          `Removed ${deletedCount} design${deletedCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          'warning'
        )
      } else {
        toast.show(`Removed ${deletedCount} design${deletedCount !== 1 ? 's' : ''}`, 'success')
      }
      await fetchTemplatesData()
    } catch (err) {
      toast.show(err.message || 'Failed to remove designs', 'error')
    } finally {
      setBulkActionLoading(false)
      setBulkDeleteOpen(false)
    }
  }, [selectedIds, toast, fetchTemplatesData])

  const handleBulkStatusApply = useCallback(async () => {
    if (!selectedIds.length) {
      setBulkStatusOpen(false)
      return
    }
    setBulkActionLoading(true)
    try {
      const result = await api.bulkUpdateTemplateStatus(selectedIds, bulkStatus)
      const updatedCount = result?.updatedCount ?? result?.updated?.length ?? 0
      const failedCount = result?.failedCount ?? result?.failed?.length ?? 0
      if (failedCount > 0) {
        toast.show(
          `Updated ${updatedCount} design${updatedCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          'warning'
        )
      } else {
        toast.show(
          `Updated ${updatedCount} design${updatedCount !== 1 ? 's' : ''}`,
          'success'
        )
      }
      await fetchTemplatesData()
      setBulkStatusOpen(false)
    } catch (err) {
      toast.show(err.message || 'Failed to update status', 'error')
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedIds, bulkStatus, toast, fetchTemplatesData])

  const handleBulkTagsApply = useCallback(async () => {
    if (!selectedIds.length) {
      setBulkTagsOpen(false)
      return
    }
    const tags = bulkTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (!tags.length) {
      toast.show('Enter at least one tag', 'error')
      return
    }
    // Validate tag length (max 50 chars per backend requirement)
    const invalidTag = tags.find((tag) => tag.length > 50)
    if (invalidTag) {
      toast.show(`Tag "${invalidTag.slice(0, 20)}..." exceeds 50 character limit`, 'error')
      return
    }
    setBulkActionLoading(true)
    try {
      const result = await api.bulkAddTemplateTags(selectedIds, tags)
      const updatedCount = result?.updatedCount ?? result?.updated?.length ?? 0
      const failedCount = result?.failedCount ?? result?.failed?.length ?? 0
      if (failedCount > 0) {
        toast.show(
          `Tagged ${updatedCount} design${updatedCount !== 1 ? 's' : ''}, ${failedCount} failed`,
          'warning'
        )
      } else {
        toast.show(
          `Tagged ${updatedCount} design${updatedCount !== 1 ? 's' : ''}`,
          'success'
        )
      }
      await fetchTemplatesData()
      setBulkTags('')
      setBulkTagsOpen(false)
    } catch (err) {
      toast.show(err.message || 'Failed to add tags', 'error')
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedIds, bulkTags, toast, fetchTemplatesData])

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FavoriteButton
              entityType="templates"
              entityId={row.id}
              initialFavorite={favorites.has(row.id)}
              onToggle={(isFav) => handleFavoriteToggle(row.id, isFav)}
            />
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
      field: 'mappingKeys',
      headerName: 'Fields',
      width: 80,
      renderCell: (value, row) => {
        const count = Array.isArray(value) ? value.length : Array.isArray(row.mappingKeys) ? row.mappingKeys.length : row.tokens_count
        return (
          <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
            {count || '-'}
          </Box>
        )
      },
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 180,
      renderCell: (value) => {
        const tags = Array.isArray(value) ? value : []
        if (!tags.length) {
          return <Box sx={{ color: palette.scale[600], fontSize: '0.75rem' }}>-</Box>
        }
        return (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            {tags.slice(0, 2).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{ bgcolor: alpha(palette.scale[100], 0.08), color: palette.scale[300], fontSize: '0.6875rem' }}
              />
            ))}
            {tags.length > 2 && (
              <Typography variant="caption" color="text.secondary">
                +{tags.length - 2}
              </Typography>
            )}
          </Stack>
        )
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 140,
      renderCell: (value, row) => {
        const raw = value || row.created_at
        return (
          <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
            {raw ? new Date(raw).toLocaleDateString() : '-'}
          </Box>
        )
      },
    },
    {
      field: 'lastRunAt',
      headerName: 'Last Run',
      width: 140,
      renderCell: (value, row) => {
        const raw = value || row.last_run_at
        return (
          <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
            {raw ? new Date(raw).toLocaleDateString() : '-'}
          </Box>
        )
      },
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      width: 140,
      renderCell: (value, row) => {
        const raw = value || row.updated_at
        return (
          <Box sx={{ color: palette.scale[400], fontSize: '0.8125rem' }}>
            {raw ? new Date(raw).toLocaleDateString() : '-'}
          </Box>
        )
      },
    },
  ], [favorites, handleFavoriteToggle])

  const filters = useMemo(() => {
    const baseFilters = [
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
          { value: 'archived', label: 'Archived' },
        ],
      },
    ]

    // Add tags filter if we have tags
    if (allTags.length > 0) {
      baseFilters.push({
        key: 'tags',
        label: 'Tag',
        options: allTags.map((tag) => ({ value: tag, label: tag })),
        matchFn: (row, filterValue) => {
          const rowTags = Array.isArray(row.tags) ? row.tags : []
          return rowTags.includes(filterValue)
        },
      })
    }

    return baseFilters
  }, [allTags])

  const bulkActions = useMemo(() => ([
    {
      label: 'Update Status',
      icon: <ArchiveIcon sx={{ fontSize: 16 }} />,
      onClick: () => setBulkStatusOpen(true),
      disabled: bulkActionLoading,
    },
    {
      label: 'Add Tags',
      icon: <LabelIcon sx={{ fontSize: 16 }} />,
      onClick: () => setBulkTagsOpen(true),
      disabled: bulkActionLoading,
    },
  ]), [bulkActionLoading, setBulkStatusOpen, setBulkTagsOpen])

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>
      {(kindFilter || statusParam) && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          {kindFilter && (
            <Chip
              label={`Type: ${kindFilter.toUpperCase()}`}
              onDelete={() => clearQuickFilter('kind')}
              size="small"
              sx={{ bgcolor: alpha(palette.scale[100], 0.08), color: palette.scale[300] }}
            />
          )}
          {statusParam && (
            <Chip
              label={`Status: ${statusParam}`}
              onDelete={() => clearQuickFilter('status')}
              size="small"
              sx={{ bgcolor: alpha(palette.scale[100], 0.08), color: palette.scale[300] }}
            />
          )}
        </Stack>
      )}
      <DataTable
        title="Report Designs"
        subtitle="Upload and manage your report layouts"
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        searchPlaceholder="Search designs..."
        filters={filters}
        actions={[
          {
            label: 'Upload Design',
            icon: <AddIcon sx={{ fontSize: 18 }} />,
            variant: 'contained',
            onClick: handleAddTemplate,
          },
          {
            label: 'Import Backup',
            icon: <UploadFileIcon sx={{ fontSize: 18 }} />,
            variant: 'outlined',
            onClick: handleOpenImport,
          },
        ]}
        selectable
        onSelectionChange={setSelectedIds}
        bulkActions={bulkActions}
        onBulkDelete={handleBulkDeleteOpen}
        onRowClick={handleRowClick}
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
          icon: DescriptionIcon,
          title: 'No report designs yet',
          description: 'Upload a PDF or Excel file as a template for your reports.',
          actionLabel: 'Upload Design',
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
        <MenuItem onClick={handleEditMetadata} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><SettingsIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExport} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Export</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate} disabled={duplicating} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><ContentCopyIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>{duplicating ? 'Duplicating...' : 'Duplicate'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleViewSimilar} sx={{ color: palette.scale[200] }}>
          <ListItemIcon><AutoAwesomeIcon sx={{ fontSize: 16, color: palette.scale[500] }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>View Similar</ListItemText>
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
        title="Remove Design"
        message={`Are you sure you want to remove "${deletingTemplate?.name || deletingTemplate?.id}"? You can undo this within a few seconds.`}
        confirmLabel="Remove"
        severity="error"
        loading={loading}
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Remove Designs"
        message={`Remove ${selectedIds.length} design${selectedIds.length !== 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel="Remove"
        severity="error"
        loading={bulkActionLoading}
      />

      <Dialog open={metadataOpen} onClose={() => setMetadataOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Design Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={metadataForm.name}
              onChange={(e) => setMetadataForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={metadataForm.description}
              onChange={(e) => setMetadataForm((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Tags"
              value={metadataForm.tags}
              onChange={(e) => setMetadataForm((prev) => ({ ...prev, tags: e.target.value }))}
              helperText="Comma-separated (e.g. finance, monthly, ops)"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={metadataForm.status}
                label="Status"
                onChange={(e) => setMetadataForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetadataOpen(false)} disabled={metadataSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleMetadataSave}
            disabled={metadataSaving || !metadataForm.name.trim()}
          >
            {metadataSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500] }}>
              Update {selectedIds.length} design{selectedIds.length !== 1 ? 's' : ''} to:
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={bulkStatus}
                label="Status"
                onChange={(e) => setBulkStatus(e.target.value)}
              >
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkStatusOpen(false)} disabled={bulkActionLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkStatusApply}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkTagsOpen} onClose={() => setBulkTagsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Tags</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', color: palette.scale[500] }}>
              Add tags to {selectedIds.length} design{selectedIds.length !== 1 ? 's' : ''}.
            </Typography>
            <TextField
              label="Tags"
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
              helperText="Comma-separated (e.g. finance, monthly, ops)"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkTagsOpen(false)} disabled={bulkActionLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkTagsApply}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? 'Updating...' : 'Add Tags'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => !importing && setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Design Backup</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button variant="outlined" component="label" disabled={importing}>
              {importFile ? importFile.name : 'Choose backup file (.zip)'}
              <input
                type="file"
                hidden
                accept=".zip"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </Button>
            <TextField
              label="Design Name (optional)"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              fullWidth
              disabled={importing}
            />
            {importing && (
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Uploading... {importProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={importProgress} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={importing || !importFile}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Similar Designs Dialog */}
      <Dialog open={similarOpen} onClose={() => setSimilarOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          Similar Designs
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Designs similar to "{similarTemplate?.name || similarTemplate?.id}"
          </Typography>
          {similarLoading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Loading similar designs...</Typography>
            </Box>
          ) : similarTemplates.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No similar designs found.</Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {similarTemplates.map((template) => {
                const config = KIND_CONFIG[template.kind] || KIND_CONFIG.pdf
                const Icon = config.icon
                return (
                  <Box
                    key={template.id}
                    onClick={() => handleSelectSimilarTemplate(template)}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
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
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">{template.name || template.id}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {template.description || `${template.kind?.toUpperCase() || 'PDF'} Template`}
                        </Typography>
                      </Box>
                      {template.similarity_score && (
                        <Chip
                          label={`${Math.round(template.similarity_score * 100)}% match`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimilarOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
