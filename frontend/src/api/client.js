import axios from 'axios'
import * as mock from './mock'

const runtimeEnv = {
  ...(typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {}),
  ...(globalThis.__NEURA_TEST_ENVIRONMENT__ || {}),
}

// base URL from env, with fallback

export const API_BASE = runtimeEnv.VITE_API_BASE_URL || 'http://127.0.0.1:8000'



// preconfigured axios instance

export const api = axios.create({ baseURL: API_BASE })



// helper: simulate latency in mock mode

export const sleep = (ms = 400) => new Promise(r => setTimeout(r, ms))



// whether to use mock API (defaults to false for production safety)

export const isMock = runtimeEnv.VITE_USE_MOCK === 'true'

const normalizeKind = (kind) => (kind === 'excel' ? 'excel' : 'pdf')

const TEMPLATE_ROUTES = {
  pdf: {
    verify: () => `${API_BASE}/templates/verify`,
    mappingPreview: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/mapping/preview`,
    corrections: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/mapping/corrections-preview`,
    approve: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/mapping/approve`,
    generator: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/generator-assets/v1`,
    chartSuggest: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/charts/suggest`,
    savedCharts: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/charts/saved`,
    manifest: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/artifacts/manifest`,
    head: (id, name) =>
      `${API_BASE}/templates/${encodeURIComponent(id)}/artifacts/head?name=${encodeURIComponent(name)}`,
    keys: (id) => `${API_BASE}/templates/${encodeURIComponent(id)}/keys/options`,
    discover: () => `${API_BASE}/reports/discover`,
    run: () => `${API_BASE}/reports/run`,
    runJob: () => `${API_BASE}/jobs/run-report`,
    uploadsBase: '/uploads',
    manifestBase: '/templates',
  },
  excel: {
    verify: () => `${API_BASE}/excel/verify`,
    mappingPreview: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/mapping/preview`,
    corrections: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/mapping/corrections-preview`,
    approve: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/mapping/approve`,
    generator: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/generator-assets/v1`,
    chartSuggest: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/charts/suggest`,
    savedCharts: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/charts/saved`,
    manifest: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/artifacts/manifest`,
    head: (id, name) =>
      `${API_BASE}/excel/${encodeURIComponent(id)}/artifacts/head?name=${encodeURIComponent(name)}`,
    keys: (id) => `${API_BASE}/excel/${encodeURIComponent(id)}/keys/options`,
    discover: () => `${API_BASE}/excel/reports/discover`,
    run: () => `${API_BASE}/excel/reports/run`,
    runJob: () => `${API_BASE}/excel/jobs/run-report`,
    uploadsBase: '/excel-uploads',
    manifestBase: '/excel',
  },
}

const getTemplateRoutes = (kind) => TEMPLATE_ROUTES[normalizeKind(kind)]

const prepareKeyValues = (values) => {
  if (!values || typeof values !== 'object') return undefined
  const payload = {}
  Object.entries(values).forEach(([token, raw]) => {
    if (!token) return
    if (Array.isArray(raw)) {
      const normalized = raw
        .map((value) => (value == null ? '' : String(value).trim()))
        .filter(Boolean)
      if (!normalized.length) return
      payload[token] = normalized.length === 1 ? normalized[0] : normalized
      return
    }
    if (raw === undefined || raw === null) return
    const text = typeof raw === 'string' ? raw.trim() : raw
    if (typeof text === 'string') {
      if (!text) return
      payload[token] = text
      return
    }
    payload[token] = raw
  })
  return Object.keys(payload).length ? payload : undefined
}



/* ------------------------ NEW: small utilities ------------------------ */



// Build absolute URLs for artifacts the API returns (e.g. /uploads/...)

