import Grid from '@mui/material/Grid2'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress,
  Card, CardActionArea, CardActions, CardContent, Autocomplete, Tooltip, Dialog, DialogContent, DialogTitle,
  CircularProgress, Alert, IconButton, Collapse, MenuItem, Paper,
} from '@mui/material'
import { Stepper, Step, StepLabel } from '@mui/material'
import { alpha } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DownloadIcon from '@mui/icons-material/Download'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ReplayIcon from '@mui/icons-material/Replay'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ListAltIcon from '@mui/icons-material/ListAlt'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  isMock,
  withBase,
  listApprovedTemplates,
  deleteTemplate as deleteTemplateRequest,
  fetchTemplateKeyOptions,
  discoverReports,
  runReport,
  listSchedules,
  createSchedule,
  deleteSchedule,
  normalizeRunArtifacts,
  importTemplateZip,
  templateExportZipUrl,
} from '../../api/client'
import * as mock from '../../api/mock'
import { savePersistedCache } from '../../hooks/useBootstrapState.js'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
import { resolveTemplatePreviewUrl, resolveTemplateThumbnailUrl } from '../../utils/preview'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EmptyState from '../../components/feedback/EmptyState.jsx'
import LoadingState from '../../components/feedback/LoadingState.jsx'
import InfoTooltip from '../../components/common/InfoTooltip.jsx'
import TOOLTIP_COPY from '../../content/tooltipCopy.jsx'
import DiscoveryListsPanel from './DiscoveryListsPanel.jsx'

/* ----------------------- helpers ----------------------- */
const ALL_OPTION = '__ALL__'
const SCHEDULE_FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'six_hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

const parseEmailTargets = (value) => {
  if (!value) return []
  return value
    .split(/[,;]+/)
    .map((entry) => (entry == null ? '' : String(entry).trim()))
    .filter((entry, idx, arr) => entry && arr.indexOf(entry) === idx)
}

const formatScheduleDate = (value) => {
  if (!value) return 'Pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const toSqlFromDayjs = (d) => (d && d.isValid && d.isValid())
  ? d.format('YYYY-MM-DD HH:mm:00')
  : ''
const formatDisplayDate = (d) => (d && typeof d?.isValid === 'function' && d.isValid())
  ? d.format('MMM D, YYYY h:mm A')
  : ''

const includeConn = (body, connectionId) =>
  connectionId ? { ...body, connection_id: connectionId } : body

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

const addKeyValues = (body, keyValues) => {
  if (!keyValues || typeof keyValues !== 'object') return body
  const cleaned = {}
  Object.entries(keyValues).forEach(([token, rawValue]) => {
    const name = typeof token === 'string' ? token.trim() : ''
    if (!name) return
    let values = []
    let sawAll = false
    if (Array.isArray(rawValue)) {
      const seen = new Set()
      rawValue.forEach((entry) => {
        if (entry === ALL_OPTION) {
          sawAll = true
          return
        }
        const text = entry == null ? '' : String(entry).trim()
        if (!text || seen.has(text)) return
        seen.add(text)
        values.push(text)
      })
    } else if (rawValue != null) {
      const text = String(rawValue).trim()
      if (text && text !== ALL_OPTION) {
        values = [text]
      } else if (text === ALL_OPTION) {
        sawAll = true
      }
    }
    if (!values.length) {
      if (sawAll) {
        cleaned[name] = 'All'
      }
      return
    }
    cleaned[name] = values.length === 1 ? values[0] : values
  })
  if (!Object.keys(cleaned).length) return body
  return { ...body, key_values: cleaned }
}

const formatTokenLabel = (token) => {
  if (!token) return ''
  return token
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)([a-z])/g, (match, prefix, char) => `${prefix}${char.toUpperCase()}`)
}
const getTemplateKind = (template) => (template?.kind === 'excel' ? 'excel' : 'pdf')
const formatCount = (value) => {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString()
}
/* ------------------------------------------------------ */
const surfaceStackSx = {
  gap: { xs: 2, md: 2.5 },
}

const previewFrameSx = {
  width: '100%',
  maxWidth: { xs: 260, sm: 280, md: 300, lg: 320 },
  aspectRatio: '210 / 297',
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  mx: 'auto',
  p: 1,
}

function StepIndicator(props) {
  const { active, completed, icon } = props
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 14,
        border: '2px solid',
        borderColor: completed ? 'success.main' : active ? 'primary.main' : 'divider',
        bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'background.paper',
        color: completed || active ? 'common.white' : 'text.secondary',
        transition: 'all 160ms ease',
        boxShadow: active ? '0 2px 6px rgba(79,70,229,0.2)' : 'none',
      }}
    >
      {completed ? <CheckRoundedIcon fontSize="small" /> : icon}
    </Box>
  )
}



