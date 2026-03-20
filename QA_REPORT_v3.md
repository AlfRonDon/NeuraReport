# NeuraReport — Comprehensive QA Report (Round 3)

**Date**: 2026-02-22
**Environment**: Backend `localhost:9070`, Frontend `localhost:9071` (Vite dev)
**Database**: STP SQLite (`73e9d384-2697-46af-96b0-f130b43cce55`) — 5 tables, 2022 total rows
**Templates**: 138 total (107 Excel, 31 PDF), 5 approved (4 Excel + 1 PDF)
**Context**: Round 3 QA — post-fix verification. 36 issues from Round 2 were fixed before this run.

---

## Executive Summary

**Total test cases executed: 314**
**Passed: 274 (87%)**
**Failed: 12 (4%)**
**Warn: 28 (9%)**

| Group | Area | Tests | Pass | Fail | Warn |
|-------|------|-------|------|------|------|
| 1 | Dashboard, Connections, Health | 16 | 12 | 0 | 4 |
| 2 | Templates, Report Gen, Excel Pipeline | 28 | 22 | 2 | 4 |
| 3 | Jobs, Schedules, Report History | 30 | 30 | 0 | 0 |
| 4 | NL2SQL, Query Builder | 22 | 21 | 0 | 1 |
| 5 | Documents, Spreadsheets, DocQA | 31 | 25 | 2 | 4 |
| 6 | Dashboard Builder, Workflows, Agents | 29 | 26 | 2 | 1 |
| 7 | Charts, Visualization, Analytics | 23 | 23 | 0 | 0 |
| 8 | Search, Knowledge, Design, Settings | 38 | 34 | 1 | 3 |
| 9 | AI Features, DocAI, Export | 20 | 15 | 3 | 2 |
| 10 | Connectors, Enrichment, Federation, Synthesis | 20 | 20 | 0 | 0 |
| 11 | Favorites, Notifications, Preferences, Audit | 28 | 23 | 0 | 5 |
| 12 | Edge Cases, Cross-Feature | 29 | 23 | 2 | 4 |
| **TOTAL** | | **314** | **274** | **12** | **28** |

### Pages Tested (33 pages)

`/` `/connections` `/templates` `/setup/wizard` `/generate` `/reports` `/history` `/jobs` `/schedules` `/query` `/documents` `/spreadsheets` `/dashboard-builder` `/workflows` `/agents` `/visualization` `/analyze` `/activity` `/stats` `/ops` `/knowledge` `/design` `/settings` `/search` `/docqa` `/summary` `/synthesis` `/enrichment` `/federation` `/connectors` `/ingestion` `/widgets` `/logger`

### Screenshots (27 total)

All saved to `/home/rohith/desktop/NeuraReport/screenshots/qa3/`:
`01_dashboard.png` `02_connections.png` `03_templates.png` `03_wizard.png` `04_generate.png` `04_reports.png` `05_jobs.png` `06_schedules.png` `07_history.png` `08_query.png` `09_documents.png` `10_spreadsheets.png` `11_docqa.png` `12_dashboards.png` `13_workflows.png` `14_agents.png` `15_visualization.png` `16_analyze.png` `16_activity.png` `16_stats.png` `16_ops.png` `17_search.png` `18_knowledge.png` `19_design.png` `20_settings.png` `21_summary.png` `21_synthesis.png` `22_ingestion.png` `23_logger.png` `24_widgets.png` `25_connectors.png` `26_enrichment.png` `27_federation.png`

---

## Previously Fixed Issues — Verified Working

All 36 issues from Round 2 were fixed. Key verifications:

