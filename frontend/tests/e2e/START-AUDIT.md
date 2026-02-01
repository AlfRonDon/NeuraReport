# START FULL AUDIT - 2,534 Actions

## ⚡ Quick Start Commands

### Step 1: Start Backend (Terminal 1)
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Wait for: `Application startup complete`

---

### Step 2: Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

---

### Step 3: Verify Services (Terminal 3)
```bash
# Check backend
curl http://localhost:8000/health

# Check frontend
curl http://localhost:5173
```

Both should respond successfully.

---

### Step 4: Run Full Audit

#### **Option A: Parallel Execution (RECOMMENDED - 5-6 hours)**

```bash
cd frontend/tests/e2e
./run-parallel-audit.sh 4
```

This will:
- Split 2,534 actions into 51 batches of 50 actions each
- Run 4 batches in parallel
- Complete in approximately **5-6 hours**
- Save results incrementally

---

#### **Option B: Sequential Execution (21 hours)**

```bash
cd frontend
npx playwright test audit-semantic-verification.spec.ts
```

This will:
- Execute all 2,534 actions one by one
- Take approximately **21 hours**
- Save results incrementally every 50 actions

---

#### **Option C: Route-by-Route (Parallel-Friendly)**

Execute high-priority routes first:

```bash
# Terminal 1: Design page (342 actions - ~3 hours)
TARGET_ROUTE=/design npx playwright test audit-semantic-verification.spec.ts

# Terminal 2: History page (245 actions - ~2 hours)
TARGET_ROUTE=/history npx playwright test audit-semantic-verification.spec.ts

# Terminal 3: Jobs page (240 actions - ~2 hours)
TARGET_ROUTE=/jobs npx playwright test audit-semantic-verification.spec.ts

# Terminal 4: Connections page (204 actions - ~1.5 hours)
TARGET_ROUTE=/connections npx playwright test audit-semantic-verification.spec.ts
```

Continue with remaining routes...

---

## 📊 Monitor Progress

### Watch live progress:
```bash
# In a separate terminal
watch -n 10 'cat frontend/tests/e2e/evidence/semantic-audit/ledger/PARTIAL-LEDGER.json | jq "{processed, passed, failed}"'
```

### Count completed actions:
```bash
ls frontend/tests/e2e/evidence/semantic-audit/network/*.json 2>/dev/null | wc -l
```

### Check for defects:
```bash
cat frontend/tests/e2e/evidence/semantic-audit/defects/DEFECT-LIST.json 2>/dev/null | jq ".totalDefects"
```

### View latest results:
```bash
tail -f frontend/tests/e2e/evidence/semantic-audit/logs/batch-*.log
```

---

## ⏱️ Time Estimates

| Execution Mode | Actions | Estimated Time | Best For |
|----------------|---------|----------------|----------|
| Single Action | 1 | 30 seconds | Testing |
| Single Route | 50-350 | 25min - 3hrs | Validation |
| Parallel (4 jobs) | 2,534 | **5-6 hours** | **Production** |
| Sequential | 2,534 | 21 hours | Overnight |

---

## 🎯 What Happens During Execution

For each of the 2,534 actions:

1. **Navigate** to route in fresh browser
2. **Locate** element using stable selector
3. **Click** element (real browser interaction)
4. **Capture** network traffic (all API calls)
5. **Screenshot** before and after
6. **Infer** semantic intent from action context
7. **Verify** backend behavior matches intent
8. **Validate** UI reflects backend truth
9. **Record** verdict (PASS/FAIL) with evidence
10. **Save** to ledger

**No skips. No "untestable". No click-only passes.**

---

## 📁 Output Files

As execution proceeds, files are created in `evidence/semantic-audit/`:

```
evidence/semantic-audit/
├── ledger/
│   ├── PARTIAL-LEDGER.json          # Updates every 50 actions
│   └── ACTION-RESOLUTION-LEDGER.json # Final ledger (2,534 entries)
│
├── defects/
│   └── DEFECT-LIST.json             # All failures
│
├── network/
│   ├── {actionId}-network.json      # 2,534 files
│   └── ...
│
├── screenshots/
│   ├── {actionId}-before.png        # 5,068 files (before/after pairs)
│   ├── {actionId}-after.png
│   └── ...
│
├── logs/
│   ├── batch-0.log                  # Per-batch execution logs
│   └── ...
│
└── FINAL-ASSERTION.json             # Coverage statement
```

