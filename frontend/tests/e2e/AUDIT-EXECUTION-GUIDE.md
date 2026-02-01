# Semantic Backend Verification Audit - Execution Guide

## Overview

This audit re-executes all **2,534 previously identified UI actions** with full semantic backend verification.

**Objective:**
- Execute each action through end-user browser interactions
- Verify backend behavior matches user's logical expectation
- Verify UI reflects backend truth
- Zero untestable actions
- Zero click-only passes

**This validates TRUTH, not motion.**

---

## Prerequisites

1. **Backend running locally:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Frontend running locally:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Playwright installed:**
   ```bash
   cd frontend
   npm install
   npx playwright install
   ```

---

## Execution Modes

### Mode 1: Single Action (Testing/Debugging)

Execute a single action by ID for detailed inspection:

```bash
TARGET_ACTION=connections-E000 npx playwright test audit-semantic-verification.spec.ts
```

**Use cases:**
- Debug specific action failure
- Test semantic verification logic
- Quick validation

### Mode 2: Single Route (Parallel-Friendly)

Execute all actions for a specific route:

```bash
TARGET_ROUTE=/connections npx playwright test audit-semantic-verification.spec.ts
```

**Use cases:**
- Route-by-route validation
- Parallel execution across routes
- Focused testing

### Mode 3: Batch Execution (Parallel)

Execute actions in batches for distributed execution:

```bash
# Batch 1: Actions 0-49
RUN_MODE=batch BATCH_INDEX=0 BATCH_SIZE=50 npx playwright test audit-semantic-verification.spec.ts

# Batch 2: Actions 50-99
RUN_MODE=batch BATCH_INDEX=1 BATCH_SIZE=50 npx playwright test audit-semantic-verification.spec.ts

# ... and so on
```

**Use cases:**
- Parallel execution across multiple machines/containers
- CI/CD pipeline distribution
- Faster overall execution

### Mode 4: Full Execution (Sequential)

Execute all 2,534 actions sequentially:

```bash
npx playwright test audit-semantic-verification.spec.ts
```

**Use cases:**
- Complete audit run
- Final validation
- Overnight/weekend execution

**Estimated time:** 21 hours (30s per action × 2,534 actions)

---

## Parallel Execution Strategy

For fastest execution, use parallel batches across multiple terminals/machines:

### Terminal 1 (Batch 0-9):
```bash
for i in {0..9}; do
  RUN_MODE=batch BATCH_INDEX=$i BATCH_SIZE=50 npx playwright test audit-semantic-verification.spec.ts
done
```

### Terminal 2 (Batch 10-19):
```bash
for i in {10..19}; do
  RUN_MODE=batch BATCH_INDEX=$i BATCH_SIZE=50 npx playwright test audit-semantic-verification.spec.ts
done
```

### Terminal 3 (Batch 20-29):
```bash
for i in {20..29}; do
  RUN_MODE=batch BATCH_INDEX=$i BATCH_SIZE=50 npx playwright test audit-semantic-verification.spec.ts
done
```

### Continue until all batches complete...

**Total batches needed:** 51 batches (2,534 actions ÷ 50 per batch)

**Estimated time with 4 parallel terminals:** ~5-6 hours

---

## Route-Based Parallel Execution

Execute each route in parallel (29 routes total):

```bash
# Get list of routes
node -e "
const inv = require('./MASTER-ACTION-INVENTORY.json');
const routes = [...new Set(inv.actions.map(a => a.route))];
routes.forEach((r, i) => console.log(\`Route \${i}: \${r}\`));
"

# Then execute each route in separate terminal:
# Terminal 1:
TARGET_ROUTE=/ npx playwright test audit-semantic-verification.spec.ts

# Terminal 2:
TARGET_ROUTE=/connections npx playwright test audit-semantic-verification.spec.ts

# Terminal 3:
TARGET_ROUTE=/templates npx playwright test audit-semantic-verification.spec.ts

# ... etc.
```

**Estimated time with 4 parallel routes:** ~3-4 hours (depending on route action counts)

---

## Output Structure

All evidence is stored in `frontend/tests/e2e/evidence/semantic-audit/`:

```
evidence/semantic-audit/
├── ledger/
│   ├── ACTION-RESOLUTION-LEDGER.json    # Full ledger (2,534 entries)
│   └── PARTIAL-LEDGER.json              # Incremental saves
├── defects/
│   └── DEFECT-LIST.json                 # All failures with details
├── network/
│   ├── connections-E000-network.json    # Network capture per action
│   ├── connections-E001-network.json
│   └── ...
├── screenshots/
│   ├── connections-E000-before.png      # Before/after per action
│   ├── connections-E000-after.png
│   └── ...
└── FINAL-ASSERTION.json                 # Coverage assertion
```

---

## Action Resolution Ledger Format

Each entry contains:

