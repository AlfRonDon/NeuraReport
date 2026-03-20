# NeuraReport — Issues Report (Round 3 QA)

**Date**: 2026-02-22
**Tester**: Claude (End-to-End QA — Round 3, Post-Fix Verification)
**Scope**: 33 pages, 314 test cases across 12 groups, 50 flows, 577 API endpoints
**Backend**: localhost:9070 | **Frontend**: localhost:9071

---

## Legend
- **HIGH**: Feature broken / unusable for end users
- **MEDIUM**: Feature partially broken, workaround exists
- **LOW**: Cosmetic, minor UX issue, or non-blocking
- **WARN**: Observation, not necessarily a bug

---

## HIGH (2)

### H1-v3. PDF report generation fails via generic `/reports/run`
- **Severity**: HIGH
- **Page**: Report Generation (`/generate`)
- **Endpoint**: `POST /api/v1/reports/run` with `template_id=hmwssb_billing`
- **What I did**: Ran the HMWSSB PDF template through the generic reports facade
- **What I expected**: PDF report generated successfully
- **What happened**: Auto-detects kind=pdf correctly, but generation fails with HTTP 500 "report_generation_failed"
- **Impact**: PDF templates cannot be run via the generic reports facade. Excel templates work fine via the same endpoint.
- **Workaround**: None for PDF generation via this route

### H2-v3. Dashboard `totalJobs` shows 50 instead of actual 110
- **Severity**: HIGH
- **Page**: Dashboard (`/`)
- **Endpoint**: `GET /api/v1/analytics/dashboard`
- **What I did**: Compared dashboard summary with actual job count
- **What I expected**: `totalJobs` reflects true count
- **What happened**: Dashboard reports `totalJobs=50`, but `GET /api/v1/jobs?limit=200` returns 110 jobs. Health endpoint confirms `jobs_count=110`.
- **Root cause**: Dashboard likely uses default limit (50) when counting jobs instead of total count
- **Impact**: Dashboard metrics are misleading

---

## MEDIUM (9)

### M1-v3. `/api/v1/documents/templates` route shadowed by `/{document_id}`
- **Severity**: MEDIUM
- **Endpoint**: `GET /api/v1/documents/templates`
- **What happened**: Returns 404 "Document not found" — treats "templates" as a document ID
- **Root cause**: FastAPI route ordering — `/{document_id}` registered before static `/templates` route
- **Fix**: Register `/templates` route BEFORE `/{document_id}` in the router

### M2-v3. Document search only matches names, not content
- **Severity**: MEDIUM
- **Endpoint**: `GET /api/v1/documents?q=flow`
- **What happened**: Returns 0 results even though document content contains "flow". Searching by name works.
- **Impact**: Content search not implemented for documents

### M3-v3. `status=approved` filter leaks `active` templates
- **Severity**: MEDIUM
- **Endpoint**: `GET /api/v1/templates?status=approved`
- **What happened**: Returns 96 templates, includes some with status "active"
- **Impact**: Status filter treats "active" as equivalent to "approved"

### M4-v3. `xlsx=false` flag completely ignored
- **Severity**: MEDIUM
- **Endpoint**: `POST /api/v1/excel/reports/run` with `xlsx: false`
- **What happened**: XLSX still generated and `xlsx_url` returned
- **Impact**: Cannot opt out of XLSX generation to save processing time

### M5-v3. Dashboard builder `/templates` crashes (500)
- **Severity**: MEDIUM
- **Endpoint**: `GET /api/v1/dashboards/templates`
- **What happened**: HTTP 500 internal error
- **Impact**: Cannot list or use dashboard templates

### M6-v3. Dashboard `share` crashes (500)
- **Severity**: MEDIUM
- **Endpoint**: `POST /api/v1/dashboards/{id}/share`
- **What happened**: HTTP 500 internal error
- **Impact**: Cannot share dashboards with users

### M7-v3. Knowledge search `query` param doesn't filter
- **Severity**: MEDIUM
- **Endpoint**: `GET /api/v1/knowledge/documents?query=QA`
- **What happened**: Returns all 9 documents, just reorders with match first
- **Impact**: Knowledge search is effectively broken