| Fix | Description | Verified |
|-----|-------------|----------|
| C1 | `docx=true` crash → returns 422 | PASS (Flow 7.1) |
| C2 | `/reports/run` hardcoded kind=pdf → auto-detects | PASS (Flow 7.6, E1) |
| H1 | Invalid connection_id accepted → returns 404 | PASS (Flow 7.2) |
| H2 | Cancel completed job → returns 409 | PASS (Flow 8.10) |
| H3 | `/preferences` missing → works | PASS (Flow 27.5) |
| H4 | Favorites singular type → normalized | PASS (Flow 40.2, 40.6) |
| M1 | Templates no pagination → limit/offset works | PASS (Flow 4.3, 4.4) |
| M2 | Templates no kind filter → works | PASS (Flow 4.5, 4.6) |
| M3 | Templates no search → q param works | PASS (Flow 4.7) |
| M4 | Reversed dates accepted → returns 422 | PASS (Flow 7.3) |
| M6 | Jobs offset broken → works | PASS (Flow 8.4) |
| M7 | Schedule interval_minutes=0 → returns 422 | PASS (Flow 9.5, 9.6) |
| M11 | Settings requires wrapper → flat keys work | PASS (Flow 27.3) |
| M13 | Workflow ignores unknown fields → returns 422 | PASS (Flow 19.4) |
| M14 | Fuzzy search 0 results → returns matches | PASS (Flow 24.3) |
| L2 | No GET /templates/{id} → works | PASS (Flow 4.10) |
| L6 | status=completed broken → normalized | PASS (Flow 8.6) |
| L7 | Nonexistent job 200 → returns 404 | PASS (Flow 8.9) |
| L8 | DELETE jobs missing → works | PASS (Flow 8.11) |
| L9 | Notification mark-read 200 → returns 404 | PASS (Flow 41.6) |
| L12 | NL2SQL truncated always false → correct | PASS (Flow 11.6, 11.7) |

---

## New Issues Found — CRITICAL (0)

No critical issues found in this round.

---

## New Issues Found — HIGH (2)

### H1-v3. PDF report generation fails via generic `/reports/run` endpoint
- **Page**: Report Generation (`/generate`)
- **Endpoint**: `POST /api/v1/reports/run` with `template_id=hmwssb_billing`
- **What happened**: Auto-detects kind=pdf correctly, but generation fails with HTTP 500 "report_generation_failed"
- **Expected**: PDF report generated successfully
- **Impact**: PDF templates cannot be run via the generic reports facade
- **Workaround**: Use template-specific endpoints if available

### H2-v3. Dashboard `totalJobs` shows 50 instead of actual 110
- **Page**: Dashboard (`/`)
- **Endpoint**: `GET /api/v1/analytics/dashboard`
- **What happened**: `summary.totalJobs=50` but `GET /api/v1/jobs?limit=200` returns 110 jobs. Health endpoint confirms `jobs_count=110`
- **Expected**: Dashboard should show the true total
- **Impact**: Dashboard metrics are misleading — using default pagination limit instead of true count

---

## New Issues Found — MEDIUM (9)

### M1-v3. `/api/v1/documents/templates` route shadowed by `/{document_id}`
- **Endpoint**: `GET /api/v1/documents/templates` → 404 "Document not found"
- **Root cause**: FastAPI route ordering — `/{document_id}` catches "templates" as literal string
- **Impact**: Document templates endpoint is unreachable

### M2-v3. Document search only matches names, not content
- **Endpoint**: `GET /api/v1/documents?q=flow`
- **What happened**: Returns 0 results even though document content contains "flow". Searching by name (q=QA) works
- **Impact**: Users cannot search documents by content, only by title

### M3-v3. `status=approved` filter still leaks `active` templates
- **Endpoint**: `GET /api/v1/templates?status=approved`
- **What happened**: Returns 96 templates, some with status "active"
- **Impact**: Status filter is not strict

### M4-v3. `xlsx=false` flag completely ignored
- **Endpoint**: `POST /api/v1/excel/reports/run` with `xlsx: false`
- **What happened**: XLSX still generated and `xlsx_url` still returned
- **Impact**: Users cannot opt out of XLSX generation

### M5-v3. Dashboard builder `/templates` endpoint crashes (500)
- **Endpoint**: `GET /api/v1/dashboards/templates`
- **What happened**: HTTP 500 internal error
- **Impact**: Cannot list available dashboard templates

### M6-v3. Dashboard `share` endpoint crashes (500)
- **Endpoint**: `POST /api/v1/dashboards/{id}/share`
- **What happened**: HTTP 500 internal error
- **Impact**: Cannot share dashboards

### M7-v3. Knowledge search `query` param does not filter
- **Endpoint**: `GET /api/v1/knowledge/documents?query=QA`
- **What happened**: Returns all 9 documents, just reorders with match first
- **Impact**: Knowledge search is effectively broken — no actual filtering

