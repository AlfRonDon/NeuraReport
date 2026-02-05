/**
 * BrowserAgent — Playwright-based browser controller.
 *
 * This is the "hands" of the AI test agent. It can:
 * - Take screenshots and observe the current page state
 * - Click buttons, type into fields, select dropdown options
 * - Navigate to URLs, scroll the page
 * - Capture network traffic (API calls to the backend)
 * - Upload files
 *
 * The BrowserAgent does NOT decide what to do — that's the AgentBrain's job.
 * This class simply executes actions and reports observations.
 */
import { type Page, type Response, type Request } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import type {
  AgentAction,
  PageObservation,
  InteractiveElement,
  ApiCallRecord,
  ActionTarget,
} from './types'

// Pattern borrowed from semantic audit: comprehensive API route matching
const API_ROUTE_PATTERN = /\/(api|connections|templates|reports|jobs|schedules|analyze|enrichment|federation|synthesis|docqa|documents|spreadsheets|dashboards|connectors|workflows|export|design|knowledge|ingestion|search|visualization|agents|nl2sql|charts|summary|recommendations|docai|ai)\b/

export class BrowserAgent {
  private page: Page
  private apiCalls: ApiCallRecord[] = []
  private requestBodies: Map<string, string> = new Map() // track request bodies for semantic verification
  private evidenceDir: string
  private screenshotCount = 0

  constructor(page: Page, evidenceDir: string) {
    this.page = page
    this.evidenceDir = evidenceDir
    fs.mkdirSync(path.join(evidenceDir, 'screenshots'), { recursive: true })
    fs.mkdirSync(path.join(evidenceDir, 'network'), { recursive: true })
    this.setupNetworkCapture()
  }

  /**
   * Attach request+response listeners to capture API calls.
   * Enhanced from semantic audit: captures request bodies and uses comprehensive route matching.
   */
  private setupNetworkCapture() {
    // Capture request bodies (from semantic audit pattern)
    this.page.on('request', (request: Request) => {
      const url = request.url()
      if (!url.includes('/api/') && !API_ROUTE_PATTERN.test(url)) return
      const postData = request.postData()
      if (postData) {
        this.requestBodies.set(`${request.method()}:${url}`, postData.slice(0, 1000))
      }
    })

    this.page.on('response', async (response: Response) => {
      const url = response.url()
      // Match API calls using comprehensive pattern (from semantic audit)
      if (!url.includes('/api/') && !API_ROUTE_PATTERN.test(url)) return
      const request = response.request()
      let responsePreview = ''
      try {
        const contentType = response.headers()['content-type'] || ''
        if (contentType.includes('json')) {
          const body = await response.json().catch(() => null)
          responsePreview = JSON.stringify(body).slice(0, 500)
        } else {
          responsePreview = (await response.text().catch(() => '')).slice(0, 500)
        }
      } catch { /* streaming or binary */ }

      const reqKey = `${request.method()}:${url}`
      this.apiCalls.push({
        method: request.method(),
        url: url,
        status: response.status(),
        responseTime: 0,
        responsePreview,
        requestBody: this.requestBodies.get(reqKey),
      })
      this.requestBodies.delete(reqKey)
    })
  }

  /** Take a screenshot and save it as evidence */
  async takeScreenshot(label?: string): Promise<string> {
    this.screenshotCount++
    const filename = `${String(this.screenshotCount).padStart(3, '0')}-${label || 'step'}.png`
    const filepath = path.join(this.evidenceDir, 'screenshots', filename)
    try {
      await this.page.screenshot({ path: filepath, fullPage: false })
    } catch {
      // Screenshot can fail if page is navigating or crashed — non-fatal
      console.warn(`[BrowserAgent] Screenshot failed: ${label}`)
    }
    return filepath
  }

  /** Take a screenshot and return as base64 for LLM vision */
  async getScreenshotBase64(): Promise<string> {
    try {
      const buffer = await this.page.screenshot({ fullPage: false })
      return buffer.toString('base64')
    } catch {
      return '' // return empty if screenshot fails
    }
  }

