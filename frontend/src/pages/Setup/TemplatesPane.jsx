import Grid from '@mui/material/Grid2'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress,
  Card, CardActionArea, CardContent, Autocomplete, Tooltip, Dialog, DialogContent, DialogTitle,
  CircularProgress, Checkbox, Alert, Collapse,
} from '@mui/material'
import { Stepper, Step, StepLabel } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DownloadIcon from '@mui/icons-material/Download'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ReplayIcon from '@mui/icons-material/Replay'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ListAltIcon from '@mui/icons-material/ListAlt'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isMock, API_BASE, withBase, listApprovedTemplates, deleteTemplate as deleteTemplateRequest, fetchTemplateKeyOptions } from '../../api/client'
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

/* ----------------------- helpers ----------------------- */
const ALL_OPTION = '__ALL__'

const toSqlFromDayjs = (d) => (d && d.isValid && d.isValid())
  ? d.format('YYYY-MM-DD HH:mm:00')
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

async function discoverReportsAPI({ templateId, startDate, endDate, connectionId, keyValues }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const base = {
    template_id: templateId,
    start_date: toSqlFromDayjs(startDate),
    end_date: toSqlFromDayjs(endDate),
  }
  const res = await fetch(`${API_BASE}/reports/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addKeyValues(includeConn(base, connectionId), keyValues)),
  })
  if (!res.ok) throw new Error(await res.text().catch(()=>`Discovery failed (${res.status})`))
  return res.json()
}

// 🔻 backend: /reports/run
async function runReportAPI({ templateId, startDate, endDate, batchIds, connectionId, keyValues }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const base = {
    template_id: templateId,
    start_date: toSqlFromDayjs(startDate),
    end_date: toSqlFromDayjs(endDate),
    batch_ids: (batchIds && batchIds.length) ? batchIds : null,
  }
  const res = await fetch(`${API_BASE}/reports/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addKeyValues(includeConn(base, connectionId), keyValues)),
  })
  if (!res.ok) throw new Error(await res.text().catch(()=>`Run failed (${res.status})`))
  return res.json()
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
  const [nameQuery, setNameQuery] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewType, setPreviewType] = useState('html')
  const [previewKey, setPreviewKey] = useState(null)
  const filtered = useMemo(() => {
    const tagFiltered = tagFilter.length ? approved.filter((t) => (t.tags || []).some((tag) => tagFilter.includes(tag))) : approved
    const nq = nameQuery.trim().toLowerCase()
    return nq ? tagFiltered.filter((t) => (t.name || '').toLowerCase().includes(nq)) : tagFiltered
  }, [approved, tagFilter, nameQuery])
  const loadingTemplates = !templates.length && (isLoading || isFetching)
  const noApprovedTemplates = !loadingTemplates && approved.length === 0
  const filtersActive = tagFilter.length > 0 || Boolean(nameQuery.trim())
  const clearFilters = useCallback(() => {
    setTagFilter([])
    setNameQuery('')
  }, [setTagFilter, setNameQuery])
  const renderTemplateCards = () => (
    <Grid container spacing={2}>
      {filtered.map((t) => {
        const selectedState = selected.includes(t.id)
        const type = t.sourceType?.toUpperCase() || 'PDF'
        const previewInfo = resolveTemplatePreviewUrl(t)
        const thumbnailInfo = resolveTemplateThumbnailUrl(t)
        const htmlPreview = previewInfo.url
        const imagePreview = !htmlPreview ? thumbnailInfo.url : null
        const boxClickable = Boolean(htmlPreview || imagePreview)
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
                    sx={[
                      previewFrameSx,
                      boxClickable && { cursor: 'pointer' },
                    ]}
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
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        No preview yet
                      </Typography>
                    )}
                  </Box>

                  {!!t.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebKitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ flexWrap: 'wrap', rowGap: 1 }}
                    >
                      <Chip size="small" label={type} variant="outlined" />
                      <Button
                        size="small"
                        variant={selectedState ? 'contained' : 'outlined'}
                        color="primary"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onToggle(t.id)
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
  let templateListContent
  if (loadingTemplates) {
    templateListContent = (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <LoadingState
          label="Loading templates..."
          description="Fetching approved templates from the server."
        />
      </Box>
    )
  } else if (noApprovedTemplates) {
    templateListContent = (
      <EmptyState
        size="large"
        title="No approved templates yet"
        description="Upload and verify a template to make it available for report runs."
        action={
          <Button variant="contained" onClick={() => setSetupNav('generate')}>
            Upload template
          </Button>
        }
      />
    )
  } else if (!filtered.length) {
    templateListContent = (
      <EmptyState
        title="No templates match these filters"
        description="Adjust your filters or clear them to see all approved templates."
        action={
          filtersActive ? (
            <Button variant="outlined" size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />
    )
  } else {
    templateListContent = renderTemplateCards()
  }

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

  return (
    <Surface sx={surfaceStackSx}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography variant="h6">Select Templates</Typography>
        <InfoTooltip
          content={TOOLTIP_COPY.templatePicker}
          ariaLabel="How to select templates"
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Autocomplete
          multiple
          options={allTags}
          value={tagFilter}
          onChange={(e, v) => setTagFilter(v)}
          freeSolo
          renderInput={(params) => <TextField {...params} label="Filter by tags" />}
          sx={{ minWidth: { xs: '100%', sm: 240 }, maxWidth: 420 }}
        />
        <TextField label="Search by name" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 220 }, maxWidth: 360 }} />
      </Stack>
      <Grid container spacing={2}>
        {filtered.map((t) => {
          const selectedState = selected.includes(t.id)
          const type = t.sourceType?.toUpperCase() || 'PDF'
          const previewInfo = resolveTemplatePreviewUrl(t)
          const thumbnailInfo = resolveTemplateThumbnailUrl(t)
          const htmlPreview = previewInfo.url
          const imagePreview = !htmlPreview ? thumbnailInfo.url : null
          const boxClickable = Boolean(htmlPreview || imagePreview)
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
                    {/* Thumbnail preview box: prefer HTML preview when available */}
                    <Box
                      sx={[
                        previewFrameSx,
                        boxClickable && { cursor: 'pointer' },
                      ]}
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
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
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
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flexWrap: 'wrap', rowGap: 1 }}
                      >
                        <Chip size="small" label={type} variant="outlined" />
                        <Button
                          size="small"
                          variant={selectedState ? 'contained' : 'outlined'}
                          color="primary"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onToggle(t.id)
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
                      </Stack>

                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
        {!filtered.length && (
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary">No templates match these filters. Clear filters.</Typography>
          </Grid>
        )}
      </Grid>
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

function GenerateAndDownload({ selected, selectedTemplates, autoType, start, end, setStart, setEnd, onFind, findDisabled, finding, results, onToggleBatch, onGenerate, canGenerate, generateLabel, generation, onRetryGeneration = () => {}, keyValues = {}, onKeyValueChange = () => {}, keysReady = true, keyOptions = {}, keyOptionsLoading = {} }) {
  const valid = selectedTemplates.length > 0 && !!start && !!end && end.valueOf() >= start.valueOf()
  const { downloads } = useAppStore()
  const targetNames = Object.values(results).map((r) => r.name)
  const subline = targetNames.length
    ? `${targetNames.slice(0, 3).join(', ')}${targetNames.length > 3 ? ', ...' : ''}`
    : ''
  const templatesWithKeys = useMemo(() => (
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
      .filter(Boolean)
  ), [selectedTemplates, keyOptions])
  const [discoveryOpen, setDiscoveryOpen] = useState(false)
  const resultCount = useMemo(() => Object.keys(results).length, [results])

  useEffect(() => {
    if (finding) setDiscoveryOpen(true)
  }, [finding])

  useEffect(() => {
    if (resultCount > 0) setDiscoveryOpen(true)
  }, [resultCount])

  const keyPanelVisible = templatesWithKeys.length > 0 && resultCount > 0
  const keysMissing = keyPanelVisible && !keysReady
  const handleToggleDiscovery = () => setDiscoveryOpen((prev) => !prev)
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
              startIcon={<SearchIcon />}
              onClick={onFind}
              disabled={!valid || findDisabled}
              aria-label="Discover matching reports"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Find Reports
            </Button>
            <Tooltip title={generateLabel}>
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  disableElevation
                  startIcon={<RocketLaunchIcon />}
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

        <Button
          variant="outlined"
          size="small"
          startIcon={<ListAltIcon />}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: discoveryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 160ms ease',
              }}
            />
          }
          onClick={handleToggleDiscovery}
          aria-expanded={discoveryOpen}
          aria-controls="discovery-results-panel"
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          Discovery Lists
        </Button>

        <Collapse in={discoveryOpen} timeout="auto" unmountOnExit>
          <Box
            id="discovery-results-panel"
            role="region"
            aria-label="Discovery results"
            sx={{ mt: 2 }}
          >
            {finding ? (
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary">
                  Searching data...
                </Typography>
              </Stack>
            ) : resultCount > 0 ? (
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {Object.keys(results).map((tid) => {
                  const r = results[tid]
                  const total = r.rows_total ?? r.batches.reduce((a, b) => a + (b.rows || 0), 0)
                  const count = r.batches_count ?? r.batches.length
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
                      <Typography variant="subtitle2">{r.name}</Typography>
                      {r.batches.length ? (
                        <Stack spacing={1} sx={{ mt: 1.25 }}>
                          <Typography variant="body2" color="text.secondary">
                            {count} {count === 1 ? 'batch' : 'batches'} found ({total} rows)
                          </Typography>
                          {r.batches.map((b, idx) => (
                            <Stack
                              key={b.id || idx}
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              sx={{ width: '100%' }}
                            >
                              <Checkbox
                                checked={b.selected}
                                onChange={(e) => onToggleBatch(tid, idx, e.target.checked)}
                                sx={{ p: 0.5 }}
                              />
                              <Typography variant="body2" sx={{ flex: 1, overflowWrap: 'anywhere' }}>
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
            ) : (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                No discovery results yet. Run Find Reports after setting your date range.
              </Alert>
            )}
          </Box>
        </Collapse>

        {keyPanelVisible && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
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
                    );
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
                  {(selectedTemplates.length === 0
                    ? 'Select a template to configure key token filters.'
                    : 'Selected templates do not define key tokens.')}
                </Typography>
              </Box>
            )}
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
          {downloads.map((d, i) => (
            <Stack
              key={i}
              spacing={1}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {d.filename} {'\u2022'} {d.template} {'\u2022'} {d.format.toUpperCase()} {'\u2022'} {d.size}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  disabled={!d.htmlUrl}
                  component="a"
                  href={d.htmlUrl ? withBase(d.htmlUrl) : '#'}
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
                  disabled={!d.pdfUrl}
                  component="a"
                  href={d.pdfUrl ? buildDownloadUrl(withBase(d.pdfUrl)) : '#'}
                  target="_blank"
                  rel="noopener"
                >
                  Download
                </Button>
                <Button size="small" variant="text" startIcon={<FolderOpenIcon />} disabled>
                  Show in folder
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disableElevation
                  startIcon={<ReplayIcon />}
                  onClick={d.onRerun}
                >
                  Re-run
                </Button>
              </Stack>
            </Stack>
          ))}
          {!downloads.length && <Typography variant="body2" color="text.secondary">No recent downloads yet.</Typography>}
        </Stack>
      </Surface>
    </>
  )
}


export default function TemplatesPane() {
  // pull connection if available; API can fallback when not provided
  const { templates, addDownload, activeConnectionId } = useAppStore()
  const toast = useToast()
  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])
  const [selected, setSelected] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const onToggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const selectedTemplates = useMemo(() => approved.filter((t) => selected.includes(t.id)), [approved, selected])
  const selectedTypes = useMemo(() => selectedTemplates.map((t) => t.sourceType), [selectedTemplates])
  const autoType = selectedTypes.length === 0 ? '-' : selectedTypes.every((t) => t === selectedTypes[0]) ? selectedTypes[0]?.toUpperCase() : 'Mixed'
  const [keyValues, setKeyValues] = useState({})
  const [keyOptions, setKeyOptions] = useState({})
  const [keyOptionsLoading, setKeyOptionsLoading] = useState({})
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [finding, setFinding] = useState(false)
  const [results, setResults] = useState({})
  const [generation, setGeneration] = useState({ items: [] })

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

  useEffect(() => {
    if (!start || !end) return
    if (!Object.keys(results).length) return
    const startSql = toSqlFromDayjs(start)
    const endSql = toSqlFromDayjs(end)
    if (!startSql || !endSql) return
    let cancelled = false
    const pendingIds = new Set()
    selectedTemplates.forEach((tpl) => {
      const tokens = Array.isArray(tpl?.mappingKeys)
        ? tpl.mappingKeys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)
        : []
      if (!tokens.length) return
      const existingOptions = keyOptions[tpl.id] || {}
      const missing = tokens.filter((token) => existingOptions[token] === undefined)
      if (!missing.length) return
      if (keyOptionsLoading[tpl.id]) return
      pendingIds.add(tpl.id)
      setKeyOptionsLoading((prev) => ({ ...prev, [tpl.id]: true }))
      fetchTemplateKeyOptions(tpl.id, {
        connectionId: tpl.lastConnectionId || activeConnectionId,
        tokens: missing,
        limit: 100,
        startDate: startSql,
        endDate: endSql,
      })
        .then((data) => {
          if (cancelled) return
          const incoming = data?.keys && typeof data.keys === 'object' ? data.keys : {}
          const normalizedBatch = {}
          missing.forEach((token) => {
            const rawValues = incoming[token]
            const normalized = Array.isArray(rawValues)
              ? Array.from(new Set(rawValues.map((value) => (value == null ? '' : String(value).trim())).filter(Boolean)))
              : []
            normalizedBatch[token] = normalized
          })
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
      if (pendingIds.size) {
        setKeyOptionsLoading((prev) => {
          const next = { ...prev }
          pendingIds.forEach((id) => {
            if (next[id]) delete next[id]
          })
          return next
        })
      }
    }
  }, [selectedTemplates, start, end, results, keyOptions, toast, activeConnectionId])

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
          payload[token] = 'All'
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

  useEffect(() => { setResults({}); setFinding(false) }, [selected, start?.valueOf(), end?.valueOf()])

  const onFind = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selectedTemplates.length || !start || !end) return toast.show('Select a template and choose a start/end date.', 'warning')

    setKeyOptions({})
    setKeyOptionsLoading({})
    setFinding(true)
    try {
      const r = {}
      for (const t of selectedTemplates) {
        const keyFilters = buildKeyFiltersForTemplate(t.id)
        const data = await discoverReportsAPI({
          templateId: t.id,
          startDate: start,
          endDate: end,
          connectionId: activeConnectionId,   // pass when available
          keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
        })
        r[t.id] = {
          name: t.name,
          batches: (data.batches || []).map((b) => ({ ...b, selected: b.selected ?? true })),
          batches_count: data.batches_count ?? (data.batches?.length || 0),
          rows_total: data.rows_total ?? (data.batches?.reduce((a, b) => a + (b.rows || 0), 0) || 0),
        }
      }
      setResults(r)
    } catch (e) {
      toast.show(String(e), 'error')
    } finally {
      setFinding(false)
    }
  }

  const onToggleBatch = (id, idx, val) => {
    setResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], batches: prev[id].batches.map((b, i) => (i === idx ? { ...b, selected: val } : b)) },
    }))
  }

  const canGenerate = useMemo(() => {
    const hasSel = Object.values(results).length > 0 && Object.values(results).some((r) => r.batches.some((b) => b.selected))
    const rangeReady = !!start && !!end && end.valueOf() >= start.valueOf()
    return hasSel && rangeReady && keysReady
  }, [results, start, end, keysReady])

  const generateLabel = useMemo(() => {
    const names = selectedTemplates.map((t) => t.name)
    if (!names.length) return 'Run Reports'
    const preview = names.slice(0, 2).join(', ')
    const extra = names.length > 2 ? ` +${names.length - 2} more` : ''
    return `Run reports for ${preview}${extra}`
  }, [selectedTemplates])

  const batchIdsFor = (tplId) =>
    (results[tplId]?.batches || []).filter(b => b.selected).map(b => b.id)

  const onGenerate = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selectedTemplates.length) return toast.show('Select at least one template.', 'warning')
    const missing = collectMissingKeys()
    if (missing.length) {
      const message = missing.map(({ tpl, tokens }) => `${tpl.name || tpl.id}: ${tokens.join(', ')}`).join('; ')
      toast.show(`Provide values for key tokens before running (${message}).`, 'warning')
      return
    }

    const seed = selectedTemplates.map((t) => ({ id: `${t.id}-${Date.now()}`, tplId: t.id, name: t.name, status: 'running', progress: 10, htmlUrl: null, pdfUrl: null }))
    setGeneration({ items: seed })

  for (const it of seed) {
    try {
      const keyFilters = buildKeyFiltersForTemplate(it.tplId)
      const data = await runReportAPI({
        templateId: it.tplId,
          startDate: start,
          endDate: end,
          batchIds: batchIdsFor(it.tplId),
          connectionId: activeConnectionId,   // pass when available
          keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
        })
        const htmlUrl = data?.html_url ? withBase(data.html_url) : null
        const pdfUrl  = data?.pdf_url ? withBase(data.pdf_url) : null

        setGeneration((prev) => ({ items: prev.items.map((x) => (x.id === it.id ? { ...x, progress: 100, status: 'complete', htmlUrl, pdfUrl } : x)) }))
        addDownload({ filename: `${it.name}.pdf`, template: it.name, format: 'pdf', size: '', htmlUrl, pdfUrl, onRerun: () => onGenerate() })
      } catch (e) {
        setGeneration((prev) => ({ items: prev.items.map((x) => (x.id === it.id ? { ...x, progress: 100, status: 'failed' } : x)) }))
        toast.show(String(e), 'error')
      }
    }
  }

  const retryGenerationItem = async (item) => {
    if (!API_BASE) {
      toast.show('VITE_API_BASE_URL is not set', 'error')
      return
    }
    if (!item?.tplId) {
      toast.show('Unable to retry this run. Refresh and try again.', 'error')
      return
    }
    if (!start || !end) {
      toast.show('Select a start and end date before retrying.', 'warning')
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

    setGeneration((prev) => ({
      items: prev.items.map((x) => (
        x.id === item.id
          ? { ...x, status: 'running', progress: 10, htmlUrl: null, pdfUrl: null }
          : x
      )),
    }))

    try {
      const keyFilters = buildKeyFiltersForTemplate(item.tplId)
      const data = await runReportAPI({
        templateId: item.tplId,
        startDate: start,
        endDate: end,
        batchIds: batches,
        connectionId: activeConnectionId,
        keyValues: Object.keys(keyFilters).length ? keyFilters : undefined,
      })
      const htmlUrl = data?.html_url ? withBase(data.html_url) : null
      const pdfUrl = data?.pdf_url ? withBase(data.pdf_url) : null

      setGeneration((prev) => ({
        items: prev.items.map((x) => (
          x.id === item.id
            ? { ...x, progress: 100, status: 'complete', htmlUrl, pdfUrl }
            : x
        )),
      }))
      addDownload({
        filename: `${item.name}.pdf`,
        template: item.name,
        format: 'pdf',
        size: '',
        htmlUrl,
        pdfUrl,
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
        onToggleBatch={onToggleBatch}
        onGenerate={onGenerate}
        canGenerate={canGenerate}
        generateLabel={generateLabel}
        generation={generation}
        onRetryGeneration={retryGenerationItem}
        keyValues={keyValues}
        onKeyValueChange={handleKeyValueChange}
        keysReady={keysReady}
        keyOptions={keyOptions}
        keyOptionsLoading={keyOptionsLoading}
      />
    </>
  )
}