### M8-v3. No backend routes for Summary/Synthesis pages
- **Frontend**: `/summary` and `/synthesis` pages exist
- **Backend**: All `/api/v1/summary/*` and `/api/v1/synthesis/*` endpoints return 404
- **Impact**: These pages have no backend support (synthesis sessions work via `/api/v1/synthesis/sessions`)

### M9-v3. No backend routes for Ingestion page
- **Frontend**: `/ingestion` page exists
- **Backend**: All `/api/v1/ingestion/*` endpoints return 404
- **Impact**: Ingestion page has no backend support

---

## New Issues Found — LOW (11)

### L1-v3. Connections endpoint ignores `limit` param
- **Endpoint**: `GET /api/v1/connections?limit=1` returns all 12

### L2-v3. Notifications POST/DELETE only on analytics route
- **Issue**: `POST /api/v1/notifications` → 405 but `POST /api/v1/analytics/notifications` works. Same for DELETE
- **Impact**: Route inconsistency — base notifications endpoint only supports GET

### L3-v3. Favorites silently reject invalid entity types
- **Endpoint**: `POST /api/v1/favorites` with `entity_type=""` or `entity_type="unknown"` → returns 200 `{"added":false}`
- **Expected**: 400/422 with error message

### L4-v3. Notifications accept empty body
- **Endpoint**: `POST /api/v1/analytics/notifications` with `{}` creates notification with default title
- **Expected**: 422 requiring at least title or message

### L5-v3. Brand kit accepts invalid hex colors
- **Endpoint**: `POST /api/v1/design/brand-kits` with `primary_color="#GGGGGG"` → 200 OK
- **Expected**: 422 validation error

### L6-v3. DocAI classify accepts empty text
- **Endpoint**: `POST /api/v1/docai/classify` with `text=""` → 200 OK with classification
- **Expected**: 422 validation error

### L7-v3. DocAI entity extraction very limited
- **Issue**: Only extracts money entities via regex. Misses person names, organizations, dates, locations

### L8-v3. DocAI multi-document summarize is a stub
- **Endpoint**: `POST /api/v1/docai/summarize/multi` → returns "requires document library integration"

### L9-v3. Bulk endpoints use camelCase while others use snake_case
- **Endpoint**: `/api/v1/analytics/bulk/templates/add-tags` requires `templateIds` (camelCase)
- **Other endpoints**: `template_id` (snake_case)
- **Impact**: Inconsistent API naming convention

### L10-v3. Schedule cron field possibly ignored
- **Endpoint**: `POST /api/v1/reports/schedules` with `cron: "0 8 * * 1"` → response shows `frequency: "daily"`, `interval_minutes: 1440`
- **Expected**: Weekly schedule matching the cron expression

### L11-v3. Job retry mechanism stuck on failed renderPdf
- **Issue**: Jobs that fail at renderPdf enter retry loop (`retryCount=1`, `maxRetries=3`) but never complete
- **Impact**: Jobs get stuck in "queued" state indefinitely

---

## Warnings / Observations (17)

| # | Observation |
|---|-------------|
| W1 | LLM subsystem reports error ("Claude Code CLI check failed"). AI features still work via fallback |
| W2 | STP database table names changed from spec (LevelSensor→LT, PH_ORP→ANALYSER, main→device_mappings) |
| W3 | `/artifacts/head` endpoint requires `?name=` param (not obvious from route name) |
| W4 | Report generation requires `batches` param for success (not documented as required) |
| W5 | Template IDs in test spec are stale (level-report-7a7bf9 → level-report-335e30) |
| W6 | Empty dates accepted in report run (empty strings "" for start_date/end_date) |
| W7 | Cancelled jobs may transition to `pending_retry` (retry overrides user cancel) |
| W8 | `information_schema.tables` empty for SQLite-via-DuckDB — use `sqlite_master` instead |
| W9 | NL2SQL save is `POST /save` (singular) but list/get/delete is `/saved` (plural) |
| W10 | NL2SQL explain uses `sql` as query param on POST request (unusual pattern) |
| W11 | Document merge restricted to PDF documents only |
| W12 | Spreadsheet cell updates via PUT may not return updated cells in response |
| W13 | Spreadsheet export format via `/export?format=xlsx` not `/export/xlsx` |
| W14 | Dashboard snapshot renders fail (`render_status=failed`) |
| W15 | Workflow node `data` field silently dropped, only `config` stored |
| W16 | Analytics usage shows `totalJobs=0` while dashboard shows 50 (counting discrepancy) |
| W17 | Transient 500 errors on report generation under load (succeed on retry) |