export const withBase = (pathOrUrl) =>
  /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${API_BASE}${pathOrUrl}`


/**
 * Shared utility for handling NDJSON streaming responses.
 * Use this for new streaming endpoints to avoid code duplication.
 *
 * @param {Response} res - Fetch response with streaming body
 * @param {Object} options - Options object
 * @param {Function} options.onEvent - Called for each parsed event
 * @param {string} options.errorMessage - Error message prefix for failures
 * @returns {Promise<Object>} The final result event payload
 *
 * @example
 * const result = await handleStreamingResponse(res, {
 *   onEvent: (event) => console.log(event),
 *   errorMessage: 'Operation failed',
 * })
 */
export async function handleStreamingResponse(res, { onEvent, errorMessage = 'Request failed' } = {}) {
  if (!res.ok || !res.body) {
    let detail
    try {
      const data = await res.json()
      detail = data?.detail
    } catch {
      detail = await res.text().catch(() => null)
    }
    throw new Error(detail || errorMessage)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalEvent = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let newlineIndex
    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (!line) continue

      let payload
      try {
        payload = JSON.parse(line)
      } catch {
        continue
      }

      onEvent?.(payload)

      if (payload.event === 'result') {
        finalEvent = payload
      } else if (payload.event === 'error') {
        try {
          await reader.cancel()
        } catch {
          /* ignore */
        }
        const err = new Error(payload.detail || errorMessage)
        err.detail = payload.detail
        throw err
      }
    }
  }

  // Handle any remaining data in buffer
  if (buffer.trim()) {
    try {
      const payload = JSON.parse(buffer.trim())
      onEvent?.(payload)
      if (payload.event === 'result') {
        finalEvent = payload
      } else if (payload.event === 'error') {
        const err = new Error(payload.detail || errorMessage)
        err.detail = payload.detail
        throw err
      }
    } catch {
      // ignore trailing junk
    }
  }

  if (!finalEvent) {
    throw new Error(`${errorMessage}: no result payload received`)
  }

  return finalEvent
}


// Optional: turn server errors into nice messages

api.interceptors.response.use(

  (r) => r,

  (err) => {

    const msg =

      err?.response?.data?.detail ||

      err?.response?.data?.message ||

      err?.message ||

      'Request failed'

    return Promise.reject(new Error(msg))

  }

)



/* ------------------------ REAL API calls (existing) ------------------------ */



// 1) Test a DB connection

export async function testConnection({ db_url, db_type, database }) {

  const { data } = await api.post('/connections/test', { db_url, db_type, database })

  return data // { ok, connection_id, normalized, latency_ms }

}



// 2) Upload + verify a PDF template (streaming progress)

export async function verifyTemplate({ file, connectionId, refineIters = 0, onProgress, kind = 'pdf' } = {}) {
  const form = new FormData()
  form.append('file', file)
  const normalizedConnectionId = connectionId ?? ''
  form.append('connection_id', normalizedConnectionId)
  form.append('refine_iters', String(refineIters ?? 0))

  const res = await fetch(getTemplateRoutes(kind).verify(), {
    method: 'POST',
    body: form,
  })



  if (!res.ok || !res.body) {

    let detail

    try {

      const data = await res.json()

      detail = data?.detail

    } catch {

      detail = await res.text().catch(() => null)

    }

    throw new Error(detail || 'Verify template failed')

  }



  const reader = res.body.getReader()

  const decoder = new TextDecoder()
  let buffer = ''
  let finalEvent = null
  let contractStage = null
  let generatorStage = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })



    let newlineIndex

    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {

      const line = buffer.slice(0, newlineIndex).trim()

      buffer = buffer.slice(newlineIndex + 1)

      if (!line) continue



      let payload

      try {

        payload = JSON.parse(line)

      } catch {

        continue

      }



      if (payload.event === 'stage') {

        onProgress?.(payload)

      } else if (payload.event === 'result') {

        finalEvent = payload

        onProgress?.(payload)

      } else if (payload.event === 'error') {

        try {

          await reader.cancel()

        } catch {

          /* ignore */

        }

        const err = new Error(payload.detail || 'Verification failed')

        err.detail = payload.detail

        throw err

      }

    }

  }



  if (buffer.trim()) {

    try {

      const payload = JSON.parse(buffer.trim())

      if (payload.event === 'stage') {
        onProgress?.(payload)
      } else if (payload.event === 'result') {
        finalEvent = payload
        onProgress?.(payload)

      } else if (payload.event === 'error') {

        try {

          await reader.cancel()

        } catch {

          /* ignore */

        }

        const err = new Error(payload.detail || 'Verification failed')

        err.detail = payload.detail

        throw err

      }

    } catch {

      // ignore trailing junk

    }

  }



  if (!finalEvent) {

    throw new Error('Verification did not return a result payload')

  }



  const { template_id, schema, artifacts, schema_ext_url } = finalEvent

  const schemaExtRel = schema_ext_url || artifacts?.schema_ext_url || null

  const schemaExtUrl = schemaExtRel ? withBase(schemaExtRel) : null

  const llm2Rel = artifacts?.llm2_html_url || null

  const llm2Url = llm2Rel ? withBase(llm2Rel) : null

  return {

    template_id,

    schema,

    schema_ext_url: schemaExtUrl,

    llm2_html_url: llm2Url,

    artifacts: artifacts

      ? {

          pdf_url: artifacts.pdf_url ? withBase(artifacts.pdf_url) : null,

          png_url: artifacts.png_url ? withBase(artifacts.png_url) : null,

          html_url: artifacts.html_url ? withBase(artifacts.html_url) : null,

          llm2_html_url: llm2Url,

          schema_ext_url: schemaExtUrl,

        }

      : null,

  }

}



// 3) Auto-generate headerG��column mapping

export async function mappingPreview(templateId, connectionId, options = {}) {
  const kind = options.kind || 'pdf'
  const params = { connection_id: connectionId ?? '' }
  if (Object.prototype.hasOwnProperty.call(options, 'forceRefresh')) {
    params.force_refresh = options.forceRefresh
  }
  const endpoint = getTemplateRoutes(kind).mappingPreview(templateId)
  const { data } = await api.post(endpoint, null, { params })
  return data
}



export async function runCorrectionsPreview({
  templateId,
  userInput = '',
  page = 1,
  mappingOverride,
  sampleTokens,
  onEvent,
  signal,
  kind = 'pdf',
} = {}) {
  if (!templateId) {
    throw new Error('templateId is required for corrections preview')
  }
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const res = await fetch(getTemplateRoutes(kind).corrections(templateId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_input: userInput,
      page,
      ...(mappingOverride && Object.keys(mappingOverride).length > 0
        ? { mapping_override: mappingOverride }
        : {}),
      ...(Array.isArray(sampleTokens) && sampleTokens.length > 0
        ? { sample_tokens: sampleTokens }
        : {}),
    }),
    signal,
  })



  if (!res.ok || !res.body) {

    let detail

    try {

      const data = await res.json()

      detail = data?.detail

    } catch {

      detail = await res.text().catch(() => null)

    }

    throw new Error(detail || 'Corrections preview failed')

  }



  const reader = res.body.getReader()

  const decoder = new TextDecoder()

  let buffer = ''

  let finalEvent = null

  let contractStage = null



  while (true) {

    const { value, done } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })



    let newlineIndex

    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {

      const line = buffer.slice(0, newlineIndex).trim()

      buffer = buffer.slice(newlineIndex + 1)

      if (!line) continue



      let payload

      try {

        payload = JSON.parse(line)

      } catch {

        continue

      }



      onEvent?.(payload)



      if (payload.event === 'result') {

        finalEvent = payload

      } else if (payload.event === 'error') {

        try {

          await reader.cancel()

        } catch {

          /* ignore */

        }

        const err = new Error(payload.detail || 'Corrections preview failed')

        err.detail = payload.detail

        throw err

      }

    }

  }



  if (buffer.trim()) {

    try {

      const payload = JSON.parse(buffer.trim())

      onEvent?.(payload)

      if (payload.event === 'result') {

        finalEvent = payload

      } else if (payload.event === 'error') {

        const err = new Error(payload.detail || 'Corrections preview failed')

        err.detail = payload.detail

        throw err

      }

    } catch {

      // ignore trailing junk

    }

  }



  if (!finalEvent) {

    throw new Error('Corrections preview did not return a result payload')

  }



  const artifacts = finalEvent.artifacts || {}

  const processed = finalEvent.processed || {}
  return {
    ...finalEvent,
    artifacts: {
      template_html: artifacts.template_html ? withBase(artifacts.template_html) : null,
      page_summary: artifacts.page_summary ? withBase(artifacts.page_summary) : null,
    },
    processed,
  }

}



// 4) Approve & save the mapping (streaming progress)

export async function fetchArtifactManifest(templateId, { kind = 'pdf' } = {}) {
  const res = await fetch(getTemplateRoutes(kind).manifest(templateId))
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Manifest fetch failed (${res.status})`))
  }
  const data = await res.json()
  return data?.manifest ?? data
}

