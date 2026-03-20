/**
 * Playwright UI test: Verify key dropdown shows correct filtered values.
 * Navigates the real frontend, selects template/connection/dates, screenshots dropdown.
 */
import { chromium } from 'playwright'

const FRONTEND = 'http://localhost:9071'
const RESULTS_DIR = '/home/rohith/desktop/NeuraReport/test-results'

async function main() {
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
        const keys = data?.keys || {}
        const entries = Object.entries(keys).map(([k, v]) => `${k}=${v.length}`)
        keyApiCalls.push({ sd, ed, keys })
        console.log(`  [API] keys/options ${sd}..${ed} → ${entries.join(', ')}`)
      } catch {}
    }
  })

  // 1. Go to dashboard
  console.log('1. Loading dashboard...')
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(2000)

  // 2. Click "Run Reports" in quick actions
  console.log('2. Navigating to Reports...')
  const runReports = page.locator('text=Run Reports').first()
  if (await runReports.count() > 0) {
    await runReports.click()
  } else {
    const myReports = page.locator('a, [role="button"]').filter({ hasText: /My Reports/i }).first()
    if (await myReports.count() > 0) await myReports.click()
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-01-reports-page.png`, fullPage: true })

  // 3. Select d1fdde template
  console.log('3. Selecting d1fdde template...')
  const muiSelects = page.locator('.MuiSelect-select')
  const selectCount = await muiSelects.count()
  console.log(`   Found ${selectCount} MUI selects`)

  if (selectCount > 0) {
    await muiSelects.first().click()
    await page.waitForTimeout(500)
    // Find d1fdde option
    const options = await page.locator('[role="option"]').allTextContents()
    const d1fddeOpt = options.find(o => o.toLowerCase().includes('d1fdde') && !o.includes('d1fdde_2') && !o.includes('d1fdde-2'))
    if (d1fddeOpt) {
      await page.locator('[role="option"]').filter({ hasText: d1fddeOpt }).first().click()
      console.log(`   Selected: "${d1fddeOpt}"`)
    } else {
      // Try any d1fdde
      const anyD1 = options.find(o => o.toLowerCase().includes('d1fdde'))
      if (anyD1) {
        await page.locator('[role="option"]').filter({ hasText: anyD1 }).first().click()
        console.log(`   Selected: "${anyD1}"`)
      } else {
        console.log(`   d1fdde not found. Options: ${options.slice(0, 5).join(', ')}...`)
        await page.keyboard.press('Escape')
      }
    }
    await page.waitForTimeout(3000)
  }

  // 4. Select Recipe Log Scale2 connection
  console.log('4. Selecting connection...')
  const selects2 = page.locator('.MuiSelect-select')
  const count2 = await selects2.count()
  if (count2 >= 2) {
    await selects2.nth(1).click()
    await page.waitForTimeout(500)
    // Find Recipe Log Scale2 or recipe_log (1)
    const connOpts = await page.locator('[role="option"]').allTextContents()
    const scaleConn = connOpts.find(o => o.includes('Scale2') || o.includes('recipe_log (1)'))
    if (scaleConn) {
      await page.locator('[role="option"]').filter({ hasText: /Scale2|recipe_log \(1\)/i }).first().click()
      console.log(`   Selected: "${scaleConn.substring(0, 40)}"`)
    } else {
      console.log(`   Scale2 not found. Connections: ${connOpts.map(o => o.substring(0, 30)).join(', ')}`)
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(4000)
  }

  await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-02-template-connection.png`, fullPage: true })

  // 5. Click "Custom" date preset, then set wide date range (all data)
  console.log('5. Setting wide date range (all data)...')
  const customBtn = page.locator('button, [role="button"]').filter({ hasText: /^Custom$/i }).first()
  if (await customBtn.count() > 0) {
    await customBtn.click()
    await page.waitForTimeout(500)
  }

  const dateInputs = page.locator('input[type="date"]')
  const dateCount = await dateInputs.count()
  console.log(`   Found ${dateCount} date inputs`)

  if (dateCount >= 2) {
    await dateInputs.nth(0).fill('2025-06-01')
    await dateInputs.nth(1).fill('2025-11-09')
    console.log('   Set dates: 2025-06-01 → 2025-11-09')
  }
  await page.waitForTimeout(4000)

  // 6. Open key dropdown and capture options for wide range
  console.log('6. Opening key dropdown (wide range)...')
  const allSelects = page.locator('.MuiSelect-select')
  const totalSelects = await allSelects.count()

  let keySelectIndex = -1
  let wideOptions = []
  for (let i = totalSelects - 1; i >= 2; i--) {
    await allSelects.nth(i).click()
    await page.waitForTimeout(500)
    const opts = await page.locator('[role="option"]').allTextContents()
    // Key dropdown has recipe names, not connection/template names
    const isKeyDropdown = opts.some(o => /^[A-Z_]+$/.test(o) || o === 'All')
    if (isKeyDropdown && opts.length > 1) {
      keySelectIndex = i
      wideOptions = opts.filter(o => o !== 'All' && o.trim() !== '')
      console.log(`   Wide range: ${wideOptions.length} keys`)
      await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-03-wide-dropdown.png`, fullPage: true })
      await page.keyboard.press('Escape')
      break
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  if (keySelectIndex < 0) {
    console.log('   Could not find key dropdown')
    await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-03-no-dropdown.png`, fullPage: true })
    await browser.close()
    return
  }

  // 7. Narrow to Oct 1-5
  console.log('7. Narrowing to Oct 1-5...')
  await dateInputs.nth(0).fill('2025-10-01')
  await dateInputs.nth(1).fill('2025-10-05')
  await page.waitForTimeout(4000)

  await allSelects.nth(keySelectIndex).click()
  await page.waitForTimeout(500)
  const oct15Options = (await page.locator('[role="option"]').allTextContents()).filter(o => o !== 'All' && o.trim() !== '')
  console.log(`   Oct 1-5: ${oct15Options.length} keys → ${oct15Options.join(', ')}`)
  await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-04-oct1-5-dropdown.png`, fullPage: true })
  await page.keyboard.press('Escape')

  // 8. Narrow to Oct 3-4
  console.log('8. Narrowing to Oct 3-4...')
  await dateInputs.nth(0).fill('2025-10-03')
  await dateInputs.nth(1).fill('2025-10-04')
  await page.waitForTimeout(4000)

  await allSelects.nth(keySelectIndex).click()
  await page.waitForTimeout(500)
  const oct34Options = (await page.locator('[role="option"]').allTextContents()).filter(o => o !== 'All' && o.trim() !== '')
  console.log(`   Oct 3-4: ${oct34Options.length} keys → ${oct34Options.join(', ')}`)
  await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-05-oct3-4-dropdown.png`, fullPage: true })
  await page.keyboard.press('Escape')

  // 9. Narrow to Oct 1-2
  console.log('9. Narrowing to Oct 1-2...')
  await dateInputs.nth(0).fill('2025-10-01')
  await dateInputs.nth(1).fill('2025-10-02')
  await page.waitForTimeout(4000)

  await allSelects.nth(keySelectIndex).click()
  await page.waitForTimeout(500)
  const oct12Options = (await page.locator('[role="option"]').allTextContents()).filter(o => o !== 'All' && o.trim() !== '')
  console.log(`   Oct 1-2: ${oct12Options.length} keys → ${oct12Options.join(', ')}`)
  await page.screenshot({ path: `${RESULTS_DIR}/ui-keys-06-oct1-2-dropdown.png`, fullPage: true })
  await page.keyboard.press('Escape')

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('UI KEY FILTER VERIFICATION')
  console.log(`${'='.repeat(60)}`)
  console.log(`  Wide range:   ${wideOptions.length} keys (DB has 34)`)
  console.log(`  Oct 1-5:      ${oct15Options.length} keys (DB has 8) → ${oct15Options.join(', ')}`)
  console.log(`  Oct 3-4:      ${oct34Options.length} keys (DB has 3) → ${oct34Options.join(', ')}`)
  console.log(`  Oct 1-2:      ${oct12Options.length} keys (DB has 5) → ${oct12Options.join(', ')}`)

  const allMatch = oct15Options.length === 8 && oct34Options.length === 3 && oct12Options.length === 5
  console.log(`\n  Result: ${allMatch ? 'ALL MATCH - PASS' : 'MISMATCH - check screenshots'}`)

  console.log(`\n  API calls intercepted: ${keyApiCalls.length}`)

  await browser.close()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
