import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Chip, Divider, LinearProgress,
  MenuItem, Paper,
} from '@mui/material'
import { Stepper, Step, StepLabel } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { useNavigate } from 'react-router-dom'
import {
  fetchTemplateKeyOptions,
  discoverReports,
  runReportAsJob,
  listSchedules,
  createSchedule,
  deleteSchedule,
} from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider.jsx'
import Surface from '../../components/layout/Surface.jsx'
import InfoTooltip from '../../components/common/InfoTooltip.jsx'
import TOOLTIP_COPY from '../../content/tooltipCopy.jsx'
import TemplatePicker from '../../features/generate/components/TemplatePicker.jsx'
import GenerateAndDownload from '../../features/generate/components/GenerateAndDownload.jsx'
import {
  ALL_OPTION,
  SCHEDULE_FREQUENCY_OPTIONS,
  parseEmailTargets,
  formatScheduleDate,
  toSqlFromDayjs,
  formatDisplayDate,
  formatTokenLabel,
  getTemplateKind,
  surfaceStackSx,
} from './templatesPaneUtils'
import { DEFAULT_RESAMPLE_CONFIG } from '../../features/generate/utils/generateFeatureUtils'


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

export default function TemplatesPane() {
  // pull connection if available; API can fallback when not provided
  const templates = useAppStore((state) => state.templates)
  const navigate = useNavigate()
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
  const [outputFormats, setOutputFormats] = useState({})
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
        const rawBatches = Array.isArray(data.batches) ? data.batches : []
        const normalizedBatches = rawBatches.map((batch, index) => {
          const batchId = Object.prototype.hasOwnProperty.call(batch, 'id') ? batch.id : `${index + 1}`
          const rows = Number(batch.rows || 0)
          const parent = Number(batch.parent || 0)
          const safeParent = parent || 1
          const time = batch.time ?? null
          const category = batch.category ?? null
          return {
            ...batch,
            id: batchId,
            rows,
            parent,
            selected: batch.selected ?? true,
            time,
            category,
            rows_per_parent: safeParent ? rows / safeParent : rows,
          }
        })
        const fieldCatalog = Array.isArray(data.field_catalog) ? data.field_catalog : []
        const discoverySchema = data.discovery_schema && typeof data.discovery_schema === 'object' ? data.discovery_schema : null
        const defaultDimension = discoverySchema?.defaults?.dimension
          || (fieldCatalog.some((field) => field?.name === 'time')
            ? 'time'
            : fieldCatalog.some((field) => field?.name === 'category')
              ? 'category'
              : 'batch_index')
        const defaultMetric = discoverySchema?.defaults?.metric
          || (fieldCatalog.some((field) => field?.name === 'rows')
            ? 'rows'
            : fieldCatalog.some((field) => field?.name === 'rows_per_parent')
              ? 'rows_per_parent'
              : 'parent')
        const dimensionKind = discoverySchema?.dimensions?.find?.((dim) => dim?.name === defaultDimension)?.kind || 'categorical'
        const batchMetrics = Array.isArray(data.batch_metrics)
          ? data.batch_metrics
          : normalizedBatches.map((entry, index) => ({
              batch_index: index + 1,
              batch_id: entry.id ?? index + 1,
              rows: entry.rows ?? 0,
              parent: entry.parent ?? 0,
              rows_per_parent: entry.rows_per_parent ?? 0,
              time: entry.time ?? null,
              category: entry.category ?? null,
            }))
        r[t.id] = {
          name: t.name,
          batches: normalizedBatches,
          allBatches: normalizedBatches,
          batches_count: data.batches_count ?? normalizedBatches.length,
          rows_total: data.rows_total ?? normalizedBatches.reduce((a, b) => a + (b.rows || 0), 0),
          fieldCatalog,
          batchMetrics,
          discoverySchema,
          numericBins: data.numeric_bins && typeof data.numeric_bins === 'object' ? data.numeric_bins : {},
          categoryGroups: data.category_groups && typeof data.category_groups === 'object' ? data.category_groups : {},
          resample: {
            config: {
              ...DEFAULT_RESAMPLE_CONFIG,
              dimension: defaultDimension,
              metric: defaultMetric,
              dimensionKind,
            },
            filteredIds: null,
          },
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
      status: 'queued',
      progress: 5,
      jobId: null,
      error: null,
    }))
    setGeneration({ items: seed })

    for (const it of seed) {
      try {
        const keyFilters = buildKeyFiltersForTemplate(it.tplId)
        const requestDocx = true
        const requestXlsx = it.kind === 'excel'
        const response = await runReportAsJob({
          templateId: it.tplId,
          templateName: it.name,
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
        const jobId = response?.job_id || null
        setGeneration((prev) => ({
          items: prev.items.map((x) =>
            x.id === it.id
              ? {
                  ...x,
                  progress: jobId ? 15 : 10,
                  status: 'queued',
                  jobId,
                  error: null,
                }
              : x,
          ),
        }))
        if (jobId) {
          toast.show(`Queued job ${jobId} for ${it.name}`, 'success')
        }
      } catch (e) {
        setGeneration((prev) => ({
          items: prev.items.map((x) =>
            x.id === it.id ? { ...x, progress: 100, status: 'failed', error: String(e) } : x,
          ),
        }))
        toast.show(String(e), 'error')
      }
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
        outputFormats={outputFormats}
        setOutputFormats={setOutputFormats}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        onEditTemplate={(tpl) => {
          if (!tpl?.id) return
          navigate(`/templates/${tpl.id}/edit`)
        }}
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
        generatorReady
        generatorIssues={{ missing: [], needsFix: [], messages: [] }}
        keyValues={keyValues}
        onKeyValueChange={handleKeyValueChange}
        keysReady={keysReady}
        keyOptions={keyOptions}
        keyOptionsLoading={keyOptionsLoading}
        onResampleFilter={handleResampleFilter}
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
                          {schedule.template_name || schedule.template_id} - {schedule.frequency || 'custom'} - Next run {formatScheduleDate(schedule.next_run_at)}
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
    </>
  )
}
