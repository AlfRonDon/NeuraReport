import axios from 'axios'



// base URL from env, with fallback

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'



// preconfigured axios instance

export const api = axios.create({ baseURL: API_BASE })



// helper: simulate latency in mock mode

export const sleep = (ms = 400) => new Promise(r => setTimeout(r, ms))



// whether to use mock API

export const isMock = (import.meta.env.VITE_USE_MOCK || 'true') === 'true'



/* ------------------------ NEW: small utilities ------------------------ */



// Build absolute URLs for artifacts the API returns (e.g. /uploads/…)

export const withBase = (pathOrUrl) =>
  /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${API_BASE}${pathOrUrl}`


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

export async function verifyTemplate({ file, connectionId, refineIters = 0, onProgress } = {}) {

  const form = new FormData()

  form.append('file', file)

  form.append('connection_id', connectionId)

  form.append('refine_iters', String(refineIters ?? 0))



  const res = await fetch(`${API_BASE}/templates/verify`, {

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



// 3) Auto-generate header→column mapping

export async function mappingPreview(templateId, connectionId, options = {}) {

  const params = { connection_id: connectionId ?? '' }

  if (Object.prototype.hasOwnProperty.call(options, 'forceRefresh')) {

    params.force_refresh = options.forceRefresh

  }



  const { data } = await api.post(

    `/templates/${templateId}/mapping/preview`,

    null,

    { params }

  )

  return data

  // { mapping, errors, schema_info, catalog }

}



export async function runCorrectionsPreview({

  templateId,

  userInput = '',

  page = 1,

  mappingOverride,

  sampleTokens,

  onEvent,

  signal,

} = {}) {

  if (!templateId) {

    throw new Error('templateId is required for corrections preview')

  }

  if (signal?.aborted) {

    throw new DOMException('Aborted', 'AbortError')

  }



  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/mapping/corrections-preview`, {

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

export async function fetchArtifactManifest(templateId) {

  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/artifacts/manifest`);

  if (!res.ok) {

    throw new Error(await res.text().catch(() => `Manifest fetch failed (${res.status})`));

  }

  const data = await res.json();

  return data?.manifest ?? data;

}



export async function fetchArtifactHead(templateId, name) {

  const url = `${API_BASE}/templates/${encodeURIComponent(templateId)}/artifacts/head?name=${encodeURIComponent(name)}`;

  const res = await fetch(url);

  if (!res.ok) {

    throw new Error(await res.text().catch(() => `Artifact head failed (${res.status})`));

  }

  return res.json();

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



  const res = await fetch(`${API_BASE}/templates/${templateId}/mapping/approve`, {

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

      manifest = await fetchArtifactManifest(templateId)

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


export async function fetchTemplateKeyOptions(templateId, { connectionId, tokens, limit, startDate, endDate } = {}) {
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
  const res = await fetch(
    `${API_BASE}/templates/${encodeURIComponent(templateId)}/keys/options${query}`,
  )
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

export async function postGeneratorAssetsV1(templateId, body, { onProgress, signal } = {}) {

  if (signal?.aborted) {

    throw new DOMException('Aborted', 'AbortError')

  }



  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/generator-assets/v1`, {

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



// A) List approved templates (adjust if your API differs)

export async function listApprovedTemplates() {

  const { data } = await api.get('/templates', { params: { status: 'approved' } })

  return data?.templates || []

}

export async function deleteTemplate(templateId) {
  if (!templateId) throw new Error('Missing template id')
  if (isMock) {
    return { status: 'ok', template_id: templateId }
  }
  const { data } = await api.delete(`/templates/${encodeURIComponent(templateId)}`)
  return data
}



// B) Run a report for a date range (returns artifact URLs)

export async function runReport({ templateId, connectionId, startDate, endDate, batchIds = null }) {

  const { data } = await api.post('/reports/run', {

    template_id: templateId,

    connection_id: connectionId,

    start_date: startDate,   // ISO string

    end_date: endDate,       // ISO string

    batch_ids: batchIds,     // optional

  })

  return data

  // → {

  //   ok, run_id, template_id, start_date, end_date,

  //   html_url: "/uploads/<tid>/filled_*.html",

  //   pdf_url:  "/uploads/<tid>/filled_*.pdf"

  // }

}



// C) Normalize a run response’s artifact URLs to absolute

export function normalizeRunArtifacts(run) {

  return {

    ...run,

    html_url: withBase(run.html_url),

    pdf_url: withBase(run.pdf_url),

  }

}

// D) Optional: placeholder for a future discovery endpoint

export async function discoverBatches() {

  // Implement when backend adds /reports/discover

  // const { data } = await api.post('/reports/discover', {

  //   template_id: templateId,

  //   connection_id: connectionId,

  //   start_date: startDate,

  //   end_date: endDate,

  // })

  // return data // { batches: [{ id, rows }, ...] }

  throw new Error('Discovery endpoint not implemented on backend yet.')

}

export async function discoverReports({ templateId, connectionId, startDate, endDate }) {

  const payload = {

    template_id: templateId,

    start_date: startDate,

    end_date: endDate,

  }

  if (connectionId) payload.connection_id = connectionId

  const { data } = await api.post('/reports/discover', payload)

  return data // { template_id, name, batches:[{id,parent,rows,selected}], batches_count, rows_total }

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



export async function recordLastUsed({ connectionId, templateId }) {

  if (isMock) return { status: 'ok', last_used: { connection_id: connectionId, template_id: templateId } }

  const { data } = await api.post('/state/last-used', {

    connection_id: connectionId,

    template_id: templateId,

  })

  return data?.last_used

}









