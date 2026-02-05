/**
 * AI Agent Test Runner — Orchestrates the browser agent + LLM brain.
 *
 * This is the main execution loop:
 * 1. Initialize scenario
 * 2. Observe page state (screenshot + DOM)
 * 3. Send observation to LLM brain → get next action
 * 4. Execute action via browser agent
 * 5. Record result, repeat until done or max actions
 * 6. Run backend brain checks
 * 7. Evaluate success criteria
 * 8. Generate evidence report
 */
import * as fs from 'fs'
import * as path from 'path'
import type { Page } from '@playwright/test'
import { BrowserAgent } from './browser-agent'
import { AgentBrain } from './agent-brain'
import type {
  TestScenario,
  ScenarioResult,
  ActionLogEntry,
  CriterionResult,
  BackendCheckResult,
} from './types'

export interface RunnerConfig {
  /** Directory for all evidence output */
  evidenceBaseDir: string
  /** Whether to take screenshots at every step */
  screenshotEveryStep?: boolean
  /** Delay between actions (ms) to avoid overwhelming the app */
  actionDelay?: number
  /** Model override (default: sonnet) */
  model?: string
}

export class AITestRunner {
  private browser: BrowserAgent
  private brain: AgentBrain
  private config: RunnerConfig
  private page: Page

  constructor(page: Page, config: RunnerConfig) {
    this.page = page
    this.config = {
      screenshotEveryStep: true,
      actionDelay: 500,
      ...config,
    }

    // Create evidence directory for this run
    fs.mkdirSync(config.evidenceBaseDir, { recursive: true })

    this.browser = new BrowserAgent(page, config.evidenceBaseDir)
    this.brain = new AgentBrain({
      model: config.model,
      screenshotDir: path.join(config.evidenceBaseDir, 'vision-screenshots'),
    })
  }

  /** Run a single scenario and return the result */
  async runScenario(scenario: TestScenario): Promise<ScenarioResult> {
    const startTime = Date.now()
    const actionLog: ActionLogEntry[] = []
    let error: string | undefined

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`🤖 AI Agent: ${scenario.name}`)
    console.log(`   Goal: ${scenario.goal.slice(0, 100)}...`)
    console.log(`${'═'.repeat(60)}`)

    // Initialize the brain with this scenario
    this.brain.initScenario(scenario)

    // Navigate to start URL
    try {
      const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5174'
      const fullUrl = scenario.startUrl.startsWith('http')
        ? scenario.startUrl
        : `${baseUrl}${scenario.startUrl}`
      await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await this.page.waitForTimeout(2000) // let page render
    } catch (err: any) {
      return this.buildResult(scenario, startTime, actionLog, 'error', `Failed to navigate to start URL: ${err.message}`)
    }

    // Take initial screenshot
    await this.browser.takeScreenshot('initial')

    // Main action loop
    let actionCount = 0
    let isDone = false

    while (actionCount < scenario.maxActions && !isDone) {
      actionCount++
      const stepStart = Date.now()

      try {
        // 1. Observe the current page state
        const observation = await this.browser.observe()

        // 2. Ask the brain what to do
        const action = await this.brain.decideAction(observation)

        console.log(`  [${actionCount}/${scenario.maxActions}] ${action.type}: ${action.reasoning?.slice(0, 80)}`)

        // 3. Check if done
        if (action.type === 'done') {
          isDone = true
          actionLog.push({
            step: actionCount,
            timestamp: new Date().toISOString(),
            action,
            result: 'success',
            duration: Date.now() - stepStart,
          })
          break
        }

        // 4. Execute the action
        const result = await this.browser.execute(action)

        // 5. Take screenshot if configured
        let screenshotPath: string | undefined
        if (this.config.screenshotEveryStep) {
          screenshotPath = await this.browser.takeScreenshot(
            `step-${String(actionCount).padStart(3, '0')}-${action.type}`
          )
        }

        // 6. Record the result
        const duration = Date.now() - stepStart
        this.brain.recordResult(action, result, duration)
        actionLog.push({
          step: actionCount,
          timestamp: new Date().toISOString(),
          action,
          result: result.success ? 'success' : 'failed',
          error: result.error,
          duration,
          screenshotAfter: screenshotPath,
        })

        if (!result.success) {
          console.log(`    ⚠ Action failed: ${result.error?.slice(0, 100)}`)
        }

        // 7. Add delay between actions
        if (this.config.actionDelay) {
          await this.page.waitForTimeout(this.config.actionDelay)
        }

      } catch (err: any) {
        console.error(`    ✗ Step ${actionCount} crashed: ${err.message?.slice(0, 100)}`)
        actionLog.push({
          step: actionCount,
          timestamp: new Date().toISOString(),
          action: { type: 'done', reasoning: `Error: ${err.message}` },
          result: 'failed',
          error: err.message,
          duration: Date.now() - stepStart,
        })
        // Don't abort on single step failure — let the brain recover
      }
    }

    if (!isDone && actionCount >= scenario.maxActions) {
      error = `Reached maximum actions (${scenario.maxActions}) without completing`
    }

    // Take final screenshot
    await this.browser.takeScreenshot('final')

    // Run backend brain checks
    const backendResults = await this.runBackendChecks(scenario)