### M8-v3. No backend routes for Summary and Ingestion pages
- **Severity**: MEDIUM
- **Frontend**: `/summary` and `/ingestion` pages render
- **Backend**: All `/api/v1/summary/*` and `/api/v1/ingestion/*` return 404
- **Note**: Synthesis sessions work via a different endpoint (`/api/v1/synthesis/sessions`)

### M9-v3. Usage analytics reports 0 jobs when dashboard shows 50
- **Severity**: MEDIUM
- **Endpoint**: `GET /api/v1/analytics/usage?period=week` → `totalJobs: 0`
- **Dashboard**: `GET /api/v1/analytics/dashboard` → `totalJobs: 50`
- **Impact**: Usage analytics and dashboard metrics are inconsistent

---

## LOW (11)

### L1-v3. Connections endpoint ignores `limit` param
- **Endpoint**: `GET /api/v1/connections?limit=1` returns all 12 connections

### L2-v3. Notifications POST/DELETE only work on analytics route
- **Issue**: `POST /api/v1/notifications` → 405. Must use `POST /api/v1/analytics/notifications`
- **Same for**: DELETE. Route inconsistency.

### L3-v3. Favorites silently reject invalid entity types
- **Endpoint**: `POST /api/v1/favorites` with `entity_type=""` or `"unknown"` → 200 `{"added":false}`
- **Expected**: 400/422 with descriptive error

### L4-v3. Notifications accept empty body
- **Endpoint**: `POST /api/v1/analytics/notifications` with `{}` creates notification with default title
- **Expected**: 422 requiring at least title or message

### L5-v3. Brand kit accepts invalid hex colors
- **Endpoint**: `POST /api/v1/design/brand-kits` with `primary_color="#GGGGGG"` → 200 OK
- **Expected**: 422 validation error for invalid hex format

### L6-v3. DocAI classify accepts empty text
- **Endpoint**: `POST /api/v1/docai/classify` with `text=""` → 200 OK with classification
- **Expected**: 422 validation error

### L7-v3. DocAI entity extraction very limited
- **Issue**: Only extracts money entities via regex. Misses person names, organizations, dates, locations from clearly structured text.

### L8-v3. DocAI multi-document summarize is a stub
- **Endpoint**: `POST /api/v1/docai/summarize/multi` → returns canned "requires document library integration"

### L9-v3. API naming convention inconsistency (camelCase vs snake_case)
- **Bulk endpoints**: `templateIds`, `jobIds` (camelCase)
- **Schedule/Report endpoints**: `template_id`, `connection_id` (snake_case)
- **Impact**: Confusing developer experience

### L10-v3. Schedule cron field possibly ignored
- **Endpoint**: `POST /api/v1/reports/schedules` with `cron: "0 8 * * 1"` (weekly Monday)
- **Response**: `frequency: "daily"`, `interval_minutes: 1440` — doesn't match cron expression

### L11-v3. Job retry mechanism stuck on renderPdf failures
- **Issue**: Jobs that fail at renderPdf enter retry loop but never reach terminal state
- **Impact**: Jobs stuck in "queued" indefinitely after certain failures

---

## Test Coverage Summary

| Category | Tests | Pass | Fail | Warn | Rate |
|----------|-------|------|------|------|------|
| Dashboard + Connections + Health | 16 | 12 | 0 | 4 | 100% |
| Templates + Report Gen | 28 | 22 | 2 | 4 | 93% |
| Jobs + Schedules + History | 30 | 30 | 0 | 0 | 100% |
| NL2SQL + Query Builder | 22 | 21 | 0 | 1 | 100% |
| Documents + Spreadsheets + DocQA | 31 | 25 | 2 | 4 | 94% |
| Dashboard Builder + Workflows + Agents | 29 | 26 | 2 | 1 | 93% |
| Charts + Visualization + Analytics | 23 | 23 | 0 | 0 | 100% |
| Search + Knowledge + Design + Settings | 38 | 34 | 1 | 3 | 97% |
| AI + DocAI + Export | 20 | 15 | 3 | 2 | 85% |
| Connectors + Enrichment + Federation + Synthesis | 20 | 20 | 0 | 0 | 100% |
| Favorites + Notifications + Preferences + Audit | 28 | 23 | 0 | 5 | 100% |
| Edge Cases + Cross-Feature | 29 | 23 | 2 | 4 | 93% |
| **TOTAL** | **314** | **274** | **12** | **28** | **96%** |

(Pass rate excludes WARN from failure count)
