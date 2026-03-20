import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:9071';
const SCREENSHOT_DIR = '/home/rohith/desktop/NeuraReport/screenshots/qa3';

const pages = [
  { path: '/', name: 'home', waitFor: 2000 },
  { path: '/connections', name: 'connections', waitFor: 2000 },
  { path: '/templates', name: 'templates', waitFor: 2000 },
  { path: '/generate', name: 'generate', waitFor: 2000 },
  { path: '/reports', name: 'reports', waitFor: 2000 },
  { path: '/history', name: 'history', waitFor: 2000 },
  { path: '/jobs', name: 'jobs', waitFor: 2000 },
  { path: '/schedules', name: 'schedules', waitFor: 2000 },
  { path: '/query', name: 'query', waitFor: 2000 },
  { path: '/documents', name: 'documents', waitFor: 2000 },
  { path: '/spreadsheets', name: 'spreadsheets', waitFor: 2000 },
  { path: '/dashboard-builder', name: 'dashboard-builder', waitFor: 2000 },
  { path: '/workflows', name: 'workflows', waitFor: 2000 },
  { path: '/agents', name: 'agents', waitFor: 2000 },
  { path: '/visualization', name: 'visualization', waitFor: 2000 },
  { path: '/analyze', name: 'analyze', waitFor: 2000 },
  { path: '/activity', name: 'activity', waitFor: 2000 },
  { path: '/stats', name: 'stats', waitFor: 2000 },
  { path: '/ops', name: 'ops', waitFor: 2000 },
  { path: '/knowledge', name: 'knowledge', waitFor: 2000 },
  { path: '/design', name: 'design', waitFor: 2000 },
  { path: '/settings', name: 'settings', waitFor: 2000 },
  { path: '/search', name: 'search', waitFor: 2000 },
  { path: '/docqa', name: 'docqa', waitFor: 2000 },
  { path: '/logger', name: 'logger', waitFor: 2000 },
  { path: '/connectors', name: 'connectors', waitFor: 2000 },
  { path: '/widgets', name: 'widgets', waitFor: 2000 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const results = [];
  const errors = [];

  for (const pg of pages) {
    const page = await context.newPage();
    const url = `${BASE_URL}${pg.path}`;
    try {
      // Capture console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Navigate
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => null);
      await page.waitForTimeout(pg.waitFor);

      const status = response ? response.status() : 'timeout';

      // Get page title and visible text content
      const title = await page.title();
      const bodyText = await page.evaluate(() => {
        const body = document.querySelector('#root') || document.body;
        return body?.innerText?.substring(0, 500) || '';
      });

      // Check for error states
      const hasError = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return text.includes('Something went wrong') ||
               text.includes('Error') ||
               text.includes('404') ||
               text.includes('Cannot read') ||
               text.includes('undefined');
      });

      // Check for loading state stuck
      const isLoading = await page.evaluate(() => {
        const spinners = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"], [role="progressbar"]');
        return spinners.length > 3; // More than 3 loading indicators = stuck
      });

      // Count visible elements
      const elementCount = await page.evaluate(() => {
        return document.querySelectorAll('button, input, table, [class*="card"], [class*="Card"]').length;
      });

      // Screenshot
      const screenshotPath = `${SCREENSHOT_DIR}/${pg.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const result = {
        page: pg.name,
        status,
        title,
        hasError,
        isLoading,
        elementCount,
        consoleErrors: consoleErrors.length,
        bodyPreview: bodyText.substring(0, 150).replace(/\n/g, ' '),
      };
      results.push(result);

      const flag = hasError ? ' ⚠️ ERROR' : isLoading ? ' ⏳ LOADING' : ' ✓';
      console.log(`${pg.name}: HTTP ${status}, ${elementCount} elements${flag}`);
      if (consoleErrors.length > 0) {
        console.log(`  Console errors: ${consoleErrors.slice(0, 2).join('; ')}`);
      }
    } catch (err) {
      console.log(`${pg.name}: EXCEPTION - ${err.message}`);
      errors.push({ page: pg.name, error: err.message });
    }
    await page.close();
  }

  // Write summary
  writeFileSync(`${SCREENSHOT_DIR}/qa3_results.json`, JSON.stringify({ results, errors }, null, 2));

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total: ${results.length} pages`);
  console.log(`Errors: ${results.filter(r => r.hasError).length}`);
  console.log(`Loading stuck: ${results.filter(r => r.isLoading).length}`);
  console.log(`Console errors: ${results.filter(r => r.consoleErrors > 0).length}`);

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