    // Evaluate success criteria
    const criteriaResults = await this.evaluateCriteria(scenario)

    // Determine overall status
    const allCriteriaPassed = criteriaResults.every(r => r.passed)
    const allBackendPassed = backendResults.every(r => r.passed)
    const status = error
      ? (actionCount >= scenario.maxActions ? 'timeout' : 'error')
      : (allCriteriaPassed && allBackendPassed ? 'pass' : 'fail')

    return this.buildResult(scenario, startTime, actionLog, status, error, criteriaResults, backendResults)
  }

  /** Run backend API checks defined in the scenario */
  private async runBackendChecks(scenario: TestScenario): Promise<BackendCheckResult[]> {
    if (!scenario.backendChecks?.length) return []

    const results: BackendCheckResult[] = []
    for (const check of scenario.backendChecks) {
      try {
        const { status, data } = await this.browser.apiCall(
          check.method,
          check.endpoint,
          check.body,
        )

        const passed = check.expectedStatus
          ? status === check.expectedStatus
          : status < 400

        results.push({
          description: check.description,
          passed,
          endpoint: check.endpoint,
          status,
          responsePreview: JSON.stringify(data).slice(0, 300),
        })
      } catch (err: any) {
        results.push({
          description: check.description,
          passed: false,
          endpoint: check.endpoint,
          error: err.message,
        })
      }
    }
    return results
  }

  /** Evaluate success criteria against current page state */
  private async evaluateCriteria(scenario: TestScenario): Promise<CriterionResult[]> {
    const results: CriterionResult[] = []
    for (const criterion of scenario.successCriteria) {
      const result = await this.browser.verify(criterion.check)
      results.push({
        description: criterion.description,
        passed: result.passed,
        actual: result.actual,
        expected: criterion.check.expected as string,
      })
    }
    return results
  }

  /** Build the scenario result object */
  private buildResult(
    scenario: TestScenario,
    startTime: number,
    actionLog: ActionLogEntry[],
    status: ScenarioResult['status'],
    error?: string,
    criteriaResults?: CriterionResult[],
    backendResults?: BackendCheckResult[],
  ): ScenarioResult {
    const result: ScenarioResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status,
      duration: Date.now() - startTime,
      actionCount: actionLog.length,
      actionLog,
      criteriaResults: criteriaResults || [],
      backendResults,
      error,
      evidence: {
        screenshots: [],
        networkCaptures: [],
        llmDecisions: '',
      },
    }

    // Save evidence
    const evidenceDir = this.config.evidenceBaseDir

    // Save action log
    const actionLogPath = path.join(evidenceDir, `${scenario.id}-action-log.json`)
    fs.writeFileSync(actionLogPath, JSON.stringify(actionLog, null, 2))

    // Save LLM conversation
    const convoPath = path.join(evidenceDir, `${scenario.id}-llm-conversation.json`)
    fs.writeFileSync(convoPath, JSON.stringify(this.brain.getConversation(), null, 2))
    result.evidence.llmDecisions = convoPath

    // Save network log
    this.browser.saveNetworkLog(scenario.id)

    // Save full result
    const resultPath = path.join(evidenceDir, `${scenario.id}-result.json`)
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2))

    // Print summary
    const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'timeout' ? '⏱' : '⚠'
    console.log(`\n${icon} ${scenario.name}: ${status.toUpperCase()} (${actionLog.length} actions, ${Math.round(result.duration / 1000)}s)`)
    if (criteriaResults?.length) {
      criteriaResults.forEach(c => {
        console.log(`  ${c.passed ? '✓' : '✗'} ${c.description}`)
      })
    }
    if (backendResults?.length) {
      backendResults.forEach(b => {
        console.log(`  ${b.passed ? '✓' : '✗'} [API] ${b.description}`)
      })
    }

    return result
  }
}

// ─── Aggregate report generation ─────────────────────────────────────

export interface AuditReport {
  timestamp: string
  totalScenarios: number
  passed: number
  failed: number
  errors: number
  timeouts: number
  totalDuration: number
  totalActions: number
  scenarios: ScenarioResult[]
  summary: string
}

export function generateAuditReport(results: ScenarioResult[]): AuditReport {
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const errors = results.filter(r => r.status === 'error').length
  const timeouts = results.filter(r => r.status === 'timeout').length

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalScenarios: results.length,
    passed,
    failed,
    errors,
    timeouts,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    totalActions: results.reduce((sum, r) => sum + r.actionCount, 0),
    scenarios: results,
    summary: [
      `AI Agent Audit Report`,
      `═════════════════════`,
      `Total Scenarios: ${results.length}`,
      `Passed: ${passed} | Failed: ${failed} | Errors: ${errors} | Timeouts: ${timeouts}`,
      `Pass Rate: ${results.length ? Math.round(passed / results.length * 100) : 0}%`,
      `Total Actions: ${results.reduce((sum, r) => sum + r.actionCount, 0)}`,
      `Total Duration: ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s`,
      '',
      ...results.map(r => {
        const icon = r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '⚠'
        return `${icon} [${r.status.toUpperCase()}] ${r.scenarioName} (${r.actionCount} actions, ${Math.round(r.duration / 1000)}s)`
      }),
    ].join('\n'),
  }

  return report
}
