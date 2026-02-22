# NeuraReport — Full QA Issues & Bug Report (v2)

**Date**: 2026-02-22
**Tester**: Claude (End-to-End User Flow Testing — Round 2)
**Scope**: 30+ pages, 243 test cases (main flows + edge cases), real data verification against stp.db
**Backend**: localhost:9070 | **Frontend**: localhost:9071
**STP Connection**: `73e9d384-2697-46af-96b0-f130b43cce55` (5 tables, 2022 rows total)

---

## Legend
- **CRITICAL**: App crashes, data loss, or core feature completely broken
- **HIGH**: Feature broken / unusable for end users
- **MEDIUM**: Feature partially broken, workaround exists
- **LOW**: Cosmetic, minor UX issue, or non-blocking
- **FIXED**: Fixed in current or previous session

---

## Previously Fixed Issues (from Round 1)

| # | Issue | Fix Applied |
|---|-------|-------------|
| F1 | Playwright Chromium SIGTRAP crash during PDF generation | Subprocess-based `_pdf_worker.py` — now generates valid 234KB PDFs |
| F2 | NL2SQL datetime/DATE functions fail | Regex rewrite pipeline in `sqlite_loader.py` — all 11 datetime variants pass |
| F3 | `strftime()` infinite recursion in DuckDB | Removed alias macro that shadowed built-in — `strftime('%Y-%m','now')` returns `2026-02` |
| F4 | XLSX export returns CSV content | openpyxl-based export — now produces valid 4972-byte XLSX |
| F5 | 5 API endpoints returning 404 | Added routes for `/agents`, `/charts/saved`, `/settings`, `/favorites`, `/notifications` |
| F6 | Analytics dashboard shows all zeros | Fixed camelCase/snake_case key mismatch in `_sanitize_job()` |
| F7 | Search returns 0 results | Implemented `reindex_all()` with lazy indexing — now returns 250 docs |
| F8 | Schedule misfire grace time too strict | Changed default from 3600 to 0 (unlimited) |

---

## Current Issues — CRITICAL (2)

### C1. `docx=true` causes server crash (500 Internal Error)
- **Page**: Report Generation (`/generate`)
- **Endpoint**: `POST /api/v1/excel/reports/run` with `docx: true`
- **What I did**: Generated report with DOCX output enabled
- **What I expected**: Either a DOCX file or a clear "unsupported" error
- **What happened**: Request times out after 30s, then returns HTTP 500
- **Impact**: Server error on a user-facing parameter accepted by the schema
- **Recommendation**: Remove `docx` from schema or implement DOCX pipeline

### C2. `/api/v1/reports/jobs/run-report` endpoint broken
- **Page**: Jobs (`/jobs`)
- **Endpoint**: `POST /api/v1/reports/jobs/run-report`
- **What I did**: Queued report jobs for LEVEL_REPORT and FLOW_METER templates
- **What I expected**: Jobs complete successfully like `/api/v1/excel/jobs/run-report`
- **What happened**: Jobs queue but immediately fail: `template_id not found` at `contractCheck` step
- **Impact**: The "reports" facade route has a broken template lookup path
- **Workaround**: Use `/api/v1/excel/jobs/run-report` instead

---

## Current Issues — HIGH (4)

### H1. Invalid `connection_id` silently accepted in report generation
- **Endpoint**: `POST /api/v1/excel/reports/run`
- **What I did**: Passed `connection_id: "nonexistent"`
- **What I expected**: HTTP 404 or 422 error
- **What happened**: HTTP 200 — report generated with presumably empty data, no warning
- **Impact**: Users could generate misleading empty reports without realizing the connection is wrong

### H2. Cancel completed job corrupts job history
- **Endpoint**: `POST /api/v1/jobs/{completed_id}/cancel`
- **What I did**: Cancelled an already-succeeded job
- **What I expected**: HTTP 409 "Job already completed"
- **What happened**: HTTP 200 — status changed from `succeeded` to `cancelled`, error set to "Cancelled by user"
- **Impact**: Corrupts completed job records

