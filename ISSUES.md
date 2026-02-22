# NeuraReport — Full App Issues & Bug Report

**Date**: 2026-02-22
**Tester**: Claude (End-to-End User Flow Testing)
**Scope**: All 32 pages, all backend API routes, real data verification against stp.db
**Backend**: localhost:9070 | **Frontend**: localhost:9071
**STP Connection**: `73e9d384-2697-46af-96b0-f130b43cce55` (5 tables, 2022 rows total)

---

## Legend
- **CRITICAL**: App crashes, data loss, or core feature broken
- **HIGH**: Feature broken / unusable for end users
- **MEDIUM**: Feature partially broken, workaround exists
- **LOW**: Cosmetic, minor UX issue, or non-blocking
- **FIXED**: Already fixed in this or previous review session (needs server restart)

---

## Issues By Page / Feature

### [Report Generation] CRITICAL: Playwright Chromium crashes during PDF generation
- **Severity**: CRITICAL
- **What I did**: POST `/excel/reports/run` with flow-meter-report template, STP connection, dates 2026-02-19 to 2026-02-21
- **What I expected**: Report generated with HTML, PDF, XLSX artifacts
- **What happened**: 500 Internal Server Error. Playwright Chromium crashes with `SIGTRAP` signal. Error: `TargetClosedError: BrowserType.launch: Target page, context or browser has been closed`
- **Root cause**: `ReportGenerateExcel.py:65` uses `asyncio.run()` inside a `ThreadPoolExecutor` when running within uvicorn's event loop. Playwright's Chromium subprocess management conflicts with this nested event loop pattern. Chromium's `--user-data-dir=/tmp/playwright_chromiumdev_profile-*` works fine standalone but crashes when launched from a thread pool.
- **Standalone test**: `playwright chromium.launch()` works fine outside the backend process
- **Impact**: ALL new report generation is broken — no new reports can be generated
- **Workaround**: Existing previously-generated reports are still served correctly
- **Screenshot**: `screenshots/04_generate.png`
- **Backend log**: `prodo/logs/backend.error.log` — full traceback showing `fill_and_print()` → `_run_async()` → `html_to_pdf_async()` → `BrowserType.launch` crash

### [Report Generation] HIGH: Server running stale code — fixes not applied
- **Severity**: HIGH
- **What I did**: Checked file modification times vs server start time
- **What I expected**: Server uses latest code
- **What happened**: `sqlite_loader.py` modified at 03:56 AM but server started at 02:17 AM (Feb 22). The NL2SQL datetime rewrite fix and spreadsheet XLSX export fix exist in the files but the running server uses the old code.
- **Impact**: All fixes from previous session (datetime rewriting, XLSX export) are not active
- **Fix**: Restart the uvicorn backend server (PID 3810356)

### [NL2SQL] HIGH: datetime() / DATE() functions fail in query execution
- **Severity**: HIGH (FIXED in file, needs server restart)
- **What I did**: Executed `SELECT datetime('now', '-24 hours'), DATE('now', '-7 days'), datetime('now', 'start of month')` via NL2SQL execute
- **What I expected**: DuckDB datetime rewrite transforms SQLite datetime syntax to DuckDB equivalents
- **What happened**: `DuckDB execution failed: Parser Error: Wrong number of arguments provided to DATE function`
- **Root cause**: The datetime rewrite fix exists in `sqlite_loader.py` (line 258-268) but the running server was started before the fix was saved
- **Backend log**: `Query execution failed: DuckDB execution failed: Parser Error: Wrong number of arguments provided to DATE function`
- **Fix status**: Code is correct in the file — rewrite regexes match and transform properly (verified independently). Server restart will fix this.

### [NL2SQL] MEDIUM: SQL generation (LLM-powered) returns error
- **Severity**: MEDIUM
- **What I did**: POST `/api/v1/nl2sql/generate` with question "Show me average flow meter readings by device"
- **What I expected**: Generated SQL query
- **What happened**: `{"status": "error", "code": "generation_failed", "message": "Failed to generate SQL query"}`
- **Possible cause**: LLM API key missing, rate limited, or LLM service unavailable
- **Note**: Direct SQL execution (without LLM generation) works correctly

### [Jobs] HIGH: Jobs stuck in queued/pending_retry state
- **Severity**: HIGH
- **What I did**: POST `/excel/jobs/run-report` to queue a PRESSURE_TRANSMITTER report job
- **What I expected**: Job runs to completion
- **What happened**: Job stays in `queued` / `pending_retry` status indefinitely (checked multiple times over several minutes). Progress stuck at 15%.
- **Root cause**: Same Playwright Chromium crash as the synchronous report generation
- **Job ID**: `e7d1063a-53d0-4210-a8ae-73601d5fdac3`

