/**
 * Type definitions for the AI Test Agent system.
 *
 * The AI agent acts like ChatGPT agent mode / Claude computer-use —
 * it sees the browser, decides what to click/type, and autonomously
 * tests the application like a human test engineer would.
 */

// ─── Action types the LLM can decide to perform ───────────────────────

export type AgentActionType =
  | 'click'
  | 'type'
  | 'navigate'
  | 'scroll'
  | 'select'       // MUI select dropdown
  | 'upload'       // file upload
  | 'wait'         // wait for condition
  | 'verify'       // assert something about the page
  | 'api_call'     // call backend API directly
  | 'screenshot'   // take a screenshot for evidence
  | 'done'         // scenario complete

export interface AgentAction {
  type: AgentActionType
  /** Human-readable description of why the agent is doing this */
  reasoning: string
  /** Selector or target — role-based preferred: { role: 'button', name: 'Submit' } */
  target?: ActionTarget
  /** Value to type or select */
  value?: string
  /** URL for navigate or API call */
  url?: string
  /** HTTP method for api_call */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** Body for api_call */
  body?: Record<string, unknown>
  /** Condition to wait for */
  waitFor?: string
  /** Assertion for verify */
  assertion?: VerifyAssertion
  /** Scroll direction */
  direction?: 'up' | 'down'
  /** Scroll amount in pixels */
  amount?: number
}

export interface ActionTarget {
  /** Playwright role selector */
  role?: string
  /** Accessible name */
  name?: string
  /** data-testid */
  testId?: string
  /** CSS selector as fallback */
  css?: string
  /** Text content to find */
  text?: string
  /** Label for form fields */
  label?: string
}

export interface VerifyAssertion {
  /** What to check */
  check: 'visible' | 'hidden' | 'text_contains' | 'text_equals' | 'count' | 'api_response' | 'page_title' | 'url_contains' | 'toast_message'
  /** Target element (optional - some checks are page-level) */
  target?: ActionTarget
  /** Expected value */
  expected?: string | number
  /** Tolerance for numeric checks */
  tolerance?: number
}

// ─── Agent observation of the page state ─────────────────────────────

export interface PageObservation {
  /** Current URL */
  url: string
  /** Page title */
  title: string
  /** Simplified DOM summary - interactive elements visible on page */
  interactiveElements: InteractiveElement[]
  /** Any visible toasts/alerts */
  toasts: string[]
  /** Screenshot (base64 encoded) */
  screenshot?: string
  /** Network calls since last observation */
  recentApiCalls: ApiCallRecord[]
  /** Any error messages visible on page */
  errors: string[]
  /** Current page heading */
  heading?: string
  /** Semantic hints inferred from backend activity (resource IDs, errors, etc.) */
  semanticHints?: string[]
}

export interface InteractiveElement {
  role: string
  name: string
  type?: string
  value?: string
  disabled?: boolean
  /** Visual location hint */
  location?: string
  testId?: string
}

export interface ApiCallRecord {
  method: string
  url: string
  status: number
  responseTime: number
  /** Truncated response body (first 500 chars) */
  responsePreview?: string
  /** Truncated request body (first 1000 chars) — for semantic verification */
  requestBody?: string
}

// ─── Test scenario definition ────────────────────────────────────────

export interface TestScenario {
  /** Unique ID */
  id: string
  /** Human-readable name */
  name: string
  /** What the agent should accomplish — described naturally */
  goal: string
  /** Step-by-step hints (optional — the LLM should figure it out) */
  hints?: string[]
  /** Starting URL */
  startUrl: string
  /** Maximum actions before giving up */
  maxActions: number
  /** Success criteria — what must be true for the scenario to pass */
  successCriteria: SuccessCriterion[]
  /** Backend brain checks — direct API validations */
  backendChecks?: BackendCheck[]
  /** Category for organization */
  category: 'connection' | 'template' | 'report' | 'schedule' | 'ai_agent' | 'nl2sql' | 'docqa' | 'workflow' | 'navigation'
  /** Tags */
  tags?: string[]
}

export interface SuccessCriterion {
  description: string
  check: VerifyAssertion
}

export interface BackendCheck {
  /** Description of what we're checking */
  description: string
  /** API endpoint to call */
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  /** What to assert about the response */
  expectedStatus?: number
  /** JSON path expression to check in response */
  responseCheck?: {
    path: string
    operator: 'equals' | 'contains' | 'exists' | 'gt' | 'lt' | 'matches'
    value: unknown
  }
}

// ─── Agent execution result ──────────────────────────────────────────

export interface ScenarioResult {
  scenarioId: string
  scenarioName: string
  status: 'pass' | 'fail' | 'error' | 'timeout'
  /** Total time in ms */
  duration: number
  /** Number of actions taken */
  actionCount: number
  /** Full action log with reasoning */
  actionLog: ActionLogEntry[]
  /** Success criteria results */
  criteriaResults: CriterionResult[]
  /** Backend check results */
  backendResults?: BackendCheckResult[]
  /** Error message if failed */
  error?: string
  /** Evidence paths */
  evidence: {
    screenshots: string[]
    networkCaptures: string[]
    llmDecisions: string
  }
}

export interface ActionLogEntry {
  step: number
  timestamp: string
  action: AgentAction
  result: 'success' | 'failed' | 'skipped'
  error?: string
  /** Time taken for this action */
  duration: number
  /** Screenshot path after action */
  screenshotAfter?: string
}

export interface CriterionResult {
  description: string
  passed: boolean
  actual?: string
  expected?: string
}

export interface BackendCheckResult {
  description: string
  passed: boolean
  endpoint: string
  status?: number
  responsePreview?: string
  error?: string
}