export async function fetchArtifactHead(templateId, name, { kind = 'pdf' } = {}) {
  const url = getTemplateRoutes(kind).head(templateId, name)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `Artifact head failed (${res.status})`))
  }
  return res.json()
}



export async function mappingApprove(
  templateId,
  mapping,
  {
    connectionId,
    userValuesText = '',
    userInstructions = '',
    keys,
    onProgress,
    signal,
    kind = 'pdf',
  } = {}
) {

  const payload = { mapping }

  if (connectionId) payload.connection_id = connectionId

  if (typeof userValuesText === 'string') payload.user_values_text = userValuesText

  if (typeof userInstructions === 'string') payload.user_instructions = userInstructions

  if (Array.isArray(keys)) {
    const normalizedKeys = Array.from(new Set(keys.map((token) => (typeof token === 'string' ? token.trim() : '')).filter(Boolean)))
    payload.keys = normalizedKeys
  } else if (keys === null) {
    payload.keys = []
  }



  if (signal?.aborted) {

    throw new DOMException('Aborted', 'AbortError')

  }



  const res = await fetch(getTemplateRoutes(kind).approve(templateId), {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(payload),

    signal,

  })



  if (!res.ok || !res.body) {

    let detail

    try {

      const data = await res.json()

      detail = data?.detail

    } catch {

      detail = await res.text().catch(() => null)

    }

    throw new Error(detail || 'Approve mapping failed')

  }



  const reader = res.body.getReader()

  const decoder = new TextDecoder()

  let buffer = ''
  let finalEvent = null
  let contractStage = null
  let generatorStage = null



  while (true) {

    const { value, done } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })



    let newlineIndex

    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {

      const line = buffer.slice(0, newlineIndex).trim()

      buffer = buffer.slice(newlineIndex + 1)

      if (!line) continue



      let payloadEvent

      try {

        payloadEvent = JSON.parse(line)

      } catch {

        continue

      }



      if (payloadEvent.event === 'stage') {

        if (payloadEvent.stage === 'contract_build_v2') {

          contractStage = payloadEvent

        } else if (payloadEvent.stage === 'generator_assets_v1') {

          generatorStage = payloadEvent

        }

        onProgress?.(payloadEvent)

      } else if (payloadEvent.event === 'result') {

        finalEvent = payloadEvent

        onProgress?.(payloadEvent)

      } else if (payloadEvent.event === 'error') {

        try {

          await reader.cancel()

        } catch {

          /* ignore */

        }

        const err = new Error(payloadEvent.detail || 'Approve mapping failed')

        err.detail = payloadEvent.detail

        throw err

      }

    }

  }



  if (buffer.trim()) {
    try {
      const payloadEvent = JSON.parse(buffer.trim())
      if (payloadEvent.event === 'stage') {
        if (payloadEvent.stage === 'contract_build_v2') {
          contractStage = payloadEvent
        } else if (payloadEvent.stage === 'generator_assets_v1') {
          generatorStage = payloadEvent
        }
        onProgress?.(payloadEvent)
      } else if (payloadEvent.event === 'result') {
        finalEvent = payloadEvent
        onProgress?.(payloadEvent)
      } else if (payloadEvent.event === 'error') {
        try {
          await reader.cancel()
        } catch {
          /* ignore */
        }
        const err = new Error(payloadEvent.detail || 'Approve mapping failed')
        err.detail = payloadEvent.detail
        throw err
      }
    } catch {
      // ignore trailing junk
    }
  }


  if (!finalEvent) {

    throw new Error('Approve mapping did not return a result payload')

  }



  const {

    saved,

    final_html_path,

    final_html_url,

    template_html_url,

    thumbnail_url,

    contract_ready,

    token_map_size,

    user_values_supplied,

    manifest: manifestData,

    manifest_url,

  } = finalEvent

  const contractStagePayload = contractStage || finalEvent.contract_stage || null
  const generatorStagePayload = generatorStage || finalEvent.generator_stage || null

  const responseKeys = Array.isArray(finalEvent?.keys)
    ? Array.from(
        new Set(
          finalEvent.keys
            .map((token) => (typeof token === 'string' ? token.trim() : ''))
            .filter(Boolean),
        ),
      )
    : []
  const keysCount =
    typeof finalEvent?.keys_count === 'number' ? finalEvent.keys_count : responseKeys.length
  const artifactsRaw =
    finalEvent?.artifacts && typeof finalEvent.artifacts === 'object' && !Array.isArray(finalEvent.artifacts)
      ? finalEvent.artifacts
      : {}
  const artifacts = Object.fromEntries(
    Object.entries(artifactsRaw).map(([name, url]) => [
      name,
      typeof url === 'string' && url ? withBase(url) : url,
    ]),
  )


  let manifest = manifestData || null

  if (!manifest) {

    try {

      manifest = await fetchArtifactManifest(templateId, { kind })

    } catch (err) {

      console.warn('manifest fetch failed', err)

    }

  }

  let generatorStageNormalized = generatorStagePayload
  if (generatorStageNormalized?.artifacts) {
    const normalized = Object.fromEntries(
      Object.entries(generatorStageNormalized.artifacts).map(([name, url]) => [name, url ? withBase(url) : url])
    )
    generatorStageNormalized = { ...generatorStageNormalized, artifacts: normalized }
  }



  return {

    ok: true,

    saved,

    final_html_path,

    final_html_url: final_html_url ? withBase(final_html_url) : final_html_url ?? null,

    template_html_url: template_html_url ? withBase(template_html_url) : template_html_url ?? null,

    thumbnail_url: thumbnail_url ? withBase(thumbnail_url) : thumbnail_url ?? null,

    contract_ready: Boolean(contract_ready),

    token_map_size: token_map_size ?? 0,

    user_values_supplied: Boolean(user_values_supplied),

    manifest,

    manifest_url: manifest_url ? withBase(manifest_url) : null,

    contract_stage: contractStagePayload,

    generator_stage: generatorStageNormalized,

    artifacts,

    keys: responseKeys,

    keys_count: keysCount,

  }

}


