import Grid from '@mui/material/Grid2'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useLayoutEffect, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { savePersistedCache } from '../../../hooks/useBootstrapState.js'
import EmptyState from '../../../components/feedback/EmptyState.jsx'
import InfoTooltip from '../../../components/common/InfoTooltip.jsx'
import LoadingState from '../../../components/feedback/LoadingState.jsx'
import ScaledIframePreview from '../../../components/ScaledIframePreview.jsx'
import Surface from '../../../components/layout/Surface.jsx'
import TOOLTIP_COPY from '../../../content/tooltipCopy.jsx'
import { useAppStore } from '../../../store/useAppStore'
import { useToast } from '../../../components/ToastProvider.jsx'
import { resolveTemplatePreviewUrl, resolveTemplateThumbnailUrl } from '../../../utils/preview'
import { buildLastEditInfo } from '../../../utils/templateMeta'
import getSourceMeta from '../utils/templateSourceMeta'
import { buildDownloadUrl, surfaceStackSx, getTemplateKind } from '../utils/generateFeatureUtils'
import { registerTemplatePickerRoot } from '../utils/templatePickerRegistry'
import {
  deleteTemplateRequest,
  getTemplateCatalog,
  isMock,
  listApprovedTemplates,
  mock,
  recommendTemplates,
  withBase,
} from '../services/generateApi'

export function TemplatePicker({ selected, onToggle, outputFormats, setOutputFormats, tagFilter, setTagFilter, onEditTemplate }) {
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
    const cleanup = registerTemplatePickerRoot(node)
    return cleanup
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

export default TemplatePicker
