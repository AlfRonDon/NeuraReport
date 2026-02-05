/**
 * AgentBrain — LLM-powered decision engine using Claude Code CLI.
 *
 * Instead of calling the Anthropic API (which needs credits),
 * this uses the `claude` CLI that's already part of your Claude Code
 * subscription. Zero extra cost.
 *
 * Each step: we send the page state to `claude -p` and get back
 * the next action as JSON.
 */
import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type {
  AgentAction,
  PageObservation,
  TestScenario,
  ActionLogEntry,
} from './types'

// ─── Configuration ───────────────────────────────────────────────────

interface BrainConfig {
  /** Claude model to use (default: sonnet for speed/cost balance) */
  model: string
  /** Max tokens for response */
  maxTokens?: number
  /** Send screenshots to Claude for visual understanding */
  useVision?: boolean
  /** Directory to save temporary screenshot files for Claude to read */
  screenshotDir?: string
}

// ─── The Brain ───────────────────────────────────────────────────────

export class AgentBrain {
  private config: BrainConfig
  private systemPrompt = ''
  private recentHistory: string[] = []
  private actionHistory: ActionLogEntry[] = []
  private stepCount = 0
  private maxRetries = 3
  private maxHistoryLines = 40 // keep last N lines of context

  constructor(config: Partial<BrainConfig> = {}) {
    const screenshotDir = config.screenshotDir || path.join(os.tmpdir(), 'ai-agent-screenshots')
    fs.mkdirSync(screenshotDir, { recursive: true })
    this.config = {
      model: config.model || process.env.AI_TEST_MODEL || 'sonnet',
      maxTokens: config.maxTokens ?? 1024,
      useVision: config.useVision ?? true, // enabled — claude CLI + Read tool can see images
      screenshotDir,
    }
  }

  /** Initialize the brain with a test scenario */
  initScenario(scenario: TestScenario) {
    this.recentHistory = []
    this.actionHistory = []
    this.stepCount = 0
    this.systemPrompt = this.buildSystemPrompt(scenario)
  }