export async function fetchTemplateKeyOptions(
  templateId,
  { connectionId, tokens, limit, startDate, endDate, kind = 'pdf' } = {},
) {
  if (!templateId) {
    throw new Error('templateId is required to fetch key options')
  }
  const params = new URLSearchParams()
  if (connectionId) params.set('connection_id', connectionId)
  if (Array.isArray(tokens) && tokens.length) params.set('tokens', tokens.join(','))
  else if (typeof tokens === 'string' && tokens.trim()) params.set('tokens', tokens.trim())
  if (typeof limit === 'number' && Number.isFinite(limit)) params.set('limit', String(limit))
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const query = params.size ? `?${params.toString()}` : ''
  const endpoint = getTemplateRoutes(kind).keys(templateId)
  const res = await fetch(`${endpoint}${query}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Key options fetch failed (${res.status})`)
  }
  const data = await res.json().catch(() => ({}))
  const keys = data?.keys && typeof data.keys === 'object' ? data.keys : {}
  return {
    keys: Object.fromEntries(
      Object.entries(keys).map(([token, values]) => [
        token,
        Array.isArray(values)
          ? Array.from(
              new Set(
                values
                  .map((value) => (value == null ? '' : String(value)))
                  .map((value) => value.trim())
                  .filter(Boolean),
              ),
            )
          : [],
      ]),
    ),
  }
}


// 5) Step-5 Generator Assets (SQL + Schemas)

export async function postGeneratorAssetsV1(templateId, body, { onProgress, signal, kind = 'pdf' } = {}) {

  if (signal?.aborted) {

    throw new DOMException('Aborted', 'AbortError')

  }



  const res = await fetch(getTemplateRoutes(kind).generator(templateId), {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(body),

    signal,

  })



  if (!res.ok || !res.body) {

    let detail

    try {

      const data = await res.json()

      detail = data?.detail

    } catch {

      detail = await res.text().catch(() => null)

    }

    throw new Error(detail || 'Generator assets request failed')

  }



  const reader = res.body.getReader()

  const decoder = new TextDecoder()

  let buffer = ''

  let finalEvent = null



  while (true) {

    const { value, done } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })



    let newlineIndex

    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {

      const line = buffer.slice(0, newlineIndex).trim()

      buffer = buffer.slice(newlineIndex + 1)

      if (!line) continue



      let payloadEvent

      try {

        payloadEvent = JSON.parse(line)

      } catch {

        continue

      }



      if (payloadEvent.event === 'stage') {

        onProgress?.(payloadEvent)

      } else if (payloadEvent.event === 'result') {

        finalEvent = payloadEvent

        onProgress?.(payloadEvent)

      } else if (payloadEvent.event === 'error') {

        try {

          await reader.cancel()

        } catch {

          /* ignore */

        }

        const err = new Error(payloadEvent.detail || 'Generator assets request failed')

        err.detail = payloadEvent.detail

        throw err

      }

    }

  }



  if (buffer.trim()) {

    try {

      const payloadEvent = JSON.parse(buffer.trim())

      if (payloadEvent.event === 'stage') {

        onProgress?.(payloadEvent)

      } else if (payloadEvent.event === 'result') {

        finalEvent = payloadEvent

        onProgress?.(payloadEvent)

      } else if (payloadEvent.event === 'error') {

        const err = new Error(payloadEvent.detail || 'Generator assets request failed')

        err.detail = payloadEvent.detail

        throw err

      }

    } catch {

      /* ignore trailing junk */

    }

  }



  if (!finalEvent) {

    throw new Error('Generator assets request did not return a result payload')

  }



  const artifactEntries = Object.entries(finalEvent.artifacts || {})

  const normalizedArtifacts = Object.fromEntries(

    artifactEntries.map(([name, url]) => [name, url ? withBase(url) : url])

  )



  return {

    ...finalEvent,

    artifacts: normalizedArtifacts,

  }

}



// 5) Convenience for turning verify artifacts into absolute URLs

export function normalizeArtifacts(artifacts) {

  return {

    ...artifacts,

    pdf_url:  withBase(artifacts.pdf_url),

    png_url:  withBase(artifacts.png_url),

    html_url: withBase(artifacts.html_url),

  }

}



/* ------------------------ NEW: Generate-page helpers ------------------------ */

const normalizeChartSuggestion = (chart, idx) => {
  if (!chart || typeof chart !== 'object') return null
  const type = typeof chart.type === 'string' ? chart.type.toLowerCase().trim() : ''
  const xField = typeof chart.xField === 'string' ? chart.xField.trim() : ''
  let yFields = chart.yFields
  if (typeof yFields === 'string') {
    yFields = [yFields]
  }
  if (!Array.isArray(yFields)) {
    yFields = []
  }
  const normalizedY = yFields
    .map((value) => (typeof value === 'string' ? value.trim() : String(value)))
    .filter(Boolean)
  if (!type || !xField || !normalizedY.length) return null
  return {
    id: chart.id ? String(chart.id) : `chart_${idx + 1}`,
    type,
    xField,
    yFields: normalizedY,
    groupField:
      typeof chart.groupField === 'string'
        ? chart.groupField
        : chart.groupField != null
          ? String(chart.groupField)
          : null,
    aggregation:
      typeof chart.aggregation === 'string'
        ? chart.aggregation
        : chart.aggregation != null
          ? String(chart.aggregation)
          : null,
    chartTemplateId:
      typeof chart.chartTemplateId === 'string'
        ? chart.chartTemplateId
        : chart.chartTemplateId != null
          ? String(chart.chartTemplateId)
          : null,
    title: typeof chart.title === 'string' ? chart.title : null,
    description: typeof chart.description === 'string' ? chart.description : null,
  }
}

