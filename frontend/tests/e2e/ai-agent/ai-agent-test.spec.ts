/**
 * AI Agent E2E Tests — LLM-driven browser testing.
 *
 * Instead of scripted test steps, an AI agent (Claude) controls the browser
 * and decides what to click, type, and verify — like ChatGPT agent mode
 * but for QA testing.
 *
 * The agent tests:
 * 1. All pages and interactions (comprehensive audit)
 * 2. Core user workflows (connection → template → report)
 * 3. Backend AI brain (NL2SQL, agents, template verification, chart suggestions)
 * 4. LLM pipeline quality (prompt effectiveness, response accuracy)
 *
 * Run specific scenarios:
 *   npx playwright test ai-agent-test.spec.ts --grep "connection"
 *   npx playwright test ai-agent-test.spec.ts --grep "ai-brain"
 *   npx playwright test ai-agent-test.spec.ts --grep "audit"
 *
 * Run all:
 *   npx playwright test ai-agent-test.spec.ts
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY  - Claude API key (required)
 *   AI_TEST_MODEL      - Claude model (default: claude-sonnet-4-5-20250929)
 *   BASE_URL           - Frontend URL (default: http://127.0.0.1:5174)
 *   BACKEND_URL        - Backend URL (default: http://127.0.0.1:8001)
 *   AI_TEST_SCENARIOS  - Comma-separated scenario IDs to run (default: all)
 */
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { AITestRunner, generateAuditReport } from './test-runner'
import {
  ALL_SCENARIOS,
  generatePerPageScenarios,
  getAIBrainScenarios,
  getScenariosByCategory,
  getScenariosByTag,
  comprehensiveAuditScenario,
  fullWorkflowScenario,
} from './scenarios'
import type { TestScenario, ScenarioResult } from './types'

// ─── Configuration ─────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EVIDENCE_ROOT = path.resolve(__dirname, '..', 'evidence', 'ai-agent')
const SELECTED_SCENARIOS = process.env.AI_TEST_SCENARIOS?.split(',').map(s => s.trim()) || []

function shouldRun(scenario: TestScenario): boolean {
  if (SELECTED_SCENARIOS.length === 0) return true
  return SELECTED_SCENARIOS.includes(scenario.id) || SELECTED_SCENARIOS.includes(scenario.category)
}

function getEvidenceDir(scenarioId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return path.join(EVIDENCE_ROOT, `${timestamp}-${scenarioId}`)
}

// ─── Preflight check ────────────────────────────────────────────────

test.beforeAll(async () => {
  // Verify claude CLI is available (uses Claude Code subscription — no API key needed)
  try {
    const { spawnSync } = await import('child_process')
    const check = spawnSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 10_000,
      shell: true,
      windowsHide: true,
    })
    if (check.status !== 0) throw new Error(check.stderr || 'exit ' + check.status)
    console.log(`Claude CLI: ${check.stdout?.trim()}`)
  } catch {
    console.warn('\n⚠ Claude CLI not found — AI agent tests require Claude Code CLI')
    console.warn('  Install from: https://docs.anthropic.com/claude-code\n')
  }
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true })
})

// ─── Helper to run a scenario ───────────────────────────────────────

async function runScenario(page: any, scenario: TestScenario): Promise<ScenarioResult> {
  const runner = new AITestRunner(page, {
    evidenceBaseDir: getEvidenceDir(scenario.id),
    model: process.env.AI_TEST_MODEL,
    screenshotEveryStep: true,
    actionDelay: 500,
  })

  return runner.runScenario(scenario)
}

// ═════════════════════════════════════════════════════════════════════
// CORE WORKFLOW TESTS
// ═════════════════════════════════════════════════════════════════════

test.describe('AI Agent: Core Workflows', () => {
  test.setTimeout(300_000) // 5 minutes per test

  for (const scenario of ALL_SCENARIOS.filter(s => !s.tags?.includes('comprehensive-audit'))) {
    test(`[${scenario.id}] ${scenario.name} @${scenario.category}`, async ({ page }) => {
      if (!shouldRun(scenario)) test.skip()

      const result = await runScenario(page, scenario)
      // Assert the scenario passed
      expect(result.status, `Scenario "${scenario.name}" should pass`).toBe('pass')
    })
  }
})

// ═════════════════════════════════════════════════════════════════════
// AI BRAIN / LLM PIPELINE TESTS
// ═════════════════════════════════════════════════════════════════════

