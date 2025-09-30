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

// 2) Upload + verify a PDF template
export async function verifyTemplate({ file, connectionId, refineIters = 0 }) {
  const form = new FormData()
  form.append('file', file)
  form.append('connection_id', connectionId)
  form.append('refine_iters', String(refineIters))
  const { data } = await api.post('/templates/verify', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
  // {
  //   template_id,
  //   schema,
  //   artifacts: { pdf_url, png_url, html_url }  // NOTE: relative paths
  // }
}

// 3) Auto-generate header→column mapping
export async function mappingPreview(templateId, connectionId) {
  const { data } = await api.post(
    `/templates/${templateId}/mapping/preview`,
    null,
    { params: { connection_id: connectionId } }
  )
  return data
  // { mapping, errors, schema_info, catalog }
}

// 4) Approve & save the mapping
export async function mappingApprove(templateId, mapping) {
  const { data } = await api.post(
    `/templates/${templateId}/mapping/approve`,
    { mapping }
  )
  return data // { ok, saved }
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
  // Expected: [{ id, name, tags, ... }]
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
export async function discoverBatches({ templateId, connectionId, startDate, endDate }) {
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
const API = import.meta.env.VITE_API_BASE_URL;

export async function discoverReports({ templateId, connectionId, startDate, endDate }) {
  const res = await fetch(`${API}/reports/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      connection_id: connectionId,
      start_date: startDate,
      end_date: endDate
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { template_id, name, batches:[{id,parent,rows,selected}], batches_count, rows_total }
}