### [Schedules] MEDIUM: Schedule next_run_at is in the past
- **Severity**: MEDIUM
- **What I did**: GET `/health/scheduler` — checked scheduler health
- **What I expected**: `next_run_at` should be a future date
- **What happened**: `next_run_at: "2026-02-18T00:00:06"` which is 4 days in the past. `in_seconds: 0`. Scheduler is "running" and "enabled" but the overdue schedule hasn't triggered.
- **Schedule**: "c ds" (HMWSSB Billing template, daily frequency)
- **Impact**: Scheduled reports are not running on time

### [Spreadsheets] HIGH: XLSX export returns CSV content
- **Severity**: HIGH (FIXED in file, needs server restart)
- **What I did**: GET `/api/v1/spreadsheets/{id}/export?format=xlsx`
- **What I expected**: Valid XLSX file (ZIP format, starts with `PK`)
- **What happened**: File starts with `Devi` (plain text CSV) — the export returns CSV content with `.xlsx` extension
- **File size**: 2748 bytes (too small for proper XLSX)
- **Fix status**: The `export_xlsx()` method was fixed in previous session (uses openpyxl) but server needs restart

### [Spreadsheets] MEDIUM: GET /cells returns 0 cells after PUT /cells succeeds
- **Severity**: MEDIUM
- **What I did**: PUT `/api/v1/spreadsheets/{id}/cells` with 9 cell updates → returned `{"updated_count": 9}`. Then GET `/api/v1/spreadsheets/{id}/cells`
- **What I expected**: 9 cells returned
- **What happened**: `{"cells": []}` — 0 cells returned
- **Note**: CSV export shows the data IS persisted (Device, Reading, Unit columns with FM values). The GET endpoint may be reading from a different source.

### [Spreadsheets] LOW: Create endpoint ignores initial cells
- **Severity**: LOW
- **What I did**: POST `/api/v1/spreadsheets` with `cells` field containing initial data
- **What I expected**: Spreadsheet created with pre-populated cells
- **What happened**: Spreadsheet created but cells field was ignored. Requires separate PUT /cells call.

### [Documents] MEDIUM: Document create API validation unclear
- **Severity**: MEDIUM
- **What I did**: POST `/api/v1/documents` with `{"title": "...", "content": "markdown string", "tags": [...]}`
- **What I expected**: Document created
- **What happened**: 422 Validation Error — `content` field expects a dict/object, not a string. `title` should be `name`. API schema is not intuitive.
- **Error**: `"msg": "Input should be a valid dictionary or object to extract fields from"`

### [Documents] LOW: Previously created document not found
- **Severity**: LOW
- **What I did**: GET `/api/v1/documents/{id}` for a document that appeared in the list
- **What I expected**: Document details
- **What happened**: `{"status": "error", "code": "http_404", "message": "Document not found"}`
- **Note**: May be due to server restart or cleanup between sessions

### [Dashboard] LOW: topTemplates array is always empty
- **Severity**: LOW
- **What I did**: GET `/api/v1/analytics/dashboard`
- **What I expected**: `topTemplates` populated with most-used templates
- **What happened**: `"topTemplates": []` — always empty despite 50 report runs across multiple templates

### [Dashboard] LOW: jobsTrend shows all zeros for the week
- **Severity**: LOW
- **What I did**: GET `/api/v1/analytics/dashboard`
- **What I expected**: `jobsTrend` shows actual job counts for recent days
- **What happened**: All 7 days show `total: 0, completed: 0, failed: 0`. 50 jobs exist historically but the week's trend is empty. Jobs were last run on Feb 20-21.
- **Possible cause**: Analytics may only count jobs in the current calendar week (Mon-Sun) and jobs ran before Monday

### [Backend] MEDIUM: Multiple API endpoints return 404 (Not Found)
- **Severity**: MEDIUM
- **What I did**: Tested various API endpoints that have corresponding frontend pages
- **What I expected**: API responses (even if empty lists)
- **What happened**: 404 for: `/api/v1/agents`, `/api/v1/charts/saved`, `/api/v1/settings`, `/api/v1/favorites`, `/api/v1/notifications`, `/api/v1/knowledge`
- **Impact**: Frontend pages exist but backend APIs are not implemented or routes are registered differently
- **Working endpoints**: dashboards, workflows, documents, spreadsheets, nl2sql, connections, templates, jobs, schedules, reports, analytics, search, brand-kits, ingestion, docqa

