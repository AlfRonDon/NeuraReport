import Grid from '@mui/material/Grid2'
import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress, Collapse,
  Card, CardActionArea, CardContent, Autocomplete, MenuItem, Select, Tooltip,
  CircularProgress, Alert, Checkbox, IconButton, Tabs, Tab,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import {
  isMock,
  withBase,
  deleteTemplate as deleteTemplateRequest,
  fetchTemplateKeyOptions,
  listApprovedTemplates,
  discoverReports,
  runReportAsJob,
  suggestCharts,
  listSavedCharts,
  createSavedChart,
  updateSavedChart,
  deleteSavedChart,
  getTemplateCatalog,
  recommendTemplates,
} from '../../api/client'
import * as mock from '../../api/mock'
import { savePersistedCache } from '../../hooks/useBootstrapState.js'
import { useAppStore } from '../../store/useAppStore'
import { useTrackedJobs } from '../../hooks/useJobs'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import EmptyState from '../../components/feedback/EmptyState.jsx'
import LoadingState from '../../components/feedback/LoadingState.jsx'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
import InfoTooltip from '../../components/common/InfoTooltip.jsx'
import TOOLTIP_COPY from '../../content/tooltipCopy.jsx'
import { resolveTemplatePreviewUrl, resolveTemplateThumbnailUrl } from '../../utils/preview'
import { buildLastEditInfo } from '../../utils/templateMeta'
import getSourceMeta from './templateSourceMeta'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Brush,
} from 'recharts'

/* -----------------------------------------------------------
   Config / helpers
----------------------------------------------------------- */
const surfaceStackSx = {
  gap: { xs: 2, md: 2.5 },
}

const JOB_STATUS_COLORS = {
  queued: 'default',
  running: 'info',
  succeeded: 'success',
  failed: 'error',
  cancelled: 'warning',
}

const toSqlDateTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`
}

const buildDownloadUrl = (url) => {
  if (!url) return ''
  try {
    const u = new URL(url)
    u.searchParams.set('download', '1')
    return u.toString()
  } catch {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}download=1`
  }
}

// no connection id required in this flow
function normalizeKeyValuePayload(keyValues) {
  if (!keyValues || typeof keyValues !== 'object') return null
  const cleaned = {}
  const ALL_SENTINELS = new Set(['all', 'select all', '__NR_SELECT_ALL__'])
  Object.entries(keyValues).forEach(([token, value]) => {
    const name = typeof token === 'string' ? token.trim() : ''
    if (!name) return
    const base = Array.isArray(value) ? value : [value]
    const seen = new Set()
    const normalized = []
    let sawAll = false
    base.forEach((raw) => {
      const text = raw == null ? '' : String(raw).trim()
      if (!text || seen.has(text)) return
      if (ALL_SENTINELS.has(text.toLowerCase())) {
        sawAll = true
        return
      }
      seen.add(text)
      normalized.push(text)
    })
    if (!normalized.length) {
      if (sawAll) {
        cleaned[name] = 'All'
      }
      return
    }
    if (sawAll) {
      cleaned[name] = 'All'
      return
    }
    cleaned[name] = normalized.length === 1 ? normalized[0] : normalized
  })
  return Object.keys(cleaned).length ? cleaned : null
}

const DEFAULT_RESAMPLE_CONFIG = {
  dimension: 'time',
  metric: 'rows',
  aggregation: 'sum',
  bucket: 'auto',
  range: null,
}

const RESAMPLE_DIMENSION_OPTIONS = [
  { value: 'time', label: 'Time' },
  { value: 'category', label: 'Category' },
  { value: 'batch_index', label: 'Discovery order' },
]

const RESAMPLE_METRIC_OPTIONS = [
  { value: 'rows', label: 'Rows' },
  { value: 'rows_per_parent', label: 'Rows per parent' },
  { value: 'parent', label: 'Parent rows' },
]

const RESAMPLE_AGGREGATION_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'max', label: 'Max' },
  { value: 'min', label: 'Min' },
]

const RESAMPLE_BUCKET_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'minute', label: 'Minute' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

const RESAMPLE_UNCATEGORIZED_LABEL = 'Uncategorized'
const MS_IN_MINUTE = 60 * 1000
const MS_IN_HOUR = 60 * MS_IN_MINUTE
const MS_IN_DAY = 24 * MS_IN_HOUR
const MS_IN_WEEK = 7 * MS_IN_DAY

const clampBrushRange = (range, maxIndex) => {
  if (!Array.isArray(range) || range.length !== 2 || maxIndex < 0) return null
  const start = Math.max(0, Math.min(maxIndex, Number(range[0]) || 0))
  const endRaw = Number(range[1])
  const end = Math.max(start, Math.min(maxIndex, Number.isFinite(endRaw) ? endRaw : maxIndex))
  return [start, end]
}

const resolveTimeBucket = (metrics, requestedBucket) => {
  if (requestedBucket && requestedBucket !== 'auto') return requestedBucket
  const timestamps = (Array.isArray(metrics) ? metrics : [])
    .map((entry) => Date.parse(entry?.time ?? entry?.timestamp ?? ''))
    .filter((value) => !Number.isNaN(value))
  if (!timestamps.length) return 'day'
  const span = Math.max(...timestamps) - Math.min(...timestamps)
  if (span > 120 * MS_IN_DAY) return 'month'
  if (span > 35 * MS_IN_DAY) return 'week'
  if (span > 7 * MS_IN_DAY) return 'day'
  if (span > 6 * MS_IN_HOUR) return 'hour'
  return 'minute'
}

const truncateTimestampToBucket = (timestamp, bucket) => {
  if (timestamp == null) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  if (bucket === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1).setHours(0, 0, 0, 0)
  }
  if (bucket === 'week') {
    const day = date.getDay()
    const diff = date.getDate() - day
    return new Date(date.getFullYear(), date.getMonth(), diff).setHours(0, 0, 0, 0)
  }
  if (bucket === 'day') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).setHours(0, 0, 0, 0)
  }
  if (bucket === 'hour') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).setMinutes(0, 0, 0)
  }
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ).setSeconds(0, 0)
}

const formatBucketLabel = (timestamp, bucket) => {
  if (timestamp == null) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  if (bucket === 'month') {
    return date.toLocaleString(undefined, { month: 'short', year: 'numeric' })
  }
  if (bucket === 'week' || bucket === 'day') {
    return date.toLocaleDateString()
  }
  if (bucket === 'hour') {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    })
  }
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const collectIdsFromSeries = (series, range) => {
  const ids = new Set()
  if (!Array.isArray(series) || !Array.isArray(range)) return ids
  for (let idx = range[0]; idx <= range[1] && idx < series.length; idx += 1) {
    const bucket = series[idx]
    if (!bucket) continue
    const batchIds = Array.isArray(bucket.batchIds) ? bucket.batchIds : []
    batchIds.forEach((id) => ids.add(String(id)))
  }
  return ids
}

const buildResampleComputation = (metrics, config = DEFAULT_RESAMPLE_CONFIG) => {
  const safeMetrics = Array.isArray(metrics) ? metrics : []
  const dimension = config?.dimension || DEFAULT_RESAMPLE_CONFIG.dimension
  const metricKey = config?.metric || DEFAULT_RESAMPLE_CONFIG.metric
  const aggregation = config?.aggregation || DEFAULT_RESAMPLE_CONFIG.aggregation
  const bucketSelection = config?.bucket || DEFAULT_RESAMPLE_CONFIG.bucket
  const resolvedBucket = dimension === 'time' ? resolveTimeBucket(safeMetrics, bucketSelection) : 'none'
  const groupsMap = new Map()

  safeMetrics.forEach((entry, idx) => {
    const batchIndexRaw = entry?.batch_index
    const batchIndex = Number.isFinite(Number(batchIndexRaw)) ? Number(batchIndexRaw) : idx + 1
    const batchId = entry?.batch_id ?? entry?.batchId ?? entry?.id ?? batchIndex
    if (batchId == null) return
    const metricValue = Number(entry?.[metricKey]) || 0
    let groupKey = ''
    let sortValue = 0
    let label = ''
    if (dimension === 'time') {
      const timestamp = Date.parse(entry?.time ?? entry?.timestamp ?? '')
      if (Number.isNaN(timestamp)) return
      const truncated = truncateTimestampToBucket(timestamp, resolvedBucket)
      if (truncated == null) return
      groupKey = `${resolvedBucket}:${truncated}`
      sortValue = truncated
      label = formatBucketLabel(truncated, resolvedBucket)
    } else if (dimension === 'category') {
      const category = entry?.category != null && String(entry.category).trim().length
        ? String(entry.category)
        : RESAMPLE_UNCATEGORIZED_LABEL
      groupKey = `cat:${category}`
      sortValue = category.toLowerCase()
      label = category
    } else {
      groupKey = `idx:${batchIndex}`
      sortValue = batchIndex
      label = `Batch ${batchIndex}`
    }
    const existing = groupsMap.get(groupKey) || {
      key: groupKey,
      label,
      sortValue,
      sum: 0,
      count: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      batchIds: new Set(),
    }
    existing.sum += metricValue
    existing.count += 1
    existing.min = Math.min(existing.min, metricValue)
    existing.max = Math.max(existing.max, metricValue)
    existing.batchIds.add(String(batchId))
    groupsMap.set(groupKey, existing)
  })

  const series = Array.from(groupsMap.values())
    .map((entry) => {
      let value = entry.sum
      if (aggregation === 'avg') {
        value = entry.count ? entry.sum / entry.count : 0
      } else if (aggregation === 'max') {
        value = entry.max === Number.NEGATIVE_INFINITY ? 0 : entry.max
      } else if (aggregation === 'min') {
        value = entry.min === Number.POSITIVE_INFINITY ? 0 : entry.min
      }
      return {
        key: entry.key,
        label: entry.label,
        value,
        sortValue: entry.sortValue,
        batchIds: Array.from(entry.batchIds),
      }
    })
    .sort((a, b) => {
      if (typeof a.sortValue === 'number' && typeof b.sortValue === 'number') {
        return a.sortValue - b.sortValue
      }
      return String(a.sortValue).localeCompare(String(b.sortValue))
    })

  if (!series.length) {
    return {
      series,
      resolvedBucket,
      displayRange: null,
      configRange: null,
      allowedIds: null,
      filterActive: false,
    }
  }

  const maxIndex = series.length - 1
  const hasUserRange = Array.isArray(config?.range) && config.range.length === 2
  const clampedRange = clampBrushRange(hasUserRange ? config.range : [0, maxIndex], maxIndex) ?? [0, maxIndex]
  const coversAll = clampedRange[0] === 0 && clampedRange[1] === maxIndex
  const filterActive = hasUserRange && !coversAll
  const allowedIds = filterActive ? collectIdsFromSeries(series, clampedRange) : null

  return {
    series,
    resolvedBucket,
    displayRange: clampedRange,
    configRange: filterActive ? clampedRange : null,
    allowedIds,
    filterActive,
  }
}
const getTemplateKind = (template) => (template?.kind === 'excel' ? 'excel' : 'pdf')