```json
{
  "actionId": "connections-E000",
  "route": "/connections",
  "page": "connections",
  "uiDescription": "Go to Dashboard",
  "intendedBackendLogic": "Navigate to / route",
  "actualBackendBehavior": "Navigation executed, no backend call (expected)",
  "verificationMethod": "URL change verification",
  "uiResult": "button executed successfully",
  "verdict": "PASS",
  "evidenceReferences": {
    "networkCapture": "network/connections-E000-network.json",
    "beforeScreenshot": "screenshots/connections-E000-before.png",
    "afterScreenshot": "screenshots/connections-E000-after.png"
  },
  "executionTimeMs": 1234,
  "timestamp": "2026-02-01T12:00:00.000Z"
}
```

**Verdict rules:**
- **PASS**: Backend behavior matches intent AND UI reflects backend truth
- **FAIL**: Backend behavior mismatch OR unverifiable OR execution failure

**No "untestable" or "partial" classifications allowed.**

---

## Defect List Format

Failures include:

```json
{
  "actionId": "templates-E042",
  "route": "/templates",
  "page": "templates",
  "uiDescription": "Create Template",
  "intendedBackendLogic": "Create new resource via POST, persist to database, return resource with ID",
  "actualBackendBehavior": "POST /templates returned 201 but response lacks resource ID",
  "verificationMethod": "Response body inspection",
  "uiResult": "button executed successfully",
  "verdict": "FAIL",
  "defectDescription": "Backend behavior mismatch: Expected resource ID in response, observed empty body",
  "evidenceReferences": {
    "networkCapture": "network/templates-E042-network.json",
    "beforeScreenshot": "screenshots/templates-E042-before.png",
    "afterScreenshot": "screenshots/templates-E042-after.png"
  }
}
```

---

## Progress Monitoring

Monitor execution progress:

```bash
# Watch partial ledger updates
watch -n 5 'cat frontend/tests/e2e/evidence/semantic-audit/ledger/PARTIAL-LEDGER.json | jq ".processed, .passed, .failed"'

# Count completed actions
ls frontend/tests/e2e/evidence/semantic-audit/network/*.json | wc -l

# Check defect count
cat frontend/tests/e2e/evidence/semantic-audit/defects/DEFECT-LIST.json | jq ".totalDefects"
```

---

## Expected Defect Categories

Based on semantic verification, expect defects in:

1. **Missing backend calls**
   - UI action triggers no API request when it should

2. **Backend response mismatch**
   - 200 OK but response lacks expected data (e.g., no resource ID after POST)

3. **State persistence failures**
   - Backend returns success but data not persisted

4. **UI not reflecting backend truth**
   - Backend state changes but UI doesn't update

5. **Unstable selectors**
   - Elements lack data-testid/aria-label/id for reliable location

---

## Validation Checklist

After execution, verify:

- [ ] `ACTION-RESOLUTION-LEDGER.json` contains 2,534 entries
- [ ] `DEFECT-LIST.json` lists all failures with reproduction steps
- [ ] `FINAL-ASSERTION.json` confirms 100% execution (zero untestable)
- [ ] Each action has network capture + screenshots
- [ ] Defect count matches reality (not suspiciously zero)

---

## Final Report Generation

After all actions complete, the audit produces:

### 1. Action Resolution Ledger (2,534 entries)
**Location:** `evidence/semantic-audit/ledger/ACTION-RESOLUTION-LEDGER.json`

Contains:
- Every action ID
- UI description
- Intended backend logic
- Actual backend behavior
- Verification method
- Verdict (PASS/FAIL)
- Evidence references

### 2. Defect List
**Location:** `evidence/semantic-audit/defects/DEFECT-LIST.json`

Contains:
- All failed actions
- Expected vs actual behavior
- Reproduction steps
- Evidence files

### 3. Final Coverage Assertion
**Location:** `evidence/semantic-audit/FINAL-ASSERTION.json`

Confirms:
- All 2,534 actions executed
- Each verified against semantic backend intent
- No click-only passes
- No untestable classifications

---

## Success Criteria

✅ **Audit is complete when:**
1. All 2,534 actions executed
2. Each has backend semantic verification
3. Ledger contains all entries
4. Defect list documents all failures
5. Final assertion confirms zero untestable

❌ **Audit is INVALID if:**
1. Any action skipped
2. Any action marked "untestable"
3. Any verdict based on click success alone
4. Backend behavior not verified

---

## Troubleshooting

### Issue: Action not found
**Cause:** Element selector changed since inventory creation
**Solution:** Mark as FAIL with "Element not relocatable" defect

### Issue: Network capture empty
**Cause:** Backend not running or CORS issue
**Solution:** Verify backend is accessible at localhost:8000

### Issue: Timeout errors
**Cause:** Slow backend response
**Solution:** Increase timeout or mark as FAIL

### Issue: Test crashes
**Cause:** Memory/resource exhaustion
**Solution:** Use batch mode with smaller batch sizes

---

## Next Steps After Execution

1. **Review defect list** - Prioritize by severity
2. **Reproduce failures** - Use evidence files to debug
3. **Fix defects** - Update code based on semantic mismatches
4. **Re-run failed actions** - Verify fixes
5. **Generate stakeholder report** - Summarize findings

---

## Contact

For questions about this audit framework, consult the specification document or review the semantic verification logic in `audit-semantic-verification.spec.ts`.

**Remember: This validates TRUTH, not motion. If the backend lies, the UI is lying—even if it looks fine.**