### H3. `/api/v1/preferences` endpoint missing (404)
- **Endpoint**: `GET /api/v1/preferences`, `PUT /api/v1/preferences`
- **What I did**: Accessed preferences directly
- **What I expected**: Settings/preferences response
- **What happened**: HTTP 404
- **Workaround**: Use `/api/v1/analytics/preferences` instead
- **Impact**: Frontend may be calling the wrong path

### H4. Template favorites broken — always returns `added: false`
- **Endpoint**: `POST /api/v1/favorites` with valid template ID
- **What I did**: Added a favorite for `flow-meter-report-8c0bf6`
- **What I expected**: Template appears in favorites list
- **What happened**: `added: false`, template never appears. Only connections work
- **Partial workaround**: `/api/v1/analytics/favorites/templates/{id}` works (note: plural `templates` required)

---

## Current Issues — MEDIUM (14)

### M1. No pagination on templates list
- **Endpoint**: `GET /api/v1/templates?limit=5&offset=0`
- **Issue**: Returns all 138 templates (~158KB) regardless of `limit`/`offset` — parameters not in schema

### M2. No `kind` filter on templates
- **Endpoint**: `GET /api/v1/templates?kind=excel`
- **Issue**: Returns all 138 templates. `kind` parameter ignored — not in schema

### M3. No search/name filter on templates
- **Endpoint**: `GET /api/v1/templates?search=FLOW`
- **Issue**: Returns all 138 templates. No text search implemented

### M4. Reversed date range silently accepted
- **Endpoint**: `POST /api/v1/excel/reports/run` with `start_date: "2026-12-31"`, `end_date: "2020-01-01"`
- **Issue**: Generates report with empty data, no validation error

### M5. `xlsx=false` parameter ignored
- **Endpoint**: `POST /api/v1/excel/reports/run` with `xlsx: false`
- **Issue**: XLSX always generated regardless of parameter value

### M6. Job offset/pagination broken
- **Endpoint**: `GET /api/v1/jobs?limit=5&offset=1000`
- **Issue**: `offset` completely ignored — returns first 5 jobs instead of empty list

### M7. Schedule accepts `interval_minutes=0` and `-1` silently
- **Endpoint**: `POST /api/v1/reports/schedules`
- **Issue**: Silently overridden to 1440 (daily) with no validation error

### M8. Document tags not persisted
- **Endpoint**: `POST /api/v1/documents`, `PUT /api/v1/documents/{id}`
- **Issue**: `tags` accepted in request but always returns `[]`

### M9. Document search not implemented
- **Endpoints**: `POST /documents/search` → 405; `GET /documents?search=` → returns all unfiltered
- **Issue**: No working way to search documents

### M10. Knowledge base silently ignores `content` and `category` fields
- **Endpoint**: `POST /api/v1/knowledge/documents`
- **Issue**: Schema uses `description` and `document_type` instead — unknown fields silently dropped

### M11. Settings PUT requires non-obvious `{"updates":{...}}` wrapper
- **Endpoint**: `PUT /api/v1/settings`
- **Issue**: Flat payloads rejected with 422. Must use `{"updates": {...}}`

### M12. Usage analytics returns 0 jobs while dashboard shows 50
- **Endpoint**: `GET /api/v1/analytics/usage?period=week` and `?period=month`
- **Issue**: `totalJobs: 0` inconsistent with dashboard `totalJobs: 50`

### M13. Workflow API silently ignores `steps` field
- **Endpoint**: `POST /api/v1/workflows`
- **Issue**: Sending `steps` instead of `nodes`/`edges` returns 200 OK with empty graph

### M14. Fuzzy search returns 0 results for close typos
- **Endpoint**: `POST /api/v1/search/search` with `search_type: "fuzzy"`, `query: "flwo"`
- **Issue**: Returns 0 results but provides `did_you_mean: "flow"`. Should return approximate matches

---

## Current Issues — LOW (16)

### L1. Dashboard field naming: `totalJobs` not `totalReports`
- `GET /api/v1/analytics/dashboard` uses `totalJobs` instead of `totalReports`. `dailyStats` doesn't exist (uses `jobsTrend`)