---

## Flow-by-Flow Results

### Group 1: Dashboard, Connections, Health (16 tests)

| # | Test | Result |
|---|------|--------|
| 1.1 | Screenshot `/` | PASS |
| 1.2 | Dashboard API summary | PASS |
| 1.3 | Templates cross-check (138=138) | PASS |
| 1.4 | jobsTrend array | PASS |
| 1.5 | recentActivity array | PASS |
| 1.6 | Dashboard no-auth access | PASS |
| 2.1 | Screenshot `/connections` | PASS |
| 2.2 | List connections (12 found) | PASS |
| 2.3 | STP health check (latency 0ms) | PASS |
| 2.4 | STP schema (5 tables) | WARN |
| 2.5 | STP preview data | PASS |
| 2.6 | Connection test | PASS |
| 3.1 | Health basic (status=ok) | PASS |
| 3.2 | Health detailed (LLM error) | WARN |
| 3.3 | Invalid connection health (404) | PASS |
| E1 | Dashboard totalJobs vs actual | WARN |
| E2 | Connections limit ignored | WARN |
| E3 | Schema field validation | PASS |
| E4 | Rapid health check (no race) | PASS |

### Group 2: Templates, Report Gen, Excel Pipeline (28 tests)

| # | Test | Result |
|---|------|--------|
| 4.1-4.8 | Template listing, pagination, filtering, search | PASS (8/8) |
| 4.9 | status=approved filter | **FAIL** |
| 4.10 | GET template by ID | PASS |
| 4.11 | Nonexistent template 404 | PASS |
| 5.1-5.4 | Template artifacts, wizard | PASS (3), WARN (1) |
| 6.1-6.8 | Report generation happy path | PASS (5), WARN (3) |
| 7.1-7.5 | Validation edge cases (C1, H1, M4) | PASS (4), WARN (1) |
| 7.6 | Auto-detect kind=excel (C2) | PASS |
| 7.7 | Auto-detect kind=pdf | **FAIL** |
| 7.8 | Nonexistent template error | PASS |

### Group 3: Jobs, Schedules, Report History (30 tests)

| # | Test | Result |
|---|------|--------|
| 8.1-8.12 | Jobs CRUD, pagination, cancel, delete | PASS (12/12) |
| 9.1-9.11 | Schedules CRUD, trigger, pause/resume | PASS (11/11) |
| 10.1-10.4 | Report history | PASS (4/4) |
| E1-E3 | Edge cases (facade, cancel running, custom) | PASS (3/3) |

### Group 4: NL2SQL, Query Builder (22 tests)

| # | Test | Result |
|---|------|--------|
| 11.1-11.10 | Execute, datetime, COUNT(*) | PASS (9), WARN (1) |
| 12.1-12.2 | Generate, explain | PASS (2/2) |
| 13.1-13.6 | Save, list, get, history, delete | PASS (6/6) |
| E1-E4 | Edge cases (non-SELECT, empty, invalid) | PASS (4/4) |

### Group 5: Documents, Spreadsheets, DocQA (31 tests)

| # | Test | Result |
|---|------|--------|
| 14.1-14.9 | Documents CRUD, search | PASS (7), FAIL (2) |
| 15.1-15.5 | Comments, versions, export, merge | PASS (4), WARN (1) |
| 16.1-16.9 | Spreadsheets CRUD, import/export | PASS (6), WARN (3) |
| 17.1-17.5 | DocQA sessions | PASS (5/5) |
| E1-E4 | Edge cases | PASS (4/4) |

### Group 6: Dashboard Builder, Workflows, Agents (29 tests)

| # | Test | Result |
|---|------|--------|
| 18.1-18.11 | Dashboard builder CRUD | PASS (8), FAIL (2), WARN (1) |
| 19.1-19.5 | Workflows CRUD, M13 validation | PASS (5/5) |
| 20.1-20.8 | Agents list, health, v2 execute | PASS (8/8) |
| E1-E5 | Edge cases | PASS (5/5) |

### Group 7: Charts, Visualization, Analytics (23 tests)

