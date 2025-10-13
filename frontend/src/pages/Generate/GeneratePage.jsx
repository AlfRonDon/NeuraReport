import Grid from '@mui/material/Grid2'
import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress,
  Card, CardActionArea, CardContent, Checkbox, Autocomplete, MenuItem, Select, Tooltip,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { isMock, withBase } from '../../api/client'
import * as mock from '../../api/mock'
import { savePersistedCache } from '../../hooks/useBootstrapState.js'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import ScaledIframePreview from '../../components/ScaledIframePreview.jsx'
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
async function discoverReportsAPI({ templateId, startDate, endDate }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const body = {
    template_id: templateId,
    start_date: toSqlDateTime(startDate),
    end_date: toSqlDateTime(endDate),
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

async function runReportAPI({ templateId, startDate, endDate, batchIds }) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const body = {
    template_id: templateId,
    start_date: toSqlDateTime(startDate),
    end_date: toSqlDateTime(endDate),
    batch_ids: batchIds ?? null,
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
  const { templates, setTemplates } = useAppStore()

  const { data } = useQuery({
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

  return (
    <Surface sx={surfaceStackSx}>
      <Stack spacing={1.5}>
        <Typography variant="h6">Template Picker</Typography>
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
                <CardActionArea onClick={() => onToggle(t.id)} sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', flexGrow: 1, justifyContent: 'space-between' }}>
                    <Box
                      sx={{
                        minHeight: 180,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'auto',
                        bgcolor: 'background.default',
                        p: 1,
                      }}
                    >
                      {htmlPreview ? (
                        <ScaledIframePreview
                          key={previewKey}
                          src={htmlPreview}
                          title={`${t.name} preview`}
                          sx={{ width: '100%' }}
                        />
                      ) : imagePreview ? (
                        <Box component="img" src={imagePreview} alt={`${t.name} preview`} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
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
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                        {t.name}
                      </Typography>
                      {!!t.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {t.description}
                        </Typography>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {(t.tags || []).slice(0, 3).map((tag) => <Chip key={tag} label={tag} size="small" />)}
                      {(t.tags || []).length > 3 && <Chip size="small" variant="outlined" label={`+${(t.tags || []).length - 3}`} />}
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label={type} variant="outlined" />
                  <Select
                    size="small"
                    value={fmt}
                    onChange={(e) => setOutputFormats((m) => ({ ...m, [t.id]: e.target.value }))}
                    sx={{ bgcolor: 'background.paper', minWidth: 112 }}
                    aria-label="Output format"
                  >
                    <MenuItem value="auto">Auto ({type})</MenuItem>
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="excel">Excel</MenuItem>
                  </Select>
                </Box>
              </Card>
            </Grid>
          )
        })}
        {!filtered.length && (
          <Grid size={12} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">No templates match these tags. Clear filters.</Typography>
          </Grid>
        )}
      </Grid>
    </Surface>
  )
}

/* -----------------------------------------------------------
   Generate & Download
----------------------------------------------------------- */
function GenerateAndDownload({ selected, autoType, start, end, setStart, setEnd, onFind, findDisabled, finding, results, onToggleBatch, onGenerate, canGenerate, generateLabel, generation }) {
  const valid = !!selected.length && !!start && !!end && new Date(end) >= new Date(start)
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
        <Typography variant="h6">Recently Downloaded</Typography>
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
                <Button size="small" variant="outlined" disabled={!d.htmlUrl} component="a" href={d.htmlUrl || '#'} target="_blank" rel="noopener">
                  Open
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

  useEffect(() => { setResults({}); setFinding(false) }, [selected, start, end])

  const autoType = useMemo(() => {
    if (!selected.length) return '-'
    const selectedTemplates = approved.filter((t) => selected.includes(t.id))
    const types = selectedTemplates.map((t) => t.sourceType?.toUpperCase() || 'PDF')
    return types.every((t) => t === types[0]) ? types[0] : 'Mixed'
  }, [approved, selected])

  const onToggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const onFind = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selected.length || !start || !end) return toast.show('Select a template and choose a start/end date.', 'warning')

    setFinding(true)
    try {
      const payload = {}
      const targets = approved.filter((t) => selected.includes(t.id))
      for (const t of targets) {
        const data = await discoverReportsAPI({
          templateId: t.id,
          startDate: start,
          endDate: end,
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
    return hasBatches && !!start && !!end && new Date(end) >= new Date(start)
  }, [results, start, end])

  const generateLabel = useMemo(() => {
    const names = approved.filter((t) => selected.includes(t.id)).map((t) => t.name)
    return names.length ? `Generate reports for ${names.length} templates` : 'Generate Reports'
  }, [approved, selected])

  const batchIdsFor = (tplId) => (results[tplId]?.batches || []).filter((b) => b.selected).map((b) => b.id)

  const onGenerate = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selected.length) return

    const targets = approved.filter((t) => selected.includes(t.id))
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
      </Grid>
    </Grid>
  )
}