---

## ✅ Completion Checklist

When execution finishes, verify:

- [ ] All terminals completed without errors
- [ ] `ACTION-RESOLUTION-LEDGER.json` exists
- [ ] Ledger contains exactly **2,534 entries**
- [ ] `DEFECT-LIST.json` exists (may be empty if all pass)
- [ ] `FINAL-ASSERTION.json` exists
- [ ] Network captures: 2,534 JSON files
- [ ] Screenshots: 5,068 PNG files (before/after pairs)

---

## 📊 Analyze Results

Once execution completes:

```bash
cd frontend/tests/e2e
node analyze-audit-results.js
```

This generates:
- Overall statistics
- Pass/fail by route
- Defect categorization
- Top 10 defects
- Verification method breakdown
- CSV export for stakeholders

---

## 🚨 Troubleshooting

### Backend not responding
```bash
# Check backend logs
cd backend
python -m uvicorn app.main:app --reload
# Look for errors
```

### Frontend not loading
```bash
# Check frontend logs
cd frontend
npm run dev
# Verify http://localhost:5173 loads
```

### Playwright not installed
```bash
cd frontend
npx playwright install
```

### Out of memory errors
- Reduce batch size: `BATCH_SIZE=25 ./run-parallel-audit.sh 4`
- Reduce parallelism: `./run-parallel-audit.sh 2`
- Run sequentially with restarts every 500 actions

### Tests timing out
- Increase timeout in spec file (default: 30s per action)
- Check if backend is slow (database issues, etc.)

---

## 🎓 Understanding Results

### PASS Example:
```json
{
  "actionId": "templates-E015",
  "verdict": "PASS",
  "intendedBackendLogic": "Create new resource via POST, persist to database, return resource with ID",
  "actualBackendBehavior": "Resource created successfully: POST /templates → 201 (ID: abc123)",
  "verificationMethod": "Response body inspection"
}
```

### FAIL Example:
```json
{
  "actionId": "reports-E042",
  "verdict": "FAIL",
  "intendedBackendLogic": "Delete resource via DELETE request, remove from database",
  "actualBackendBehavior": "DELETE /reports/123 returned 200 but resource still exists",
  "defectDescription": "Backend behavior mismatch: Resource not actually deleted despite 200 OK",
  "verificationMethod": "Follow-up GET request"
}
```

---

## 📞 Next Steps After Completion

1. **Run analysis**: `node analyze-audit-results.js`
2. **Review defects**: Open `evidence/semantic-audit/defects/DEFECT-LIST.json`
3. **Prioritize fixes**: Sort defects by severity and frequency
4. **Generate report**: Use `audit-results.csv` for stakeholder presentation
5. **Fix defects**: Address semantic mismatches in codebase
6. **Re-run failures**: Execute failed actions again to verify fixes
7. **Archive evidence**: Save evidence directory for compliance/audit trail

---

## ⚠️ Important Notes

- **Keep services running**: Don't stop backend/frontend during execution
- **Don't interact**: Let Playwright control the browser
- **Disk space**: Ensure at least 5GB free for evidence files
- **Network stability**: Ensure stable internet (for any external API calls)
- **Power**: Plug in laptop if running on battery
- **Time commitment**: Parallel mode takes 5-6 hours - plan accordingly

---

## 🚀 READY TO BEGIN

Execute this command to start the full audit:

```bash
cd frontend/tests/e2e
./run-parallel-audit.sh 4
```

**This will execute all 2,534 actions with semantic backend verification.**

**Zero omissions. Zero untestable. Full truth validation.**

---

## 📧 After Execution

Share these files with stakeholders:
- `evidence/semantic-audit/FINAL-ASSERTION.json` - Coverage statement
- `evidence/semantic-audit/audit-results.csv` - Full results in spreadsheet format
- `evidence/semantic-audit/defects/DEFECT-LIST.json` - Prioritized defect list

The evidence directory serves as the complete audit trail.