### L2. No `GET /api/v1/templates/{id}` endpoint
- Only PATCH and DELETE supported. Must search full list for single template

### L3. Manifest route inconsistency
- `/api/v1/templates/{id}/artifacts/manifest` → 404, but `/api/v1/excel/{id}/artifacts/manifest` works

### L4. `docx_url` always null in report response
- Both runs return `docx_url: null` despite manifest showing `.docx` files from prior runs

### L5. Missing `finished_at`/`started_at` in report run details
- `GET /api/v1/reports/runs/{id}` only has `createdAt`, no timing fields

### L6. Jobs use `succeeded` not `completed` status
- `?status=completed` returns 0 results. Must use `?status=succeeded`

### L7. Nonexistent job returns 200 with `null`
- `GET /api/v1/jobs/nonexistent-id` returns `{"job":null}` HTTP 200 instead of 404

### L8. DELETE not supported on individual jobs
- `DELETE /api/v1/jobs/{id}` returns 405 Method Not Allowed

### L9. Nonexistent notification mark-read returns 200
- `POST /api/v1/notifications/fake-id/read` returns `{"status":"ok"}` instead of 404

### L10. Favorites entity type requires plural form
- `/analytics/favorites/template/{id}` → 400. Must use `templates` (plural)

### L11. `status=approved` filter leaks `active` templates
- Returns 96 results including 1 with status `active`

### L12. NL2SQL silently caps at 100 rows, reports `truncated: false`
- `LIMIT 10000` returns 100 rows with `truncated: false`, `total_count: null`

### L13. CSV import creates oversized spreadsheet (100x26 from 3x4 data)
- Default template size used instead of fitting to actual data dimensions

### L14. Agent type naming inconsistency
- List returns `type: "data_analyst"` but endpoint path is `/data-analysis`

### L15. Global vs template-scoped chart listing mismatch
- `GET /api/v1/charts/saved` returns empty even when template-scoped charts exist

### L16. Brand kit `font_family` schema inconsistency
- Accepted at top level in POST but returned nested inside `typography.font_family` in GET

---

## Info / Observations (5)

| # | Observation |
|---|-------------|
| I1 | `substr()` on timestamp columns fails in DuckDB — must use `CAST(... AS VARCHAR)` |
| I2 | `health/detailed` shows `llm.status: "error"` (Claude Code CLI check) and `openai: not_configured` |
| I3 | Memory usage ~1.7 GB RSS |
| I4 | Stale schedule "c ds" has `next_run_at: 2026-02-18` (4 days past) |
| I5 | Knowledge search uses `query` param not `q` (minor discoverability) |

---

## Test Coverage Summary

| Category | Tests | Pass | Fail | Rate |
|----------|-------|------|------|------|
| Core Flows (1-20) | 215 | 190 | 18 | 88% |
| Edge: Report Gen | 18 | 9 | 9 | 50% |
| Edge: NL2SQL + Connections | 28 | 28 | 0 | 100% |
| Edge: Jobs + Schedules + Analytics | 30 | 20 | 10 | 67% |
| **Total** | **291** | **247** | **37** | **85%** |

### Pages Tested (33 pages)
`/` `/connections` `/templates` `/setup/wizard` `/generate` `/reports` `/history` `/jobs` `/schedules` `/query` `/documents` `/spreadsheets` `/dashboard-builder` `/workflows` `/agents` `/visualization` `/analyze` `/activity` `/stats` `/ops` `/knowledge` `/design` `/settings` `/search` `/docqa` `/summary` `/enrichment` `/federation` `/synthesis` `/connectors` `/ingestion` `/widgets` `/logger`

### Screenshots (36 total)
All saved to `/home/rohith/desktop/NeuraReport/screenshots/qa2/`

---

## Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| Previously Fixed | 8 | All verified working |
| CRITICAL | 2 | C1 (docx crash), C2 (reports/jobs broken) |
| HIGH | 4 | H1-H4 |
| MEDIUM | 14 | M1-M14 |
| LOW | 16 | L1-L16 |
| Info | 5 | I1-I5 |
| **Active Total** | **36 issues** | |