// normalize for <input type="datetime-local">
const toLocalInputValue = (v) => {
  if (!v) return ''
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2,'0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth()+1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

/* -----------------------------------------------------------
   Template Picker
----------------------------------------------------------- */

const templatePickerInstances = new Set()
let activeTemplatePickerRoot = null

const hideTemplatePickerRoot = (node) => {
  if (!node) return
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('data-template-picker-hidden', 'true')
  node.setAttribute('hidden', 'true')
  node.inert = true
}

const showTemplatePickerRoot = (node) => {
  if (!node) return
  node.removeAttribute('aria-hidden')
  node.removeAttribute('data-template-picker-hidden')
  node.removeAttribute('hidden')
  node.inert = false
}

const activateTemplatePickerRoot = (node) => {
  if (!node || activeTemplatePickerRoot === node) return
  if (activeTemplatePickerRoot) {
    hideTemplatePickerRoot(activeTemplatePickerRoot)
  }
  showTemplatePickerRoot(node)
  activeTemplatePickerRoot = node
}

const activateFallbackTemplatePicker = () => {
  const iterator = templatePickerInstances.values().next()
  if (!iterator.done) {
    activateTemplatePickerRoot(iterator.value)
    return
  }
  activeTemplatePickerRoot = null
}

function TemplatePicker({ selected, onToggle, outputFormats, setOutputFormats, tagFilter, setTagFilter, onEditTemplate }) {
  const {
    templates,
    templateCatalog,
    setTemplates,
    setTemplateCatalog,
    removeTemplate,
  } = useAppStore()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [deleting, setDeleting] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [nameQuery, setNameQuery] = useState('')
  const [requirement, setRequirement] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [recommending, setRecommending] = useState(false)
  const pickerRootRef = useRef(null)

  const templatesQuery = useQuery({
    queryKey: ['templates', isMock],
    queryFn: () => (isMock ? mock.listTemplates() : listApprovedTemplates()),
  })

  const catalogQuery = useQuery({
    queryKey: ['template-catalog', isMock],
    queryFn: () => {
      if (isMock) {
        return typeof mock.getTemplateCatalog === 'function' ? mock.getTemplateCatalog() : []
      }
      return getTemplateCatalog()
    },
  })

  const { data, isLoading, isFetching, isError, error } = templatesQuery
  const catalogData = catalogQuery.data

  useEffect(() => {
    if (data) {
      setTemplates(data)
      const state = useAppStore.getState()
      savePersistedCache({
        connections: state.savedConnections,
        templates: data,
        lastUsed: state.lastUsed,
      })
    }
  }, [data, setTemplates])

  useEffect(() => {
    if (catalogData) {
      setTemplateCatalog(catalogData)
    }
  }, [catalogData, setTemplateCatalog])

  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])
  const catalogPool = useMemo(
    () => (templateCatalog && templateCatalog.length ? templateCatalog : templates),
    [templateCatalog, templates],
  )
  const companyCandidates = useMemo(
    () => approved.filter((tpl) => String(tpl.source || 'company').toLowerCase() !== 'starter'),
    [approved],
  )
  const starterCandidates = useMemo(
    () => catalogPool.filter((tpl) => String(tpl.source || '').toLowerCase() === 'starter'),
    [catalogPool],
  )
  const allTags = useMemo(
    () => Array.from(new Set(companyCandidates.flatMap((tpl) => tpl.tags || []))),
    [companyCandidates],
  )

  const normalizedQuery = nameQuery.trim().toLowerCase()
  const applyNameFilter = useCallback(
    (items) => {
      if (!normalizedQuery) return items
      return items.filter((tpl) => (tpl.name || tpl.id || '').toLowerCase().includes(normalizedQuery))
    },
    [normalizedQuery],
  )
  const applyTagFilter = useCallback(
    (items) => {
      if (!tagFilter?.length) return items
      return items.filter((tpl) => (tpl.tags || []).some((tag) => tagFilter.includes(tag)))
    },
    [tagFilter],
  )

  const companyMatches = useMemo(
    () => applyNameFilter(applyTagFilter(companyCandidates)),
    [applyNameFilter, applyTagFilter, companyCandidates],
  )
  const starterMatches = useMemo(
    () => applyNameFilter(starterCandidates),
    [applyNameFilter, starterCandidates],
  )

  const recommendTemplatesClient = isMock ? mock.recommendTemplates : recommendTemplates
  useLayoutEffect(() => {
    const node = pickerRootRef.current
    if (node) {
      templatePickerInstances.add(node)
      activateTemplatePickerRoot(node)
    }
    return () => {
      if (activeTemplatePickerRoot === node) {
        showTemplatePickerRoot(node)
        templatePickerInstances.delete(node)
        activeTemplatePickerRoot = null
        activateFallbackTemplatePicker()
        return
      }
      if (node) {
        templatePickerInstances.delete(node)
        showTemplatePickerRoot(node)
      }
    }
  }, [])

  const handleRecommend = async () => {
    const prompt = requirement.trim()
    if (!prompt) {
      toast.show('Describe what you need before requesting recommendations.', 'info')
      return
    }
    setRecommending(true)
    try {
      const result = await recommendTemplatesClient({ requirement: prompt, limit: 6 })
      const recs = Array.isArray(result?.recommendations)
        ? result.recommendations
        : Array.isArray(result)
          ? result
          : []
      setRecommendations(recs)
      setActiveTab('recommended')
    } catch (err) {
      toast.show(String(err), 'error')
    } finally {
      setRecommending(false)
    }
  }

  const handleRequirementKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleRecommend()
    }
  }

  const handleFindInAll = (templateName) => {
    setNameQuery(templateName || '')
    setActiveTab('all')
  }

  const handleDeleteTemplate = async (template) => {
    if (!template?.id) return
    const name = template.name || template.id
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete "${name}"? This cannot be undone.`)
      if (!confirmed) return
    }
    setDeleting(template.id)
    try {
      await deleteTemplateRequest(template.id)
      removeTemplate(template.id)
      setOutputFormats((prev) => {
        const next = { ...(prev || {}) }
        delete next[template.id]
        return next
      })
      if (selected.includes(template.id)) {
        onToggle(template.id)
      }
      queryClient.setQueryData(['templates', isMock], (prev) => {
        if (Array.isArray(prev)) {
          return prev.filter((item) => item?.id !== template.id)
        }
        if (prev && Array.isArray(prev.templates)) {
          return {
            ...prev,
            templates: prev.templates.filter((item) => item?.id !== template.id),
          }
        }
        return prev
      })
      const state = useAppStore.getState()
      savePersistedCache({
        connections: state.savedConnections,
        templates: state.templates,
        lastUsed: state.lastUsed,
      })
      toast.show(`Deleted "${name}"`, 'success')
    } catch (err) {
      toast.show(String(err), 'error')
    } finally {
      setDeleting(null)
    }
  }

  const renderCompanyGrid = (list) => (
    <Grid container spacing={2.5}>
      {list.map((t) => {
        const selectedState = selected.includes(t.id)
        const type = getTemplateKind(t).toUpperCase()
        const fmt = outputFormats[t.id] || 'auto'
        const previewInfo = resolveTemplatePreviewUrl(t)
        const htmlPreview = previewInfo.url
        const previewKey = previewInfo.key || `${t.id}-preview`
        const thumbnailInfo = resolveTemplateThumbnailUrl(t)
        const imagePreview = !htmlPreview ? thumbnailInfo.url : null
        const generatorArtifacts = {
          sql: t.artifacts?.generator_sql_pack_url,
          schemas: t.artifacts?.generator_output_schemas_url,
          meta: t.artifacts?.generator_assets_url,
        }
        const generatorMeta = t.generator || {}
        const hasGeneratorAssets = Object.values(generatorArtifacts).some(Boolean)
        const needsUserFix = Array.isArray(generatorMeta.needsUserFix) ? generatorMeta.needsUserFix : []
        const generatorStatusLabel = generatorMeta.invalid ? 'Needs review' : 'Ready'
        const generatorStatusColor = generatorMeta.invalid ? 'warning' : 'success'
        let generatorUpdated = null
        if (generatorMeta.updatedAt) {
          const parsed = new Date(generatorMeta.updatedAt)
          generatorUpdated = Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString()
        }
        const assetHref = (url) => (url ? buildDownloadUrl(withBase(url)) : null)
        const generatorReady = hasGeneratorAssets && !generatorMeta.invalid && needsUserFix.length === 0
        const lastEditInfo = buildLastEditInfo(t.generator?.summary)
        const lastEditChipLabel = lastEditInfo?.chipLabel || 'Not edited yet'
        const lastEditChipColor = lastEditInfo?.color || 'default'
        const lastEditChipVariant = lastEditInfo?.variant || 'outlined'
        const handleCardToggle = () => {
          if (!selectedState) {
            if (!hasGeneratorAssets) {
              toast.show('Generate SQL & schema assets for this template before selecting it.', 'warning')
              return
            }
            if (!generatorReady) {
              const detail = needsUserFix.length ? `Resolve: ${needsUserFix.join(', ')}` : 'Generator assets need attention.'
              toast.show(detail, 'warning')
              return
            }
          }
          onToggle(t.id)
        }
        const handleCardKeyDown = (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleCardToggle()
          }
        }

        return (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id} sx={{ minWidth: 0 }}>
            <Card
              variant="outlined"
              sx={[
                {
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 300,
                  transition: 'border-color 160ms ease, box-shadow 160ms ease',
                },
                selectedState && {
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 1px rgba(79,70,229,0.28)',
                },
              ]}
            >
              <Checkbox
                checked={selectedState}
                onChange={() => onToggle(t.id)}
                sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1 }}
                aria-label={`Select ${t.name}`}
              />
              <CardActionArea component="div" role="button" tabIndex={0} onKeyDown={handleCardKeyDown} onClick={handleCardToggle} sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', flexGrow: 1 }}>
                  <Box
                    sx={{
                      minHeight: 180,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'background.default',
                      p: 1,
                      aspectRatio: '210 / 297',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {htmlPreview ? (
                      <ScaledIframePreview
                        key={previewKey}
                        src={htmlPreview}
                        title={`${t.name} preview`}
                        sx={{ width: '100%', height: '100%' }}
                        frameAspectRatio="210 / 297"
                        pageShadow
                        pageBorderColor="rgba(15,23,42,0.08)"
                        marginGuides={{ inset: 28, color: 'rgba(79,70,229,0.28)' }}
                      />
                    ) : imagePreview ? (
                      <Box component="img" src={imagePreview} alt={`${t.name} preview`} loading="lazy" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                      >
                        No preview yet
                      </Typography>
                    )}
                  </Box>
                  <Stack spacing={0.75}>
                    {!!t.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {(t.tags || []).slice(0, 3).map((tag) => <Chip key={tag} label={tag} size="small" />)}
                      {(t.tags || []).length > 3 && <Chip size="small" variant="outlined" label={`+${(t.tags || []).length - 3}`} />}
                    </Stack>
                    {hasGeneratorAssets && (
                      <Stack spacing={0.75} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            SQL & schema assets - {generatorMeta.dialect || 'unknown'}
                          </Typography>
                          <Chip size="small" color={generatorStatusColor} label={generatorStatusLabel} />
                          {!!needsUserFix.length && (
                            <Tooltip title={needsUserFix.join('\\n')}>
                              <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                label={`${needsUserFix.length} fix${needsUserFix.length === 1 ? '' : 'es'}`}
                              />
                            </Tooltip>
                          )}
                          {generatorUpdated && (
                            <Typography variant="caption" color="text.secondary">
                              Updated {generatorUpdated}
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          {generatorArtifacts.sql && (
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={assetHref(generatorArtifacts.sql)}
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                            >
                              SQL Pack
                            </Button>
                          )}
                          {generatorArtifacts.schemas && (
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={assetHref(generatorArtifacts.schemas)}
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Output Schemas
                            </Button>
                          )}
                          {generatorArtifacts.meta && (
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={assetHref(generatorArtifacts.meta)}
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Generator JSON
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    )}
                  </Stack>
                  <Divider sx={{ mt: 'auto', my: 1 }} />
                  <Stack spacing={1} alignItems="flex-start">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                      {t.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ flexWrap: 'wrap', rowGap: 1 }}
                    >
                      <Chip size="small" label={type} variant="outlined" />
                      <Select
                        size="small"
                        value={fmt}
                        onChange={(e) => setOutputFormats((m) => ({ ...m, [t.id]: e.target.value }))}
                        sx={{ bgcolor: 'background.paper', minWidth: 132 }}
                        aria-label="Output format"
                      >
                        <MenuItem value="auto">Auto ({type})</MenuItem>
                        <MenuItem value="pdf">PDF</MenuItem>
                        <MenuItem value="docx">Word (DOCX)</MenuItem>
                        <MenuItem value="xlsx">Excel (XLSX)</MenuItem>
                      </Select>
                      <Button
                        size="small"
                        variant={selectedState ? 'contained' : 'outlined'}
                        color="primary"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCardToggle()
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label={`${selectedState ? 'Deselect' : 'Select'} ${t.name || 'template'}`}
                      >
                        {selectedState ? 'Selected' : 'Select'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={
                          deleting === t.id ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteOutlineIcon fontSize="small" />
                          )
                        }
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteTemplate(t)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={deleting === t.id}
                        aria-label={`Delete ${t.name || 'template'}`}
                      >
                        Delete
                      </Button>
                      {typeof onEditTemplate === 'function' && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditOutlinedIcon fontSize="small" />}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onEditTemplate(t)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Button>
                      )}
                      <Chip
                        size="small"
                        label={lastEditChipLabel}
                        color={lastEditInfo ? lastEditChipColor : 'default'}
                        variant={lastEditInfo ? lastEditChipVariant : 'outlined'}
                        sx={{ mt: 0.5 }}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )

  const renderStarterGrid = (list) => (
    <Grid container spacing={2.5}>
      {list.map((t) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id} sx={{ minWidth: 0 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t.name || t.id}
                </Typography>
                {t.description && (
                  <Typography variant="body2" color="text.secondary">
                    {t.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Starter template · Read-only
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )

  const renderRecommendations = () => {
    if (!recommendations.length) {
      return (
        <EmptyState
          size="medium"
          title="No recommendations yet"
          description="Describe what you need and click Get recommendations to see suggestions."
        />
      )
    }
    return (
      <Grid container spacing={2.5}>
        {recommendations.map((entry, index) => {
          const template = entry?.template || {}
          const meta = getSourceMeta(template.source)
          const isStarter = meta.isStarter
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id || `rec-${index}`} sx={{ minWidth: 0 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {template.name || template.id || 'Template'}
                      </Typography>
                      <Chip size="small" label={meta.label} color={meta.color} variant={meta.variant} />
                    </Stack>
                    {template.description && (
                      <Typography variant="body2" color="text.secondary">
                        {template.description}
                      </Typography>
                    )}
                    {entry?.explanation && (
                      <Typography variant="body2">
                        {entry.explanation}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {isStarter ? 'Starter template · Review before use' : 'Company template · Editable'}
                    </Typography>
                    {!isStarter && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleFindInAll(template.name || template.id)}
                      >
                        Find in "All" templates
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    )
  }

  const renderAllTab = () => {
    const sections = []
    const hasCompanyTemplates = companyCandidates.length > 0
    const hasStarterTemplates = starterCandidates.length > 0
    if (hasCompanyTemplates) {
      sections.push(
        <Stack key="company" spacing={1.5}>
          <Typography variant="subtitle2">Company templates</Typography>
          {companyMatches.length ? (
            renderCompanyGrid(companyMatches)
          ) : (
            <Typography variant="body2" color="text.secondary">
              No company templates match the current filters.
            </Typography>
          )}
        </Stack>,
      )
    }
    if (hasStarterTemplates) {
      sections.push(
        <Stack key="starter" spacing={1.5}>
          <Typography variant="subtitle2">Starter templates</Typography>
          {starterMatches.length ? (
            renderStarterGrid(starterMatches)
          ) : (
            <Typography variant="body2" color="text.secondary">
              No starter templates match the current filters.
            </Typography>
          )}
        </Stack>,
      )
    }
    if (!sections.length) {
      return (
        <EmptyState
          size="medium"
          title="No templates match the current filters"
          description="Adjust the search text or tags to see more templates."
        />
      )
    }
    return <Stack spacing={3}>{sections}</Stack>
  }

  const renderCompanyTab = () => {
    if (!companyMatches.length) {
      return (
        <EmptyState
          size="medium"
          title="No company templates match"
          description="Try clearing the search text or adjusting the tag filters."
        />
      )
    }
    return renderCompanyGrid(companyMatches)
  }

  const renderStarterTab = () => {
    if (!starterMatches.length) {
      return (
        <EmptyState
          size="medium"
          title="No starter templates available"
          description="Starter templates will appear here when provided by the catalog."
        />
      )
    }
    return renderStarterGrid(starterMatches)
  }

  const renderRecommendedTab = () => renderRecommendations()

  const tabContent = () => {
    if (activeTab === 'company') return renderCompanyTab()
    if (activeTab === 'starter') return renderStarterTab()
    if (activeTab === 'recommended') return renderRecommendedTab()
    return renderAllTab()
  }

  const showRefreshing = (isFetching && !isLoading) || catalogQuery.isFetching

  return (
    <Surface ref={pickerRootRef} sx={surfaceStackSx}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="h6">Template Picker</Typography>
          <InfoTooltip
            content={TOOLTIP_COPY.templatePicker}
            ariaLabel="Template picker guidance"
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Autocomplete
            multiple
            options={allTags}
            value={tagFilter}
            onChange={(e, v) => setTagFilter(v)}
            freeSolo
            renderInput={(params) => <TextField {...params} label="Filter by tags" />}
            sx={{ maxWidth: 440 }}
          />
          <TextField
            label="Search by name"
            size="small"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            sx={{ maxWidth: 320 }}
          />
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }}
          >
          <TextField
            label="Describe what you need"
            size="small"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            onKeyDown={handleRequirementKeyDown}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleRecommend}
            disabled={recommending}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {recommending ? 'Finding…' : 'Get recommendations'}
          </Button>
        </Stack>
      </Stack>
      <Collapse in={showRefreshing} unmountOnExit>
        <LinearProgress color="secondary" sx={{ borderRadius: 1 }} aria-label="Refreshing templates" />
      </Collapse>
      {isLoading ? (
        <LoadingState
          label="Loading approved templates..."
          description="Fetching the latest approved templates from the pipeline."
        />
      ) : isError ? (
        <Alert severity="error">
          {String(error?.message || 'Failed to load approved templates.')}
        </Alert>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="All" value="all" />
            <Tab label="Company" value="company" />
            <Tab label="Starter" value="starter" />
            <Tab label="Recommended" value="recommended" />
          </Tabs>
          <Box sx={{ mt: 2 }}>{tabContent()}</Box>
        </>
      )}
    </Surface>
  )
}

/* -----------------------------------------------------------
   Run Reports
----------------------------------------------------------- */
function GenerateAndDownload({
  selected,
  selectedTemplates,
  autoType,
  start,
  end,
  setStart,
  setEnd,
  onFind,
  findDisabled,
  finding,
  results,
  onToggleBatch,
  onGenerate,
  canGenerate,
  generateLabel,
  generation,
  generatorReady,
  generatorIssues,
  keyValues = {},
  onKeyValueChange = () => {},
  keysReady = true,
  keyOptions = {},
  keyOptionsLoading = {},
  onResampleFilter = () => {},
}) {
  const { downloads } = useAppStore()
  const toast = useToast()
  const targetNames = selectedTemplates.map((t) => t.name)
  const subline = targetNames.length
    ? `${targetNames.slice(0, 3).join(', ')}${targetNames.length > 3 ? ', ...' : ''}`
    : ''
  const generatorMessages = generatorIssues?.messages || []
  const generatorMissing = generatorIssues?.missing || []
  const generatorNeedsFix = generatorIssues?.needsFix || []
  const selectionReady = selected.length > 0 && generatorReady
  const [chartQuestion, setChartQuestion] = useState('')
  const [chartSuggestions, setChartSuggestions] = useState([])
  const [selectedChartId, setSelectedChartId] = useState(null)
  const [chartSampleData, setChartSampleData] = useState(null)
  const [selectedChartSource, setSelectedChartSource] = useState('suggestion')
  const [savedCharts, setSavedCharts] = useState([])
  const [savedChartsLoading, setSavedChartsLoading] = useState(false)
  const [savedChartsError, setSavedChartsError] = useState(null)
  const [selectedSavedChartId, setSelectedSavedChartId] = useState(null)
  const [saveChartLoading, setSaveChartLoading] = useState(false)
  const trackedJobIds = useMemo(
    () => generation.items.map((item) => item.jobId).filter(Boolean),
    [generation.items],
  )
  const { jobsById } = useTrackedJobs(trackedJobIds)
  const templateKeyTokens = (tpl) => {
    const fromState = Array.isArray(tpl?.mappingKeys)
      ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
      : []
    if (fromState.length) return fromState
    const options = keyOptions?.[tpl?.id] || {}
    return Object.keys(options || {})
  }
  const templatesWithKeys = useMemo(() => (
    selectedTemplates
      .map((tpl) => ({ tpl, tokens: templateKeyTokens(tpl) }))
      .filter(({ tokens }) => tokens.length > 0)
  ), [selectedTemplates, keyOptions])
  const valid = selectionReady && !!start && !!end && new Date(end) >= new Date(start) && keysReady
  const keysMissing = !keysReady && templatesWithKeys.length > 0
  const showGeneratorWarning = selected.length > 0 && (!generatorReady || generatorMissing.length || generatorNeedsFix.length)
  const activeTemplate = useMemo(
    () => (selectedTemplates && selectedTemplates.length ? selectedTemplates[0] : null),
    [selectedTemplates],
  )
  const activeTemplateId = activeTemplate?.id
  const activeTemplateKind = useMemo(
    () => (activeTemplate ? getTemplateKind(activeTemplate) : 'pdf'),
    [activeTemplate],
  )
  const activeTemplateResult = activeTemplateId ? results?.[activeTemplateId] : null
  const activeBatchData = useMemo(() => {
    if (!activeTemplateId || !activeTemplateResult || !Array.isArray(activeTemplateResult.batches)) {
      return []
    }
    return activeTemplateResult.batches.map((batch, index) => {
      const batchId = batch.id != null ? String(batch.id) : String(index + 1)
      const rows = Number(batch.rows || 0)
      const parent = Number(batch.parent || 0)
      const safeParent = parent || 1
      const rowsPerParent = safeParent ? rows / safeParent : rows
      return {
        batch_index: index + 1,
        batch_id: batchId,
        rows,
        parent,
        rows_per_parent: rowsPerParent,
        time: batch.time ?? null,
        category: batch.category ?? null,
      }
    })
  }, [activeTemplateId, activeTemplateResult])
  const { data: previewData, usingSampleData } = useMemo(() => {
    if (activeBatchData.length) {
      return { data: activeBatchData, usingSampleData: false }
    }
    if (Array.isArray(chartSampleData) && chartSampleData.length) {
      return { data: chartSampleData, usingSampleData: true }
    }
    return { data: [], usingSampleData: false }
  }, [activeBatchData, chartSampleData])
  const activeFieldCatalog = Array.isArray(activeTemplateResult?.fieldCatalog)
    ? activeTemplateResult.fieldCatalog
    : []
  const dimensionOptions = useMemo(() => {
    const names = new Set(activeFieldCatalog.map((field) => field?.name))
    const base = RESAMPLE_DIMENSION_OPTIONS.filter((option) => {
      if (option.value === 'time') return names.has('time')
      if (option.value === 'category') return names.has('category')
      return true
    })
    if (!base.some((opt) => opt.value === 'batch_index')) {
      const fallback = RESAMPLE_DIMENSION_OPTIONS.find((opt) => opt.value === 'batch_index')
      if (fallback) base.push(fallback)
    }
    return base
  }, [activeFieldCatalog])
  const metricOptions = useMemo(() => {
    const names = new Set(activeFieldCatalog.map((field) => field?.name))
    const base = RESAMPLE_METRIC_OPTIONS.filter((option) => names.has(option.value))
    if (!base.length) {
      return [...RESAMPLE_METRIC_OPTIONS]
    }
    return base
  }, [activeFieldCatalog])
  const resampleConfig = activeTemplateResult?.resample?.config || DEFAULT_RESAMPLE_CONFIG
  const safeResampleConfig = useMemo(() => {
    const next = { ...DEFAULT_RESAMPLE_CONFIG, ...resampleConfig }
    if (!dimensionOptions.some((opt) => opt.value === next.dimension)) {
      next.dimension = dimensionOptions[0]?.value || DEFAULT_RESAMPLE_CONFIG.dimension
    }
    if (!metricOptions.some((opt) => opt.value === next.metric)) {
      next.metric = metricOptions[0]?.value || DEFAULT_RESAMPLE_CONFIG.metric
    }
    return next
  }, [resampleConfig, dimensionOptions, metricOptions])
  const resampleState = useMemo(
    () => buildResampleComputation(activeTemplateResult?.batchMetrics, safeResampleConfig),
    [activeTemplateId, activeTemplateResult?.batchMetrics, safeResampleConfig],
  )
  const totalBatchCount =
    activeTemplateResult?.allBatches?.length ?? activeTemplateResult?.batches?.length ?? 0
  const filteredBatchCount = activeTemplateResult?.batches?.length ?? 0
  const selectedMetricLabel = useMemo(
    () => metricOptions.find((opt) => opt.value === safeResampleConfig.metric)?.label || 'Metric',
    [metricOptions, safeResampleConfig.metric],
  )
  const resampleBucketHelper =
    safeResampleConfig.dimension === 'time' && safeResampleConfig.bucket === 'auto'
      ? `Auto bucket: ${resampleState.resolvedBucket}`
      : ''
  const applyResampleConfig = useCallback(
    (nextConfig) => {
      if (!activeTemplateId) return
      const computation = buildResampleComputation(activeTemplateResult?.batchMetrics, nextConfig)
      onResampleFilter(activeTemplateId, {
        config: {
          ...nextConfig,
          range: computation.configRange,
        },
        allowedBatchIds: computation.allowedIds ? Array.from(computation.allowedIds) : null,
      })
    },
    [activeTemplateId, activeTemplateResult?.batchMetrics, onResampleFilter],
  )
  const handleResampleSelectorChange = useCallback(
    (field) => (event) => {
      const { value } = event?.target || {}
      if (value == null) return
      const nextConfig = { ...safeResampleConfig, [field]: value }
      if (field !== 'range') {
        nextConfig.range = null
      }
      applyResampleConfig(nextConfig)
    },
    [applyResampleConfig, safeResampleConfig],
  )
  const handleResampleBrushChange = useCallback(
    ({ startIndex, endIndex }) => {
      if (
        !activeTemplateId ||
        !Array.isArray(resampleState.series) ||
        !resampleState.series.length
      ) {
        return
      }
      if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) return
      const maxIndex = resampleState.series.length - 1
      const nextRange = clampBrushRange([startIndex, endIndex], maxIndex)
      if (!nextRange) return
      const coversAll = nextRange[0] === 0 && nextRange[1] === maxIndex
      const idsSet = coversAll ? null : collectIdsFromSeries(resampleState.series, nextRange)
      onResampleFilter(activeTemplateId, {
        config: {
          ...safeResampleConfig,
          range: coversAll ? null : nextRange,
        },
        allowedBatchIds: idsSet ? Array.from(idsSet) : null,
      })
    },
    [activeTemplateId, onResampleFilter, resampleState.series, safeResampleConfig],
  )
  const handleResampleReset = useCallback(() => {
    if (!activeTemplateId) return
    onResampleFilter(activeTemplateId, {
      config: { ...safeResampleConfig, range: null },
      allowedBatchIds: null,
    })
  }, [activeTemplateId, onResampleFilter, safeResampleConfig])
  const selectedSuggestion = useMemo(() => {
    if (!chartSuggestions.length) return null
    if (selectedChartId) {
      const found = chartSuggestions.find((chart) => chart.id === selectedChartId)
      if (found) return found
    }
    return chartSuggestions[0] || null
  }, [chartSuggestions, selectedChartId])
  const selectedSavedChart = useMemo(
    () => savedCharts.find((chart) => chart.id === selectedSavedChartId) || null,
    [savedCharts, selectedSavedChartId],
  )
  const selectedChartSpec = useMemo(
    () => (selectedChartSource === 'saved' ? selectedSavedChart?.spec || null : selectedSuggestion),
    [selectedChartSource, selectedSavedChart, selectedSuggestion],
  )
  useEffect(() => {
    setChartSuggestions([])
    setSelectedChartId(null)
    setSelectedSavedChartId(null)
    setSelectedChartSource('suggestion')
    setChartSampleData(null)
  }, [activeTemplateId])
  const fetchSavedCharts = useCallback(() => {
    if (!activeTemplateId) {
      setSavedCharts([])
      setSavedChartsLoading(false)
      setSavedChartsError(null)
      setSelectedSavedChartId(null)
      setSelectedChartSource((prev) => (prev === 'saved' ? 'suggestion' : prev))
      return
    }
    const currentTemplateId = activeTemplateId
    setSavedChartsLoading(true)
    setSavedChartsError(null)
    listSavedCharts({ templateId: currentTemplateId, kind: activeTemplateKind })
      .then((charts) => {
        if (currentTemplateId === activeTemplateId) {
          setSavedCharts(charts)
        }
      })
      .catch((err) => {
        if (currentTemplateId === activeTemplateId) {
          setSavedChartsError(err?.message || 'Failed to load saved charts.')
        }
      })
      .finally(() => {
        if (currentTemplateId === activeTemplateId) {
          setSavedChartsLoading(false)
        }
      })
  }, [activeTemplateId, activeTemplateKind])
  useEffect(() => {
    fetchSavedCharts()
  }, [fetchSavedCharts])
  const chartSuggestMutation = useMutation({
    mutationFn: async ({
      templateId,
      kind,
      startDate,
      endDate,
      keyValuesForTemplate,
      question,
    }) => {
      return suggestCharts({
        templateId,
        startDate,
        endDate,
        keyValues: keyValuesForTemplate,
        question,
        kind,
      })
    },
    onSuccess: (data) => {
      const charts = Array.isArray(data?.charts) ? data.charts : []
      setChartSuggestions(charts)
      setSelectedChartId((prev) => {
        if (prev && charts.some((chart) => chart.id === prev)) return prev
        return charts[0]?.id || null
      })
      setSelectedSavedChartId(null)
      setSelectedChartSource('suggestion')
      const sampleData = Array.isArray(data?.sampleData) ? data.sampleData : null
      setChartSampleData(sampleData && sampleData.length ? sampleData : null)
    },
    onError: (error) => {
      toast.show(error?.message || 'Chart suggestions failed', 'error')
    },
  })
  const handleAskCharts = async () => {
    if (!activeTemplate || !start || !end) {
      toast.show('Select a template and valid date range before asking for charts.', 'warning')
      return
    }
    if (!activeBatchData.length) {
      toast.show('Run discovery for this template to unlock chart suggestions.', 'info')
      return
    }
    const startSql = toSqlDateTime(start)
    const endSql = toSqlDateTime(end)
    if (!startSql || !endSql) {
      toast.show('Provide a valid start and end date before asking for charts.', 'warning')
      return
    }
    try {
      setChartSampleData(null)
      await chartSuggestMutation.mutateAsync({
        templateId: activeTemplate.id,
        kind: activeTemplateKind,
        startDate: startSql,
        endDate: endSql,
        keyValuesForTemplate: keyValues?.[activeTemplate.id] || {},
        question: chartQuestion,
      })
    } catch {
      // handled in onError
    }
  }
  const handleSelectSuggestion = (chartId) => {
    setSelectedChartSource('suggestion')
    setSelectedChartId(chartId)
    setSelectedSavedChartId(null)
  }
  const handleSelectSavedChart = (chartId) => {
    setSelectedChartSource('saved')
    setSelectedSavedChartId(chartId)
    setSelectedChartId(null)
  }
  const handleSaveCurrentSuggestion = async () => {
    if (!activeTemplate || !selectedSuggestion) {
      toast.show('Select a template and a suggestion before saving.', 'info')
      return
    }
    if (typeof window === 'undefined') return
    const index = chartSuggestions.indexOf(selectedSuggestion)
    const defaultName =
      selectedSuggestion.title ||
      selectedSuggestion.description ||
      (index >= 0 ? `Suggested chart ${index + 1}` : 'Saved chart')
    const entered = window.prompt('Name this chart', defaultName || 'Saved chart')
    if (!entered || !entered.trim()) return
    const name = entered.trim()
    try {
      setSaveChartLoading(true)
      const created = await createSavedChart({
        templateId: activeTemplate.id,
        name,
        spec: selectedSuggestion,
        kind: activeTemplateKind,
      })
      if (created) {
        setSavedCharts((prev) => [...prev, created])
        setSelectedChartSource('saved')
        setSelectedSavedChartId(created.id)
        toast.show(`Saved chart "${created.name}"`, 'success')
      }
    } catch (error) {
      toast.show(error?.message || 'Failed to save chart.', 'error')
    } finally {
      setSaveChartLoading(false)
    }
  }
  const handleRenameSavedChart = async (event, chart) => {
    event?.stopPropagation()
    if (!chart || !activeTemplate) return
    if (typeof window === 'undefined') return
    const currentName = chart.name || 'Saved chart'
    const entered = window.prompt('Rename chart', currentName)
    if (!entered || !entered.trim()) return
    const name = entered.trim()
    try {
      const updated = await updateSavedChart({
        templateId: activeTemplate.id,
        chartId: chart.id,
        name,
        kind: activeTemplateKind,
      })
      if (updated) {
        setSavedCharts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        toast.show(`Renamed chart to "${updated.name}"`, 'success')
      }
    } catch (error) {
      toast.show(error?.message || 'Failed to rename chart.', 'error')
    }
  }
  const handleDeleteSavedChart = async (event, chart) => {
    event?.stopPropagation()
    if (!chart || !activeTemplate) return
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete saved chart "${chart.name || 'Saved chart'}"?`)
      if (!confirmed) return
    }
    try {
      await deleteSavedChart({
        templateId: activeTemplate.id,
        chartId: chart.id,
        kind: activeTemplateKind,
      })
      setSavedCharts((prev) => prev.filter((item) => item.id !== chart.id))
      if (selectedChartSource === 'saved' && selectedSavedChartId === chart.id) {
        setSelectedChartSource('suggestion')
        setSelectedSavedChartId(null)
      }
      toast.show('Deleted saved chart.', 'success')
    } catch (error) {
      toast.show(error?.message || 'Failed to delete chart.', 'error')
    }
  }
  const handleRetrySavedCharts = () => {
    fetchSavedCharts()
  }
  const renderSuggestedChart = useCallback((spec, data, { source } = {}) => {
    if (!spec) {
      return (
        <Typography variant="body2" color="text.secondary">
          Select a suggestion to preview a chart.
        </Typography>
      )
    }
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No data available for this template and filters.
        </Typography>
      )
    }
    const sample = data[0] || {}
    const fieldNames = new Set(Object.keys(sample))
    const missingFields = []
    if (!fieldNames.has(spec.xField)) {
      missingFields.push(spec.xField)
    }
    const yFieldsArray = Array.isArray(spec.yFields) && spec.yFields.length ? spec.yFields : ['rows']
    yFieldsArray.forEach((field) => {
      if (!fieldNames.has(field)) {
        missingFields.push(field)
      }
    })
    if (spec.groupField && !fieldNames.has(spec.groupField)) {
      missingFields.push(spec.groupField)
    }
    if (missingFields.length) {
      return (
        <Alert severity="warning" sx={{ mt: 0.5 }}>
          {source === 'saved'
            ? `Saved chart references fields not present in current data (missing: ${missingFields.join(
                ', ',
              )}). Edit or delete this chart.`
            : `Cannot render this chart because the dataset is missing: ${missingFields.join(', ')}.`}
        </Alert>
      )
    }
    const palette = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#ec4899', '#a855f7', '#06b6d4']
    const type = (spec.type || '').toLowerCase()
    const xField = spec.xField
    const yKeys = yFieldsArray.length ? yFieldsArray : ['rows']
    if (type === 'pie') {
      const valueKey = yKeys[0]
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={xField}
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={2}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <RechartsLegend />
          </PieChart>
        </ResponsiveContainer>
      )
    }
    if (type === 'scatter') {
      const yKey = yKeys[0]
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey={xField} name={xField} tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey={yKey} name={yKey} tick={{ fontSize: 11 }} />
            <RechartsTooltip />
            <RechartsLegend />
            <Scatter data={data} fill="#22c55e" />
          </ScatterChart>
        </ResponsiveContainer>
      )
    }
    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip />
            <RechartsLegend />
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={palette[index % palette.length]}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip />
          <RechartsLegend />
          {yKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={palette[index % palette.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }, [])
  return (
    <>
      <Surface sx={surfaceStackSx}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={{ xs: 1, sm: 2 }}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography variant="h6">Run Reports</Typography>
              <InfoTooltip
                content={TOOLTIP_COPY.runReports}
                ariaLabel="Run reports guidance"
              />
            </Stack>
            {!!subline && <Typography variant="caption" color="text.secondary">{subline}</Typography>}
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={onFind}
              disabled={!valid || findDisabled}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Find Reports
            </Button>
            <Tooltip title={generateLabel}>
              <span>
                <Button
                  variant="contained"
                  onClick={onGenerate}
                  disabled={!canGenerate}
                  aria-label={generateLabel}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {generateLabel}
                </Button>
              </span>
            </Tooltip>
          </Stack>

        {showGeneratorWarning && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {generatorMissing.length
              ? 'Generate SQL & schema assets for all selected templates before continuing.'
              : 'Resolve SQL & schema asset issues before continuing.'}
            {generatorMessages.length ? (
              <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                {generatorMessages.map((msg, idx) => (
                  <Typography key={`generator-msg-${idx}`} component="li" variant="caption">
                    {msg}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Alert>
        )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Start Date & Time"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={toLocalInputValue(start)}
            onChange={(e) => setStart(e.target.value)}
            helperText="Timezone: system"
          />
          <TextField
            label="End Date & Time"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={toLocalInputValue(end)}
            onChange={(e) => setEnd(e.target.value)}
            error={!!(start && end && new Date(end) < new Date(start))}
            helperText={start && end && new Date(end) < new Date(start) ? 'End must be after Start' : ' '}
          />
          <Chip label={`Auto: ${autoType || '-'}`} size="small" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Key Token Values</Typography>
          {keysMissing && (
            <Alert severity="warning">Fill in all key token values to enable discovery and runs.</Alert>
          )}
          {templatesWithKeys.length > 0 ? (
            templatesWithKeys.map(({ tpl, tokens }) => (
              <Box
                key={tpl.id}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, bgcolor: 'background.paper' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{tpl.name || tpl.id}</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {tokens.map((token) => {
                    const templateOptions = keyOptions?.[tpl.id] || {}
                    const tokenOptions = templateOptions[token] || []
                    const loading = Boolean(keyOptionsLoading?.[tpl.id])
                    const stored = keyValues?.[tpl.id]?.[token]
                    const rawValue = Array.isArray(stored)
                      ? stored
                      : stored
                        ? [stored]
                        : []
                    const uniqueTokenOptions = tokenOptions.filter((opt, idx, arr) => arr.indexOf(opt) === idx)
                    const SELECT_ALL_OPTION = '__NR_SELECT_ALL__'
                    const optionsWithAll = uniqueTokenOptions.length > 1 ? [...uniqueTokenOptions, SELECT_ALL_OPTION] : uniqueTokenOptions
                    const ALL_SENTINELS = new Set(['all', 'select all', SELECT_ALL_OPTION.toLowerCase()])
                    const isAllStored = rawValue.some(
                      (val) => typeof val === 'string' && ALL_SENTINELS.has(val.toLowerCase()),
                    )
                    const displayValue = isAllStored
                      ? [SELECT_ALL_OPTION]
                      : rawValue
                        .filter((val, idx) => rawValue.indexOf(val) === idx)
                        .filter((val) => val !== SELECT_ALL_OPTION)
                    return (
                      <Autocomplete
                        key={token}
                        multiple
                        freeSolo
                        options={optionsWithAll}
                        value={displayValue}
                        getOptionLabel={(option) => (option === SELECT_ALL_OPTION ? 'All values' : option)}
                        filterSelectedOptions
                        renderTags={(value, getTagProps) => {
                          const isAllSelectedExplicit =
                            uniqueTokenOptions.length > 0 &&
                            value.length === uniqueTokenOptions.length &&
                            value.every((item) => uniqueTokenOptions.includes(item))
                          const selectedIncludesAllSentinel = value.some(
                            (item) => typeof item === 'string' && ALL_SENTINELS.has(item.toLowerCase()),
                          )
                          if (isAllSelectedExplicit || selectedIncludesAllSentinel) {
                            return [
                              <Chip
                                {...getTagProps({ index: 0 })}
                                key="all-values"
                                label="All values"
                              />,
                            ]
                          }
                          return value.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              key={option}
                              label={option === SELECT_ALL_OPTION ? 'All values' : option}
                            />
                          ))
                        }}
                        onChange={(_event, newValue) => {
                          const cleaned = Array.isArray(newValue) ? newValue : []
                          const normalized = cleaned
                            .map((item) => (typeof item === 'string' ? item.trim() : ''))
                            .filter((item) => item.length > 0)
                          const hasSelectAll = normalized.some((item) => {
                            const lower = item.toLowerCase()
                            return item === SELECT_ALL_OPTION || ALL_SENTINELS.has(lower)
                          })
                          const sanitized = normalized.filter(
                            (item) => !ALL_SENTINELS.has(item.toLowerCase()) && item !== SELECT_ALL_OPTION,
                          )
                          if (hasSelectAll) {
                            const allList = uniqueTokenOptions.length
                              ? [SELECT_ALL_OPTION, ...uniqueTokenOptions]
                              : [SELECT_ALL_OPTION]
                            onKeyValueChange(tpl.id, token, allList)
                          } else {
                            onKeyValueChange(tpl.id, token, sanitized)
                          }
                        }}
                        isOptionEqualToValue={(option, optionValue) => option === optionValue}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={token}
                            required
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    )
                  })}
                </Stack>
              </Box>
            ))
          ) : (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                bgcolor: 'background.default',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">
                {selected.length === 0
                  ? 'Select a template to configure key token filters.'
                  : 'Selected templates do not define key tokens.'}
              </Typography>
            </Box>
          )}
        </Stack>

        {activeTemplate && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 0.5, md: 1 }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">Resampling</Typography>
                <Typography variant="body2" color="text.secondary">
                  Filter discovery batches before generating charts and reports.
                </Typography>
              </Stack>
              <Button
                size="small"
                variant="text"
                onClick={handleResampleReset}
                disabled={!resampleState.filterActive}
              >
                Reset filter
              </Button>
            </Stack>
            {Array.isArray(activeTemplateResult?.batchMetrics) &&
            activeTemplateResult.batchMetrics.length ? (
              <>
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  spacing={1.25}
                  sx={{ mt: 1.5 }}
                >
                  <TextField
                    select
                    size="small"
                    label="Dimension"
                    value={safeResampleConfig.dimension}
                    onChange={handleResampleSelectorChange('dimension')}
                    sx={{ minWidth: { xs: '100%', lg: 180 } }}
                  >
                    {dimensionOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Metric"
                    value={safeResampleConfig.metric}
                    onChange={handleResampleSelectorChange('metric')}
                    sx={{ minWidth: { xs: '100%', lg: 180 } }}
                  >
                    {metricOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Aggregation"
                    value={safeResampleConfig.aggregation}
                    onChange={handleResampleSelectorChange('aggregation')}
                    sx={{ minWidth: { xs: '100%', lg: 180 } }}
                  >
                    {RESAMPLE_AGGREGATION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Time bucket"
                    value={safeResampleConfig.bucket}
                    onChange={handleResampleSelectorChange('bucket')}
                    disabled={safeResampleConfig.dimension !== 'time'}
                    helperText={
                      safeResampleConfig.dimension === 'time'
                        ? resampleBucketHelper
                        : 'Only applies to time dimension'
                    }
                    sx={{ minWidth: { xs: '100%', lg: 180 } }}
                  >
                    {RESAMPLE_BUCKET_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <Box sx={{ height: 260, mt: 2 }}>
                  {resampleState.series.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={resampleState.series}
                        margin={{ top: 8, right: 16, bottom: 24, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="#4f46e5" name={selectedMetricLabel} />
                        <Brush
                          dataKey="label"
                          height={24}
                          stroke="#4f46e5"
                          startIndex={
                            resampleState.displayRange ? resampleState.displayRange[0] : 0
                          }
                          endIndex={
                            resampleState.displayRange
                              ? resampleState.displayRange[1]
                              : Math.max(resampleState.series.length - 1, 0)
                          }
                          travellerWidth={8}
                          onChange={handleResampleBrushChange}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      sx={{ height: '100%' }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No buckets available for this selection. Try a different dimension.
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={0.5}
                  sx={{ mt: 1 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Showing {filteredBatchCount}
                    {totalBatchCount && totalBatchCount !== filteredBatchCount
                      ? ` / ${totalBatchCount}`
                      : ''}{' '}
                    {filteredBatchCount === 1 ? 'batch' : 'batches'}
                  </Typography>
                  {safeResampleConfig.dimension === 'time' && resampleBucketHelper && (
                    <Typography variant="caption" color="text.secondary">
                      {resampleBucketHelper}
                    </Typography>
                  )}
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Run discovery for this template to populate resampling metrics.
              </Typography>
            )}
          </Box>
        )}

        {(finding || Object.keys(results).length > 0) && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Discovery Results</Typography>
            {finding ? (
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <LinearProgress aria-label="Finding matching reports" />
                <Typography variant="body2" color="text.secondary">
                  Searching data...
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {Object.keys(results).map((tid) => {
                  const r = results[tid]
                  const filteredCount = r.batches.length
                  const originalCount = r.allBatches?.length ?? r.batches_count ?? filteredCount
                  const filteredRows = r.batches.reduce((acc, batch) => acc + (batch.rows || 0), 0)
                  const summary =
                    originalCount === filteredCount
                      ? `${filteredCount} ${filteredCount === 1 ? 'batch' : 'batches'} \u2022 ${filteredRows} rows`
                      : `${filteredCount} / ${originalCount} batches \u2022 ${filteredRows} rows`
                  return (
                    <Box
                      key={tid}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 0.5, sm: 1 }}>
                        <Typography variant="subtitle2">{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {summary}
                        </Typography>
                      </Stack>
                      {r.batches.length ? (
                        <Stack spacing={1} sx={{ mt: 1.25 }}>
                          <Typography variant="body2" color="text.secondary">
                            Select the batches to include in the run.
                          </Typography>
                          {r.batches.map((b, idx) => (
                            <Stack key={b.id || idx} direction="row" spacing={1} alignItems="center">
                              <Checkbox
                                checked={b.selected}
                                onChange={(e) => onToggleBatch(tid, idx, e.target.checked)}
                                inputProps={{ 'aria-label': `Toggle batch ${idx + 1} for ${r.name}` }}
                              />
                              <Typography variant="body2">
                                Batch {idx + 1} {'\u2022'} {(b.parent ?? 1)} {(b.parent ?? 1) === 1 ? 'parent' : 'parents'} {'\u2022'} {b.rows} rows
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No data found for this range.</Typography>
                      )}
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>
        )}

        {activeTemplate && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">AI chart suggestions</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Ask about the discovered batches for {activeTemplate.name || activeTemplate.id}.
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  label="Ask a question about this template's data"
                  placeholder="e.g. Highlight batches with unusually high row counts"
                  value={chartQuestion}
                  onChange={(event) => setChartQuestion(event.target.value)}
                />
                <Button
                  variant="outlined"
                  onClick={handleAskCharts}
                  disabled={
                    chartSuggestMutation.isLoading ||
                    !activeBatchData.length
                  }
                  sx={{ alignSelf: { xs: 'flex-end', sm: 'flex-start' }, whiteSpace: 'nowrap' }}
                >
                  {chartSuggestMutation.isLoading ? 'Asking for charts...' : 'Ask AI for charts'}
                </Button>
              </Stack>
              {!activeBatchData.length && (
                <Typography variant="caption" color="text.secondary">
                  Run discovery for this template to unlock chart suggestions.
                </Typography>
              )}
              {chartSuggestions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No suggestions yet. Ask a question to generate chart ideas.
                </Typography>
              ) : (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Suggestions
                    </Typography>
                    <Stack spacing={1}>
                      {chartSuggestions.map((chart) => (
                        <Card
                          key={chart.id}
                          variant={
                            selectedChartSource === 'suggestion' && chart.id === selectedChartId
                              ? 'outlined'
                              : 'elevation'
                          }
                          sx={{
                            borderColor:
                              selectedChartSource === 'suggestion' && chart.id === selectedChartId
                                ? 'primary.main'
                                : 'divider',
                            bgcolor:
                              selectedChartSource === 'suggestion' && chart.id === selectedChartId
                                ? alpha('#4f46e5', 0.04)
                                : 'background.paper',
                          }}
                        >
                          <CardActionArea onClick={() => handleSelectSuggestion(chart.id)}>
                            <CardContent>
                              <Typography variant="subtitle2">
                                {chart.title || 'Untitled chart'}
                              </Typography>
                              {chart.description && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5 }}
                                >
                                  {chart.description}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                                <Chip
                                  size="small"
                                  label={chart.type || 'chart'}
                                  variant="outlined"
                                  sx={{ textTransform: 'capitalize' }}
                                />
                                {chart.chartTemplateId && (
                                  <Chip
                                    size="small"
                                    label={chart.chartTemplateId}
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                  <Box
                    sx={{
                      flex: 2,
                      minHeight: { xs: 260, sm: 300 },
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      p: 1.5,
                      minWidth: 0,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Preview
                    </Typography>
                    {usingSampleData && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Using sample dataset from suggestion response
                      </Typography>
                    )}
                    <Box sx={{ width: '100%', height: { xs: 220, sm: 260 } }}>
                      {renderSuggestedChart(selectedChartSpec, previewData, {
                        source: selectedChartSource,
                      })}
                    </Box>
                    {chartSuggestions.length > 0 && (
                      <Box sx={{ textAlign: 'right', mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BookmarkAddOutlinedIcon fontSize="small" />}
                          onClick={handleSaveCurrentSuggestion}
                          disabled={!selectedSuggestion || saveChartLoading}
                        >
                          {saveChartLoading ? 'Saving…' : 'Save this chart'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Saved charts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Reuse charts you previously saved for {activeTemplate?.name || activeTemplate?.id || 'this template'}.
          </Typography>
          {!activeTemplate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Select a template to view saved charts.
            </Typography>
          )}
          {activeTemplate && (
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {savedChartsLoading && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading saved charts…
                  </Typography>
                </Stack>
              )}
              {savedChartsError && (
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={handleRetrySavedCharts}>
                      Retry
                    </Button>
                  }
                >
                  {savedChartsError}
                </Alert>
              )}
              {!savedChartsLoading && !savedChartsError && savedCharts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No saved charts yet. Use "Save this chart" after asking AI to pin a favorite configuration.
                </Typography>
              )}
              {!savedChartsLoading && !savedChartsError && savedCharts.length > 0 && (
                <Stack spacing={1}>
                  {savedCharts.map((chart) => {
                    const spec = chart.spec || {}
                    const isSelected = selectedChartSource === 'saved' && selectedSavedChartId === chart.id
                    return (
                      <Card
                        data-testid={`saved-chart-card-${chart.id}`}
                        key={chart.id}
                        variant={isSelected ? 'outlined' : 'elevation'}
                        sx={{
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected ? alpha('#4f46e5', 0.04) : 'background.paper',
                        }}
                      >
                        <CardActionArea component="div" onClick={() => handleSelectSavedChart(chart.id)}>
                          <CardContent>
                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                              <Typography variant="subtitle2" sx={{ pr: 1 }}>
                                {chart.name || 'Saved chart'}
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  aria-label="Rename saved chart"
                                  onClick={(event) => handleRenameSavedChart(event, chart)}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label="Delete saved chart"
                                  onClick={(event) => handleDeleteSavedChart(event, chart)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                label={spec.type || 'chart'}
                                variant="outlined"
                                sx={{ textTransform: 'capitalize' }}
                              />
                              {spec.chartTemplateId && (
                                <Chip
                                  size="small"
                                  label={`From template: ${spec.chartTemplateId}`}
                                  variant="outlined"
                                />
                              )}
                              {!spec.chartTemplateId && (
                                <Chip size="small" label="Custom" variant="outlined" />
                              )}
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Stack>
          )}
        </Box>

        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Progress</Typography>
          {generation.items.length > 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Reports continue running in the background. Open the Jobs panel (clock icon in the header) to monitor status and download results.
            </Alert>
          )}
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {generation.items.map((item) => {
              const jobDetails = item.jobId ? jobsById?.[item.jobId] : null
              const rawStatus = (jobDetails?.status || item.status || 'queued').toLowerCase()
              const statusLabel = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
              const jobProgress =
                typeof jobDetails?.progress === 'number'
                  ? jobDetails.progress
                  : typeof item.progress === 'number'
                    ? item.progress
                    : null
              const clampedProgress =
                typeof jobProgress === 'number' && Number.isFinite(jobProgress)
                  ? Math.min(100, Math.max(0, jobProgress))
                  : null
              const chipColor = JOB_STATUS_COLORS[rawStatus] || 'default'
              const progressVariant = clampedProgress == null ? 'indeterminate' : 'determinate'
              const errorMessage = jobDetails?.error || item.error
              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 0.5, sm: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.jobId ? `Job ID: ${item.jobId}` : 'Preparing job...'}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={statusLabel}
                      color={chipColor === 'default' ? 'default' : chipColor}
                      variant={chipColor === 'default' ? 'outlined' : 'filled'}
                    />
                  </Stack>
                  <LinearProgress
                    variant={progressVariant}
                    value={progressVariant === 'determinate' ? clampedProgress : undefined}
                    sx={{ mt: 1 }}
                    aria-label={`${item.name} progress`}
                  />
                  {errorMessage ? (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {errorMessage}
                    </Alert>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Keep an eye on the Jobs panel to see when this run finishes and download the files.
                    </Typography>
                  )}
                </Box>
              )
            })}
            {!generation.items.length && <Typography variant="body2" color="text.secondary">No runs yet</Typography>}
          </Stack>
        </Box>
      </Surface>

      <Surface sx={surfaceStackSx}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="h6">Recently Downloaded</Typography>
          <InfoTooltip
            content={TOOLTIP_COPY.recentDownloads}
            ariaLabel="Recent downloads guidance"
          />
        </Stack>
        <Stack spacing={1.5}>
          {downloads.map((d, i) => {
            const metaLine = [d.template, d.format ? d.format.toUpperCase() : null, d.size || 'Size unknown']
              .filter(Boolean)
              .join(' \u2022 ')
            const formatChips = [
              d.pdfUrl && { label: 'PDF', color: 'primary' },
              d.docxUrl && { label: 'DOCX', color: 'secondary' },
              d.xlsxUrl && { label: 'XLSX', color: 'info' },
            ].filter(Boolean)
            const actionButtons = [
              {
                key: 'open',
                label: 'Open preview',
                variant: 'outlined',
                color: 'inherit',
                disabled: !d.htmlUrl,
                href: d.htmlUrl ? withBase(d.htmlUrl) : null,
              },
              {
                key: 'pdf',
                label: 'Download PDF',
                variant: 'contained',
                color: 'primary',
                disabled: !d.pdfUrl,
                href: d.pdfUrl ? buildDownloadUrl(withBase(d.pdfUrl)) : null,
              },
              d.docxUrl && {
                key: 'docx',
                label: 'Download DOCX',
                variant: 'outlined',
                color: 'primary',
                href: buildDownloadUrl(withBase(d.docxUrl)),
              },
              d.xlsxUrl && {
                key: 'xlsx',
                label: 'Download XLSX',
                variant: 'outlined',
                color: 'info',
                href: buildDownloadUrl(withBase(d.xlsxUrl)),
              },
            ].filter(Boolean)
            return (
              <Box
                key={`${d.filename}-${i}`}
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: '0 6px 20px rgba(15,23,42,0.06)',
                  transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 160ms ease',
                  '&:hover': {
                    borderColor: 'primary.light',
                    boxShadow: '0 10px 30px rgba(79,70,229,0.14)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ md: 'center' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap title={d.filename}>
                        {d.filename}
                      </Typography>
                      {metaLine && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                          noWrap
                          title={metaLine}
                        >
                          {metaLine}
                        </Typography>
                      )}
                    </Box>
                    {!!formatChips.length && (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        {formatChips.map(({ label, color: colorKey }) => (
                          <Chip
                            key={label}
                            size="small"
                            label={label}
                            sx={(theme) => ({
                              borderRadius: 1,
                              fontWeight: 600,
                              bgcolor: alpha(theme.palette[colorKey].main, 0.12),
                              color: theme.palette[colorKey].dark,
                              border: '1px solid',
                              borderColor: alpha(theme.palette[colorKey].main, 0.3),
                            })}
                          />
                        ))}
                      </Stack>
                    )}
                  </Stack>

                  <Divider />

                  <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={1.25}
                    alignItems={{ lg: 'flex-start' }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      sx={{ flexGrow: 1, columnGap: 1, rowGap: 1 }}
                    >
                      {actionButtons.map((action) => {
                        const linkProps = action.href
                          ? { component: 'a', href: action.href, target: '_blank', rel: 'noopener' }
                          : {}
                        return (
                          <Button
                            key={action.key}
                            size="small"
                            variant={action.variant}
                            color={action.color}
                            disabled={action.disabled}
                            sx={{
                              textTransform: 'none',
                              minWidth: { xs: '100%', sm: 0 },
                              flex: { xs: '1 1 100%', sm: '0 0 auto' },
                              px: 2.5,
                            }}
                            {...linkProps}
                          >
                            {action.label}
                          </Button>
                        )
                      })}
                    </Stack>
                    <Box sx={{ width: { xs: '100%', lg: 'auto' } }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<ReplayIcon fontSize="small" />}
                        onClick={d.onRerun}
                        sx={{ width: { xs: '100%', lg: 'auto' }, textTransform: 'none', px: 2.5 }}
                      >
                        Re-run
                      </Button>
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            )
          })}
          {!downloads.length && <Typography variant="body2" color="text.secondary">No recent downloads yet.</Typography>}
        </Stack>
      </Surface>
    </>
  )
}

/* -----------------------------------------------------------
   Page Shell
----------------------------------------------------------- */
export default function GeneratePage() {
  const { templates } = useAppStore()
  const queryClient = useQueryClient()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])
  const [selected, setSelected] = useState([])
  const [pendingFocusTemplate, setPendingFocusTemplate] = useState(location.state?.focusTemplateId || null)
  const [outputFormats, setOutputFormats] = useState({})
  const [tagFilter, setTagFilter] = useState([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [finding, setFinding] = useState(false)
  const [results, setResults] = useState({})
  const [generation, setGeneration] = useState({ items: [] })
  const [keyValues, setKeyValues] = useState({})
  const [keyOptions, setKeyOptions] = useState({})
  const [keyOptionsLoading, setKeyOptionsLoading] = useState({})
  const isDevEnv = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

  useEffect(() => {
    if (!isDevEnv || typeof window === 'undefined') return
    window.__NR_GENERATE_KEY_OPTIONS__ = keyOptions
    window.__NR_GENERATE_KEY_VALUES__ = keyValues
  }, [keyOptions, keyValues, isDevEnv])

  useEffect(() => { setResults({}); setFinding(false) }, [selected, start, end, keyValues])

  const selectedTemplates = useMemo(
    () => approved.filter((t) => selected.includes(t.id)),
    [approved, selected],
  )
  const locationState = location.state
  const focusTemplateIdFromLocation = locationState?.focusTemplateId

  useEffect(() => {
    if (!focusTemplateIdFromLocation) return
    setPendingFocusTemplate(focusTemplateIdFromLocation)
    const nextState = { ...(locationState || {}) }
    delete nextState.focusTemplateId
    navigate(location.pathname + location.search, {
      replace: true,
      state: Object.keys(nextState).length ? nextState : null,
    })
  }, [focusTemplateIdFromLocation, location.pathname, location.search, locationState, navigate])

  useEffect(() => {
    if (!pendingFocusTemplate) return
    const exists = approved.some((tpl) => tpl.id === pendingFocusTemplate)
    if (!exists) return
    setSelected((prev) => (prev.includes(pendingFocusTemplate) ? prev : [...prev, pendingFocusTemplate]))
    setPendingFocusTemplate(null)
  }, [approved, pendingFocusTemplate])

  useEffect(() => {
    setKeyOptions((prev) => {
      const next = {}
      selectedTemplates.forEach((tpl) => {
        if (prev[tpl.id]) {
          next[tpl.id] = prev[tpl.id]
        }
      })
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length === nextKeys.length && prevKeys.every((key) => prev[key] === next[key])) {
        return prev
      }
      return next
    })
    setKeyOptionsLoading((prev) => {
      const next = {}
      selectedTemplates.forEach((tpl) => {
        if (prev[tpl.id]) {
          next[tpl.id] = prev[tpl.id]
        }
      })
      if (Object.keys(prev).length === Object.keys(next).length) {
        return prev
      }
      return next
    })
  }, [selectedTemplates])
  const generatorSummary = useMemo(() => {
    const missing = selectedTemplates.filter(
      (t) =>
        !t.artifacts?.generator_sql_pack_url ||
        !t.artifacts?.generator_output_schemas_url,
    )
    const needsFix = selectedTemplates.filter((t) => {
      const meta = t.generator || {}
      const issues = Array.isArray(meta.needsUserFix) ? meta.needsUserFix.length : 0
      return meta.invalid || issues > 0
    })
    return {
      missing,
      needsFix,
      messages: needsFix.flatMap((tpl) => tpl.generator?.needsUserFix || []),
      ready: selectedTemplates.length > 0 && missing.length === 0 && needsFix.length === 0,
    }
  }, [selectedTemplates])

  const getTemplateKeyTokens = useCallback(
    (tpl) => {
      const fromState = Array.isArray(tpl?.mappingKeys)
        ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
        : []
      if (fromState.length) return fromState
      const options = keyOptions?.[tpl?.id] || {}
      return Object.keys(options || {})
    },
    [keyOptions],
  )

  useEffect(() => {
    let cancelled = false
    selectedTemplates.forEach((tpl) => {
      const stateTokens = Array.isArray(tpl?.mappingKeys)
        ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
        : []
      const existing = keyOptions[tpl.id] || {}
      const existingTokenKeys = Object.keys(existing)
      let requestTokens
      let shouldFetch = false

      if (stateTokens.length) {
        const missing = stateTokens.filter((token) => !(token in existing))
        if (missing.length || !existingTokenKeys.length) {
          shouldFetch = true
          requestTokens = stateTokens
        }
      } else if (!existingTokenKeys.length) {
        shouldFetch = true
        requestTokens = undefined
      }

      if (!shouldFetch || keyOptionsLoading[tpl.id]) {
        return
      }

      setKeyOptionsLoading((prev) => ({ ...prev, [tpl.id]: true }))
      fetchTemplateKeyOptions(tpl.id, {
        connectionId: tpl.lastConnectionId,
        tokens: requestTokens,
        limit: 100,
        startDate: start,
        endDate: end,
        kind: tpl.kind || 'pdf',
      })
        .then((data) => {
          if (cancelled) return
          const incoming = data?.keys && typeof data.keys === 'object' ? data.keys : {}
          if (typeof window !== 'undefined' && typeof window.__nrLogKeyOptions === 'function') {
            try {
              window.__nrLogKeyOptions({
                templateId: tpl.id,
                connectionId: tpl.lastConnectionId || null,
                tokens: requestTokens,
                payload: incoming,
              })
            } catch (err) {
              console.warn('nr_key_options_log_failed', err)
            }
          }
          setKeyOptions((prev) => {
            const prevTemplateOptions = prev[tpl.id] || {}
            const merged = { ...prevTemplateOptions }
            let changed = false
            const sourceTokens = requestTokens ?? Object.keys(incoming)
            sourceTokens.forEach((token) => {
              const values = Array.isArray(incoming[token]) ? incoming[token] : []
              if (!Array.isArray(prevTemplateOptions[token]) || values.join('|') !== (prevTemplateOptions[token] || []).join('|')) {
                merged[token] = values
                if (values.length || !(token in prevTemplateOptions)) {
                  changed = true
                }
              }
            })
            if (!changed && prev[tpl.id]) {
              return prev
            }
            return { ...prev, [tpl.id]: merged }
          })
        })
        .catch((err) => {
          if (cancelled) return
          console.warn('key_options_fetch_failed', err)
          toast.show(`Failed to load key options for ${tpl.name || tpl.id}`, 'error')
        })
        .finally(() => {
          if (cancelled) return
          setKeyOptionsLoading((prev) => ({ ...prev, [tpl.id]: false }))
        })
    })

    return () => {
      cancelled = true
    }
  }, [selectedTemplates, keyOptions, keyOptionsLoading, toast])

  const collectMissingKeys = () => {
    const missing = []
    selectedTemplates.forEach((tpl) => {
      const required = getTemplateKeyTokens(tpl)
      if (!required.length) return
      const provided = keyValues[tpl.id] || {}
      const absent = required.filter((token) => {
        const raw = provided[token]
        if (Array.isArray(raw)) {
          return !raw.some((entry) => String(entry || '').trim())
        }
        return !raw || !String(raw).trim()
      })
      if (absent.length) {
        missing.push({ tpl, tokens: absent })
      }
    })
    return missing
  }

  const autoType = useMemo(() => {
    if (!selected.length) return '-'
    const types = selectedTemplates.map((t) => getTemplateKind(t).toUpperCase())
    return types.every((t) => t === types[0]) ? types[0] : 'Mixed'
  }, [selected, selectedTemplates])

  const keysReady = useMemo(() => {
    return selectedTemplates.every((tpl) => {
      const required = getTemplateKeyTokens(tpl)
      if (!required.length) return true
      const provided = keyValues[tpl.id] || {}
      return required.every((token) => {
        const raw = provided[token]
        if (Array.isArray(raw)) {
          return raw.some((entry) => String(entry || '').trim())
        }
        return !!raw && String(raw).trim().length > 0
      })
    })
  }, [selectedTemplates, keyValues, getTemplateKeyTokens])

  const onToggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const handleKeyValueChange = (templateId, token, values) => {
    setKeyValues((prev) => {
      const next = { ...prev }
      const existing = { ...(next[templateId] || {}) }
      const asArray = Array.isArray(values) ? values : [values]
      const seen = new Set()
      const normalized = []
      asArray.forEach((entry) => {
        const text = entry == null ? '' : String(entry).trim()
        if (!text || seen.has(text)) return
        seen.add(text)
        normalized.push(text)
      })
      if (normalized.length) {
        existing[token] = normalized
        next[templateId] = existing
      } else {
        delete existing[token]
        if (Object.keys(existing).length === 0) {
          delete next[templateId]
        } else {
          next[templateId] = existing
        }
      }
      return next
    })
  }

  const onFind = async () => {
    if (!selectedTemplates.length || !start || !end) return toast.show('Select a template and choose a start/end date.', 'warning')
    if (generatorSummary.missing.length) {
      return toast.show('Generate SQL & schema assets for all selected templates before discovering reports.', 'warning')
    }
    if (generatorSummary.needsFix.length) {
      const detail = generatorSummary.messages.length ? generatorSummary.messages.join(', ') : 'Resolve SQL & schema asset issues before discovery.'
      return toast.show(detail, 'warning')
    }
    const missingKeyEntries = collectMissingKeys()
    if (missingKeyEntries.length) {
      const message = missingKeyEntries.map(({ tpl, tokens }) => `${tpl.name || tpl.id}: ${tokens.join(', ')}`).join('; ')
      toast.show(`Provide values for key tokens before discovery (${message}).`, 'warning')
      return
    }

    const startSql = toSqlDateTime(start)
    const endSql = toSqlDateTime(end)
    if (!startSql || !endSql) {
      toast.show('Provide a valid start and end date.', 'warning')
      return
    }

    setFinding(true)
    try {
      const payload = {}
      const targets = selectedTemplates
      for (const t of targets) {
        const data = await discoverReports({
          templateId: t.id,
          startDate: startSql,
          endDate: endSql,
          keyValues: keyValues[t.id],
          kind: getTemplateKind(t),
        })
        const rawBatches = Array.isArray(data.batches) ? data.batches : []
        const normalizedBatches = rawBatches.map((batch, index) => {
          const batchId = Object.prototype.hasOwnProperty.call(batch, 'id') ? batch.id : `${index + 1}`
          const rows = Number(batch.rows || 0)
          const parent = Number(batch.parent || 0)
          return {
            ...batch,
            id: batchId,
            rows,
            parent,
            selected: batch.selected ?? true,
            time: batch.time ?? null,
            category: batch.category ?? null,
          }
        })
        const fieldCatalog = Array.isArray(data.field_catalog) ? data.field_catalog : []
        const defaultDimension = fieldCatalog.some((field) => field?.name === 'time')
          ? 'time'
          : fieldCatalog.some((field) => field?.name === 'category')
            ? 'category'
            : 'batch_index'
        const defaultMetric = fieldCatalog.some((field) => field?.name === 'rows')
          ? 'rows'
          : fieldCatalog.some((field) => field?.name === 'rows_per_parent')
            ? 'rows_per_parent'
            : 'parent'
        const rawMetrics = Array.isArray(data.batch_metrics) ? data.batch_metrics : null
        const batchMetricsSource = rawMetrics && rawMetrics.length ? rawMetrics : normalizedBatches
        const batchMetrics = batchMetricsSource.map((entry, index) => {
          const base = normalizedBatches[index] || {}
          const rows = Number(entry?.rows ?? base.rows ?? 0)
          const parent = Number(entry?.parent ?? base.parent ?? 0)
          const safeParent = parent || (base.parent || 0)
          return {
            batch_index: entry?.batch_index ?? index + 1,
            batch_id: entry?.batch_id ?? base.id ?? `${index + 1}`,
            rows,
            parent,
            rows_per_parent:
              entry?.rows_per_parent ??
              (safeParent ? rows / safeParent : rows),
            time: entry?.time ?? base.time ?? null,
            category: entry?.category ?? base.category ?? null,
          }
        })
        payload[t.id] = {
          name: t.name,
          batches: normalizedBatches,
          allBatches: normalizedBatches,
          batches_count: data.batches_count ?? normalizedBatches.length,
          rows_total:
            data.rows_total ??
            normalizedBatches.reduce((acc, batch) => acc + (batch.rows || 0), 0),
          fieldCatalog,
          batchMetrics,
          resample: {
            config: {
              ...DEFAULT_RESAMPLE_CONFIG,
              dimension: defaultDimension,
              metric: defaultMetric,
            },
            filteredIds: null,
          },
        }
      }
      setResults(payload)
    } catch (error) {
      toast.show(String(error), 'error')
    } finally {
      setFinding(false)
    }
  }

  const onToggleBatch = (id, idx, val) => {
    setResults((prev) => {
      const target = prev[id]
      if (!target || !Array.isArray(target.batches)) return prev
      const targetBatch = target.batches[idx]
      if (!targetBatch) return prev
      const batchId = targetBatch.id
      const baseAll = (target.allBatches || target.batches || []).map((batch) => {
        if (String(batch.id) === String(batchId)) {
          return { ...batch, selected: val }
        }
        return batch
      })
      const allowedSet = target.resample?.filteredIds
      const nextBatches = allowedSet
        ? baseAll.filter((batch) => allowedSet.has(String(batch.id)))
        : baseAll
      return {
        ...prev,
        [id]: {
          ...target,
          allBatches: baseAll,
          batches: nextBatches,
        },
      }
    })
  }

  const handleResampleFilter = useCallback((templateId, payload) => {
    if (!templateId) return
    setResults((prev) => {
      const target = prev[templateId]
      if (!target) return prev
      const baseAll = target.allBatches || target.batches || []
      const allowedList = Array.isArray(payload?.allowedBatchIds)
        ? payload.allowedBatchIds.map((id) => String(id))
        : null
      const allowedSet = allowedList ? new Set(allowedList) : null
      const nextBatches = allowedSet
        ? baseAll.filter((batch) => allowedSet.has(String(batch.id)))
        : baseAll
      const incomingConfig = payload?.config
      const mergedConfig = incomingConfig
        ? { ...(target.resample?.config || DEFAULT_RESAMPLE_CONFIG), ...incomingConfig }
        : target.resample?.config || DEFAULT_RESAMPLE_CONFIG
      return {
        ...prev,
        [templateId]: {
          ...target,
          batches: nextBatches,
          resample: {
            config: mergedConfig,
            filteredIds: allowedSet,
          },
        },
      }
    })
  }, [])

  const canGenerate = useMemo(() => {
    const hasBatches = Object.values(results).some((r) => r.batches?.some((b) => b.selected))
    const datesReady = !!start && !!end && new Date(end) >= new Date(start)
    return hasBatches && datesReady && keysReady && generatorSummary.missing.length === 0 && generatorSummary.needsFix.length === 0
  }, [results, start, end, keysReady, generatorSummary.missing.length, generatorSummary.needsFix.length])

  const generateLabel = useMemo(() => {
    const names = selectedTemplates.map((t) => t.name).filter(Boolean)
    if (!names.length) return 'Run Reports'
    const preview = names.slice(0, 2).join(', ')
    const extra = names.length > 2 ? ` +${names.length - 2} more` : ''
    return `Run reports for ${preview}${extra}`
  }, [selectedTemplates])

  const batchIdsFor = (tplId) => (results[tplId]?.batches || []).filter((b) => b.selected).map((b) => b.id)

  const onGenerate = async () => {
    if (!selectedTemplates.length) return
    if (!start || !end) {
      toast.show('Select a start and end date before running.', 'warning')
      return
    }
    const startSql = toSqlDateTime(start)
    const endSql = toSqlDateTime(end)
    if (!startSql || !endSql) {
      toast.show('Provide a valid date range.', 'warning')
      return
    }
    if (generatorSummary.missing.length) {
      return toast.show('Generate SQL & schema assets for all selected templates before generating reports.', 'warning')
    }
    if (generatorSummary.needsFix.length) {
      const detail = generatorSummary.messages.length ? generatorSummary.messages.join(', ') : 'Resolve SQL & schema asset issues before generating reports.'
      return toast.show(detail, 'warning')
    }
    const missingKeyEntries = collectMissingKeys()
    if (missingKeyEntries.length) {
      const message = missingKeyEntries.map(({ tpl, tokens }) => `${tpl.name || tpl.id}: ${tokens.join(', ')}`).join('; ')
      toast.show(`Provide values for key tokens before running (${message}).`, 'warning')
      return
    }

    const timestamp = Date.now()
    const seed = selectedTemplates.map((t, idx) => ({
      id: `${t.id}-${timestamp + idx}`,
      tplId: t.id,
      name: t.name,
      kind: getTemplateKind(t),
      status: 'queued',
      progress: 5,
      jobId: null,
      error: null,
    }))
    setGeneration({ items: seed })

    let queuedJobs = 0

    for (const item of seed) {
      try {
        const rawFormat = outputFormats[item.tplId] || 'auto'
        const normalizedFormat = rawFormat === 'excel' ? 'xlsx' : rawFormat
        const requestDocx = normalizedFormat === 'docx' || normalizedFormat === 'auto'
        const requestXlsx = normalizedFormat === 'xlsx' || (normalizedFormat === 'auto' && item.kind === 'excel')
        const response = await runReportAsJob({
          templateId: item.tplId,
          templateName: item.name,
          startDate: startSql,
          endDate: endSql,
          batchIds: batchIdsFor(item.tplId),
          keyValues: keyValues[item.tplId],
          docx: requestDocx,
          xlsx: requestXlsx,
          kind: item.kind,
        })
        const jobId = response?.job_id || null
        setGeneration((prev) => ({
          items: prev.items.map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  jobId,
                  status: 'queued',
                  progress: jobId ? 15 : 10,
                  error: null,
                }
              : x,
          ),
        }))
        queuedJobs += 1
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
      } catch (error) {
        const message = error?.message || String(error)
        setGeneration((prev) => ({
          items: prev.items.map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  status: 'failed',
                  progress: 100,
                  error: message,
                }
              : x,
          ),
        }))
        toast.show(String(error), 'error')
      }
    }

    if (queuedJobs > 0) {
      toast.show('Reports are running in the background. Open the Jobs panel to monitor progress.', 'success')
    }
  }

  return (
    <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid size={12} sx={{ minWidth: 0 }}>
        <TemplatePicker
          selected={selected}
          onToggle={onToggle}
          outputFormats={outputFormats}
          setOutputFormats={setOutputFormats}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
        />
        </Grid>
        <Grid size={12} sx={{ minWidth: 0 }}>
        <GenerateAndDownload
          selected={selectedTemplates.map((t) => t.id)}
          selectedTemplates={selectedTemplates}
          autoType={autoType}
          start={start}
          end={end}
          setStart={setStart}
          setEnd={setEnd}
          onFind={onFind}
          findDisabled={finding}
          finding={finding}
          results={results}
          onToggleBatch={onToggleBatch}
          onGenerate={onGenerate}
          canGenerate={canGenerate}
          generateLabel={generateLabel}
          generation={generation}
          generatorReady={generatorSummary.ready}
          generatorIssues={generatorSummary}
          keyValues={keyValues}
          onKeyValueChange={handleKeyValueChange}
          keysReady={keysReady}
          keyOptions={keyOptions}
          keyOptionsLoading={keyOptionsLoading}
          onResampleFilter={handleResampleFilter}
        />
        </Grid>
    </Grid>
  )
}

export { TemplatePicker, GenerateAndDownload }