  /** Observe the current page state — this is what the LLM "sees" */
  async observe(): Promise<PageObservation> {
    const url = this.page.url()
    const title = await this.page.title()

    // Get interactive elements on page
    const interactiveElements = await this.getInteractiveElements()

    // Get visible toasts/alerts
    const toasts = await this.getToasts()

    // Get visible errors
    const errors = await this.getErrors()

    // Get page heading
    const heading = await this.getHeading()

    // Get recent API calls and reset
    const recentApiCalls = [...this.apiCalls]
    this.apiCalls = []

    // Get screenshot as base64 for LLM
    const screenshot = await this.getScreenshotBase64()

    // Semantic hints from API activity (from semantic audit's SemanticVerifier pattern)
    // This tells the LLM brain about backend behavior it can't see from the UI
    const semanticHints: string[] = []
    for (const call of recentApiCalls) {
      if (call.status >= 400) {
        semanticHints.push(`Backend error: ${call.method} ${call.url} → ${call.status}`)
      }
      if (call.method === 'POST' && call.status < 300 && call.responsePreview) {
        try {
          const resp = JSON.parse(call.responsePreview)
          if (resp.id || resp.connection_id || resp.template_id || resp.job_id) {
            semanticHints.push(`Resource created: ID=${resp.id || resp.connection_id || resp.template_id || resp.job_id}`)
          }
        } catch { /* not JSON */ }
      }
    }

    return {
      url,
      title,
      interactiveElements,
      toasts,
      screenshot,
      recentApiCalls,
      errors,
      heading,
      semanticHints,
    }
  }

