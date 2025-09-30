import { useEffect, useMemo, useState } from 'react'
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress, Grid,
  Card, CardActionArea, CardContent, Checkbox, Autocomplete, Tooltip
} from '@mui/material'
import { Stepper, Step, StepLabel } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DownloadIcon from '@mui/icons-material/Download'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ReplayIcon from '@mui/icons-material/Replay'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useQuery } from '@tanstack/react-query'
import { isMock } from '../../api/client'
import * as mock from '../../api/mock'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'

/* ----------------------- helpers ----------------------- */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'')
const toSqlFromDayjs = (d) => (d && d.isValid && d.isValid())
  ? d.format('YYYY-MM-DD HH:mm:00')
  : ''

const includeConn = (body, connectionId) =>
  connectionId ? { ...body, connection_id: connectionId } : body

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

function TemplatePicker({ selected, onToggle, tagFilter, setTagFilter }) {
  const { templates, setTemplates } = useAppStore()
  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => (isMock ? mock.listTemplates() : Promise.resolve([])) })
  useEffect(() => { if (data && templates.length === 0) setTemplates(data) }, [data, setTemplates, templates.length])
  const approved = useMemo(() => templates.filter((t) => t.status === 'approved'), [templates])
  const allTags = useMemo(() => Array.from(new Set(approved.flatMap((t) => t.tags || []))), [approved])
  const [nameQuery, setNameQuery] = useState('')
  const filtered = useMemo(() => {
    const tagFiltered = tagFilter.length ? approved.filter((t) => (t.tags || []).some((tag) => tagFilter.includes(tag))) : approved
    const nq = nameQuery.trim().toLowerCase()
    return nq ? tagFiltered.filter((t) => (t.name || '').toLowerCase().includes(nq)) : tagFiltered
  }, [approved, tagFilter, nameQuery])

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Select Template</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <Autocomplete
          multiple
          options={allTags}
          value={tagFilter}
          onChange={(e, v) => setTagFilter(v)}
          freeSolo
          renderInput={(params) => <TextField {...params} label="Filter by tags" size="small" />}
          sx={{ minWidth: 240, maxWidth: 420 }}
        />
        <TextField size="small" label="Search by name" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} sx={{ minWidth: 220, maxWidth: 360 }} />
      </Stack>
      <Grid container spacing={2}>
        {filtered.map((t) => {
          const selectedState = selected.includes(t.id)
          const type = t.sourceType?.toUpperCase() || 'PDF'
          return (
            <Grid item xs={12} sm={6} md={6} key={t.id}>
              <Card
                variant={selectedState ? 'elevation' : 'outlined'}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: 4 },
                  ...(selectedState ? { borderColor: 'primary.main', boxShadow: 6 } : {}),
                }}
              >
                <Checkbox checked={selectedState} onChange={() => onToggle(t.id)} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} aria-label={`Select ${t.name}`} />
                <CardActionArea onClick={() => onToggle(t.id)}>
                  <CardContent>
                    <Box sx={{ height: 240, border: '1px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">Thumbnail preview</Typography>
                    </Box>
                    <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700, lineHeight: 1.2 }} noWrap>{t.name}</Typography>
                    {!!t.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      {(t.tags || []).slice(0, 4).map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                      {!!(t.tags || []).slice(4).length && <Chip size="small" label={`+${(t.tags || []).length - 4}`} variant="outlined" />}
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label={type} color="default" />
                </Box>
              </Card>
            </Grid>
          )
        })}
        {!filtered.length && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">No templates match these filters. Clear filters.</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  )
}

