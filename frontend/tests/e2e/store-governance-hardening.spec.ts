/**
 * Source-inspection tests for frontend store/governance hardening — lines 1208-1247
 * of FORENSIC_AUDIT_REPORT.md.
 *
 * These tests verify that the fixes applied to frontend stores and UX governance
 * components are present in the source code by inspecting file contents.
 *
 * Run with: npx playwright test store-governance-hardening.spec.ts
 */
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')
}

// =============================================================================
// STORE HARDENING
// =============================================================================

test.describe('ingestionStore — upload progress stale-state fix', () => {
  const src = () => readSource('src/stores/ingestionStore.js')

  test('uploadProgress uses updater function (not get())', () => {
    const source = src()
    // The old pattern: { ...get().uploadProgress, [fileId]: ... }
    expect(source).not.toContain('get().uploadProgress')
    // The new pattern uses Zustand state-updater callback
    expect(source).toContain('state.uploadProgress')
  })
})

test.describe('documentStore — savingComment loading flag', () => {
  const src = () => readSource('src/stores/documentStore.js')

  test('savingComment state field exists', () => {
    expect(src()).toContain('savingComment: false')
  })

  test('addComment sets savingComment', () => {
    expect(src()).toContain("savingComment: true")
  })

  test('addComment clears savingComment on success', () => {
    // After the API call succeeds, savingComment should be false in the set() call
    const source = src()
    const addCommentBlock = source.slice(
      source.indexOf('addComment:'),
      source.indexOf('resolveComment:')
    )
    expect(addCommentBlock).toContain('savingComment: false')
  })
})

test.describe('useAppStore — localStorage size guard', () => {
  const src = () => readSource('src/stores/useAppStore.js')

  test('loadDiscoveryFromStorage checks raw.length before JSON.parse', () => {
    const source = src()
    const loadFnStart = source.indexOf('const loadDiscoveryFromStorage')
    const loadFnEnd = source.indexOf('const evictOldestResults')
    const loadFn = source.slice(loadFnStart, loadFnEnd)
    expect(loadFn).toContain('raw.length > DISCOVERY_MAX_SIZE_BYTES')
  })
})

test.describe('queryStore — persisted selectedConnectionId validation', () => {
  const src = () => readSource('src/stores/queryStore.js')

  test('onRehydrateStorage is defined', () => {
    expect(src()).toContain('onRehydrateStorage')
  })

  test('validates selectedConnectionId on rehydration', () => {
    const source = src()
    expect(source).toContain('selectedConnectionId')
    // Should null out invalid values
    expect(source).toContain("state.selectedConnectionId = null")
  })
})

// =============================================================================
// UX GOVERNANCE HARDENING
// =============================================================================

test.describe('useEnforcement.js — dead code removed, Set bounded', () => {
  const src = () => readSource('src/components/ux/governance/useEnforcement.js')

  test('analyzeHandler function removed', () => {
    expect(src()).not.toContain('function analyzeHandler')
  })

  test('MAX_CHECKED_COMPONENTS cap defined', () => {
    expect(src()).toContain('MAX_CHECKED_COMPONENTS')
  })

  test('Set.clear() called when cap exceeded', () => {
    expect(src()).toContain('checkedComponents.clear()')
  })
})

test.describe('WorkflowContracts.jsx — sessionStorage validation', () => {
  const src = () => readSource('src/components/ux/governance/WorkflowContracts.jsx')

  test('validates workflowId exists in WorkflowContracts before dispatch', () => {
    const source = src()
    // The fix adds WorkflowContracts[parsed.activeWorkflow] check
    expect(source).toContain('WorkflowContracts[parsed.activeWorkflow]')
  })
})

test.describe('InteractionAPI.jsx — userAgent truncation', () => {
  const src = () => readSource('src/components/ux/governance/InteractionAPI.jsx')

  test('userAgent is sliced to max length', () => {
    const source = src()
    expect(source).toContain('.slice(0, 512)')
  })
})

test.describe('CommandPalette.jsx — query length cap', () => {
  const src = () => readSource('src/features/shell/components/CommandPalette.jsx')

  test('query is capped before sending to API', () => {
    const source = src()
    expect(source).toContain('cappedQuery')
    expect(source).toContain('.slice(0, 200)')
  })

  test('globalSearch uses cappedQuery, not raw query', () => {
    const source = src()
    // The globalSearch call should use cappedQuery
    expect(source).toContain('globalSearch(cappedQuery')
  })
})
