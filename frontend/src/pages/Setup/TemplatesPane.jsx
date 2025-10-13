import Grid from '@mui/material/Grid2'
import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress,
  Card, CardActionArea, CardContent, Checkbox, Autocomplete, Tooltip, Dialog, DialogContent, DialogTitle
} from '@mui/material'
import { Stepper, Step, StepLabel } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DownloadIcon from '@mui/icons-material/Download'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ReplayIcon from '@mui/icons-material/Replay'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useQuery } from '@tanstack/react-query'
import { isMock, API_BASE, withBase, listApprovedTemplates } from '../../api/client'
import * as mock from '../../api/mock'
import { savePersistedCache } from '../../hooks/useBootstrapState.js'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
import { resolveTemplatePreviewUrl, resolveTemplateThumbnailUrl } from '../../utils/preview'

/* ----------------------- helpers ----------------------- */
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

// 🔻 backend: /reports/discover
async function discoverReportsAPI({ templateId, startDate, endDate, connectionId }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const base = {
    template_id: templateId,
    start_date: toSqlFromDayjs(startDate),
    end_date: toSqlFromDayjs(endDate),
  }
  const res = await fetch(`${API_BASE}/reports/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(includeConn(base, connectionId)),
  })
  if (!res.ok) throw new Error(await res.text().catch(()=>`Discovery failed (${res.status})`))
  return res.json()
}

// 🔻 backend: /reports/run
async function runReportAPI({ templateId, startDate, endDate, batchIds, connectionId }) {
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
    body: JSON.stringify(includeConn(base, connectionId)),
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
  const { templates, setTemplates } = useAppStore()
  const { data } = useQuery({
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

  return (
    <Surface sx={surfaceStackSx}>
      <Typography variant="h6">Select Template</Typography>
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
                <Checkbox checked={selectedState} onChange={() => onToggle(t.id)} sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1 }} aria-label={`Select ${t.name}`} />
                <CardActionArea onClick={() => onToggle(t.id)} sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', flexGrow: 1, justifyContent: 'space-between' }}>
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

                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{t.name}</Typography>
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
                  </CardContent>
                </CardActionArea>
                <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label={type} variant="outlined" />
                </Box>
              </Card>
            </Grid>
          )
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

function GenerateAndDownload({ selected, autoType, start, end, setStart, setEnd, onFind, findDisabled, finding, results, onToggleBatch, onGenerate, canGenerate, generateLabel, generation }) {
  const valid = !!selected.length && !!start && !!end && end.valueOf() >= start.valueOf()
  const { downloads } = useAppStore()
  const targetNames = Object.values(results).map((r) => r.name)
  const subline = targetNames.length
    ? `${targetNames.slice(0, 3).join(', ')}${targetNames.length > 3 ? ', ...' : ''}`
    : ''
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
            <Typography variant="h6">Generate & Download</Typography>
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

        {(finding || Object.keys(results).length > 0) && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Discovery Results</Typography>
            {finding ? (
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary">
                  Searching data...
                </Typography>
              </Stack>
            ) : (
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
                    <Button size="small" variant="outlined" color="warning" startIcon={<ReplayIcon />}>Retry</Button>
                  )}
                </Stack>
              </Box>
            ))}
            {!generation.items.length && <Typography variant="body2" color="text.secondary">No runs yet</Typography>}
          </Stack>
        </Box>
      </Surface>

      <Surface sx={surfaceStackSx}>
        <Typography variant="h6">Recently Downloaded</Typography>
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
                  href={d.htmlUrl || '#'}
                  target="_blank"
                  rel="noopener"
                >
                  Open
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
  const selectedTypes = useMemo(() => approved.filter((t) => selected.includes(t.id)).map((t) => t.sourceType), [approved, selected])
  const autoType = selectedTypes.length === 0 ? '-' : selectedTypes.every((t) => t === selectedTypes[0]) ? selectedTypes[0]?.toUpperCase() : 'Mixed'

  // Run Config state
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [finding, setFinding] = useState(false)
  const [results, setResults] = useState({}) // { tplId: { name, batches:[{id,parent,rows,selected}], batches_count, rows_total } }
  const [generation, setGeneration] = useState({ items: [] })

  useEffect(() => { setResults({}); setFinding(false) }, [selected, start?.valueOf(), end?.valueOf()])

  const onFind = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selected.length || !start || !end) return toast.show('Select a template and choose a start/end date.', 'warning')

    setFinding(true)
    try {
      const r = {}
      const targets = approved.filter((t) => selected.includes(t.id))
      for (const t of targets) {
        const data = await discoverReportsAPI({
          templateId: t.id,
          startDate: start,
          endDate: end,
          connectionId: activeConnectionId,   // pass when available
        })
        r[t.id] = {
          name: t.name,
          batches: (data.batches || []).map(b => ({ ...b, selected: b.selected ?? true })),
          batches_count: data.batches_count ?? (data.batches?.length || 0),
          rows_total: data.rows_total ?? (data.batches?.reduce((a,b)=>a+(b.rows||0),0) || 0),
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
    return hasSel && !!start && !!end && end.valueOf() >= start.valueOf()
  }, [results, start, end])

  const generateLabel = useMemo(() => {
    const names = approved.filter((t) => selected.includes(t.id)).map((t) => t.name)
    return names.length ? `Generate reports for ${names.length} templates` : 'Generate Reports'
  }, [approved, selected])

  const batchIdsFor = (tplId) =>
    (results[tplId]?.batches || []).filter(b => b.selected).map(b => b.id)

  const onGenerate = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')

    const targets = approved.filter((t) => selected.includes(t.id))
    const seed = targets.map((t) => ({ id: `${t.id}-${Date.now()}`, tplId: t.id, name: t.name, status: 'running', progress: 10, htmlUrl: null, pdfUrl: null }))
    setGeneration({ items: seed })

    for (const it of seed) {
      try {
        const data = await runReportAPI({
          templateId: it.tplId,
          startDate: start,
          endDate: end,
          batchIds: batchIdsFor(it.tplId),
          connectionId: activeConnectionId,   // pass when available
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

  const dateRangeValid = !!start && !!end && end.valueOf() >= start.valueOf()
  let activeStep = 0
  if (selected.length > 0) activeStep = 1
  if (dateRangeValid) activeStep = 2

  return (
    <>
      <Surface sx={[surfaceStackSx, { mb: 3 }]}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Generate Report</Typography>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            aria-label="Generate report steps"
            sx={{
              pb: 0,
              '& .MuiStep-root': { position: 'relative' },
              '& .MuiStepConnector-root': { top: 16 },
              '& .MuiStepLabel-label': { mt: 1 },
              '& .MuiStepConnector-line': { borderColor: 'divider' },
            }}
          >
            {['Select Template', 'Select Date & Time', 'Generate Report'].map((label) => (
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
      <TemplatePicker selected={selected} onToggle={onToggle} tagFilter={tagFilter} setTagFilter={setTagFilter} />
      <GenerateAndDownload
        selected={approved.filter((t) => selected.includes(t.id)).map((t) => t.id)}
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
      />
    </>
  )
}






