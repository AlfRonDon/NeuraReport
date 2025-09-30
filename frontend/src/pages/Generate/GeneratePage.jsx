import { useEffect, useMemo, useState } from 'react'
import {
  Box, Grid, Paper, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress,
  Card, CardActionArea, CardContent, CardHeader, Checkbox, Autocomplete, MenuItem, Select, Tooltip
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { isMock } from '../../api/client'
import * as mock from '../../api/mock'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'

/* -----------------------------------------------------------
   Config / helpers
----------------------------------------------------------- */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'') // trim trailing slash

async function listApprovedTemplatesAPI() {
  if (!API_BASE) return []
  const res = await fetch(`${API_BASE}/templates?status=approved`)
  if (!res.ok) return []
  return res.json()
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

// 🔻 no connection_id needed anymore
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

// 🔻 no connection_id needed anymore
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
    queryFn: () => isMock ? mock.listTemplates() : listApprovedTemplatesAPI(),
  })

  useEffect(() => { if (data && templates.length === 0) setTemplates(data) }, [data, setTemplates, templates.length])

  const approved = useMemo(() => templates.filter(t => (t.status === 'approved')), [templates])
  const allTags = useMemo(() => Array.from(new Set(approved.flatMap(t => t.tags || []))), [approved])
  const filtered = useMemo(() => (
    tagFilter.length ? approved.filter(t => (t.tags || []).some(tag => tagFilter.includes(tag))) : approved
  ), [approved, tagFilter])

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Template Picker</Typography>
      <Autocomplete
        multiple
        options={allTags}
        value={tagFilter}
        onChange={(e, v) => setTagFilter(v)}
        freeSolo
        renderInput={(params) => <TextField {...params} label="Filter by tags" size="small" />}
        sx={{ maxWidth: 480, mb: 2 }}
      />
      <Grid container spacing={2}>
        {filtered.map(t => {
          const selectedState = selected.includes(t.id)
          const type = t.sourceType?.toUpperCase() || 'PDF'
          const fmt = outputFormats[t.id] || 'auto'
          return (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card variant={selectedState ? 'elevation' : 'outlined'} sx={{ position: 'relative' }}>
                <Checkbox
                  checked={selectedState}
                  onChange={() => onToggle(t.id)}
                  sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
                  aria-label={`Select ${t.name}`}
                />
                <CardActionArea onClick={() => onToggle(t.id)}>
                  <CardHeader
                    title={t.name}
                    subheader={t.description || ''}
                    sx={{ pb: 0 }}
                    titleTypographyProps={{ noWrap: true }}
                    subheaderTypographyProps={{ sx: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }}
                  />
                  <CardContent>
                    <Box sx={{ height: 100, border: '1px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Thumbnail preview</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {(t.tags || []).slice(0, 3).map(tag => <Chip key={tag} label={tag} size="small" />)}
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label={type} color="default" />
                  <Select
                    size="small"
                    value={fmt}
                    onChange={(e) => setOutputFormats((m) => ({ ...m, [t.id]: e.target.value }))}
                    sx={{ bgcolor: 'background.paper' }}
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
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">No templates match these tags. Clear filters.</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  )
}

/* -----------------------------------------------------------
   Generate & Download
----------------------------------------------------------- */
function GenerateAndDownload({
  selected, autoType, start, end, setStart, setEnd,
  onFind, findDisabled, finding, results, onToggleBatch,
  onGenerate, canGenerate, generateLabel, generation
}) {
  const valid = !!selected.length && !!start && !!end && new Date(end) >= new Date(start)
  const { downloads } = useAppStore()
  const targetNames = Object.values(results).map(r => r.name)
  const subline = targetNames.length ? `${targetNames.slice(0,3).join(', ')}${targetNames.length > 3 ? ', …' : ''}` : ''
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Stack>
            <Typography variant="h6">Generate & Download</Typography>
            {!!subline && <Typography variant="caption" color="text.secondary">{subline}</Typography>}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="text" onClick={onFind} disabled={!valid || findDisabled}>Find Reports</Button>
            <Tooltip title={generateLabel}>
              <span>
                <Button variant="contained" onClick={onGenerate} disabled={!canGenerate}>{generateLabel}</Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Start Date & Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={toLocalInputValue(start)}
            onChange={(e)=>setStart(e.target.value)}
            helperText="Timezone: system"
          />
          <TextField
            label="End Date & Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={toLocalInputValue(end)}
            onChange={(e)=>setEnd(e.target.value)}
            error={!!(start && end && new Date(end) < new Date(start))}
            helperText={(start && end && new Date(end) < new Date(start)) ? 'End must be after Start' : ' '}
          />
          <Chip label={`Auto: ${autoType || '-'}`} size="small" />
        </Stack>

        {(finding || Object.keys(results).length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1">Discovery Results</Typography>
            {finding && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Searching data…</Typography>
              </Box>
            )}
            {!finding && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Object.keys(results).map(tid => {
                  const r = results[tid]
                  const total = r.rows_total ?? r.batches.reduce((a,b)=>a+b.rows,0)
                  const count = r.batches_count ?? r.batches.length
                  return (
                    <Box key={tid} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{count} {count===1?'batch':'batches'} • {total} rows</Typography>
                      </Stack>
                      {r.batches.length ? (
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {count} {count===1?'batch':'batches'} found ({total} rows)
                          </Typography>
                          {r.batches.map((b, idx) => (
                            <Stack key={b.id || idx} direction="row" spacing={1} alignItems="center">
                              <Checkbox checked={b.selected} onChange={(e)=>onToggleBatch(tid, idx, e.target.checked)} />
                              <Typography variant="body2">
                                Batch {idx+1} — {(b.parent ?? 1)} {(b.parent ?? 1) === 1 ? 'parent' : 'parents'} • {b.rows} rows
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

        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1">Progress</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {generation.items.map(item => (
              <Box key={item.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.status}</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 1 }} />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
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
                    disabled={!item.pdfUrl}
                    component="a"
                    href={item.pdfUrl || '#'}
                  >
                    Download
                  </Button>
                  <Button size="small" disabled>Show in folder</Button>
                  {item.status === 'failed' && <Button size="small">Retry</Button>}
                </Stack>
              </Box>
            ))}
            {!generation.items.length && <Typography variant="body2" color="text.secondary">No runs yet</Typography>}
          </Stack>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Recently Downloaded</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {downloads.map((d, i) => (
            <Stack
              key={i}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Typography variant="body2">
                {d.filename} • {d.template} • {d.format.toUpperCase()} • {d.size}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" disabled component="a" href={d.htmlUrl || '#'} target="_blank">Open</Button>
                <Button size="small" disabled>Show in folder</Button>
                <Button size="small" onClick={d.onRerun}>Re-run</Button>
              </Stack>
            </Stack>
          ))}
          {!downloads.length && <Typography variant="body2" color="text.secondary">No recent downloads yet.</Typography>}
        </Stack>
      </Paper>
    </>
  )
}

/* -----------------------------------------------------------
   Page
----------------------------------------------------------- */
export default function GeneratePage() {
  const { templates, addDownload } = useAppStore() // 🔻 no activeConnection needed
  const toast = useToast()
  const approved = useMemo(() => templates.filter(t => t.status === 'approved'), [templates])
  const [selected, setSelected] = useState([])
  const [outputFormats, setOutputFormats] = useState({})
  const [tagFilter, setTagFilter] = useState([])
  const onToggle = (id) => setSelected((s) => s.includes(id) ? s.filter(x=>x!==id) : [...s, id])
  const selectedTypes = useMemo(() => approved.filter(t => selected.includes(t.id)).map(t => t.sourceType), [approved, selected])
  const autoType = selectedTypes.length === 0 ? '-' : (selectedTypes.every(t => t === selectedTypes[0]) ? (selectedTypes[0]?.toUpperCase()) : 'Mixed')

  // Run Config state
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [finding, setFinding] = useState(false)
  const [results, setResults] = useState({})
  const [generation, setGeneration] = useState({ items: [] })

  useEffect(() => { setResults({}); setFinding(false) }, [selected, start, end])

  const onFind = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    if (!selected.length || !start || !end) return toast.show('Select a template and choose a start/end date.', 'warning')

    setFinding(true)
    try {
      const r = {}
      const targets = approved.filter(t => selected.includes(t.id))
      for (const t of targets) {
        const data = await discoverReportsAPI({
          templateId: t.id,
          startDate: start,
          endDate: end,
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
    setResults(prev => ({
      ...prev,
      [id]: { ...prev[id], batches: prev[id].batches.map((b,i) => i===idx ? { ...b, selected: val } : b) }
    }))
  }

  const canGenerate = useMemo(() => {
    const hasSel = Object.values(results).length > 0 && Object.values(results).some(r => r.batches.some(b => b.selected))
    return hasSel && !!start && !!end && new Date(end) >= new Date(start)
  }, [results, start, end])

  const generateLabel = useMemo(() => {
    const names = approved.filter(t => selected.includes(t.id)).map(t => t.name)
    const list = names.slice(0,3).join(', ') + (names.length>3 ? ', …' : '')
    return names.length ? `Generate reports for ${names.length} templates` : 'Generate Reports'
  }, [approved, selected])

  const batchIdsFor = (tplId) =>
    (results[tplId]?.batches || [])
      .filter(b => b.selected)
      .map(b => b.id)

  const onGenerate = async () => {
    if (!API_BASE) return toast.show('VITE_API_BASE_URL is not set', 'error')
    const targets = approved.filter(t => selected.includes(t.id))

    const seed = targets.map(t => ({
      id: `${t.id}-${Date.now()}`, tplId: t.id, name: t.name,
      status: 'running', progress: 10, format: (outputFormats[t.id] || 'auto'),
      htmlUrl: null, pdfUrl: null,
    }))
    setGeneration({ items: seed })

    for (const it of seed) {
      try {
        const data = await runReportAPI({
          templateId: it.tplId,
          startDate: start,
          endDate: end,
          batchIds: batchIdsFor(it.tplId),
        })

        const htmlUrl = `${API_BASE}${data.html_url}`
        const pdfUrl  = `${API_BASE}${data.pdf_url}`

        setGeneration(prev => ({
          items: prev.items.map(x => x.id === it.id ? { ...x, progress: 100, status: 'complete', htmlUrl, pdfUrl } : x)
        }))

        const ext = it.format === 'auto' ? 'pdf' : it.format
        addDownload({ filename: `${it.name}.${ext}`, template: it.name, format: ext, size: '', htmlUrl, pdfUrl, onRerun: () => onGenerate() })
      } catch (e) {
        setGeneration(prev => ({
          items: prev.items.map(x => x.id === it.id ? { ...x, progress: 100, status: 'failed' } : x)
        }))
        toast.show(String(e), 'error')
      }
    }
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TemplatePicker
          selected={selected}
          onToggle={onToggle}
          outputFormats={outputFormats}
          setOutputFormats={setOutputFormats}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
        />
      </Grid>
      <Grid item xs={12}>
        <GenerateAndDownload
          selected={approved.filter(t => selected.includes(t.id)).map(t => t.id)}
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