const normalizeSuggestChartsResponse = (data) => {
  const rawCharts = Array.isArray(data?.charts) ? data.charts : []
  const charts = rawCharts.map((chart, idx) => normalizeChartSuggestion(chart, idx)).filter(Boolean)
  const sampleData = Array.isArray(data?.sample_data) ? data.sample_data : null
  return { charts, sampleData }
}

export async function suggestCharts({
  templateId,
  connectionId,
  startDate,
  endDate,
  keyValues,
  question,
  kind = 'pdf',
}) {
  if (!templateId) throw new Error('templateId is required for suggestCharts')
  if (isMock) {
    const mockResponse = await mock.suggestChartsMock({
      templateId,
      connectionId,
      startDate,
      endDate,
      keyValues,
      question,
      kind,
    })
    return normalizeSuggestChartsResponse(mockResponse)
  }
  const payload = {
    start_date: startDate,
    end_date: endDate,
    question: question || '',
    include_sample_data: true,
  }
  if (connectionId) payload.connection_id = connectionId
  const preparedKeyValues = prepareKeyValues(keyValues)
  if (preparedKeyValues) {
    payload.key_values = preparedKeyValues
  }
  const endpoint = getTemplateRoutes(kind).chartSuggest(templateId)
  const { data } = await api.post(endpoint, payload)
  return normalizeSuggestChartsResponse(data)
}

const normalizeSavedChart = (chart, idx = 0) => {
  if (!chart || typeof chart !== 'object') return null
  const templateId = chart.template_id || chart.templateId
  const specPayload = chart.spec || {}
  const normalizedSpec =
    normalizeChartSuggestion(
      {
        ...specPayload,
        id: specPayload.id || `saved_spec_${idx}`,
      },
      idx,
    ) || null
  return {
    id: chart.id,
    templateId,
    name: chart.name,
    spec: normalizedSpec,
    createdAt: chart.created_at || chart.createdAt,
    updatedAt: chart.updated_at || chart.updatedAt,
  }
}

export async function listSavedCharts({ templateId, kind = 'pdf' }) {
  if (!templateId) throw new Error('templateId is required for listSavedCharts')
  if (isMock) {
    const response = await mock.listSavedChartsMock({ templateId })
    const charts = Array.isArray(response?.charts) ? response.charts : []
    return charts.map((chart, idx) => normalizeSavedChart(chart, idx)).filter(Boolean)
  }
  const endpoint = getTemplateRoutes(kind).savedCharts(templateId)
  const { data } = await api.get(endpoint)
  const charts = Array.isArray(data?.charts) ? data.charts : []
  return charts.map((chart, idx) => normalizeSavedChart(chart, idx)).filter(Boolean)
}

export async function createSavedChart({ templateId, name, spec, kind = 'pdf' }) {
  if (!templateId) throw new Error('templateId is required for createSavedChart')
  if (!name) throw new Error('name is required for createSavedChart')
  if (!spec) throw new Error('spec is required for createSavedChart')
  if (isMock) {
    const response = await mock.createSavedChartMock({
      templateId,
      name,
      spec,
    })
    return normalizeSavedChart(response, 0)
  }
  const endpoint = getTemplateRoutes(kind).savedCharts(templateId)
  const { data } = await api.post(endpoint, {
    template_id: templateId,
    name,
    spec,
  })
  return normalizeSavedChart(data, 0)
}

export async function updateSavedChart({ templateId, chartId, name, spec, kind = 'pdf' }) {
  if (!templateId) throw new Error('templateId is required for updateSavedChart')
  if (!chartId) throw new Error('chartId is required for updateSavedChart')
  if (name == null && spec == null) {
    return null
  }
  if (isMock) {
    const response = await mock.updateSavedChartMock({
      templateId,
      chartId,
      name,
      spec,
    })
    return normalizeSavedChart(response, 0)
  }
  const endpoint = `${getTemplateRoutes(kind).savedCharts(templateId)}/${encodeURIComponent(chartId)}`
  const payload = {}
  if (name != null) payload.name = name
  if (spec != null) payload.spec = spec
  const { data } = await api.put(endpoint, payload)
  return normalizeSavedChart(data, 0)
}

export async function deleteSavedChart({ templateId, chartId, kind = 'pdf' }) {
  if (!templateId) throw new Error('templateId is required for deleteSavedChart')
  if (!chartId) throw new Error('chartId is required for deleteSavedChart')
  if (isMock) {
    const response = await mock.deleteSavedChartMock({
      templateId,
      chartId,
    })
    return response
  }
  const endpoint = `${getTemplateRoutes(kind).savedCharts(templateId)}/${encodeURIComponent(chartId)}`
  const { data } = await api.delete(endpoint)
  return data
}



// A) List approved templates (adjust if your API differs)

export async function listApprovedTemplates({ kind = 'all' } = {}) {
  if (isMock) {
    const templates = mock.listTemplates() || []
    if (kind === 'excel') return templates.filter((tpl) => (tpl.kind || 'pdf') === 'excel')
    if (kind === 'pdf') return templates.filter((tpl) => (tpl.kind || 'pdf') === 'pdf')
    return templates
  }
  const params = { status: 'approved' }
  const { data } = await api.get('/templates', { params })
  const templates = Array.isArray(data?.templates) ? data.templates : []
  if (kind === 'excel') return templates.filter((tpl) => (tpl.kind || 'pdf') === 'excel')
  if (kind === 'pdf') return templates.filter((tpl) => (tpl.kind || 'pdf') === 'pdf')
  return templates
}

export async function getTemplateCatalog() {
  if (isMock) {
    if (typeof mock.getTemplateCatalog === 'function') {
      return mock.getTemplateCatalog()
    }
    return []
  }
  const { data } = await api.get('/templates/catalog')
  if (Array.isArray(data?.templates)) {
    return data.templates
  }
  if (Array.isArray(data)) {
    return data
  }
  return []
}