  /**
   * Get all interactive elements currently visible on the page.
   * Enhanced with MUI-aware disabled detection (from semantic audit).
   * Cap raised to 80 elements for better coverage.
   */
  private async getInteractiveElements(): Promise<InteractiveElement[]> {
    return this.page.evaluate(() => {
      const elements: Array<{
        role: string
        name: string
        type?: string
        value?: string
        disabled?: boolean
        location?: string
        testId?: string
      }> = []

      // MUI-aware disabled detection (from semantic audit)
      function isDisabled(el: HTMLElement): boolean {
        return (el as any).disabled === true
          || el.getAttribute('aria-disabled') === 'true'
          || el.classList.contains('Mui-disabled')
          || (el.closest('button') as HTMLButtonElement)?.disabled === true
          || el.closest('.Mui-disabled') !== null
      }

      // Buttons (including icon buttons, MUI buttons)
      document.querySelectorAll('button, [role="button"], .MuiIconButton-root, .MuiButton-root').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return // not visible
        const htmlEl = el as HTMLElement
        const name = htmlEl.textContent?.trim().slice(0, 80)
          || htmlEl.getAttribute('aria-label')
          || htmlEl.getAttribute('title')
          || ''
        // Skip notification buttons (known to cause hangs)
        if (name.toLowerCase().includes('notification')) return
        elements.push({
          role: 'button',
          name,
          disabled: isDisabled(htmlEl),
          testId: htmlEl.dataset.testid || undefined,
          location: `${Math.round(htmlEl.getBoundingClientRect().top)}px from top`,
        })
      })

      // Text inputs (including MUI TextFields)
      document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="number"], textarea, .MuiInputBase-input').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLInputElement
        const label = htmlEl.getAttribute('aria-label')
          || document.querySelector(`label[for="${htmlEl.id}"]`)?.textContent?.trim()
          || htmlEl.placeholder
          || htmlEl.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim()
          || ''
        elements.push({
          role: 'textbox',
          name: label.slice(0, 80),
          type: htmlEl.type,
          value: htmlEl.value?.slice(0, 50),
          disabled: isDisabled(htmlEl),
          testId: htmlEl.dataset.testid || undefined,
        })
      })

      // Select/combobox (MUI Select, Autocomplete)
      document.querySelectorAll('[role="combobox"], select, .MuiSelect-select').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLElement
        elements.push({
          role: 'combobox',
          name: htmlEl.getAttribute('aria-label')
            || htmlEl.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim()
            || htmlEl.textContent?.trim().slice(0, 80)
            || '',
          disabled: isDisabled(htmlEl),
          testId: htmlEl.dataset.testid || undefined,
        })
      })

      // Links
      document.querySelectorAll('a[href]').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLAnchorElement
        elements.push({
          role: 'link',
          name: htmlEl.textContent?.trim().slice(0, 80) || htmlEl.getAttribute('aria-label') || '',
        })
      })

      // Tabs (MUI Tabs)
      document.querySelectorAll('[role="tab"], .MuiTab-root').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLElement
        elements.push({
          role: 'tab',
          name: htmlEl.textContent?.trim().slice(0, 80) || htmlEl.getAttribute('aria-label') || '',
        })
      })

      // Checkboxes & Switches (MUI)
      document.querySelectorAll('input[type="checkbox"], [role="checkbox"], .MuiSwitch-root input, [role="switch"]').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLElement
        elements.push({
          role: 'checkbox',
          name: htmlEl.getAttribute('aria-label')
            || htmlEl.closest('.MuiFormControlLabel-root')?.textContent?.trim().slice(0, 80)
            || '',
          value: (el as HTMLInputElement).checked ? 'checked' : 'unchecked',
        })
      })

      // Table sort headers (from semantic audit — these are clickable but client-side only)
      document.querySelectorAll('th[role="columnheader"], .MuiTableSortLabel-root').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLElement
        elements.push({
          role: 'columnheader',
          name: htmlEl.textContent?.trim().slice(0, 80) || '',
        })
      })

      // Menus/menu items (MUI)
      document.querySelectorAll('[role="menuitem"], .MuiMenuItem-root').forEach((el) => {
        if (!(el as HTMLElement).offsetParent) return
        const htmlEl = el as HTMLElement
        elements.push({
          role: 'menuitem',
          name: htmlEl.textContent?.trim().slice(0, 80) || '',
        })
      })

      return elements.slice(0, 80) // cap raised from 50 to 80 for comprehensive coverage
    })
  }

  /** Get visible toast/snackbar messages */
  private async getToasts(): Promise<string[]> {
    return this.page.evaluate(() => {
      const toasts: string[] = []
      // MUI Snackbar
      document.querySelectorAll('.MuiSnackbar-root, [role="alert"], .MuiAlert-root').forEach((el) => {
        const text = (el as HTMLElement).textContent?.trim()
        if (text) toasts.push(text.slice(0, 200))
      })
      return toasts
    })
  }

  /** Get visible error messages */
  private async getErrors(): Promise<string[]> {
    return this.page.evaluate(() => {
      const errors: string[] = []
      document.querySelectorAll('.MuiFormHelperText-root.Mui-error, .MuiAlert-standardError, [role="alert"]').forEach((el) => {
        const text = (el as HTMLElement).textContent?.trim()
        if (text) errors.push(text.slice(0, 200))
      })
      return errors
    })
  }

  /** Get the main page heading */
  private async getHeading(): Promise<string | undefined> {
    return this.page.evaluate(() => {
      const h = document.querySelector('h1, h2, [role="heading"]')
      return h?.textContent?.trim().slice(0, 100) || undefined
    })
  }

  // ─── Action execution ──────────────────────────────────────────────

  /** Execute an action decided by the AgentBrain */
  async execute(action: AgentAction): Promise<{ success: boolean; error?: string }> {
    try {
      switch (action.type) {
        case 'click':
          return await this.executeClick(action)
        case 'type':
          return await this.executeType(action)
        case 'navigate':
          return await this.executeNavigate(action)
        case 'scroll':
          return await this.executeScroll(action)
        case 'select':
          return await this.executeSelect(action)
        case 'upload':
          return await this.executeUpload(action)
        case 'wait':
          return await this.executeWait(action)
        case 'screenshot':
          await this.takeScreenshot(action.reasoning.replace(/\s+/g, '-').slice(0, 40))
          return { success: true }
        case 'done':
          return { success: true }
        default:
          return { success: false, error: `Unknown action type: ${action.type}` }
      }
    } catch (err: any) {
      return { success: false, error: err.message?.slice(0, 300) }
    }
  }

  private resolveLocator(target?: ActionTarget) {
    if (!target) throw new Error('No target specified for action')

    if (target.role && target.name) {
      return this.page.getByRole(target.role as any, { name: target.name })
    }
    if (target.label) {
      return this.page.getByLabel(target.label)
    }
    if (target.testId) {
      return this.page.getByTestId(target.testId)
    }
    if (target.text) {
      return this.page.getByText(target.text).first()
    }
    if (target.css) {
      return this.page.locator(target.css)
    }
    throw new Error('No valid selector in target')
  }

  /**
   * Execute click with multi-strategy fallback (from semantic audit):
   * 1. Scroll into view
   * 2. Regular click
   * 3. Force click (bypasses actionability checks)
   * 4. Dismiss any opened popovers/modals after click
   */
  private async executeClick(action: AgentAction) {
    const locator = this.resolveLocator(action.target)

    // Step 1: Scroll into view
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 3000 })
    } catch { /* fixed/sticky elements — continue */ }

    // Step 2: Try regular click
    try {
      await locator.click({ timeout: 10_000 })
    } catch {
      // Step 3: Force click as fallback
      await locator.click({ force: true, timeout: 8_000 })
    }

    await this.page.waitForTimeout(500) // let UI settle
    return { success: true }
  }

  private async executeType(action: AgentAction) {
    if (!action.value) return { success: false, error: 'No value to type' }

    if (action.target?.label) {
      const field = this.page.getByLabel(action.target.label)
      await field.fill(action.value, { timeout: 10_000 })
    } else {
      const locator = this.resolveLocator(action.target)
      await locator.fill(action.value, { timeout: 10_000 })
    }
    return { success: true }
  }

  /**
   * Navigate with retry on timeout/connection refused (from semantic audit).
   */
  private async executeNavigate(action: AgentAction) {
    if (!action.url) return { success: false, error: 'No URL to navigate to' }
    let retries = 3
    while (retries > 0) {
      try {
        await this.page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await this.page.waitForTimeout(1000)
        return { success: true }
      } catch (err: any) {
        retries--
        const isRetryable = err.message?.includes('Timeout') || err.message?.includes('ERR_CONNECTION_REFUSED')
        if (retries === 0 || !isRetryable) throw err
        const waitTime = err.message?.includes('ERR_CONNECTION_REFUSED') ? 15000 : 3000
        await this.page.waitForTimeout(waitTime)
      }
    }
    return { success: true }
  }

  private async executeScroll(action: AgentAction) {
    const amount = action.amount || 300
    const direction = action.direction === 'up' ? -amount : amount
    await this.page.mouse.wheel(0, direction)
    await this.page.waitForTimeout(300)
    return { success: true }
  }

  private async executeSelect(action: AgentAction) {
    if (!action.value) return { success: false, error: 'No option value to select' }
    // MUI Select: click combobox, wait for options, click option
    const locator = this.resolveLocator(action.target)
    await locator.click({ timeout: 10_000 })
    await this.page.waitForTimeout(300)
    // Wait for options dropdown
    await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: 10_000 })
    await this.page.getByRole('option', { name: action.value }).first().click()
    await this.page.waitForTimeout(300)
    return { success: true }
  }

  private async executeUpload(action: AgentAction) {
    if (!action.value) return { success: false, error: 'No file path to upload' }
    const locator = this.resolveLocator(action.target)
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      locator.click(),
    ])
    await fileChooser.setFiles(action.value)
    await this.page.waitForTimeout(1000)
    return { success: true }
  }

  private async executeWait(action: AgentAction) {
    if (action.waitFor) {
      // Wait for text to appear
      await this.page.getByText(action.waitFor).first().waitFor({
        state: 'visible',
        timeout: 30_000,
      })
    } else {
      // Default wait
      await this.page.waitForTimeout(2000)
    }
    return { success: true }
  }

  /** Run a verification check */
  async verify(assertion: AgentAction['assertion']): Promise<{ passed: boolean; actual?: string }> {
    if (!assertion) return { passed: false, actual: 'No assertion provided' }

    try {
      switch (assertion.check) {
        case 'visible': {
          const loc = assertion.target ? this.resolveLocator(assertion.target) : null
          if (!loc) return { passed: false, actual: 'No target for visibility check' }
          const isVisible = await loc.isVisible()
          return { passed: isVisible, actual: String(isVisible) }
        }
        case 'text_contains': {
          const pageText = await this.page.textContent('body') || ''
          const contains = pageText.includes(assertion.expected as string || '')
          return { passed: contains, actual: contains ? 'found' : 'not found' }
        }
        case 'url_contains': {
          const url = this.page.url()
          const contains = url.includes(assertion.expected as string || '')
          return { passed: contains, actual: url }
        }
        case 'toast_message': {
          const toasts = await this.getToasts()
          const found = toasts.some(t => t.toLowerCase().includes((assertion.expected as string || '').toLowerCase()))
          return { passed: found, actual: toasts.join('; ') || 'no toasts' }
        }
        case 'api_response': {
          // Check most recent API call
          const lastCall = this.apiCalls[this.apiCalls.length - 1]
          if (!lastCall) return { passed: false, actual: 'no API calls captured' }
          return { passed: lastCall.status < 400, actual: `${lastCall.method} ${lastCall.url} → ${lastCall.status}` }
        }
        default:
          return { passed: false, actual: `Unknown check type: ${assertion.check}` }
      }
    } catch (err: any) {
      return { passed: false, actual: err.message }
    }
  }

  /** Make a direct API call (bypassing the browser) */
  async apiCall(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<{ status: number; data: unknown }> {
    const baseUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8001'
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`
    const apiKey = process.env.API_KEY || 'dev'

    const response = await this.page.request.fetch(url, {
      method,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      timeout: 30_000,
    })

    let data: unknown
    try {
      data = await response.json()
    } catch {
      data = await response.text()
    }
    return { status: response.status(), data }
  }

  /** Save the network capture log */
  async saveNetworkLog(scenarioId: string) {
    const logPath = path.join(this.evidenceDir, 'network', `${scenarioId}-network.json`)
    fs.writeFileSync(logPath, JSON.stringify(this.apiCalls, null, 2))
    return logPath
  }
}