  /** Decide the next action based on current page state */
  async decideAction(observation: PageObservation): Promise<AgentAction> {
    this.stepCount++

    // Save screenshot to file for Claude CLI vision (if enabled)
    let screenshotPath: string | undefined
    if (this.config.useVision && observation.screenshot) {
      screenshotPath = path.join(
        this.config.screenshotDir!,
        `step-${String(this.stepCount).padStart(3, '0')}.png`
      )
      fs.writeFileSync(screenshotPath, Buffer.from(observation.screenshot, 'base64'))
    }

    // Build the observation text
    const obsText = this.buildObservationText(observation, screenshotPath)
    this.recentHistory.push(obsText)

    // Trim history to stay within context limits
    this.trimHistory()

    // Build the full prompt for this step
    const prompt = this.buildPrompt()

    // Call claude CLI
    let action: AgentAction | null = null
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.callClaude(prompt)
        action = this.parseAction(response)
        break
      } catch (err: any) {
        console.warn(`[AgentBrain] Claude CLI attempt ${attempt + 1} failed: ${err.message?.slice(0, 150)}`)
        if (attempt === this.maxRetries - 1) {
          action = {
            type: 'done',
            reasoning: `Claude CLI failed after ${this.maxRetries} attempts: ${err.message?.slice(0, 200)}`,
          }
        }
      }
    }

    if (!action) {
      action = { type: 'done', reasoning: 'Failed to get Claude response' }
    }

    // Record the decision
    this.recentHistory.push(`[Assistant] Action: ${JSON.stringify(action)}`)

    return action
  }

  /** Feed action result back to the brain */
  recordResult(action: AgentAction, result: { success: boolean; error?: string }, duration: number) {
    const entry: ActionLogEntry = {
      step: this.stepCount,
      timestamp: new Date().toISOString(),
      action,
      result: result.success ? 'success' : 'failed',
      error: result.error,
      duration,
    }
    this.actionHistory.push(entry)

    const resultMsg = result.success
      ? `[Result] Action succeeded (${duration}ms)`
      : `[Result] Action FAILED: ${result.error}`
    this.recentHistory.push(resultMsg)
  }

  /** Get the full action history */
  getActionHistory(): ActionLogEntry[] {
    return this.actionHistory
  }

  /** Get the conversation for evidence/debugging */
  getConversation(): Array<{ role: string; content: string }> {
    return this.recentHistory.map(line => ({
      role: line.startsWith('[Assistant]') ? 'assistant' : 'user',
      content: line,
    }))
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  private buildSystemPrompt(scenario: TestScenario): string {
    return `You are an AI test engineer controlling a web browser. Test the NeuraReport application by performing actions like a real user.

SCENARIO: ${scenario.name}
GOAL: ${scenario.goal}
${scenario.hints?.length ? `HINTS:\n${scenario.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}` : ''}

SUCCESS CRITERIA:
${scenario.successCriteria.map((c, i) => `${i + 1}. ${c.description}`).join('\n')}

RESPOND WITH ONLY A JSON OBJECT (no markdown fences, no explanation):
{
  "type": "click|type|navigate|scroll|select|wait|verify|screenshot|done",
  "reasoning": "why you're doing this",
  "target": { "role": "button", "name": "Button Text" },
  "value": "text to type or select",
  "url": "/path for navigate",
  "waitFor": "text to wait for",
  "direction": "up|down",
  "amount": 300
}

TARGET SELECTORS (priority order):
1. { "role": "button", "name": "Add Connection" } — for buttons, links
2. { "label": "Connection Name" } — for form fields
3. { "testId": "save-btn" } — for data-testid
4. { "text": "some text" } — for text content
5. { "css": ".selector" } — last resort

RULES:
- ONE action per response. Be methodical.
- When done or stuck, use type: "done"
- Max ${scenario.maxActions} actions.
- Skip "Notifications" buttons (they hang).
- After clicking buttons that open dialogs, press Escape or Cancel to close.
- The app uses MUI — dropdowns are "combobox" role, dialogs need confirmation.
- Backend API is proxied through /api/.
${this.config.useVision ? '- When a SCREENSHOT file path is provided, READ IT to see the actual page. Use visual context to make better decisions about what to click/type.' : ''}`
  }

  private buildObservationText(obs: PageObservation, screenshotPath?: string): string {
    const parts = [
      `[Step ${this.stepCount}] URL: ${obs.url}`,
      obs.heading ? `Heading: ${obs.heading}` : '',
    ]

    // Include screenshot reference for vision
    if (screenshotPath) {
      const normalizedPath = screenshotPath.replace(/\\/g, '/')
      parts.push(`SCREENSHOT: Use the Read tool to view "${normalizedPath}" — it shows the current page state visually.`)
    }

    parts.push(
      `Elements (${obs.interactiveElements.length}):`,
      ...obs.interactiveElements.slice(0, 30).map((el, i) =>
        `  ${i + 1}. [${el.role}] "${el.name}"${el.disabled ? ' (disabled)' : ''}${el.value ? ` val="${el.value}"` : ''}`
      ),
    )

    if (obs.interactiveElements.length > 30) {
      parts.push(`  ... and ${obs.interactiveElements.length - 30} more elements`)
    }
    if (obs.toasts.length) parts.push(`Toasts: ${obs.toasts.join(' | ')}`)
    if (obs.errors.length) parts.push(`Errors: ${obs.errors.join(' | ')}`)
    if (obs.recentApiCalls.length) {
      parts.push('API Calls:')
      obs.recentApiCalls.slice(-5).forEach(c =>
        parts.push(`  ${c.method} ${c.url} → ${c.status}`)
      )
    }
    // Semantic hints from backend activity (from semantic audit pattern)
    if (obs.semanticHints?.length) {
      parts.push('Backend Insights:')
      obs.semanticHints.forEach(h => parts.push(`  ${h}`))
    }

    return parts.filter(Boolean).join('\n')
  }

  private buildPrompt(): string {
    // System prompt is passed via --system-prompt flag, so only include history here
    const history = this.recentHistory.join('\n\n')
    return `--- CONVERSATION HISTORY ---\n\n${history}\n\nWhat is your next action? Respond with ONLY a JSON object.`
  }

  private trimHistory() {
    // Keep history manageable — drop oldest entries if too long
    while (this.recentHistory.length > this.maxHistoryLines) {
      this.recentHistory.shift()
    }
  }

  private async callClaude(prompt: string): Promise<string> {
    // Combine system prompt + user prompt into one string to avoid shell escaping
    const combinedPrompt = `${this.systemPrompt}\n\n---\n\n${prompt}`

    // Build command as a single string (avoids empty-arg issues with shell: true)
    const toolsFlag = this.config.useVision
      ? '--allowedTools "Read"'
      : '--tools ""'
    const cmd = `claude -p --output-format json --model ${this.config.model} ${toolsFlag}`

    // Use spawnSync with input piped via stdin — cross-platform, no file escaping
    const result = spawnSync(cmd, {
      input: combinedPrompt,
      encoding: 'utf-8',
      timeout: 90_000, // 90s timeout (vision takes longer)
      maxBuffer: 2 * 1024 * 1024,
      shell: true, // needed on Windows for .cmd resolution
      windowsHide: true,
      env: { ...process.env },
    })

    if (result.error) {
      throw new Error(`Claude CLI spawn error: ${result.error.message}`)
    }

    if (result.status !== 0) {
      throw new Error(`Claude CLI exit ${result.status}: ${(result.stderr || '').slice(0, 300)}`)
    }

    const output = result.stdout?.trim()
    if (!output) {
      throw new Error('Claude CLI returned empty output')
    }

    // Parse the claude CLI JSON output
    const cliResult = JSON.parse(output)

    if (cliResult.is_error) {
      throw new Error(`Claude CLI error: ${cliResult.result}`)
    }

    return cliResult.result || ''
  }

  private parseAction(llmResponse: string): AgentAction {
    // Strip markdown code fences if present
    let cleaned = llmResponse.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    try {
      const parsed = JSON.parse(cleaned)
      if (!parsed.type) throw new Error('Missing "type" field')
      if (!parsed.reasoning) parsed.reasoning = 'No reasoning provided'
      return parsed as AgentAction
    } catch (err: any) {
      // Try to extract JSON from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (!parsed.type) throw new Error('Missing "type"')
          return parsed as AgentAction
        } catch { /* fall through */ }
      }
      throw new Error(`Failed to parse action JSON: ${err.message}\nResponse: ${cleaned.slice(0, 200)}`)
    }
  }
}