### [Search] LOW: Global search returns 0 results
- **Severity**: LOW
- **What I did**: POST `/api/v1/search/search` with query "flow meter" and "STP"
- **What I expected**: Results from templates, connections, and reports containing "flow meter" or "STP"
- **What happened**: `total_results: 0` for both queries
- **Note**: Search index may need to be built/rebuilt. Templates named "FLOW_METER_REPORT" and connections named "STP Facility DB" exist but don't appear in search.

### [Analytics] LOW: Usage stats show all zeros for the week
- **Severity**: LOW
- **What I did**: GET `/api/v1/analytics/usage?period=week`
- **What I expected**: Job/report counts for the current week
- **What happened**: `totalJobs: 0`, all breakdowns empty
- **Note**: Same issue as dashboard jobsTrend — analytics may only count current week

---

## Verified Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Home Dashboard | OK | Stats match actual data (138 templates, 12 connections, 50 jobs, 88% success) |
| Connections health check | OK | STP connection healthy, latency 0ms |
| Schema browsing | OK | 5 tables with correct row counts matching sqlite3 |
| Data preview | OK | Real FM_TABLE data with timestamps and values |
| Template catalog | OK | 138 templates (31 PDF, 107 Excel) |
| Template manifest | OK | Artifact checksums, HTML/PDF/XLSX files listed |
| Template contract | OK | Tokens, mappings, join rules, formatters |
| Report discovery | OK | Batches found with correct row counts |
| Existing report serving | OK | PDF (starts with %PDF), XLSX (starts with PK), HTML (59KB with 3135 data cells) |
| Report history | OK | 50 runs listed with full details and artifact URLs |
| Scheduler health | OK | Enabled, running, poll interval 60s |
| NL2SQL execute (basic) | OK | AVG queries return real data, 16ms execution |
| NL2SQL save/list queries | OK | Queries persist and are retrievable |
| Spreadsheet CRUD | OK | Create, update cells (9 cells), delete — all work |
| CSV export | OK | Correct data exported |
| Brand kits | OK | Returns brand kit data |
| Activity log | OK | Shows recent actions |
| Dashboard builder | OK | CRUD endpoints work (empty state) |
| Workflows | OK | List endpoint works (empty state) |
| All 32 frontend pages | OK | Screenshots taken, no rendering crashes |

---

## Cross-Verification Results

| Check | API Value | sqlite3 Value | Match? |
|-------|-----------|---------------|--------|
| FM_TABLE rows | 647 | 647 | YES |
| ANALYSER_TABLE rows | 756 | 756 | YES |
| LT_TABLE rows | 273 | 273 | YES |
| PT_TABLE rows | 263 | 263 | YES |
| device_mappings rows | 83 | 83 | YES |
| AVG(FM_101) via NL2SQL | -0.2112 | -0.2112 | YES |
| AVG(FM_102) via NL2SQL | 0.0113 | 0.0113 | YES |
| Total templates (dashboard) | 138 | N/A (API source) | YES (matches /templates) |
| Total connections (dashboard) | 12 | N/A | YES (matches /connections) |
| Total jobs (dashboard) | 50 | N/A | YES (matches /jobs) |

---

## Screenshots Taken
67 total screenshots in `/home/rohith/desktop/NeuraReport/screenshots/`:
- Dashboard, Connections, Templates, Generate, Reports, History, Jobs, Schedules, Query Builder, Documents, Spreadsheets
- Dashboard Builder, Workflows, Agents, Visualization, Analyze, Activity, Knowledge, Design, Settings, Search, DocQA
- Connectors, Ingestion, Widgets, Enrichment, Federation, Synthesis, Summary, Ops, Stats, Setup Wizard

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 (Playwright PDF crash) |
| HIGH | 4 (stale server, NL2SQL datetime, jobs stuck, XLSX export) |
| MEDIUM | 5 (schedules overdue, cells GET, doc API, 404 endpoints, NL2SQL generate) |
| LOW | 5 (topTemplates, jobsTrend, search, analytics, doc create) |
| **Total** | **15 issues** |

**3 of the 4 HIGH issues** (NL2SQL datetime, XLSX export, stale server) are FIXED in code and only need a server restart.

The **1 remaining CRITICAL issue** (Playwright Chromium crash) requires a code fix in `ReportGenerateExcel.py` to handle the `asyncio.run()` / ThreadPoolExecutor / Playwright interaction properly.
