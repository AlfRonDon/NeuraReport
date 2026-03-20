/**
 * Playwright test: Upload all 10 template zips, run reports, screenshot results.
 * Usage: node test-10-templates.mjs
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import path from 'path'

const API = 'http://localhost:9070'
const FRONTEND = 'http://localhost:9071'
const RESULTS_DIR = '/home/rohith/desktop/NeuraReport/test-results'

// Connection IDs
const RECIPE_DB = 'c6e94c43-de32-48b2-9f58-e12a88e51bbd'     // recipe_log — has recipes table
const SCALE2_DB = '9d849002-8a72-460c-bf83-4ee1b2a4f576'      // recipe_log Scale2 — has neuract__Scale2
const TEST_COPY_DB = 'be2a5318-8a30-4f2c-bcc4-b2e283cb311a'   // test-Copy.db — has RUNHOURS, TEMPERATURES
const STP_DB = '73e9d384-2697-46af-96b0-f130b43cce55'         // stp.db — has FM_TABLE, ANALYSER_TABLE

// Date ranges matched to actual data in each database
const TEMPLATES = [
  {
    name: 'd1fdde',
    zip: '/home/rohith/desktop/new reports/c5598348-4d89-445e-a2f9-43a3aa6382ee-d1fdde (1).zip',
    connectionId: RECIPE_DB,        // recipes table
    startDate: '2026-02-26',
    endDate: '2026-03-04',
  },
  {
    name: 'd1fdde_2',
    zip: '/home/rohith/desktop/new reports/c5598348-4d89-445e-a2f9-43a3aa6382ee-d1fdde_2 (1).zip',
    connectionId: RECIPE_DB,
    startDate: '2026-02-26',
    endDate: '2026-03-04',
  },
  {
    name: 'af2ec4',
    zip: '/home/rohith/desktop/new reports/db3dcb43-65e5-4bb3-9740-c86bcd5d44c4-af2ec4 (1).zip',
    connectionId: RECIPE_DB,
    startDate: '2026-02-26',
    endDate: '2026-03-04',
  },
  {
    name: 'machine_runtime',
    zip: '/home/rohith/desktop/new reports/c5598348-4d89-445e-a2f9-43a3aa6382ee-machine_runtime (1).zip',
    connectionId: TEST_COPY_DB,     // neuract__RUNHOURS — Oct-Nov 2025
    startDate: '2025-10-08',
    endDate: '2025-10-10',
  },
  {
    name: 'temperature',
    zip: '/home/rohith/desktop/new reports/temperature report.zip',
    connectionId: TEST_COPY_DB,     // neuract__TEMPERATURES — Oct-Nov 2025
    startDate: '2025-10-08',
    endDate: '2025-10-10',
  },
  {
    name: 'flowmeter',
    zip: '/home/rohith/desktop/new reports/flowmeter-table-datewise.zip',
    connectionId: STP_DB,           // neuract__FM_TABLE — Feb 19-20 (closest match for Flowmeters)
    startDate: '2026-02-19',
    endDate: '2026-02-20',
    note: 'Uses FM_TABLE; neuract__Flowmeters not available — will test discovery',
  },
  {
    name: 'recipe_batch',
    zip: '/home/rohith/desktop/new reports/recipe-batch-report-da31dc-pdf.zip',
    connectionId: RECIPE_DB,
    startDate: '2026-02-26',
    endDate: '2026-03-04',
  },
  {
    name: 'scale2_batch',
    zip: '/home/rohith/desktop/new reports/scale2-batch-report-v2.zip',
    connectionId: SCALE2_DB,
    startDate: '2026-02-26',
    endDate: '2026-02-27',
  },
  {
    name: 'scale2_cons_per_batch',
    zip: '/home/rohith/desktop/new reports/scale2-consumption-per-batch.zip',
    connectionId: SCALE2_DB,
    startDate: '2026-02-26',
    endDate: '2026-02-27',
  },
  {
    name: 'scale2_cons_report',
    zip: '/home/rohith/desktop/new reports/scale2-consumption-report.zip',
    connectionId: SCALE2_DB,
    startDate: '2026-02-26',
    endDate: '2026-02-27',
  },
]

async function uploadTemplate(zipPath) {
  const zipData = readFileSync(zipPath)
  const fileName = path.basename(zipPath)
  const formData = new FormData()
  formData.append('file', new Blob([zipData]), fileName)

  const res = await fetch(`${API}/api/v1/templates/import-zip`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`)
  }
  return data
}

async function discoverReport(templateId, connectionId, startDate, endDate) {
  const res = await fetch(`${API}/api/v1/reports/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId, connection_id: connectionId, start_date: startDate, end_date: endDate }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function runReport(templateId, connectionId, startDate, endDate) {
  const res = await fetch(`${API}/api/v1/reports/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId, connection_id: connectionId, start_date: startDate, end_date: endDate }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function main() {
  const results = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })

  for (const tpl of TEMPLATES) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`TESTING: ${tpl.name}`)
    if (tpl.note) console.log(`  NOTE: ${tpl.note}`)
    console.log(`${'='.repeat(60)}`)

    const result = { name: tpl.name, upload: null, discover: null, run: null, error: null }

    try {
      // 1. Upload
      console.log(`  Uploading ${path.basename(tpl.zip)}...`)
      const uploadData = await uploadTemplate(tpl.zip)
      const templateId = uploadData.template_id || uploadData.id
      result.upload = { ok: true, templateId }
      console.log(`  OK Uploaded as: ${templateId}`)

      // 2. Discover
      console.log(`  Discovering (${tpl.startDate} -> ${tpl.endDate})...`)
      const disc = await discoverReport(templateId, tpl.connectionId, tpl.startDate, tpl.endDate)
      const batchCount = disc.data?.batches_count ?? disc.data?.batches?.length ?? 0
      const rowsTotal = disc.data?.rows_total ?? 0
      result.discover = { ok: disc.status === 200, batchCount, rowsTotal, status: disc.status }
      if (disc.status === 200) {
        console.log(`  OK Discovery: ${batchCount} batches, ${rowsTotal} rows`)
      } else {
        const errDetail = disc.data?.detail?.message || disc.data?.detail || ''
        console.log(`  WARN Discovery failed (${disc.status}): ${String(errDetail).slice(0, 120)}`)
      }

      // 3. Run report
      console.log(`  Running report...`)
      const run = await runReport(templateId, tpl.connectionId, tpl.startDate, tpl.endDate)
      result.run = { ok: run.status === 200, status: run.status }

      if (run.status === 200 && run.data?.html_url) {
        console.log(`  OK Report: ${run.data.html_url}`)

        // 4. Screenshot
        const page = await context.newPage()
        await page.goto(`${API}${run.data.html_url}`, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(1000)
        const ssPath = `${RESULTS_DIR}/${tpl.name}-report.png`
        await page.screenshot({ path: ssPath, fullPage: true })
        console.log(`  OK Screenshot: ${ssPath}`)
        result.screenshot = ssPath
        await page.close()
      } else {
        const errMsg = run.data?.detail?.message || run.data?.detail || JSON.stringify(run.data).slice(0, 200)
        console.log(`  FAIL Report (${run.status}): ${errMsg}`)
        result.error = String(errMsg).slice(0, 200)
      }
    } catch (err) {
      console.log(`  FAIL ERROR: ${err.message}`)
      result.error = err.message
    }

    results.push(result)
  }

  // Frontend screenshot
  try {
    const page = await context.newPage()
    await page.goto(`${FRONTEND}/reports`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${RESULTS_DIR}/frontend-reports-page.png`, fullPage: true })
    console.log(`\nOK Frontend screenshot saved`)
    await page.close()
  } catch (err) {
    console.log(`\nFAIL Frontend screenshot: ${err.message}`)
  }

  await browser.close()

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('SUMMARY')
  console.log(`${'='.repeat(60)}`)
  for (const r of results) {
    const icon = r.run?.ok ? 'PASS' : 'FAIL'
    const batches = r.discover?.batchCount ?? '?'
    const rows = r.discover?.rowsTotal ?? '?'
    const detail = r.error ? ` -- ${r.error.slice(0, 80)}` : ''
    console.log(`  ${icon}  ${r.name.padEnd(25)} batches=${String(batches).padEnd(5)} rows=${rows}${detail}`)
  }

  const passed = results.filter(r => r.run?.ok).length
  const failed = results.filter(r => !r.run?.ok).length
  console.log(`\n  ${passed} passed, ${failed} failed out of ${results.length}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