function TemplatePicker({ selected, onToggle, tagFilter, setTagFilter }) {

  const { templates, setTemplates, removeTemplate, setSetupNav } = useAppStore()

  const toast = useToast()

  const queryClient = useQueryClient()

  const [deleting, setDeleting] = useState(null)

  const [importing, setImporting] = useState(false)

  const [nameQuery, setNameQuery] = useState('')

  const fileInputRef = useRef(null)

  const [previewOpen, setPreviewOpen] = useState(false)

  const [previewSrc, setPreviewSrc] = useState(null)

  const [previewType, setPreviewType] = useState('html')

  const [previewKey, setPreviewKey] = useState(null)

  const { data, isLoading, isFetching } = useQuery({

    queryKey: ['templates'],

    queryFn: () => (isMock ? mock.listTemplates() : listApprovedTemplates()),

  })



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



  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])

  const allTags = useMemo(() => Array.from(new Set(approved.flatMap((t) => t.tags || []))), [approved])

  const filtered = useMemo(() => {

    const tagFiltered = tagFilter.length

      ? approved.filter((t) => (t.tags || []).some((tag) => tagFilter.includes(tag)))

      : approved

    const nq = nameQuery.trim().toLowerCase()

    return nq ? tagFiltered.filter((t) => (t.name || '').toLowerCase().includes(nq)) : tagFiltered

  }, [approved, tagFilter, nameQuery])



  const handleImportFile = useCallback(

    async (file) => {

      if (!file) return

      if (isMock) {

        toast.show('Import is unavailable while using mock data.', 'info')

        return

      }

      setImporting(true)

      try {

        const baseName = file.name ? file.name.replace(/\.zip$/i, '').trim() : ''

        const result = await importTemplateZip({ file, name: baseName || undefined })

        await queryClient.invalidateQueries({ queryKey: ['templates'] })

        toast.show(`Imported "${result?.name || baseName || file.name}"`, 'success')

      } catch (err) {

        toast.show(String(err), 'error')

      } finally {

        setImporting(false)

        if (fileInputRef.current) {

          fileInputRef.current.value = ''

        }

      }

    },

    [toast, queryClient],

  )



  const handleImportClick = useCallback(() => {

    if (isMock) {

      toast.show('Import is unavailable while using mock data.', 'info')

      return

    }

    fileInputRef.current?.click()

  }, [toast])



  const handleImportInputChange = useCallback(

    (event) => {

      const nextFile = event?.target?.files?.[0]

      if (nextFile) {

        handleImportFile(nextFile)

      }

    },

    [handleImportFile],

  )



  const handleThumbClick = (event, payload) => {

    event.stopPropagation()

    const url = payload?.url

    if (!url) return

    setPreviewSrc(url)

    setPreviewType(payload?.type || 'html')

    setPreviewKey(payload?.key || url)

    setPreviewOpen(true)

  }



  const handlePreviewClose = () => {

    setPreviewOpen(false)

    setPreviewSrc(null)

    setPreviewType('html')

    setPreviewKey(null)

  }



  const handleDeleteTemplate = async (template) => {

    if (!template?.id) return

    const name = template.name || template.id

    if (typeof window !== 'undefined') {

      const confirmed = window.confirm(`Delete template "${name}"? This action cannot be undone.`)

      if (!confirmed) return

    }

    setDeleting(template.id)

    try {

      await deleteTemplateRequest(template.id)

      removeTemplate(template.id)

      if (selected.includes(template.id)) {

        onToggle(template.id)

      }

      queryClient.setQueryData(['templates'], (prev) => {

        if (Array.isArray(prev)) {

          return prev.filter((tpl) => tpl?.id !== template.id)

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



  let templateListContent

  if (!templates.length && (isLoading || isFetching)) {

    templateListContent = (

      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>

        <LoadingState label="Loading templates..." description="Fetching approved templates from the server." />

      </Box>

    )

  } else if (!filtered.length) {

    templateListContent = (

      <EmptyState

        title={tagFilter.length || nameQuery.trim() ? 'No templates match the filters' : 'No approved templates yet'}

        description={tagFilter.length || nameQuery.trim()

          ? 'Adjust the filters or clear them to see all approved templates.'

          : 'Upload and verify a template to make it available for runs.'}

        action={

          !filtered.length && !templates.length ? (

            <Button variant="contained" onClick={() => setSetupNav('generate')}>

              Upload template

            </Button>

          ) : null

        }

      />

    )

  } else {

    templateListContent = (

      <Grid container spacing={2}>

        {filtered.map((t) => {

          const selectedState = selected.includes(t.id)

          const type = getTemplateKind(t).toUpperCase()

          const previewInfo = resolveTemplatePreviewUrl(t)

          const thumbnailInfo = resolveTemplateThumbnailUrl(t)

          const htmlPreview = previewInfo.url

          const imagePreview = !htmlPreview ? thumbnailInfo.url : null

          const boxClickable = Boolean(htmlPreview || imagePreview)

          const mappingKeyCount = Array.isArray(t?.mappingKeys) ? t.mappingKeys.length : 0

          const exportHref = isMock ? null : templateExportZipUrl(t.id)

          return (

            <Grid size={{ xs: 12, sm: 6, md: 6 }} key={t.id} sx={{ minWidth: 0 }}>

              <Card

                variant="outlined"

                sx={[

                  {

                    position: 'relative',

                    overflow: 'hidden',

                    display: 'flex',

                    flexDirection: 'column',

                    minHeight: 280,

                    transition: 'border-color 160ms ease, box-shadow 160ms ease',

                  },

                  selectedState && {

                    borderColor: 'primary.main',

                    boxShadow: '0 0 0 1px rgba(79,70,229,0.28)',

                  },

                ]}

              >

                <CardActionArea component="div" onClick={() => onToggle(t.id)} sx={{ height: '100%' }}>

                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', flexGrow: 1 }}>

                    <Box

                      sx={[previewFrameSx, boxClickable && { cursor: 'pointer' }]}

                      onClick={(e) => {

                        if (htmlPreview) {

                          handleThumbClick(e, { url: htmlPreview, key: previewInfo.key, type: 'html' })

                        } else if (imagePreview) {

                          handleThumbClick(e, { url: imagePreview, key: imagePreview, type: 'image' })

                        }

                      }}

                    >

                      {htmlPreview ? (

                        <ScaledIframePreview

                          key={previewInfo.key}

                          src={htmlPreview}

                          title={`${t.name} preview`}

                          sx={{ width: '100%', height: '100%' }}

                          frameAspectRatio="210 / 297"

                        />

                      ) : imagePreview ? (

                        <img

                          src={imagePreview}

                          alt={`${t.name} preview`}

                          loading="lazy"

                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', cursor: 'inherit' }}

                        />

                      ) : (

                        <Typography variant="caption" color="text.secondary" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                          No preview yet

                        </Typography>

                      )}

                    </Box>



                    {!!t.description && (

                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>

                        {t.description}

                      </Typography>

                    )}

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>

                      {(t.tags || []).slice(0, 4).map((tag) => (

                        <Chip key={tag} label={tag} size="small" />

                      ))}

                      {!!(t.tags || []).slice(4).length && <Chip size="small" label={`+${(t.tags || []).length - 4}`} variant="outlined" />}

                    </Stack>

                    <Divider sx={{ mt: 'auto', my: 1 }} />

                    <Stack spacing={1} alignItems="flex-start">

                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>

                        {t.name}

                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>

                        <Chip size="small" label={type} variant="outlined" />

                        {mappingKeyCount > 0 && (

                          <Chip

                            size="small"

                            color="info"

                            variant="outlined"

                            label={`${mappingKeyCount} key ${mappingKeyCount === 1 ? 'filter' : 'filters'}`}

                          />

                        )}

                      </Stack>

                    </Stack>

                  </CardContent>

                </CardActionArea>

                <CardActions

                  sx={{

                    justifyContent: 'space-between',

                    alignItems: 'center',

                    px: 2,

                    pb: 2,

                    gap: 1,

                    flexWrap: 'wrap',

                  }}

                >

                  <Button

                    size="small"

                    variant={selectedState ? 'contained' : 'outlined'}

                    onClick={(e) => {

                      e.preventDefault()

                      e.stopPropagation()

                      onToggle(t.id)

                    }}

                    startIcon={selectedState ? <CheckRoundedIcon fontSize="small" /> : undefined}

                  >

                    {selectedState ? 'Selected' : 'Select'}

                  </Button>

                  <Stack direction="row" spacing={0.5} alignItems="center">

                    <Tooltip title={exportHref ? 'Export template ZIP' : 'Export unavailable in mock mode'}>

                      <span>

                        <IconButton

                          size="small"

                          component={exportHref ? 'a' : 'button'}

                          href={exportHref || undefined}

                          target={exportHref ? '_blank' : undefined}

                          rel={exportHref ? 'noopener' : undefined}

                          onClick={(e) => {

                            if (!exportHref) e.preventDefault()

                            e.stopPropagation()

                          }}

                        >

                          <Inventory2OutlinedIcon fontSize="small" />

                        </IconButton>

                      </span>

                    </Tooltip>

                    <Tooltip title="Delete template">

                      <span>

                        <IconButton

                          size="small"

                          color="error"

                          disabled={deleting === t.id}

                          onClick={(e) => {

                            e.preventDefault()

                            e.stopPropagation()

                            handleDeleteTemplate(t)

                          }}

                        >

                          {deleting === t.id ? (

                            <CircularProgress size={16} color="inherit" />

                          ) : (

                            <DeleteOutlineIcon fontSize="small" />

                          )}

                        </IconButton>

                      </span>

                    </Tooltip>

                  </Stack>

                </CardActions>

              </Card>

            </Grid>

          )

        })}

      </Grid>

    )

  }



  return (

    <Surface sx={surfaceStackSx}>

      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="h6">Select Templates</Typography>
          <InfoTooltip content={TOOLTIP_COPY.templatePicker} ariaLabel="How to select templates" />
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            Export from any template card to download the entire uploads folder. Import the ZIP here to restore it on this device.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" variant="outlined" label={`${selected.length} selected`} />
            <Chip size="small" variant="outlined" label={`${filtered.length} showing`} />
          </Stack>
        </Stack>
      </Stack>
      <Grid container spacing={1.5} alignItems="center" sx={{ pb: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            multiple
            options={allTags}
            value={tagFilter}
            onChange={(e, v) => setTagFilter(v)}
            freeSolo
            renderInput={(params) => <TextField {...params} label="Filter by tags" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Search by name"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid
          size={{ xs: 12, md: 4 }}
          sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleImportInputChange}
          />
          <Tooltip title="Import an exported template bundle">
            <span>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={handleImportClick}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import Template'}
              </Button>
            </span>
          </Tooltip>
        </Grid>
      </Grid>
      <Collapse in={isFetching && !isLoading} unmountOnExit>

        <LinearProgress color="secondary" sx={{ borderRadius: 1 }} aria-label="Refreshing templates" />

      </Collapse>

      {templateListContent}

      <Dialog

        open={previewOpen}

        onClose={handlePreviewClose}

        maxWidth="lg"

        fullWidth

        aria-labelledby="template-preview-title"

        PaperProps={{

          sx: {

            height: '90vh',

            bgcolor: 'background.default',

          },

        }}

      >

        <DialogTitle id="template-preview-title">Template Preview</DialogTitle>

        <DialogContent

          dividers

          sx={{

            display: 'flex',

            justifyContent: 'center',

            alignItems: 'flex-start',

            overflow: 'auto',

            bgcolor: 'background.default',

          }}

        >

          {previewSrc && previewType === 'html' ? (

            <Box

              sx={{

                width: '100%',

                maxWidth: 1120,

                mx: 'auto',

                bgcolor: 'background.paper',

                borderRadius: 1,

                boxShadow: 2,

                border: '1px solid',

                borderColor: 'divider',

                overflow: 'auto',

                p: 2,

              }}

            >

              <ScaledIframePreview key={previewKey || previewSrc} src={previewSrc} title="Template HTML preview" sx={{ width: '100%', height: '100%' }} loading="eager" />

            </Box>

          ) : previewSrc ? (

            <Box

              component="img"

              src={previewSrc}

              alt="Template preview"

              sx={{

                display: 'block',

                width: '100%',

                maxWidth: 1120,

                height: 'auto',

                mx: 'auto',

                borderRadius: 1,

                boxShadow: 2,

              }}

            />

          ) : null}

        </DialogContent>

      </Dialog>

    </Surface>

  )

}

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
  onGenerate,
  canGenerate,
  generateLabel,
  generateTooltip = '',
  generation,
  onRetryGeneration = () => {},
  keyValues = {},
  onKeyValueChange = () => {},
  keysReady = true,
  keyOptions = {},
  keyOptionsLoading = {},
  onOpenDiscovery = () => {},
}) {
  const valid = selectedTemplates.length > 0 && !!start && !!end && end.valueOf() >= start.valueOf()
  const { downloads } = useAppStore()
  const targetNames = Object.values(results).map((r) => r.name)
  const hasDiscoveryTargets = targetNames.length > 0
  const discoveryCountLabel = hasDiscoveryTargets
    ? `${targetNames.length} ${targetNames.length === 1 ? 'template' : 'templates'}`
    : ''
  const templatesWithKeys = useMemo(
    () =>
      selectedTemplates
        .map((tpl) => {
          const mappingTokens = Array.isArray(tpl?.mappingKeys)
            ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
            : []
          const templateOptions = keyOptions[tpl.id] || {}
          const sourceTokens = mappingTokens.length ? mappingTokens : Object.keys(templateOptions)
          if (!sourceTokens.length) return null
          const tokens = sourceTokens.map((token) => ({
            name: token,
            required: mappingTokens.includes(token),
            options: templateOptions[token] || [],
          }))
          return { tpl, tokens }
        })
        .filter(Boolean),
    [selectedTemplates, keyOptions],
  )
  const resultCount = useMemo(() => Object.keys(results).length, [results])
  const keyPanelVisible = templatesWithKeys.length > 0 && resultCount > 0
  const discoverySummary = useMemo(() => {
    const entries = Object.values(results || {})
    if (!entries.length) return null
    return entries.reduce(
      (acc, entry) => {
        const batches = typeof entry.batches_count === 'number'
          ? entry.batches_count
          : Array.isArray(entry.batches)
            ? entry.batches.length
            : 0
        const rows = typeof entry.rows_total === 'number'
          ? entry.rows_total
          : Array.isArray(entry.batches)
            ? entry.batches.reduce((sum, batch) => sum + (batch.rows || 0), 0)
            : 0
        const selectedBatches = Array.isArray(entry.batches)
          ? entry.batches.filter((batch) => batch.selected).length
          : 0
        return {
          templates: acc.templates + 1,
          batches: acc.batches + batches,
          rows: acc.rows + rows,
          selected: acc.selected + selectedBatches,
        }
      },
      { templates: 0, batches: 0, rows: 0, selected: 0 },
    )
  }, [results])
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
                ariaLabel="How to run reports"
              />
            </Stack>
            {hasDiscoveryTargets && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <Chip size="small" variant="outlined" label={discoveryCountLabel} />
                <Tooltip title={targetNames.join(', ')}>
                  <IconButton
                    size="small"
                    color="primary"
                    aria-label="View discovery targets"
                  >
                    <ListAltIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}
          >
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SearchIcon />}
              onClick={onFind}
              disabled={!valid || findDisabled}
              aria-label="Discover matching reports"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Find Reports
            </Button>
            <Tooltip title={generateTooltip || generateLabel}>
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  disableElevation
                  startIcon={<RocketLaunchIcon />}
                  onClick={onGenerate}
                  disabled={!canGenerate}
                  aria-label={generateTooltip || generateLabel}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {generateLabel}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <DateTimePicker
              label="Start Date & Time"
              value={start}
              onChange={(v) => setStart(v)}
              slotProps={{
                textField: {
                  size: 'small',
                  FormHelperTextProps: { sx: { color: 'text.primary' } },
                },
              }}
            />
            <DateTimePicker
              label="End Date & Time"
              slotProps={{
                textField: {
                  size: 'small',
                  error: !!(start && end && end.isBefore(start)),
                  helperText: start && end && end.isBefore(start) ? 'End must be after Start' : ' ',
                  FormHelperTextProps: { sx: { color: 'text.primary' } },
                },
              }}
              value={end}
              onChange={(v) => setEnd(v)}
            />
            <Chip
              label={`Auto: ${autoType || '-'}`}
              size="small"
              variant="outlined"
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
            />
          </Stack>
        </LocalizationProvider>

        <Tooltip
          title={
            resultCount > 0
              ? 'Open the full discovery list panel'
              : 'Run Find Reports to populate discovery lists'
          }
        >
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ListAltIcon />}
              endIcon={<OpenInNewIcon />}
              onClick={onOpenDiscovery}
              disabled={resultCount === 0 && !finding}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              Discovery Lists
            </Button>
          </span>
        </Tooltip>
        {finding ? (
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary">
              Searching data...
            </Typography>
          </Stack>
        ) : discoverySummary ? (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            {`${formatCount(discoverySummary.templates)} ${discoverySummary.templates === 1 ? 'template' : 'templates'} \u2022 ${formatCount(discoverySummary.batches)} ${discoverySummary.batches === 1 ? 'batch' : 'batches'} \u2022 ${formatCount(discoverySummary.rows)} rows`}
            <Typography component="span" variant="body2" sx={{ display: 'block', mt: 0.5 }}>
              {discoverySummary.selected > 0
                ? `${formatCount(discoverySummary.selected)} batch${discoverySummary.selected === 1 ? '' : 'es'} selected for run`
                : 'No batches selected yet. Update selections in the discovery panel.'}
            </Typography>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            No discovery results yet. Run Find Reports after setting your date range.
          </Alert>
        )}

        {templatesWithKeys.length > 0 && resultCount > 0 && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Key Token Values</Typography>
            {!keysReady && (
              <Alert severity="warning">Fill in all key token values to enable discovery and runs.</Alert>
            )}
            {templatesWithKeys.map(({ tpl, tokens }) => (
              <Box
                key={tpl.id}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, bgcolor: 'background.paper' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{tpl.name || tpl.id}</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {tokens.map(({ name, required, options = [] }) => {
                    const rawOptions = Array.isArray(options) && options.length ? options : (keyOptions?.[tpl.id]?.[name] || [])
                    const normalizedOptions = Array.from(
                      new Set(
                        rawOptions
                          .map((option) => (option == null ? '' : String(option).trim()))
                          .filter(Boolean),
                      ),
                    )
                    const dropdownOptions = [ALL_OPTION, ...normalizedOptions]
                    const loading = Boolean(keyOptionsLoading?.[tpl.id])
                    const storedValue = Array.isArray(keyValues?.[tpl.id]?.[name]) ? keyValues[tpl.id][name] : []
                    const value = storedValue.includes(ALL_OPTION)
                      ? [ALL_OPTION]
                      : storedValue
                    return (
                      <Autocomplete
                        key={`${tpl.id}-${name}`}
                        multiple
                        disableCloseOnSelect
                        options={dropdownOptions}
                        value={value}
                        loading={loading}
                        onChange={(_event, newValue) => {
                          let next = Array.isArray(newValue) ? newValue.filter(Boolean) : []
                          if (next.includes(ALL_OPTION)) {
                            next = [ALL_OPTION, ...normalizedOptions]
                          } else {
                            next = Array.from(new Set(next))
                          }
                          onKeyValueChange(tpl.id, name, next)
                        }}
                        getOptionLabel={(option) => (option === ALL_OPTION ? 'All' : option)}
                        renderTags={(tagValue, getTagProps) =>
                          tagValue.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              key={`${tpl.id}-${name}-tag-${option}-${index}`}
                              size="small"
                              label={option === ALL_OPTION ? 'All' : option}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={`${formatTokenLabel(name)}${required ? ' *' : ''}`}
                            required={required}
                            placeholder={loading ? 'Loading...' : dropdownOptions.length ? 'Select values' : 'No options'}
                          />
                        )}
                      />
                    )
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Progress</Typography>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {generation.items.map((item) => (
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
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={{ xs: 0.5, sm: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.status}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 1 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    disabled={!item.htmlUrl}
                    component="a"
                    href={item.htmlUrl || '#'}
                    target="_blank"
                    rel="noopener"
                  >
                    Open
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disableElevation
                    startIcon={<DownloadIcon />}
                    disabled={!item.pdfUrl}
                    component="a"
                    href={item.pdfUrl ? buildDownloadUrl(item.pdfUrl) : '#'}
                    target="_blank"
                    rel="noopener"
                  >
                    Download
                  </Button>
                  {item.docxUrl && (
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      disableElevation
                      startIcon={<DownloadIcon />}
                      component="a"
                      href={buildDownloadUrl(item.docxUrl)}
                      target="_blank"
                      rel="noopener"
                    >
                      Download DOCX
                    </Button>
                  )}
                  {item.xlsxUrl && (
                    <Button
                      size="small"
                      variant="contained"
                      color="info"
                      disableElevation
                      startIcon={<DownloadIcon />}
                      component="a"
                      href={buildDownloadUrl(item.xlsxUrl)}
                      target="_blank"
                      rel="noopener"
                    >
                      Download XLSX
                    </Button>
                  )}
                  <Button size="small" variant="text" startIcon={<FolderOpenIcon />} disabled>
                    Show in folder
                  </Button>
                  {item.status === 'failed' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<ReplayIcon />}
                      onClick={() => onRetryGeneration(item)}
                    >
                      Retry
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}
            {!generation.items.length && <Typography variant="body2" color="text.secondary">No runs yet</Typography>}
          </Stack>
        </Box>
      </Surface>


      <Surface sx={surfaceStackSx}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="h6">Recently Downloaded</Typography>
          <InfoTooltip
            content={TOOLTIP_COPY.recentDownloads}
            ariaLabel="How to use recent downloads"
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
                        disableElevation
                        startIcon={<ReplayIcon />}
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


export default function TemplatesPane() {
  // pull connection if available; API can fallback when not provided
  const templates = useAppStore((state) => state.templates)
  const addDownload = useAppStore((state) => state.addDownload)
  const activeConnectionId = useAppStore((state) => state.activeConnectionId)
  const activeConnection = useAppStore((state) => state.activeConnection)
  const finding = useAppStore((state) => state.discoveryFinding)
  const setFinding = useAppStore((state) => state.setDiscoveryFinding)
  const results = useAppStore((state) => state.discoveryResults)
  const discoveryMeta = useAppStore((state) => state.discoveryMeta)
  const setDiscoveryResults = useAppStore((state) => state.setDiscoveryResults)
  const clearDiscoveryResults = useAppStore((state) => state.clearDiscoveryResults)
  const toast = useToast()
  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])
  const [selected, setSelected] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const onToggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const selectedTemplates = useMemo(() => approved.filter((t) => selected.includes(t.id)), [approved, selected])
  const selectedTypes = useMemo(
    () => selectedTemplates.map((t) => getTemplateKind(t).toUpperCase()),
    [selectedTemplates],
  )
  const autoType =
    selectedTypes.length === 0
      ? '-'
      : selectedTypes.every((t) => t === selectedTypes[0])
        ? selectedTypes[0]
        : 'Mixed'
  const [keyValues, setKeyValues] = useState({})
  const [keyOptions, setKeyOptions] = useState({})
  const [keyOptionsLoading, setKeyOptionsLoading] = useState({})
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [emailTargets, setEmailTargets] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [scheduleName, setScheduleName] = useState('')
  const [scheduleFrequency, setScheduleFrequency] = useState('daily')
  const [schedules, setSchedules] = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [deletingScheduleId, setDeletingScheduleId] = useState(null)
  const [generation, setGeneration] = useState({ items: [] })
  const [discoveryPanelOpen, setDiscoveryPanelOpen] = useState(false)
  const discoveryResetReady = useRef(false)
  const keyOptionsFetchKeyRef = useRef({})
  const isDevEnv = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

  useEffect(() => {
    if (!isDevEnv || typeof window === 'undefined') return
    window.__NR_SETUP_KEY_OPTIONS__ = keyOptions
    window.__NR_SETUP_KEY_VALUES__ = keyValues
  }, [keyOptions, keyValues, isDevEnv])

  useEffect(() => {
    setKeyValues((prev) => {
      const next = {}
      selectedTemplates.forEach((tpl) => {
        if (prev[tpl.id]) next[tpl.id] = prev[tpl.id]
      })
      if (Object.keys(next).length === Object.keys(prev).length) return prev
      return next
    })
  }, [selectedTemplates])
  useEffect(() => {
    setKeyOptions((prev) => {
      const next = {}
      selectedTemplates.forEach((tpl) => {
        if (prev[tpl.id]) next[tpl.id] = prev[tpl.id]
      })
      return next
    })
    setKeyOptionsLoading((prev) => {
      const next = {}
      selectedTemplates.forEach((tpl) => {
        if (prev[tpl.id]) next[tpl.id] = prev[tpl.id]
      })
      return next
    })
  }, [selectedTemplates])

  const refreshSchedules = useCallback(async () => {
    setSchedulesLoading(true)
    try {
      const data = await listSchedules()
      setSchedules(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.show(String(e), 'error')
    } finally {
      setSchedulesLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refreshSchedules()
  }, [refreshSchedules])

  const getTemplateKeyTokens = useCallback(
    (tpl) => {
      if (!tpl) return []
      const fromState = Array.isArray(tpl?.mappingKeys)
        ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
        : []
      if (fromState.length) return fromState
      const existing = keyOptions[tpl.id] || {}
      return Object.keys(existing)
    },
    [keyOptions],
  )

  const requestKeyOptions = useCallback(
    (tpl, startSql, endSql) => {
      if (!startSql || !endSql) return
      const tokens = Array.isArray(tpl?.mappingKeys)
        ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
        : []
      if (!tokens.length) return
      const discoveryConnectionId =
        discoveryMeta?.connectionId && (discoveryMeta?.templateIds || []).includes(tpl.id)
          ? discoveryMeta.connectionId
          : null
      const effectiveConnectionId =
        discoveryConnectionId || activeConnectionId || tpl.lastConnectionId || undefined
      const paramKey = `${effectiveConnectionId || 'auto'}|${startSql}|${endSql}`
      if (keyOptionsFetchKeyRef.current[tpl.id] === paramKey) {
        return
      }
      keyOptionsFetchKeyRef.current[tpl.id] = paramKey
      setKeyOptionsLoading((prev) => ({ ...prev, [tpl.id]: true }))

      fetchTemplateKeyOptions(tpl.id, {
        connectionId: effectiveConnectionId,
        tokens,
        limit: 100,
        startDate: startSql,
        endDate: endSql,
        kind: tpl.kind || 'pdf',
      })
        .then((data) => {
          const incoming = data?.keys && typeof data.keys === 'object' ? data.keys : {}
          const normalizedBatch = {}
          tokens.forEach((token) => {
            const rawValues = incoming[token]
            const normalized = Array.isArray(rawValues)
              ? Array.from(new Set(rawValues.map((value) => (value == null ? '' : String(value).trim())).filter(Boolean)))
              : []
            normalizedBatch[token] = normalized
          })
          if (typeof window !== 'undefined' && typeof window.__nrLogKeyOptions === 'function') {
            try {
              window.__nrLogKeyOptions({
                templateId: tpl.id,
                connectionId: effectiveConnectionId || tpl.lastConnectionId || null,
                tokens,
                payload: incoming,
              })
            } catch (err) {
              console.warn('nr_key_options_log_failed', err)
            }
          }
          setKeyOptions((prev) => {
            const prevTemplateOptions = prev[tpl.id] || {}
            const nextTemplateOptions = { ...prevTemplateOptions }
            Object.entries(normalizedBatch).forEach(([token, values]) => {
              nextTemplateOptions[token] = values
            })
            return { ...prev, [tpl.id]: nextTemplateOptions }
          })
        })
        .catch((err) => {
          console.warn('key_options_fetch_failed', err)
          toast.show(`Failed to load key options for ${tpl.name || tpl.id}`, 'error')
        })
        .finally(() => {
          setKeyOptionsLoading((prev) => ({ ...prev, [tpl.id]: false }))
        })
    },
    [activeConnectionId, discoveryMeta, toast],
  )

  useEffect(() => {
    if (!start || !end) return
    const startSql = toSqlFromDayjs(start)
    const endSql = toSqlFromDayjs(end)
    if (!startSql || !endSql) return
    selectedTemplates.forEach((tpl) => requestKeyOptions(tpl, startSql, endSql))
  }, [selectedTemplates, start, end, requestKeyOptions])

  const keysReady = useMemo(() => {
    return selectedTemplates.every((tpl) => {
      const tokens = getTemplateKeyTokens(tpl)
      if (!tokens.length) return true
      const provided = keyValues[tpl.id] || {}
      return tokens.every((token) => {
        const values = provided[token]
        if (!Array.isArray(values) || values.length === 0) return false
        if (values.includes(ALL_OPTION)) return true
        return values.some((value) => value && value.trim())
      })
    })
  }, [selectedTemplates, keyValues, getTemplateKeyTokens])

  const collectMissingKeys = useCallback(() => {
    const missing = []
    selectedTemplates.forEach((tpl) => {
      const tokens = getTemplateKeyTokens(tpl)
      if (!tokens.length) return
      const provided = keyValues[tpl.id] || {}
      const absent = tokens.filter((token) => {
        const values = provided[token]
        if (!Array.isArray(values) || values.length === 0) return true
        if (values.includes(ALL_OPTION)) return false
        return !values.some((value) => value && value.trim())
      })
      if (absent.length) {
        missing.push({ tpl, tokens: absent.map((token) => formatTokenLabel(token)) })
      }
    })
    return missing
  }, [selectedTemplates, getTemplateKeyTokens, keyValues])

  const handleKeyValueChange = useCallback((templateId, token, values) => {
    setKeyValues((prev) => {
      const next = { ...prev }
      const existing = { ...(next[templateId] || {}) }
      let normalized = Array.isArray(values) ? values.map((value) => (value == null ? '' : String(value).trim())) : []
      normalized = normalized.filter(Boolean)
      if (normalized.includes(ALL_OPTION)) {
        normalized = [ALL_OPTION]
      } else {
        normalized = Array.from(new Set(normalized))
      }
      if (normalized.length) {
        existing[token] = normalized
        next[templateId] = existing
      } else {
        delete existing[token]
        if (Object.keys(existing).length) next[templateId] = existing
        else delete next[templateId]
      }
      return next
    })
  }, [])

  const buildKeyFiltersForTemplate = useCallback((templateId) => {
    const provided = keyValues[templateId] || {}
    const payload = {}
    Object.entries(provided).forEach(([token, values]) => {
      if (!Array.isArray(values) || values.length === 0) return
      if (values.includes(ALL_OPTION)) {
        const options = keyOptions[templateId]?.[token] || []
        const normalizedOptions = Array.from(
          new Set(
            options
              .map((option) => (option == null ? '' : String(option).trim()))
              .filter(Boolean),
          ),
        )
        if (normalizedOptions.length) {
          payload[token] = normalizedOptions.length === 1 ? normalizedOptions[0] : normalizedOptions
        } else {
          return // options not loaded yet; skip filtering to avoid forcing "All"
        }
        return
      }
      const normalized = Array.from(
        new Set(values.filter((value) => value && value.trim() && value !== ALL_OPTION)),
      )
      if (!normalized.length) return
      payload[token] = normalized.length === 1 ? normalized[0] : normalized
    })
    return payload
  }, [keyValues])

  // Run Config state (key-driven discovery & generation)

  useEffect(() => {
    if (!discoveryResetReady.current) {
      discoveryResetReady.current = true
      return
    }
    clearDiscoveryResults()
    setFinding(false)
    setDiscoveryPanelOpen(false)
  }, [clearDiscoveryResults, setFinding, selected, start?.valueOf(), end?.valueOf()])

  const onFind = async () => {
    if (!selectedTemplates.length || !start || !end) return toast.show('Select a template and choose a start/end date.', 'warning')
    const startSql = toSqlFromDayjs(start)
    const endSql = toSqlFromDayjs(end)
    if (!startSql || !endSql) return toast.show('Provide a valid start and end date.', 'warning')

    setKeyOptions({})
    keyOptionsFetchKeyRef.current = {}
    setKeyOptionsLoading({})
    setFinding(true)
    try {
      const r = {}
      for (const t of selectedTemplates) {
        const keyFilters = buildKeyFiltersForTemplate(t.id)
        requestKeyOptions(t, startSql, endSql)
        const data = await discoverReports({
          templateId: t.id,
          startDate: startSql,
          endDate: endSql,
          connectionId: activeConnectionId || undefined,
          keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
          kind: getTemplateKind(t),
        })
        r[t.id] = {
          name: t.name,
          batches: (data.batches || []).map((b) => ({ ...b, selected: b.selected ?? true })),
          batches_count: data.batches_count ?? (data.batches?.length || 0),
          rows_total: data.rows_total ?? (data.batches?.reduce((a, b) => a + (b.rows || 0), 0) || 0),
        }
      }
      setDiscoveryResults(r, {
        startSql,
        endSql,
        startDisplay: formatDisplayDate(start),
        endDisplay: formatDisplayDate(end),
        templateSummary: selectedTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          kind: getTemplateKind(t),
        })),
        templateIds: selectedTemplates.map((t) => t.id),
        connectionId: activeConnectionId || null,
        connectionName: activeConnection?.name || activeConnection?.connection_name || '',
        autoType,
        fetchedAt: new Date().toISOString(),
      })
    } catch (e) {
      toast.show(String(e), 'error')
    } finally {
      setFinding(false)
    }
  }

  const canGenerate = useMemo(() => {
    const hasSel = Object.values(results).length > 0 && Object.values(results).some((r) => r.batches.some((b) => b.selected))
    const rangeReady = !!start && !!end && end.valueOf() >= start.valueOf()
    return hasSel && rangeReady && keysReady
  }, [results, start, end, keysReady])

  const canSchedule = useMemo(() => {
    if (selectedTemplates.length !== 1) return false
    if (!start || !end) return false
    if (end.valueOf() < start.valueOf()) return false
    return Boolean(activeConnectionId)
  }, [selectedTemplates, start, end, activeConnectionId])

  const generateLabel = useMemo(
    () => (selectedTemplates.length ? `Run Reports (${selectedTemplates.length})` : 'Run Reports'),
    [selectedTemplates],
  )

  const generateTooltip = useMemo(() => {
    const names = selectedTemplates.map((t) => t.name).filter(Boolean)
    if (!names.length) return 'Run Reports'
    const preview = names.slice(0, 3).join(', ')
    const extra = names.length > 3 ? ` +${names.length - 3} more` : ''
    return `Run reports for ${preview}${extra}`
  }, [selectedTemplates])

  const batchIdsFor = (tplId) =>
    (results[tplId]?.batches || []).filter(b => b.selected).map(b => b.id)

  const onGenerate = async () => {
    if (!selectedTemplates.length) return toast.show('Select at least one template.', 'warning')
    if (!start || !end) return toast.show('Choose a start and end date before running.', 'warning')
    const startSql = toSqlFromDayjs(start)
    const endSql = toSqlFromDayjs(end)
    if (!startSql || !endSql) return toast.show('Provide a valid date range.', 'warning')
    const missing = collectMissingKeys()
    if (missing.length) {
      const message = missing.map(({ tpl, tokens }) => `${tpl.name || tpl.id}: ${tokens.join(', ')}`).join('; ')
      toast.show(`Provide values for key tokens before running (${message}).`, 'warning')
      return
    }

    const timestamp = Date.now()
    const emailList = parseEmailTargets(emailTargets)
    const seed = selectedTemplates.map((t, idx) => ({
      id: `${t.id}-${timestamp + idx}`,
      tplId: t.id,
      name: t.name,
      kind: getTemplateKind(t),
      status: 'running',
      progress: 10,
      htmlUrl: null,
      pdfUrl: null,
      docxUrl: null,
      xlsxUrl: null,
    }))
    setGeneration({ items: seed })

    for (const it of seed) {
      try {
        const keyFilters = buildKeyFiltersForTemplate(it.tplId)
        const requestDocx = true
        const requestXlsx = it.kind === 'excel'
        const data = await runReport({
          templateId: it.tplId,
          startDate: startSql,
          endDate: endSql,
          batchIds: batchIdsFor(it.tplId),
          connectionId: activeConnectionId || undefined,
          keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
          docx: requestDocx,
          xlsx: requestXlsx,
          kind: it.kind,
          emailRecipients: emailList.length ? emailList : undefined,
          emailSubject: emailSubject || undefined,
          emailMessage: emailMessage || undefined,
        })
        const normalized = normalizeRunArtifacts(data || {})
        const htmlUrl = normalized.html_url || null
        const pdfUrl = normalized.pdf_url || null
        const docxUrl = normalized.docx_url || null
        const xlsxUrl = normalized.xlsx_url || null

        setGeneration((prev) => ({
          items: prev.items.map((x) =>
            x.id === it.id ? { ...x, progress: 100, status: 'complete', htmlUrl, pdfUrl, docxUrl, xlsxUrl } : x,
          ),
        }))
        const formatParts = []
        if (pdfUrl) formatParts.push('pdf')
        if (docxUrl) formatParts.push('docx')
        if (xlsxUrl) formatParts.push('xlsx')
        const formatLabel = formatParts.length ? formatParts.join(' + ') : 'html'
        let filenameExt = 'pdf'
        if (xlsxUrl && requestXlsx) {
          filenameExt = 'xlsx'
        } else if (docxUrl && requestDocx) {
          filenameExt = 'docx'
        } else if (!pdfUrl) {
          filenameExt = 'html'
        }
        addDownload({
          filename: `${it.name}.${filenameExt}`,
          template: it.name,
          format: formatLabel,
          size: '',
          htmlUrl,
          pdfUrl,
          docxUrl,
          xlsxUrl,
          onRerun: () => onGenerate(),
        })
      } catch (e) {
        setGeneration((prev) => ({
          items: prev.items.map((x) =>
            x.id === it.id ? { ...x, progress: 100, status: 'failed' } : x,
          ),
        }))
        toast.show(String(e), 'error')
      }
    }
  }

  const retryGenerationItem = async (item) => {
    if (!item?.tplId) {
      toast.show('Unable to retry this run. Refresh and try again.', 'error')
      return
    }
    if (!start || !end) {
      toast.show('Select a start and end date before retrying.', 'warning')
      return
    }
    const startSql = toSqlFromDayjs(start)
    const endSql = toSqlFromDayjs(end)
    if (!startSql || !endSql) {
      toast.show('Provide a valid date range.', 'warning')
      return
    }

    const missing = collectMissingKeys().find(({ tpl }) => tpl.id === item.tplId)
    if (missing) {
      toast.show(`Provide values for key tokens before running (${missing.tokens.join(', ')})`, 'warning')
      return
    }

    const batches = batchIdsFor(item.tplId)
    if (!batches.length) {
      toast.show('Select at least one batch before retrying this template.', 'warning')
      return
    }
    const emailList = parseEmailTargets(emailTargets)

    setGeneration((prev) => ({
      items: prev.items.map((x) => (
        x.id === item.id
          ? { ...x, status: 'running', progress: 10, htmlUrl: null, pdfUrl: null, docxUrl: null, xlsxUrl: null }
          : x
      )),
    }))

    try {
      const keyFilters = buildKeyFiltersForTemplate(item.tplId)
      const templateForKind = selectedTemplates.find((tpl) => tpl.id === item.tplId)
      const runKind = item.kind || getTemplateKind(templateForKind)
      const requestDocx = true
      const requestXlsx = runKind === 'excel'
      const data = await runReport({
        templateId: item.tplId,
        startDate: startSql,
        endDate: endSql,
        batchIds: batches,
        connectionId: activeConnectionId || undefined,
        keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
        docx: requestDocx,
        xlsx: requestXlsx,
        kind: runKind,
        emailRecipients: emailList.length ? emailList : undefined,
        emailSubject: emailSubject || undefined,
        emailMessage: emailMessage || undefined,
      })
      const normalized = normalizeRunArtifacts(data || {})
      const htmlUrl = normalized.html_url || null
      const pdfUrl = normalized.pdf_url || null
      const docxUrl = normalized.docx_url || null
      const xlsxUrl = normalized.xlsx_url || null

      setGeneration((prev) => ({
        items: prev.items.map((x) => (
          x.id === item.id
            ? { ...x, progress: 100, status: 'complete', htmlUrl, pdfUrl, docxUrl, xlsxUrl }
            : x
        )),
      }))
      const formatParts = []
      if (pdfUrl) formatParts.push('pdf')
      if (docxUrl) formatParts.push('docx')
      if (xlsxUrl) formatParts.push('xlsx')
      const formatLabel = formatParts.length ? formatParts.join(' + ') : 'html'
      let filenameExt = 'pdf'
      if (xlsxUrl && requestXlsx) {
        filenameExt = 'xlsx'
      } else if (docxUrl && requestDocx) {
        filenameExt = 'docx'
      } else if (!pdfUrl) {
        filenameExt = 'html'
      }
      addDownload({
        filename: `${item.name}.${filenameExt}`,
        template: item.name,
        format: formatLabel,
        size: '',
        htmlUrl,
        pdfUrl,
        docxUrl,
        xlsxUrl,
        onRerun: () => onGenerate(),
      })
    } catch (e) {
      setGeneration((prev) => ({
        items: prev.items.map((x) => (
          x.id === item.id
            ? { ...x, progress: 100, status: 'failed' }
            : x
        )),
      }))
      toast.show(String(e), 'error')
    }
  }

  const handleCreateSchedule = async () => {
    if (selectedTemplates.length !== 1) {
      toast.show('Select exactly one template to create a schedule.', 'warning')
      return
    }
    if (!start || !end) {
      toast.show('Choose a start and end date before scheduling.', 'warning')
      return
    }
    if (!activeConnectionId) {
      toast.show('Select a connection before scheduling.', 'warning')
      return
    }
    const startSql = toSqlFromDayjs(start)
    const endSql = toSqlFromDayjs(end)
    if (!startSql || !endSql) {
      toast.show('Provide a valid date range.', 'warning')
      return
    }
    const template = selectedTemplates[0]
    const keyFilters = buildKeyFiltersForTemplate(template.id)
    const emailList = parseEmailTargets(emailTargets)
    setScheduleSaving(true)
    try {
      await createSchedule({
        templateId: template.id,
        connectionId: activeConnectionId,
        startDate: startSql,
        endDate: endSql,
        keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
        batchIds: batchIdsFor(template.id),
        docx: true,
        xlsx: getTemplateKind(template) === 'excel',
        emailRecipients: emailList.length ? emailList : undefined,
        emailSubject: emailSubject || undefined,
        emailMessage: emailMessage || undefined,
        frequency: scheduleFrequency,
        name: scheduleName || undefined,
      })
      toast.show('Scheduled job created. The first run will begin soon.', 'success')
      refreshSchedules()
    } catch (e) {
      toast.show(String(e), 'error')
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId) => {
    if (!scheduleId) return
    setDeletingScheduleId(scheduleId)
    try {
      await deleteSchedule(scheduleId)
      toast.show('Schedule removed.', 'success')
      refreshSchedules()
    } catch (e) {
      toast.show(String(e), 'error')
    } finally {
      setDeletingScheduleId(null)
    }
  }

  const dateRangeValid = !!start && !!end && end.valueOf() >= start.valueOf()
  let activeStep = 0
  if (selected.length > 0) activeStep = 1
  if (dateRangeValid) activeStep = 2

  return (
    <>
      <Surface sx={[surfaceStackSx, { mb: 3 }]}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="h6">Run Reports</Typography>
            <InfoTooltip
              content={TOOLTIP_COPY.runReports}
              ariaLabel="Run report guidance"
            />
          </Stack>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            aria-label="Report run steps"
            sx={{
              pb: 0,
              '& .MuiStep-root': { position: 'relative' },
              '& .MuiStepConnector-root': { top: 16 },
              '& .MuiStepLabel-label': { mt: 1 },
              '& .MuiStepConnector-line': { borderColor: 'divider' },
            }}
          >
            {['Select Templates', 'Set Date Range', 'Run Reports'].map((label) => (
              <Step key={label}>
                <StepLabel StepIconComponent={StepIndicator}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Typography variant="caption" color="text.secondary">
            {`${selected.length} selected \u2022 ${dateRangeValid ? 'Range set' : 'Choose a range'}`}
          </Typography>
        </Stack>
      </Surface>
      <TemplatePicker
        selected={selected}
        onToggle={onToggle}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
      />
      <GenerateAndDownload
        selected={selected}
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
        onGenerate={onGenerate}
        canGenerate={canGenerate}
        generateLabel={generateLabel}
        generateTooltip={generateTooltip}
        generation={generation}
        onRetryGeneration={retryGenerationItem}
        keyValues={keyValues}
        onKeyValueChange={handleKeyValueChange}
        keysReady={keysReady}
        keyOptions={keyOptions}
        keyOptionsLoading={keyOptionsLoading}
        onOpenDiscovery={() => setDiscoveryPanelOpen(true)}
      />
      <Surface sx={[surfaceStackSx, { mb: 3 }]}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="h6">Delivery & Scheduling</Typography>
            <InfoTooltip
              content="Add one or more recipients to email finished artifacts automatically. Create a recurring schedule to run the currently selected template on a cadence."
              ariaLabel="Delivery guidance"
            />
          </Stack>
          <TextField
            label="Email recipients"
            placeholder="ops@example.com, finance@example.com"
            value={emailTargets}
            onChange={(e) => setEmailTargets(e.target.value)}
            helperText="Comma or semicolon separated list"
            size="small"
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Email subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Schedule name (optional)"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              size="small"
              fullWidth
            />
          </Stack>
          <TextField
            label="Email message (optional)"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            multiline
            minRows={3}
          />
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-end' }}>
            <TextField
              select
              label="Schedule frequency"
              value={scheduleFrequency}
              onChange={(e) => setScheduleFrequency(e.target.value)}
              size="small"
              sx={{ minWidth: { md: 220 } }}
            >
              {SCHEDULE_FREQUENCY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              color="secondary"
              disableElevation
              onClick={handleCreateSchedule}
              disabled={!canSchedule || scheduleSaving}
            >
              {scheduleSaving ? 'Scheduling...' : 'Schedule Run'}
            </Button>
          </Stack>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography variant="subtitle2">Scheduled jobs</Typography>
              {schedulesLoading && <LinearProgress sx={{ flex: 1, height: 4, borderRadius: 2 }} />}
            </Stack>
            {!schedulesLoading && schedules.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No schedules yet. Create one with the selected template.
              </Typography>
            )}
            {!schedulesLoading && schedules.length > 0 && (
              <Stack spacing={1}>
                {schedules.map((schedule) => (
                  <Paper
                    key={schedule.id}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 1.5, borderColor: 'divider' }}
                  >
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={1.5} justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle1">{schedule.name || schedule.template_name || schedule.template_id}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {schedule.template_name || schedule.template_id} • {schedule.frequency || 'custom'} • Next run {formatScheduleDate(schedule.next_run_at)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          disabled={deletingScheduleId === schedule.id}
                        >
                          {deletingScheduleId === schedule.id ? 'Removing...' : 'Delete'}
                        </Button>
                      </Stack>
                    </Stack>
                    {schedule.last_run_status && (
                      <Typography
                        variant="caption"
                        sx={{ mt: 0.5 }}
                        color={schedule.last_run_status === 'success' ? 'success.main' : 'warning.main'}
                      >
                        Last run {schedule.last_run_status} at {formatScheduleDate(schedule.last_run_at)}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
            {schedulesLoading && <LinearProgress />}
          </Stack>
        </Stack>
      </Surface>
      <DiscoveryListsPanel open={discoveryPanelOpen} onClose={() => setDiscoveryPanelOpen(false)} />
    </>
  )
}