function GenerateAndDownload({ selected, autoType, start, end, setStart, setEnd, onFind, findDisabled, finding, results, onToggleBatch, onGenerate, canGenerate, generateLabel, generation }) {
  const valid = !!selected.length && !!start && !!end && end.valueOf() >= start.valueOf()
  const { downloads } = useAppStore()
  const targetNames = Object.values(results).map((r) => r.name)
  const subline = targetNames.length ? `${targetNames.slice(0, 3).join(', ')}${targetNames.length > 3 ? ', …' : ''}` : ''
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Stack>
            <Typography variant="h6">Generate & Download</Typography>
            {!!subline && <Typography variant="caption" color="text.secondary">{subline}</Typography>}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" color="secondary" startIcon={<SearchIcon />} sx={{ textTransform: 'none', borderRadius: 2, px: 2 }} onClick={onFind} disabled={!valid || findDisabled}>Find Reports</Button>
            <Tooltip title={generateLabel}>
              <span>
                <Button variant="contained" color="primary" disableElevation startIcon={<RocketLaunchIcon />} sx={{ textTransform: 'none', borderRadius: 2, px: 2 }} onClick={onGenerate} disabled={!canGenerate}>{generateLabel}</Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <DateTimePicker label="Start Date & Time" slotProps={{ textField: { size: 'small' } }} value={start} onChange={(v) => setStart(v)} />
            <DateTimePicker
              label="End Date & Time"
              slotProps={{ textField: { size: 'small', error: !!(start && end && end.isBefore(start)), helperText: start && end && end.isBefore(start) ? 'End must be after Start' : ' ' } }}
              value={end}
              onChange={(v) => setEnd(v)}
            />
            <Chip label={`Auto: ${autoType || '-'}`} size="small" />
          </Stack>
        </LocalizationProvider>

        {(finding || Object.keys(results).length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1">Discovery Results</Typography>
            {finding && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Searching data…
                </Typography>
              </Box>
            )}
            {!finding && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Object.keys(results).map((tid) => {
                  const r = results[tid]
                  const total = r.rows_total ?? r.batches.reduce((a, b) => a + (b.rows || 0), 0)
                  const count = r.batches_count ?? r.batches.length
                  return (
                    <Box key={tid} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                      <Typography variant="subtitle2">{r.name}</Typography>
                      {r.batches.length ? (
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {count} {count === 1 ? 'batch' : 'batches'} found ({total} rows)
                          </Typography>
                          {r.batches.map((b, idx) => (
                            <Stack key={b.id || idx} direction="row" spacing={1} alignItems="center">
                              <Checkbox checked={b.selected} onChange={(e) => onToggleBatch(tid, idx, e.target.checked)} />
                              <Typography variant="body2">
                                Batch {idx + 1} • {(b.parent ?? 1)} {(b.parent ?? 1) === 1 ? 'parent' : 'parents'} • {b.rows} rows
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
            {generation.items.map((item) => (
              <Box key={item.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.status}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={item.progress} sx={{ mt: 1 }} />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} sx={{ textTransform: 'none', borderRadius: 2 }} disabled={!item.htmlUrl} component="a" href={item.htmlUrl || '#'} target="_blank" rel="noopener">Open</Button>
                  <Button size="small" variant="contained" color="primary" disableElevation startIcon={<DownloadIcon />} sx={{ textTransform: 'none', borderRadius: 2 }} disabled={!item.pdfUrl} component="a" href={item.pdfUrl || '#'}>Download</Button>
                  <Button size="small" variant="text" startIcon={<FolderOpenIcon />} sx={{ textTransform: 'none', borderRadius: 2 }} disabled>Show in folder</Button>
                  {item.status === 'failed' && <Button size="small" variant="outlined" color="warning" startIcon={<ReplayIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Retry</Button>}
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
            <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2">{d.filename} • {d.template} • {d.format.toUpperCase()} • {d.size}</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} sx={{ textTransform: 'none', borderRadius: 2 }} disabled={!d.htmlUrl} component="a" href={d.htmlUrl || '#'} target="_blank">Open</Button>
                <Button size="small" variant="text" startIcon={<FolderOpenIcon />} sx={{ textTransform: 'none', borderRadius: 2 }} disabled>Show in folder</Button>
                <Button size="small" variant="contained" color="success" disableElevation startIcon={<ReplayIcon />} sx={{ textTransform: 'none', borderRadius: 2 }} onClick={d.onRerun}>Re-run</Button>
              </Stack>
            </Stack>
          ))}
          {!downloads.length && <Typography variant="body2" color="text.secondary">No recent downloads yet.</Typography>}
        </Stack>
      </Paper>
    </>
  )
}

export default function TemplatesPane() {
  // pull connection if available; API can fallback when not provided
  const { templates, addDownload, activeConnection } = useAppStore()
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
          connectionId: activeConnection?.id,   // pass when available
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
          connectionId: activeConnection?.id,   // pass when available
        })
        const htmlUrl = `${API_BASE}${data.html_url}`
        const pdfUrl  = `${API_BASE}${data.pdf_url}`

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
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Generate Report</Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ pb: 1 }}>
          {['Select Template', 'Select Date & Time', 'Generate Report'].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Typography variant="caption" color="text.secondary">
          {selected.length} selected • {dateRangeValid ? 'Range set' : 'Choose a range'}
        </Typography>
      </Paper>
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