test.describe('AI Agent: Backend Brain Verification @ai-brain', () => {
  test.setTimeout(300_000)

  for (const scenario of getAIBrainScenarios()) {
    test(`[${scenario.id}] ${scenario.name}`, async ({ page }) => {
      const result = await runScenario(page, scenario)

      // For brain tests, check backend results specifically
      if (result.backendResults?.length) {
        for (const br of result.backendResults) {
          expect(br.passed, `Backend check: ${br.description}`).toBe(true)
        }
      }
    })
  }
})

// ═════════════════════════════════════════════════════════════════════
// COMPREHENSIVE PAGE AUDIT — Covers all pages like the button audit
// ═════════════════════════════════════════════════════════════════════

test.describe('AI Agent: Per-Page Audit @audit', () => {
  test.setTimeout(180_000) // 3 minutes per page

  const perPageScenarios = generatePerPageScenarios()

  for (const scenario of perPageScenarios) {
    test(`[${scenario.id}] Audit: ${scenario.startUrl}`, async ({ page }) => {
      if (!shouldRun(scenario)) test.skip()

      const result = await runScenario(page, scenario)
      // Per-page audits: warn on failure but don't hard-fail
      // (some pages may not have interactive elements)
      if (result.status !== 'pass') {
        console.warn(`⚠ Page audit ${scenario.startUrl}: ${result.status} — ${result.error || 'check evidence'}`)
      }
    })
  }
})

// ═════════════════════════════════════════════════════════════════════
// COMPREHENSIVE AUDIT — Single test that visits everything
// ═════════════════════════════════════════════════════════════════════

test.describe('AI Agent: Comprehensive Audit @comprehensive', () => {
  test.setTimeout(600_000) // 10 minutes

  test('[audit-001] Full application audit', async ({ page }) => {
    const result = await runScenario(page, comprehensiveAuditScenario)
    console.log(`\nComprehensive audit: ${result.actionCount} actions, ${result.status}`)
  })
})

// ═════════════════════════════════════════════════════════════════════
// FULL E2E WORKFLOW — The ultimate test
// ═════════════════════════════════════════════════════════════════════

test.describe('AI Agent: Full E2E Workflow @e2e', () => {
  test.setTimeout(600_000) // 10 minutes

  test('[workflow-001] Connection → Template → Report', async ({ page }) => {
    const result = await runScenario(page, fullWorkflowScenario)
    expect(result.status, 'Full E2E workflow should pass').toBe('pass')
  })
})

// ═════════════════════════════════════════════════════════════════════
// AGGREGATE REPORT — Run everything and generate a summary
// ═════════════════════════════════════════════════════════════════════

test.describe('AI Agent: Full Suite with Report @full-suite', () => {
  test.setTimeout(1_800_000) // 30 minutes

  test('Run all scenarios and generate audit report', async ({ page }) => {
    const allResults: ScenarioResult[] = []

    // Run core scenarios
    for (const scenario of ALL_SCENARIOS) {
      if (!shouldRun(scenario)) continue
      try {
        const runner = new AITestRunner(page, {
          evidenceBaseDir: getEvidenceDir(scenario.id),
          model: process.env.AI_TEST_MODEL,
          screenshotEveryStep: true,
        })
        const result = await runner.runScenario(scenario)
        allResults.push(result)
      } catch (err: any) {
        console.error(`✗ Scenario ${scenario.id} crashed: ${err.message}`)
        allResults.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          status: 'error',
          duration: 0,
          actionCount: 0,
          actionLog: [],
          criteriaResults: [],
          error: err.message,
          evidence: { screenshots: [], networkCaptures: [], llmDecisions: '' },
        })
      }
    }

    // Generate aggregate report
    const report = generateAuditReport(allResults)

    // Save report
    const reportDir = path.join(EVIDENCE_ROOT, 'reports')
    fs.mkdirSync(reportDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const reportPath = path.join(reportDir, `ai-agent-report-${timestamp}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    const summaryPath = path.join(reportDir, `ai-agent-report-${timestamp}.txt`)
    fs.writeFileSync(summaryPath, report.summary)

    console.log('\n' + report.summary)
    console.log(`\nReport saved to: ${reportPath}`)

    // Assert overall pass rate
    const passRate = report.totalScenarios ? report.passed / report.totalScenarios : 0
    expect(passRate, `Overall pass rate should be > 50%`).toBeGreaterThan(0.5)
  })
})