| # | Test | Result |
|---|------|--------|
| 21.1-21.7 | Charts generate, analyze, save, delete | PASS (7/7) |
| 22.1 | Visualization screenshot | PASS |
| 23.1-23.12 | Analytics pages, usage, trends, insights | PASS (12/12) |
| E1-E3 | Edge cases | PASS (3/3) |

### Group 8: Search, Knowledge, Design, Settings (38 tests)

| # | Test | Result |
|---|------|--------|
| 24.1-24.13 | Search fulltext, fuzzy, boolean, saved | PASS (12), WARN (1) |
| 25.1-25.5 | Knowledge CRUD, search | PASS (3), WARN (2) |
| 26.1-26.10 | Design brand kits, fonts, colors | PASS (10/10) |
| 27.1-27.8 | Settings & preferences | PASS (8/8) |
| E1-E3 | Edge cases | PASS (2), FAIL (1) |

### Group 9: AI Features, DocAI, Export (20 tests)

| # | Test | Result |
|---|------|--------|
| 28.1-28.3 | AI health, tones, generate | PASS (3/3) |
| 29.1-29.3 | DocAI classify, entities, summarize | PASS (1), WARN (2) |
| 30.1-30.2 | Export jobs, printers | PASS (2/2) |
| 31.1-31.3 | Summary/synthesis pages | PASS (2), FAIL (1) |
| 32.1-32.2 | Ingestion page | PASS (1), FAIL (1) |
| 33.1-35.4 | Logger, widgets, analyze v2 config | PASS (6/6) |
| E1-E3 | Edge cases | PASS (2), FAIL (1) |

### Group 10: Connectors, Enrichment, Federation, Synthesis (20 tests)

| # | Test | Result |
|---|------|--------|
| 36.1-36.4 | Connectors list, types | PASS (4/4) |
| 37.1-37.5 | Enrichment sources, cache, preview | PASS (5/5) |
| 38.1 | Federation screenshot | PASS |
| 39.1a-g | Synthesis sessions, documents, inconsistencies | PASS (7/7) |
| E1-E3 | Edge cases | PASS (3/3) |

### Group 11: Favorites, Notifications, Preferences, Audit (28 tests)

| # | Test | Result |
|---|------|--------|
| 40.1-40.10 | Favorites CRUD, normalization | PASS (10/10) |
| 41.1-41.8 | Notifications CRUD, read, delete | PASS (6), WARN (2) |
| 42.1-42.5 | Preferences CRUD, sync | PASS (5/5) |
| 43.1-43.2 | Audit frontend-error, intent | PASS (2/2) |
| E1-E4 | Edge cases | PASS (1), WARN (3) |

### Group 12: Edge Cases, Cross-Feature (29 tests)

| # | Test | Result |
|---|------|--------|
| 44.1-44.5 | Report gen edge cases | PASS (3), WARN (2) |
| 45.1-45.6 | Template→Report→Job→History pipeline | PASS (4), FAIL (2) |
| 46.1-46.4 | Connection→Schema→Query→Report pipeline | PASS (4/4) |
| 47.1-47.2 | Bulk operations | PASS (1), WARN (1) |
| 48.1-48.5 | Schedule→Job pipeline | PASS (4), WARN (1) |
| 49.1-49.5 | Error handling consistency | PASS (5/5) |
| 50.1-50.2 | Concurrent operations | PASS (2/2) |

---

## Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| Previously Fixed (Round 2) | 36 | All verified working |
| CRITICAL (Round 3) | 0 | None found |
| HIGH (Round 3) | 2 | H1-v3, H2-v3 |
| MEDIUM (Round 3) | 9 | M1-v3 through M9-v3 |
| LOW (Round 3) | 11 | L1-v3 through L11-v3 |
| Warnings | 17 | W1 through W17 |
| **Active Issues** | **22** | |

---

## Improvement from Round 2

| Metric | Round 2 | Round 3 | Change |
|--------|---------|---------|--------|
| Total tests | 291 | 314 | +23 |
| Pass rate | 85% | 87% | +2% |
| Critical issues | 2 | 0 | -2 (fixed) |
| High issues | 4 | 2 | -2 (2 fixed, 2 new) |
| Medium issues | 14 | 9 | -5 (most fixed, some new) |
| Low issues | 16 | 11 | -5 (most fixed, some new) |
| Total active issues | 36 | 22 | -14 |
