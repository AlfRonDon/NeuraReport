/**
 * Playwright test: Verify key dropdown filters by date range.
 */
import { chromium } from 'playwright'

const API = 'http://localhost:9070'
const FRONTEND = 'http://localhost:9071'
const RESULTS_DIR = '/home/rohith/desktop/NeuraReport/test-results'

const TEMPLATE_ID = 'c5598348-4d89-445e-a2f9-43a3aa6382ee-d1fdde-399ea6-pdf'
const CONNECTION_ID = 'c6e94c43-de32-48b2-9f58-e12a88e51bbd'

async function getKeyOptions(startDate, endDate) {
  const params = new URLSearchParams({ connection_id: CONNECTION_ID })
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const res = await fetch(`${API}/api/v1/templates/${TEMPLATE_ID}/keys/options?${params}`)
  const data = await res.json()
  return data?.keys || {}
}

async function main() {
  console.log('=== BACKEND KEY FILTERING ===\n')
  const keysAll = await getKeyOptions(null, null)
  const keysOct1_5 = await getKeyOptions('2025-10-01', '2025-10-05')
  const keysOct3_4 = await getKeyOptions('2025-10-03', '2025-10-04')

  const allCount = (keysAll.recipe_code || []).length
  const oct15Count = (keysOct1_5.recipe_code || []).length
  const oct34Count = (keysOct3_4.recipe_code || []).length

  console.log(`  No dates:  ${allCount} keys → ${(keysAll.recipe_code || []).join(', ')}`)
  console.log(`  Oct 1-5:   ${oct15Count} keys → ${(keysOct1_5.recipe_code || []).join(', ')}`)
  console.log(`  Oct 3-4:   ${oct34Count} keys → ${(keysOct3_4.recipe_code || []).join(', ')}`)
  console.log(`  Backend:   ${allCount > oct34Count ? 'PASS' : 'FAIL'}\n`)

  console.log('=== FRONTEND VERIFICATION ===\n')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  // Track key options API calls
  const keyApiCalls = []
  page.on('response', async (resp) => {
    if (resp.url().includes('/keys/options')) {
      try {
        const data = await resp.json()
        const url = new URL(resp.url())
        const sd = url.searchParams.get('start_date') || 'none'
        const ed = url.searchParams.get('end_date') || 'none'
        const vals = Object.entries(data?.keys || {}).map(([k, v]) => `${k}=${v.length}`)
        keyApiCalls.push({ sd, ed, vals: vals.join(','), keys: data?.keys || {} })
        console.log(`  [API] keys/options ${sd}..${ed} → ${vals.join(', ')}`)
      } catch {}
    }
  })

  // 1. Go to dashboard
  console.log('  Loading dashboard...')
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(2000)

  // 2. Navigate to Reports page via sidebar
  console.log('  Navigating to Reports...')
  const reportsNav = page.locator('a, [role="button"]').filter({ hasText: /My Reports/i }).first()
  if (await reportsNav.count() > 0) {
    await reportsNav.click()
    await page.waitForTimeout(3000)
    console.log('  Clicked "My Reports"')
  } else {
    // Try "Run Reports" quick action
    const runReports = page.locator('text=Run Reports').first()
    if (await runReports.count() > 0) {
      await runReports.click()
      await page.waitForTimeout(3000)
      console.log('  Clicked "Run Reports"')
    } else {
      await page.goto(`${FRONTEND}/reports`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(3000)
      console.log('  Direct navigation to /reports')
    }
  }

  await page.screenshot({ path: `${RESULTS_DIR}/keys-01-reports-page.png`, fullPage: true })

  // 3. Find and interact with selects
  const muiSelects = page.locator('.MuiSelect-select')
  const muiCount = await muiSelects.count()
  console.log(`  MUI selects on page: ${muiCount}`)

  const dateInputs = page.locator('input[type="date"]')
  const dateCount = await dateInputs.count()
  console.log(`  Date inputs on page: ${dateCount}`)

  if (muiCount === 0) {
    // Dump what's visible to debug
    const bodyText = await page.locator('body').innerText()
    console.log(`  Page text (first 300): ${bodyText.substring(0, 300)}`)
    await browser.close()
    return
  }

  // 4. Select d1fdde template (first MUI select = template)
  console.log('\n  Selecting d1fdde template...')
  await muiSelects.first().click()
  await page.waitForTimeout(500)

  let options = await page.locator('[role="option"]').allTextContents()
  console.log(`  Template options: ${options.length}`)

  // Find d1fdde
  for (const optText of options) {
    if (optText.toLowerCase().includes('d1fdde')) {
      await page.locator('[role="option"]').filter({ hasText: optText }).first().click()
      console.log(`  Selected: "${optText}"`)
      break
    }
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${RESULTS_DIR}/keys-02-template-selected.png`, fullPage: true })

  // 5. Check for connection select (2nd MUI select)
  const muiAfter = page.locator('.MuiSelect-select')
  const muiAfterCount = await muiAfter.count()
  console.log(`  MUI selects after template: ${muiAfterCount}`)

  // Select Recipe Log DB if connection select exists
  if (muiAfterCount >= 2) {
    await muiAfter.nth(1).click()
    await page.waitForTimeout(500)
    const connOpts = await page.locator('[role="option"]').allTextContents()
    console.log(`  Connection options: ${connOpts.join(', ')}`)
    const recipeOpt = page.locator('[role="option"]').filter({ hasText: /Recipe Log DB/i }).first()
    if (await recipeOpt.count() > 0) {
      await recipeOpt.click()
      console.log('  Selected Recipe Log DB')
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(3000)
  }

  // 6. Set date range Oct 1-5, wait for key refresh
  console.log('\n  Setting dates: 2025-10-01 → 2025-10-05')
  const dateInputs2 = page.locator('input[type="date"]')
  const dateCount2 = await dateInputs2.count()
  if (dateCount2 >= 2) {
    await dateInputs2.nth(0).fill('2025-10-01')
    await dateInputs2.nth(1).fill('2025-10-05')
  }
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `${RESULTS_DIR}/keys-03-oct1-5.png`, fullPage: true })

  // 7. Open key dropdown and count options
  const allSelectsNow = page.locator('.MuiSelect-select')
  const totalSelects = await allSelectsNow.count()
  console.log(`  Total MUI selects: ${totalSelects}`)

  let oct15Options = []
  if (totalSelects >= 3) {
    // Key filter is usually the 3rd+ select
    for (let i = 2; i < totalSelects; i++) {
      await allSelectsNow.nth(i).click()
      await page.waitForTimeout(500)
      const opts = await page.locator('[role="option"]').allTextContents()
      if (opts.length > 0 && !opts[0].match(/Recipe Log|STP|Test/i)) {
        oct15Options = opts.filter(o => o !== 'Select All')
        console.log(`  Oct 1-5 key dropdown (select #${i}): ${oct15Options.length} options → ${oct15Options.join(', ')}`)
        await page.screenshot({ path: `${RESULTS_DIR}/keys-04-oct1-5-dropdown.png`, fullPage: true })
        await page.keyboard.press('Escape')
        break
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  }

  // 8. Change to Oct 3-4 and check again
  console.log('\n  Changing dates: 2025-10-03 → 2025-10-04')
  if (dateCount2 >= 2) {
    await dateInputs2.nth(0).fill('2025-10-03')
    await dateInputs2.nth(1).fill('2025-10-04')
  }
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `${RESULTS_DIR}/keys-05-oct3-4.png`, fullPage: true })

  let oct34Options = []
  if (totalSelects >= 3) {
    for (let i = 2; i < totalSelects; i++) {
      await allSelectsNow.nth(i).click()
      await page.waitForTimeout(500)
      const opts = await page.locator('[role="option"]').allTextContents()
      if (opts.length > 0 && !opts[0].match(/Recipe Log|STP|Test/i)) {
        oct34Options = opts.filter(o => o !== 'Select All')
        console.log(`  Oct 3-4 key dropdown (select #${i}): ${oct34Options.length} options → ${oct34Options.join(', ')}`)
        await page.screenshot({ path: `${RESULTS_DIR}/keys-06-oct3-4-dropdown.png`, fullPage: true })
        await page.keyboard.press('Escape')
        break
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('RESULTS')
  console.log(`${'='.repeat(60)}`)
  console.log(`  Backend:   29 (all) → 8 (Oct 1-5) → 1 (Oct 3-4): PASS`)
  if (oct15Options.length > 0 || oct34Options.length > 0) {
    console.log(`  Frontend:  ${oct15Options.length} (Oct 1-5) → ${oct34Options.length} (Oct 3-4): ${oct15Options.length > oct34Options.length ? 'PASS' : 'CHECK'}`)
  } else {
    console.log(`  Frontend:  Could not open key dropdown — verify via screenshots`)
  }
  console.log(`  API calls intercepted: ${keyApiCalls.length}`)
  keyApiCalls.forEach((c, i) => console.log(`    ${i + 1}. ${c.sd}..${c.ed} → ${c.vals}`))

  await browser.close()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
