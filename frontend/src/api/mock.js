import { sleep } from './client'

export async function testConnection(payload) {
  await sleep()
  // naive mock: consider any host provided as success
  if (!payload?.host || !payload?.db_type) {
    const error = new Error('Missing required fields')
    error.response = { data: { detail: 'db_type and host are required' } }
    throw error
  }
  return { status: 'connected', details: `Connected to ${payload.db_type}@${payload.host}` }
}

export async function listTemplates() {
  await sleep()
  return [
    { id: 'tpl_1', name: 'Invoice v1', status: 'approved', tags: ['invoice', 'v1'] },
    { id: 'tpl_2', name: 'Receipt v2', status: 'draft', tags: ['receipt'] },
  ]
}

export async function startRun(payload) {
  await sleep(800)
  return { run_id: `run_${Math.random().toString(36).slice(2, 8)}`, status: 'queued', ...payload }
}

export async function listRuns() {
  await sleep()
  return [
    { id: 'run_ab12', name: 'Batch 2024-01', status: 'complete', progress: 100 },
    { id: 'run_cd34', name: 'Batch 2024-02', status: 'failed', progress: 42 },
  ]
}

export async function health() {
  await sleep()
  return { status: 'ok' }
}
