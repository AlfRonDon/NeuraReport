/**
 * Premium Templates Page
 * Sophisticated template management with glassmorphism and animations
 */
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
  useTheme,
  alpha,
  styled,
  keyframes,
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
import CloseIcon from '@mui/icons-material/Close'
import { DataTable } from '../../ui/DataTable'
import { ConfirmModal } from '../../ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import FavoriteButton from '../../components/FavoriteButton'
import * as api from '../../api/client'
import * as recommendationsApi from '../../api/recommendations'
// UX Governance - Enforced interaction API
import {
  useInteraction,
  InteractionType,
  Reversibility,
} from '../../components/ux/governance'

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

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
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
}))

const QuickFilterChip = styled(Chip)(({ theme }) => ({
  borderRadius: 8,
  backgroundColor: alpha(theme.palette.text.primary, 0.08),
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
  '& .MuiChip-deleteIcon': {
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.error.main,
    },
  },
}))

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    borderRadius: 12,
    boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
    minWidth: 180,
    animation: `${fadeInUp} 0.2s ease-out`,
  },
}))

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  borderRadius: 8,
  margin: theme.spacing(0.5, 1),
  padding: theme.spacing(1, 1.5),
  fontSize: '0.8125rem',
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  '& .MuiListItemIcon-root': {
    minWidth: 32,
  },
}))

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiBackdrop-root': {
    backgroundColor: alpha(theme.palette.common.black, 0.6),
    backdropFilter: 'blur(8px)',
  },
  '& .MuiDialog-paper': {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    borderRadius: 20,
    boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.25)}`,
    animation: `${fadeInUp} 0.3s ease-out`,
  },
}))

const DialogHeader = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2.5, 3),
  fontSize: '1.125rem',
  fontWeight: 600,
}))

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(0, 3, 3),
}))

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  gap: theme.spacing(1),
}))

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  },
}))

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  },
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: theme.spacing(1, 2.5),
  transition: 'all 0.2s ease',
}))

const PrimaryButton = styled(ActionButton)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  color: '#fff',
  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
  '&:hover': {
    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
    transform: 'translateY(-1px)',
  },
  '&:disabled': {
    background: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    boxShadow: 'none',
  },
}))

const SecondaryButton = styled(ActionButton)(({ theme }) => ({
  borderColor: alpha(theme.palette.divider, 0.3),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}))

const KindIconContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'iconColor',
})(({ theme, iconColor }) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: alpha(iconColor || theme.palette.primary.main, 0.12),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
}))

const KindChip = styled(Chip, {
  shouldForwardProp: (prop) => !['kindColor', 'kindBg'].includes(prop),
})(({ theme, kindColor, kindBg }) => ({
  borderRadius: 8,
  fontWeight: 600,
  fontSize: '0.6875rem',
  backgroundColor: kindBg,
  color: kindColor,
}))

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => !['statusColor', 'statusBg'].includes(prop),
})(({ theme, statusColor, statusBg }) => ({
  borderRadius: 8,
  fontWeight: 600,
  fontSize: '0.6875rem',
  textTransform: 'capitalize',
  backgroundColor: statusBg,
  color: statusColor,
}))

const TagChip = styled(Chip)(({ theme }) => ({
  borderRadius: 6,
  fontSize: '0.6875rem',
  backgroundColor: alpha(theme.palette.text.primary, 0.08),
  color: theme.palette.text.secondary,
}))

const MoreActionsButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  transition: 'all 0.2s ease',
  '&:hover': {
    color: theme.palette.text.primary,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}))

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  borderRadius: 4,
  height: 6,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
}))

const SimilarTemplateCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    transform: 'translateX(4px)',
  },
}))

const AiIcon = styled(AutoAwesomeIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  animation: `${pulse} 2s infinite ease-in-out`,
}))

// =============================================================================
// CONFIG HELPERS
// =============================================================================

const getKindConfig = (theme, kind) => {
  const configs = {
    pdf: {
      icon: PictureAsPdfIcon,
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.12),
    },
    excel: {
      icon: TableChartIcon,
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.12),
    },
  }
  return configs[kind] || configs.pdf
}

const getStatusConfig = (theme, status) => {
  const configs = {
    approved: {
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.12),
    },
    pending: {
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.12),
    },
    draft: {
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.12),
    },
    archived: {
      color: theme.palette.text.secondary,
      bgColor: alpha(theme.palette.text.secondary, 0.08),
    },
  }
  return configs[status] || configs.approved
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TemplatesPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  // UX Governance: Enforced interaction API - ALL user actions flow through this
  const { execute } = useInteraction()
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
        api.listTemplates(),
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

    setDeleteConfirmOpen(false)
    setDeletingTemplate(null)

    // UX Governance: Delete action with tracking
    execute({
      type: InteractionType.DELETE,
      label: `Delete design "${templateToDelete.name || templateToDelete.id}"`,
      reversibility: Reversibility.PARTIALLY_REVERSIBLE,
      action: async () => {
        removeTemplate(templateToDelete.id)

        let undone = false
        const deleteTimeout = setTimeout(async () => {
          if (undone) return
          try {
            await api.deleteTemplate(templateToDelete.id)
          } catch (err) {
            if (templateData) {
              setTemplates((prev) => [...prev, templateData])
            }
            throw err
          }
        }, 5000)

        toast.showWithUndo(
          `"${templateToDelete.name || templateToDelete.id}" removed`,
          () => {
            undone = true
            clearTimeout(deleteTimeout)
            if (templateData) {
              setTemplates((prev) => [...prev, templateData])
            }
            toast.show('Design restored', 'success')
          },
          { severity: 'info' }
        )
      },
    })
  }, [deletingTemplate, templates, removeTemplate, setTemplates, toast, execute])

  const handleExport = useCallback(async () => {
    if (!menuTemplate) return
    const templateToExport = menuTemplate
    handleCloseMenu()

    // UX Governance: Download action with tracking
    execute({
      type: InteractionType.DOWNLOAD,
      label: `Export design "${templateToExport.name || templateToExport.id}"`,
      reversibility: Reversibility.SYSTEM_MANAGED,
      successMessage: 'Design exported',
      errorMessage: 'Failed to export design',
      action: async () => {
        await api.exportTemplateZip(templateToExport.id)
      },
    })
  }, [menuTemplate, handleCloseMenu, execute])

  const handleDuplicate = useCallback(async () => {
    if (!menuTemplate) return
    const templateToDuplicate = menuTemplate
    handleCloseMenu()

    // UX Governance: Create action with tracking
    execute({
      type: InteractionType.CREATE,
      label: `Duplicate design "${templateToDuplicate.name || templateToDuplicate.id}"`,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      errorMessage: 'Failed to copy design',
      action: async () => {
        setDuplicating(true)
        try {
          const result = await api.duplicateTemplate(templateToDuplicate.id)
          const duplicatedName = result?.name || (templateToDuplicate.name ? `${templateToDuplicate.name} (Copy)` : 'Template (Copy)')
          await fetchTemplatesData()
          toast.show(`Design copied as "${duplicatedName}"`, 'success')
        } finally {
          setDuplicating(false)
        }
      },
    })
  }, [menuTemplate, toast, handleCloseMenu, fetchTemplatesData, execute])

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
    const tags = metadataForm.tags
      ? metadataForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : []
    const invalidTag = tags.find((tag) => tag.length > 50)
    if (invalidTag) {
      toast.show(`Tag "${invalidTag.slice(0, 20)}..." exceeds 50 character limit`, 'error')
      return
    }

    const payload = {
      name: trimmedName,
      description: metadataForm.description.trim() || undefined,
      status: metadataForm.status,
      tags,
    }

    // UX Governance: Update action with tracking
    execute({
      type: InteractionType.UPDATE,
      label: `Update design details "${trimmedName}"`,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      successMessage: 'Design details updated',
      errorMessage: 'Failed to update design details',
      action: async () => {
        setMetadataSaving(true)
        try {
          const result = await api.updateTemplateMetadata(metadataTemplate.id, payload)
          const updated = result?.template || { ...metadataTemplate, ...payload }
          updateTemplate(metadataTemplate.id, (tpl) => ({ ...tpl, ...updated }))
          setMetadataOpen(false)
        } finally {
          setMetadataSaving(false)
        }
      },
    })
  }, [metadataTemplate, metadataForm, updateTemplate, execute])

  const handleOpenImport = useCallback(() => {
    setImportOpen(true)
  }, [])

  const handleImport = useCallback(async () => {
    if (!importFile) {
      toast.show('Select a design backup file first', 'error')
      return
    }
    const fileName = importFile.name || ''
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext !== 'zip') {
      toast.show('Invalid file type. Please select a .zip file', 'error')
      return
    }
    const maxSize = 50 * 1024 * 1024
    if (importFile.size > maxSize) {
      toast.show('File too large. Maximum size is 50MB', 'error')
      return
    }

    // UX Governance: Upload action with tracking
    execute({
      type: InteractionType.UPLOAD,
      label: `Import design "${importName.trim() || fileName}"`,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      successMessage: 'Design imported',
      errorMessage: 'Failed to import design',
      action: async () => {
        setImporting(true)
        setImportProgress(0)
        try {
          await api.importTemplateZip({
            file: importFile,
            name: importName.trim() || undefined,
            onUploadProgress: (percent) => setImportProgress(percent),
          })
          await fetchTemplatesData()
          setImportOpen(false)
          setImportFile(null)
          setImportName('')
        } finally {
          setImporting(false)
          setImportProgress(0)
        }
      },
    })
  }, [importFile, importName, fetchTemplatesData, execute])

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
        const config = getKindConfig(theme, row.kind)
        const Icon = config.icon
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FavoriteButton
              entityType="templates"
              entityId={row.id}
              initialFavorite={favorites.has(row.id)}
              onToggle={(isFav) => handleFavoriteToggle(row.id, isFav)}
            />
            <KindIconContainer iconColor={config.color}>
              <Icon sx={{ color: config.color, fontSize: 18 }} />
            </KindIconContainer>
            <Box>
              <Typography sx={{ fontWeight: 500, fontSize: '0.8125rem', color: 'text.primary' }}>
                {value || row.id}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {row.description || `${row.kind?.toUpperCase() || 'PDF'} Template`}
              </Typography>
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
        const config = getKindConfig(theme, value)
        return (
          <KindChip
            label={value?.toUpperCase() || 'PDF'}
            size="small"
            kindColor={config.color}
            kindBg={config.bgColor}
          />
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (value) => {
        const config = getStatusConfig(theme, value)
        return (
          <StatusChip
            label={value || 'approved'}
            size="small"
            statusColor={config.color}
            statusBg={config.bgColor}
          />
        )
      },
    },
    {
      field: 'mappingKeys',
      headerName: 'Fields',
      width: 80,
      renderCell: (value, row) => {
        const count = Array.isArray(value) ? value.length : Array.isArray(row.mappingKeys) ? row.mappingKeys.length : row.tokens_count
        return (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {count || '-'}
          </Typography>
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
          return <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>-</Typography>
        }
        return (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            {tags.slice(0, 2).map((tag) => (
              <TagChip key={tag} label={tag} size="small" />
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
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {raw ? new Date(raw).toLocaleDateString() : '-'}
          </Typography>
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
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {raw ? new Date(raw).toLocaleDateString() : '-'}
          </Typography>
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
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {raw ? new Date(raw).toLocaleDateString() : '-'}
          </Typography>
        )
      },
    },
  ], [theme, favorites, handleFavoriteToggle])

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
  ]), [bulkActionLoading])

  return (
    <PageContainer>
      {(kindFilter || statusParam) && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          {kindFilter && (
            <QuickFilterChip
              label={`Type: ${kindFilter.toUpperCase()}`}
              onDelete={() => clearQuickFilter('kind')}
              size="small"
            />
          )}
          {statusParam && (
            <QuickFilterChip
              label={`Status: ${statusParam}`}
              onDelete={() => clearQuickFilter('status')}
              size="small"
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
            <MoreActionsButton
              size="small"
              onClick={(e) => handleOpenMenu(e, row)}
              aria-label="More actions"
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </MoreActionsButton>
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
      <StyledMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <StyledMenuItem onClick={handleEditTemplate}>
          <ListItemIcon><EditIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Edit</ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleEditMetadata}>
          <ListItemIcon><SettingsIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Edit Details</ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleExport}>
          <ListItemIcon><DownloadIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Export</ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleDuplicate} disabled={duplicating}>
          <ListItemIcon><ContentCopyIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>{duplicating ? 'Duplicating...' : 'Duplicate'}</ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleViewSimilar}>
          <ListItemIcon><AutoAwesomeIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>View Similar</ListItemText>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: 'error.main' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem' }}>Delete</ListItemText>
        </StyledMenuItem>
      </StyledMenu>

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

      {/* Edit Metadata Dialog */}
      <StyledDialog open={metadataOpen} onClose={() => setMetadataOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader>Edit Design Details</DialogHeader>
        <StyledDialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <StyledTextField
              label="Name"
              value={metadataForm.name}
              onChange={(e) => setMetadataForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <StyledTextField
              label="Description"
              value={metadataForm.description}
              onChange={(e) => setMetadataForm((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <StyledTextField
              label="Tags"
              value={metadataForm.tags}
              onChange={(e) => setMetadataForm((prev) => ({ ...prev, tags: e.target.value }))}
              helperText="Comma-separated (e.g. finance, monthly, ops)"
              fullWidth
            />
            <StyledFormControl fullWidth>
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
            </StyledFormControl>
          </Stack>
        </StyledDialogContent>
        <StyledDialogActions>
          <SecondaryButton variant="outlined" onClick={() => setMetadataOpen(false)} disabled={metadataSaving}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleMetadataSave}
            disabled={metadataSaving || !metadataForm.name.trim()}
          >
            {metadataSaving ? 'Saving...' : 'Save'}
          </PrimaryButton>
        </StyledDialogActions>
      </StyledDialog>

      {/* Bulk Status Dialog */}
      <StyledDialog open={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogHeader>Update Status</DialogHeader>
        <StyledDialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              Update {selectedIds.length} design{selectedIds.length !== 1 ? 's' : ''} to:
            </Typography>
            <StyledFormControl fullWidth>
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
            </StyledFormControl>
          </Stack>
        </StyledDialogContent>
        <StyledDialogActions>
          <SecondaryButton variant="outlined" onClick={() => setBulkStatusOpen(false)} disabled={bulkActionLoading}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleBulkStatusApply}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? 'Updating...' : 'Update'}
          </PrimaryButton>
        </StyledDialogActions>
      </StyledDialog>

      {/* Bulk Tags Dialog */}
      <StyledDialog open={bulkTagsOpen} onClose={() => setBulkTagsOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader>Add Tags</DialogHeader>
        <StyledDialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              Add tags to {selectedIds.length} design{selectedIds.length !== 1 ? 's' : ''}.
            </Typography>
            <StyledTextField
              label="Tags"
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
              helperText="Comma-separated (e.g. finance, monthly, ops)"
              fullWidth
            />
          </Stack>
        </StyledDialogContent>
        <StyledDialogActions>
          <SecondaryButton variant="outlined" onClick={() => setBulkTagsOpen(false)} disabled={bulkActionLoading}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleBulkTagsApply}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? 'Updating...' : 'Add Tags'}
          </PrimaryButton>
        </StyledDialogActions>
      </StyledDialog>

      {/* Import Dialog */}
      <StyledDialog open={importOpen} onClose={() => !importing && setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader>Import Design Backup</DialogHeader>
        <StyledDialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <SecondaryButton variant="outlined" component="label" disabled={importing}>
              {importFile ? importFile.name : 'Choose backup file (.zip)'}
              <input
                type="file"
                hidden
                accept=".zip"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </SecondaryButton>
            <StyledTextField
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
                <StyledLinearProgress variant="determinate" value={importProgress} />
              </Box>
            )}
          </Stack>
        </StyledDialogContent>
        <StyledDialogActions>
          <SecondaryButton variant="outlined" onClick={() => setImportOpen(false)} disabled={importing}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleImport} disabled={importing || !importFile}>
            {importing ? 'Importing...' : 'Import'}
          </PrimaryButton>
        </StyledDialogActions>
      </StyledDialog>

      {/* Similar Designs Dialog */}
      <StyledDialog open={similarOpen} onClose={() => setSimilarOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AiIcon />
            <span>Similar Designs</span>
          </Stack>
        </DialogHeader>
        <StyledDialogContent>
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
                const config = getKindConfig(theme, template.kind)
                const Icon = config.icon
                return (
                  <SimilarTemplateCard
                    key={template.id}
                    onClick={() => handleSelectSimilarTemplate(template)}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <KindIconContainer iconColor={config.color}>
                        <Icon sx={{ color: config.color, fontSize: 18 }} />
                      </KindIconContainer>
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
                          sx={{ borderRadius: 8 }}
                        />
                      )}
                    </Stack>
                  </SimilarTemplateCard>
                )
              })}
            </Stack>
          )}
        </StyledDialogContent>
        <StyledDialogActions>
          <SecondaryButton variant="outlined" onClick={() => setSimilarOpen(false)}>Close</SecondaryButton>
        </StyledDialogActions>
      </StyledDialog>
    </PageContainer>
  )
}
