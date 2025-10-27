import Grid from '@mui/material/Grid2'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress, Collapse,
  Card, CardActionArea, CardContent, Autocomplete, MenuItem, Select, Tooltip,
  CircularProgress, Alert, Checkbox,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { isMock, withBase, deleteTemplate as deleteTemplateRequest, fetchTemplateKeyOptions } from '../../api/client'
import { savePersistedCache } from '../../hooks/useBootstrapState.js'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import EmptyState from '../../components/feedback/EmptyState.jsx'
import LoadingState from '../../components/feedback/LoadingState.jsx'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
import InfoTooltip from '../../components/common/InfoTooltip.jsx'
import TOOLTIP_COPY from '../../content/tooltipCopy.jsx'
import { resolveTemplatePreviewUrl, resolveTemplateThumbnailUrl } from '../../utils/preview'

/* -----------------------------------------------------------
   Config / helpers
----------------------------------------------------------- */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'') // trim trailing slash

const surfaceStackSx = {
  gap: { xs: 2, md: 2.5 },
}

async function listApprovedTemplatesAPI() {
  if (!API_BASE) return []
  const res = await fetch(`${API_BASE}/templates?status=approved`)
  if (!res.ok) return []
  const body = await res.json().catch(() => null)
  if (!body) return []
  if (Array.isArray(body)) return body
  if (Array.isArray(body.templates)) return body.templates
  return []
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

async function discoverReportsAPI({ templateId, startDate, endDate, keyValues }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const body = {
    template_id: templateId,
    start_date: toSqlDateTime(startDate),
    end_date: toSqlDateTime(endDate),
  }
  const normalizedKeys = normalizeKeyValuePayload(keyValues)
  if (normalizedKeys) {
    body.key_values = normalizedKeys
  }
  const res = await fetch(`${API_BASE}/reports/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `Discovery failed (${res.status})`)
  }
  return res.json()
}

async function runReportAPI({ templateId, startDate, endDate, batchIds, keyValues }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const body = {
    template_id: templateId,
    start_date: toSqlDateTime(startDate),
    end_date: toSqlDateTime(endDate),
    batch_ids: batchIds ?? null,
  }
  const normalizedKeys = normalizeKeyValuePayload(keyValues)
  if (normalizedKeys) {
    body.key_values = normalizedKeys
  }
  const res = await fetch(`${API_BASE}/reports/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `Run failed (${res.status})`)
  }
  return res.json()
}

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
function TemplatePicker({ selected, onToggle, outputFormats, setOutputFormats, tagFilter, setTagFilter }) {
  const { templates, setTemplates, removeTemplate } = useAppStore()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [deleting, setDeleting] = useState(null)

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['templates', isMock, API_BASE],
    queryFn: () => listApprovedTemplatesAPI(),
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

  const approved = useMemo(() => templates.filter(t => (t.status === 'approved')), [templates])
  const allTags = useMemo(() => Array.from(new Set(approved.flatMap(t => t.tags || []))), [approved])
  const filtered = useMemo(() => (
    tagFilter.length ? approved.filter(t => (t.tags || []).some(tag => tagFilter.includes(tag))) : approved
  ), [approved, tagFilter])

  const handleDeleteTemplate = async (template) => {
    if (!template?.id) return
    const name = template.name || template.id
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete template "${name}"? This cannot be undone.`)
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
      queryClient.setQueryData(['templates', isMock, API_BASE], (prev) => {
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
    } catch (error) {
      toast.show(String(error), 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Surface sx={surfaceStackSx}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="h6">Template Picker</Typography>
          <InfoTooltip
            content={TOOLTIP_COPY.templatePicker}
            ariaLabel="Template picker guidance"
          />
        </Stack>
        <Autocomplete
          multiple
          options={allTags}
          value={tagFilter}
          onChange={(e, v) => setTagFilter(v)}
          freeSolo
          renderInput={(params) => <TextField {...params} label="Filter by tags" />}
          sx={{ maxWidth: 440 }}
        />
      </Stack>
      <Collapse in={isFetching && !isLoading} unmountOnExit>
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
      ) : filtered.length === 0 ? (
        <EmptyState
          size="medium"
          title={tagFilter.length ? 'No templates match the selected tags' : 'No approved templates yet'}
          description={tagFilter.length
            ? 'Adjust the tag filters or reset them to see all approved templates.'
            : 'Approve a template in the setup flow to see it listed here.'}
        />
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((t) => {
            const selectedState = selected.includes(t.id)
            const type = t.sourceType?.toUpperCase() || 'PDF'
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
                <CardActionArea onClick={handleCardToggle} sx={{ height: '100%' }}>
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
                              <Tooltip title={needsUserFix.join('\n')}>
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
                          <MenuItem value="excel">Excel</MenuItem>
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
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          )
        })}
        </Grid>
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
}) {
  const { downloads } = useAppStore()
  const targetNames = selectedTemplates.map((t) => t.name)
  const subline = targetNames.length
    ? `${targetNames.slice(0, 3).join(', ')}${targetNames.length > 3 ? ', ...' : ''}`
    : ''
  const generatorMessages = generatorIssues?.messages || []
  const generatorMissing = generatorIssues?.missing || []
  const generatorNeedsFix = generatorIssues?.needsFix || []
  const selectionReady = selected.length > 0 && generatorReady
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
              aria-label="Discover matching reports"
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
                  const total = r.rows_total ?? r.batches.reduce((acc, batch) => acc + (batch.rows || 0), 0)
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
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 0.5, sm: 1 }}>
                        <Typography variant="subtitle2">{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {count} {count === 1 ? 'batch' : 'batches'} {'\u2022'} {total} rows
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
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 0.5, sm: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.status}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 1 }} aria-label={`${item.name} progress`} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" disabled={!item.htmlUrl} component="a" href={item.htmlUrl || '#'} target="_blank" rel="noopener">
                    Open
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!item.pdfUrl}
                    component="a"
                    href={item.pdfUrl ? buildDownloadUrl(item.pdfUrl) : '#'}
                    target="_blank"
                    rel="noopener"
                  >
                    Download
                  </Button>
                  <Button size="small" variant="text" disabled>
                    Show in folder
                  </Button>
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
            ariaLabel="Recent downloads guidance"
          />
        </Stack>
        <Stack spacing={1.5}>
          {downloads.map((d, i) => (
            <Stack
              key={`${d.filename}-${i}`}
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
                {d.filename} {'\u2022'} {d.template} {'\u2022'} {d.format.toUpperCase()} {'\u2022'} {d.size || 'Size unknown'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
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
                  disabled={!d.pdfUrl}
                  component="a"
                  href={d.pdfUrl ? buildDownloadUrl(withBase(d.pdfUrl)) : '#'}
                  target="_blank"
                  rel="noopener"
                >
                  Download
                </Button>
                <Button size="small" variant="text" disabled>
                  Show in folder
                </Button>
                <Button size="small" variant="contained" color="success" onClick={d.onRerun}>
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

/* -----------------------------------------------------------
   Page Shell
----------------------------------------------------------- */
export default function GeneratePage() {
  const { templates, addDownload } = useAppStore()
  const toast = useToast()
  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])
  const [selected, setSelected] = useState([])
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

  useEffect(() => { setResults({}); setFinding(false) }, [selected, start, end, keyValues])

  const selectedTemplates = useMemo(
    () => approved.filter((t) => selected.includes(t.id)),
    [approved, selected],
  )

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
      })
        .then((data) => {
          if (cancelled) return
          const incoming = data?.keys && typeof data.keys === 'object' ? data.keys : {}
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
    const types = selectedTemplates.map((t) => t.sourceType?.toUpperCase() || 'PDF')
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
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
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

    setFinding(true)
    try {
      const payload = {}
      const targets = selectedTemplates
      for (const t of targets) {
        const data = await discoverReportsAPI({
          templateId: t.id,
          startDate: start,
          endDate: end,
          keyValues: keyValues[t.id],
        })
        payload[t.id] = {
          name: t.name,
          batches: (data.batches || []).map((b) => ({ ...b, selected: b.selected ?? true })),
          batches_count: data.batches_count ?? (data.batches?.length || 0),
          rows_total: data.rows_total ?? (data.batches?.reduce((acc, batch) => acc + (batch.rows || 0), 0) || 0),
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
    setResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], batches: prev[id].batches.map((b, i) => (i === idx ? { ...b, selected: val } : b)) },
    }))
  }

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
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selectedTemplates.length) return
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

    const targets = selectedTemplates
    const seed = targets.map((t) => ({
      id: `${t.id}-${Date.now()}`,
      tplId: t.id,
      name: t.name,
      status: 'running',
      progress: 10,
      htmlUrl: null,
      pdfUrl: null,
    }))
    setGeneration({ items: seed })

    for (const item of seed) {
      try {
        const data = await runReportAPI({
          templateId: item.tplId,
          startDate: start,
          endDate: end,
          batchIds: batchIdsFor(item.tplId),
          keyValues: keyValues[item.tplId],
        })
        const htmlUrl = data?.html_url ? withBase(data.html_url) : null
        const pdfUrl = data?.pdf_url ? withBase(data.pdf_url) : null

        setGeneration((prev) => ({
          items: prev.items.map((x) => (x.id === item.id ? { ...x, progress: 100, status: 'complete', htmlUrl, pdfUrl } : x)),
        }))

        const ext = (outputFormats[item.tplId] || 'auto') === 'auto' ? 'pdf' : outputFormats[item.tplId]
        addDownload({ filename: `${item.name}.${ext}`, template: item.name, format: ext, size: '', htmlUrl, pdfUrl, onRerun: () => onGenerate() })
      } catch (error) {
        setGeneration((prev) => ({
          items: prev.items.map((x) => (x.id === item.id ? { ...x, progress: 100, status: 'failed' } : x)),
        }))
        toast.show(String(error), 'error')
      }
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
        />
        </Grid>
    </Grid>
  )
}