export async function recommendTemplates({ requirement, limit = 5, domains, kinds } = {}) {
  const payload = {}
  const trimmedRequirement = typeof requirement === 'string' ? requirement.trim() : ''
  if (trimmedRequirement) {
    payload.requirement = trimmedRequirement
  }
  if (Array.isArray(domains) && domains.length) {
    payload.domains = domains
  }
  if (Array.isArray(kinds) && kinds.length) {
    payload.kinds = kinds
  }
  if (limit != null) {
    payload.limit = limit
  }
  if (isMock) {
    if (typeof mock.recommendTemplates === 'function') {
      return mock.recommendTemplates(payload)
    }
    return []
  }
  const { data } = await api.post('/templates/recommend', payload)
  if (Array.isArray(data?.recommendations)) {
    return data.recommendations
  }
  return data
}

export async function deleteTemplate(templateId) {
  if (!templateId) throw new Error('Missing template id')
  if (isMock) {
    return { status: 'ok', template_id: templateId }
  }
  const { data } = await api.delete(`/templates/${encodeURIComponent(templateId)}`)
  return data
}

export async function duplicateTemplate(templateId, newName = null) {
  if (!templateId) throw new Error('Missing template id')
  if (isMock) {
    await sleep(400)
    return {
      template_id: `${templateId}-copy-${Date.now()}`,
      name: newName || 'Template (Copy)',
      kind: 'pdf',
      status: 'approved',
      source_id: templateId,
    }
  }
  const form = new FormData()
  if (newName) {
    form.append('name', newName)
  }
  const { data } = await api.post(`/templates/${encodeURIComponent(templateId)}/duplicate`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const templateExportZipUrl = (templateId) =>
  `${API_BASE}/templates/${encodeURIComponent(templateId)}/export`

export async function exportTemplateZip(templateId) {
  if (!templateId) throw new Error('Template ID is required')
  if (isMock) {
    await sleep(400)
    return { status: 'ok', mock: true }
  }
  // Trigger download via browser
  const url = templateExportZipUrl(templateId)
  const link = document.createElement('a')
  link.href = url
  link.download = `${templateId}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return { status: 'ok' }
}

export async function importTemplateZip({ file, name } = {}) {
  if (!file) throw new Error('Select a template zip file')
  if (isMock) {
    await sleep(400)
    return {
      status: 'ok',
      template_id: 'mock-template',
      mock: true,
      name: name || file.name,
    }
  }
  const form = new FormData()
  form.append('file', file)
  if (name) {
    form.append('name', name)
  }
  const { data } = await api.post('/templates/import-zip', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listSchedules() {
  if (isMock) {
    if (typeof mock.listSchedules === 'function') {
      return mock.listSchedules()
    }
    await sleep(200)
    return []
  }
  const { data } = await api.get('/reports/schedules')
  return Array.isArray(data?.schedules) ? data.schedules : []
}

export async function createSchedule(payload) {
  const apiPayload = {
    template_id: payload.templateId,
    connection_id: payload.connectionId,
    start_date: payload.startDate,
    end_date: payload.endDate,
    key_values: payload.keyValues,
    batch_ids: payload.batchIds,
    docx: !!payload.docx,
    xlsx: !!payload.xlsx,
    email_recipients: payload.emailRecipients,
    email_subject: payload.emailSubject,
    email_message: payload.emailMessage,
    frequency: payload.frequency || 'daily',
    interval_minutes: payload.intervalMinutes,
    name: payload.name,
  }
  if (isMock) {
    if (typeof mock.createSchedule === 'function') {
      return mock.createSchedule(apiPayload)
    }
    await sleep(200)
    return { schedule: { id: `mock-schedule-${Date.now()}`, ...apiPayload } }
  }
  const { data } = await api.post('/reports/schedules', apiPayload)
  return data?.schedule || data
}

export async function updateSchedule(scheduleId, payload) {
  if (!scheduleId) throw new Error('Missing schedule id')
  const apiPayload = {}
  if (payload.name !== undefined) apiPayload.name = payload.name
  if (payload.startDate !== undefined) apiPayload.start_date = payload.startDate
  if (payload.endDate !== undefined) apiPayload.end_date = payload.endDate
  if (payload.keyValues !== undefined) apiPayload.key_values = payload.keyValues
  if (payload.batchIds !== undefined) apiPayload.batch_ids = payload.batchIds
  if (payload.docx !== undefined) apiPayload.docx = !!payload.docx
  if (payload.xlsx !== undefined) apiPayload.xlsx = !!payload.xlsx
  if (payload.emailRecipients !== undefined) apiPayload.email_recipients = payload.emailRecipients
  if (payload.emailSubject !== undefined) apiPayload.email_subject = payload.emailSubject
  if (payload.emailMessage !== undefined) apiPayload.email_message = payload.emailMessage
  if (payload.frequency !== undefined) apiPayload.frequency = payload.frequency
  if (payload.intervalMinutes !== undefined) apiPayload.interval_minutes = payload.intervalMinutes
  if (payload.active !== undefined) apiPayload.active = payload.active

  if (isMock) {
    if (typeof mock.updateSchedule === 'function') {
      return mock.updateSchedule(scheduleId, apiPayload)
    }
    await sleep(200)
    return { schedule: { id: scheduleId, ...apiPayload } }
  }
  const { data } = await api.put(`/reports/schedules/${encodeURIComponent(scheduleId)}`, apiPayload)
  return data?.schedule || data
}

export async function deleteSchedule(scheduleId) {
  if (!scheduleId) throw new Error('Missing schedule id')
  if (isMock) {
    if (typeof mock.deleteSchedule === 'function') {
      return mock.deleteSchedule(scheduleId)
    }
    await sleep(200)
    return { status: 'ok', schedule_id: scheduleId }
  }
  const { data } = await api.delete(`/reports/schedules/${encodeURIComponent(scheduleId)}`)
  return data
}

export async function getTemplateHtml(templateId) {
  if (!templateId) throw new Error('templateId is required')
  if (isMock) {
    return mock.getTemplateHtml(templateId)
  }
  const { data } = await api.get(`/templates/${encodeURIComponent(templateId)}/html`)
  return data
}

export async function editTemplateManual(templateId, html) {
  if (!templateId) throw new Error('templateId is required')
  if (typeof html !== 'string') throw new Error('Provide HTML text to save')
  if (isMock) {
    return mock.editTemplateManual(templateId, html)
  }
  const { data } = await api.post(`/templates/${encodeURIComponent(templateId)}/edit-manual`, { html })
  return data
}

export async function editTemplateAi(templateId, instructions, html) {
  if (!templateId) throw new Error('templateId is required')
  const text = typeof instructions === 'string' ? instructions.trim() : ''
  if (!text) throw new Error('Provide AI instructions before applying')
  if (isMock) {
    return mock.editTemplateAi(templateId, text, html)
  }
  const payload = { instructions: text }
  if (typeof html === 'string' && html.length) {
    payload.html = html
  }
  const { data } = await api.post(`/templates/${encodeURIComponent(templateId)}/edit-ai`, payload)
  return data
}

export async function undoTemplateEdit(templateId) {
  if (!templateId) throw new Error('templateId is required')
  if (isMock) {
    return mock.undoTemplateEdit(templateId)
  }
  const { data } = await api.post(`/templates/${encodeURIComponent(templateId)}/undo-last-edit`)
  return data
}



// B) Run a report for a date range (returns artifact URLs)

export async function runReport({
  templateId,
  connectionId,
  startDate,
  endDate,
  batchIds = null,
  keyValues,
  docx = false,
  xlsx = false,
  kind = 'pdf',
}) {
  const payload = {
    template_id: templateId,
    connection_id: connectionId,
    start_date: startDate,
    end_date: endDate,
  }
  if (Array.isArray(batchIds) && batchIds.length) {
    payload.batch_ids = batchIds
  }
  const preparedKeyValues = prepareKeyValues(keyValues)
  if (preparedKeyValues) {
    payload.key_values = preparedKeyValues
  }
  if (docx) {
    payload.docx = true
  }
  if (xlsx) {
    payload.xlsx = true
  }
  const { data } = await api.post(getTemplateRoutes(kind).run(), payload)
  return data
}

export async function runReportAsJob({
  templateId,
  templateName,
  connectionId,
  startDate,
  endDate,
  batchIds = null,
  keyValues,
  docx = false,
  xlsx = false,
  kind = 'pdf',
  emailRecipients,
  emailSubject,
  emailMessage,
  scheduleId,
}) {
  const payload = {
    template_id: templateId,
    template_name: templateName,
    connection_id: connectionId,
    start_date: startDate,
    end_date: endDate,
  }
  if (Array.isArray(batchIds) && batchIds.length) {
    payload.batch_ids = batchIds
  }
  const preparedKeyValues = prepareKeyValues(keyValues)
  if (preparedKeyValues) {
    payload.key_values = preparedKeyValues
  }
  if (docx) payload.docx = true
  if (xlsx) payload.xlsx = true
  if (Array.isArray(emailRecipients) && emailRecipients.length) {
    payload.email_recipients = emailRecipients
  }
  if (emailSubject) payload.email_subject = emailSubject
  if (emailMessage) payload.email_message = emailMessage
  if (scheduleId) payload.schedule_id = scheduleId
  if (isMock) {
    return mock.runReportAsJobMock(payload)
  }
  const { data } = await api.post(getTemplateRoutes(kind).runJob(), payload)
  return data
}

// C) Normalize a run responseG��s artifact URLs to absolute

export function normalizeRunArtifacts(run) {
  return {
    ...run,
    html_url: withBase(run.html_url),
    pdf_url: withBase(run.pdf_url),
    docx_url: run.docx_url ? withBase(run.docx_url) : null,
    xlsx_url: run.xlsx_url ? withBase(run.xlsx_url) : null,
  }
}

// D) Discovery helper - delegates to discoverReports with simplified interface

export async function discoverBatches({
  templateId,
  connectionId,
  startDate,
  endDate,
  kind = 'pdf',
} = {}) {
  // Delegate to the working discoverReports implementation
  const result = await discoverReports({
    templateId,
    connectionId,
    startDate,
    endDate,
    kind,
  })
  // Return just the batches array for simplified API compatibility
  return { batches: result?.batches || [] }
}

export async function discoverReports({
  templateId,
  connectionId,
  startDate,
  endDate,
  keyValues,
  kind = 'pdf',
}) {
  const payload = {
    template_id: templateId,
    start_date: startDate,
    end_date: endDate,
  }
  if (connectionId) payload.connection_id = connectionId
  const preparedKeyValues = prepareKeyValues(keyValues)
  if (preparedKeyValues) {
    payload.key_values = preparedKeyValues
  }
  const { data } = await api.post(getTemplateRoutes(kind).discover(), payload)
  return data
}



/* ------------------------ Persistent state helpers ------------------------ */



export async function bootstrapState() {

  if (isMock) {

    return {

      status: 'ok',

      connections: [],

      templates: [],

      last_used: {},

    }

  }

  const { data } = await api.get('/state/bootstrap')

  return data

}



export async function upsertConnection({ id, name, dbType, dbUrl, database, status, latencyMs, tags }) {

  if (isMock) {

    const record = {

      id: id || `conn_${Date.now()}`,

      name,

      db_type: dbType,

      status: status || 'connected',

      summary: database || dbUrl,

      lastConnected: new Date().toISOString(),

      lastLatencyMs: latencyMs ?? null,

      tags: tags || [],

      hasCredentials: true,

    }

    return record

  }

  const payload = {

    id,

    name,

    db_type: dbType,

    db_url: dbUrl,

    database,

    status,

    latency_ms: latencyMs,

    tags,

  }

  const { data } = await api.post('/connections', payload)

  return data?.connection

}



export async function deleteConnection(connectionId) {

  if (isMock) return { status: 'ok', connection_id: connectionId }

  const { data } = await api.delete(`/connections/${encodeURIComponent(connectionId)}`)

  return data

}



export async function healthcheckConnection(connectionId) {

  if (isMock) {

    return { status: 'ok', latency_ms: Math.floor(Math.random() * 120), connection_id: connectionId }

  }

  const { data } = await api.post(`/connections/${encodeURIComponent(connectionId)}/health`)

  return data

}

export async function getSystemHealth() {
  if (isMock) {
    return {
      status: 'healthy',
      version: '4.0',
      timestamp: new Date().toISOString(),
      response_time_ms: 15,
      checks: {
        uploads_dir: { status: 'healthy', writable: true },
        state_dir: { status: 'healthy', writable: true },
        openai: { status: 'configured', message: 'OpenAI client initialized' },
        configuration: {
          api_key_configured: true,
          rate_limiting_enabled: true,
          rate_limit: '100/60s',
          request_timeout: 300,
          max_upload_size_mb: 50,
          debug_mode: false,
        },
      },
    }
  }
  const { data } = await api.get('/health/detailed')
  return data
}

export async function recordLastUsed({ connectionId, templateId }) {

  if (isMock) return { status: 'ok', last_used: { connection_id: connectionId, template_id: templateId } }

  const { data } = await api.post('/state/last-used', {

    connection_id: connectionId,

    template_id: templateId,

  })

  return data?.last_used

}

export async function listJobs({ statuses, types, limit = 25, activeOnly = false } = {}) {
  if (isMock) {
    const mockResponse = await mock.listJobsMock({ statuses, types, limit, activeOnly })
    return { jobs: Array.isArray(mockResponse?.jobs) ? mockResponse.jobs : [] }
  }
  const params = new URLSearchParams()
  if (Array.isArray(statuses)) {
    statuses.filter(Boolean).forEach((status) => params.append('status', status))
  }
  if (Array.isArray(types)) {
    types.filter(Boolean).forEach((type) => params.append('type', type))
  }
  if (limit) {
    params.set('limit', String(limit))
  }
  if (activeOnly) {
    params.set('active_only', 'true')
  }
  const query = params.toString()
  const endpoint = `/jobs${query ? `?${query}` : ''}`
  const { data } = await api.get(endpoint)
  return { jobs: Array.isArray(data?.jobs) ? data.jobs : [] }
}

export async function getJob(jobId) {
  if (!jobId) throw new Error('Missing job id')
  if (isMock) {
    return mock.getJobMock(jobId)
  }
  const { data } = await api.get(`/jobs/${encodeURIComponent(jobId)}`)
  return data?.job
}

export async function cancelJob(jobId, options = {}) {
  if (!jobId) throw new Error('Missing job id')
  const force = Boolean(options?.force)
  if (isMock) {
    return { status: 'cancelled', job_id: jobId, force }
  }
  const endpoint = `/jobs/${encodeURIComponent(jobId)}/cancel${force ? '?force=true' : ''}`
  const { data } = await api.post(endpoint)
  return data?.job || data
}


/* ------------------------ Document Analysis API ------------------------ */

/**
 * Upload and analyze a document (PDF or Excel) using AI.
 * Returns extracted tables, data points, and chart suggestions.
 *
 * @param {Object} options - Analysis options
 * @param {File} options.file - The file to analyze
 * @param {string} [options.connectionId] - Optional database connection for context
 * @param {string} [options.analysisType] - Type of analysis: 'comprehensive', 'tables', 'summary'
 * @param {Function} [options.onProgress] - Progress callback for streaming events
 * @param {AbortSignal} [options.signal] - AbortController signal for cancellation
 * @returns {Promise<Object>} Analysis result with tables, dataPoints, charts, summary
 */
export async function analyzeDocument({
  file,
  connectionId,
  analysisType = 'comprehensive',
  onProgress,
  signal,
} = {}) {
  if (!file) throw new Error('File is required for document analysis')

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const form = new FormData()
  form.append('file', file)
  if (connectionId) form.append('connection_id', connectionId)
  form.append('analysis_type', analysisType)

  const res = await fetch(`${API_BASE}/analyze/upload`, {
    method: 'POST',
    body: form,
    signal,
  })

  return handleStreamingResponse(res, {
    onEvent: onProgress,
    errorMessage: 'Document analysis failed',
  })
}

/**
 * Get a previously completed analysis by ID.
 *
 * @param {string} analysisId - The analysis ID
 * @returns {Promise<Object>} The analysis result
 */
export async function getAnalysis(analysisId) {
  if (!analysisId) throw new Error('analysisId is required')
  const { data } = await api.get(`/analyze/${encodeURIComponent(analysisId)}`)
  return data
}

/**
 * Get extracted data from an analysis in a specific format.
 *
 * @param {string} analysisId - The analysis ID
 * @param {Object} options - Options
 * @param {string} [options.format] - Output format: 'json', 'csv', 'dataframe'
 * @param {string} [options.tableId] - Specific table ID to export
 * @returns {Promise<Object>} The extracted data
 */
export async function getAnalysisData(analysisId, { format = 'json', tableId } = {}) {
  if (!analysisId) throw new Error('analysisId is required')
  const params = new URLSearchParams()
  params.set('format', format)
  if (tableId) params.set('table_id', tableId)
  const { data } = await api.get(`/analyze/${encodeURIComponent(analysisId)}/data?${params}`)
  return data
}

/**
 * Get AI-suggested charts for an analysis.
 *
 * @param {string} analysisId - The analysis ID
 * @param {Object} options - Options
 * @param {string} [options.question] - Natural language question for chart focus
 * @param {number} [options.limit] - Maximum number of chart suggestions
 * @returns {Promise<Object>} Chart suggestions
 */
export async function getAnalysisChartSuggestions(analysisId, { question, limit = 5 } = {}) {
  if (!analysisId) throw new Error('analysisId is required')
  const payload = {}
  if (question) payload.question = question
  if (limit) payload.limit = limit
  const { data } = await api.post(`/analyze/${encodeURIComponent(analysisId)}/charts/suggest`, payload)
  return data
}

/**
 * Quick document extraction without full AI analysis.
 * Faster but returns only raw extracted tables.
 *
 * @param {Object} options - Extraction options
 * @param {File} options.file - The file to extract from
 * @returns {Promise<Object>} Extracted tables and metadata
 */
export async function extractDocument({ file } = {}) {
  if (!file) throw new Error('File is required for extraction')
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/analyze/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}











