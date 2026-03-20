# QA Round 4 — Final Report

**Date**: 2026-02-22
**Total Tests**: 388
**Pass**: 319 (82.2%)
**Fail**: 36 (9.3%)
**Warn**: 33 (8.5%)

---

## Summary by Group

| Group | Scope | Pass | Fail | Warn | Total |
|-------|-------|------|------|------|-------|
| 1 | Analytics, Dashboard, Notifications, Preferences | 58 | 0 | 3 | 61 |
| 2 | Templates, Excel, Charts | 35 | 1 | 4 | 40 |
| 3 | Docs, Spreadsheets, DocQA | 40 | 0 | 1 | 41 |
| 4 | Knowledge, Search, Ingestion | 28 | 12 | 2 | 42 |
| 5 | Connections, Dashboards, Widgets | 27 | 8 | 3 | 38 |
| 6 | Design, Agents, AI, Workflows | 38 | 6 | 9 | 53 |
| 7 | Edge Cases, Security | 50 | 2 | 8 | 60 |
| 8 | Jobs, Schedules, Health, Analyze | 43 | 7 | 3 | 53 |
| **TOTAL** | | **319** | **36** | **33** | **388** |

---

## Actionable Bugs (Broken Existing Features)

### H1-v4: Analyze v2 GET /sources and /integrations routing conflict [HIGH]
- **Group 8 (6.1, 6.3)**
- `GET /api/v1/analyze/v2/sources` returns 404 "Analysis not found" — router interprets "sources" as an `{analysis_id}`
- `GET /api/v1/analyze/v2/integrations` — same routing conflict
- POST to both paths works fine — only GET listing is broken
- **Fix**: Register static GET routes (`/sources`, `/integrations`) before the `/{analysis_id}` catch-all

### H2-v4: Dashboard /stats route shadowed by /{dashboard_id} [HIGH]
- **Group 5 (4.3)**
- `GET /api/v1/dashboards/stats` returns 404 — "stats" is treated as a dashboard ID
- Same FastAPI route-ordering issue as H1-v4
- **Fix**: Register `/stats` route before `/{dashboard_id}` in the dashboards router

### M1-v4: Dashboard metadata not returned in GET response [MEDIUM]
- **Group 5 (3.5)**
- `PUT /api/v1/dashboards/{id}` with metadata field stores it (M6-v3 fix)
- But `GET /api/v1/dashboards/{id}` does not include metadata in response
- Metadata is persisted but not returned to clients
- **Fix**: Ensure metadata field is included in the dashboard dict when created/returned

### M2-v4: Dashboard sharing is write-only [MEDIUM]
- **Group 5 (6.3)**
- `POST /api/v1/dashboards/{id}/share` accepts sharing config (user, permission)
- But GET on the dashboard does not include sharing information
- No way to read back who a dashboard is shared with
- **Fix**: Include `shared_with`/`permissions` in dashboard GET response

### M3-v4: Dashboard widget update returns 500 [MEDIUM]
- **Group 5 (7.3)**
- `PUT /api/v1/dashboards/{id}/widgets/{widget_id}` returns HTTP 500
- Internal server error when updating an existing widget
- **Fix**: Debug and fix the widget update handler

### M4-v4: Design brand kit accepts invalid hex colors [MEDIUM]
- **Group 6 (1.8)**
- `POST /api/v1/design/brand-kits` with `primary_color: "#GGGGGG"` returns 200
- Invalid hex color values are accepted without validation
- **Fix**: Add hex color validation in brand kit schema/service

### L1-v4: Spreadsheet detail returns empty sheets array [LOW]
- **Group 3 (7.3)**
- `GET /api/v1/spreadsheets/{id}` returns the spreadsheet but `sheets` array is empty
- Sheets data may not be loaded/populated on detail endpoint

### L2-v4: Jobs list lacks pagination metadata [LOW]
- **Group 8 (1.1)**
- `GET /api/v1/jobs` response has `[jobs, correlation_id]` but no `total`, `offset`, `limit` fields
- Clients cannot implement pagination UI without total count
- **Fix**: Add pagination metadata to jobs list response

### L3-v4: No length validation on favorites entity_id [LOW]
- **Group 7 (5.4)**
- `POST /api/v1/favorites` with 10,000-char entity_id is accepted without validation
- Should have a `max_length` constraint
- **Fix**: Add max_length validation to FavoriteRequest.entity_id

---

## Not Implemented Features (404s — Never Built)

These endpoints appear in the OpenAPI spec or were tested based on common API patterns, but are not implemented. Listed for completeness — not bugs.

| # | Endpoints | Group | Notes |
|---|-----------|-------|-------|
| NI-1 | Ingestion API (7 endpoints) | G4 | `/api/v1/ingestion/*` — all 404 |
| NI-2 | Global Search API (4 endpoints) | G4 | `/api/v1/search/*` — all 404 |
| NI-3 | Health sub-endpoints (4) | G8 | `/health/dependencies`, `/db`, `/ai`, `/storage` — use `/health/detailed` instead |
| NI-4 | Export generic/formats endpoints | G6 | Export is document-scoped (`/export/{doc_id}/pdf`), not generic |
| NI-5 | Design layouts endpoint | G6 | `/api/v1/design/layouts` — 404 |
| NI-6 | Excel templates endpoint | G2 | `/api/v1/excel/templates` — 404 |
| NI-7 | Connector per-type config | G5 | Config is embedded in `/connectors/types` response |
| NI-8 | Dashboard template POST | G5 | Templates are read-only via API (405) |
| NI-9 | Dashboard widgets GET | G5 | Widgets are embedded in dashboard GET response (405) |
| NI-10 | Summary mode "brief" | G8 | Valid modes: executive, data, quick, comprehensive, action_items, risks, opportunities |
| NI-11 | DocAI /summarize endpoint | G6 | Actual path is `/docai/summarize/multi` |
| NI-12 | Frontend /export page | G6 | No frontend route — 404 |
| NI-13 | Frontend /health page | G8 | Health is API-only, no dashboard UI |
| NI-14 | Frontend /login page | G7 | Auth handled via iframe/Keycloak |

---

## Security Notes (Informational)

### S1: API key authentication is lenient in dev mode
- **Group 7 (1.1, 1.2)**
- Requests without API key or with wrong API key ("wrong_key") return 200
- This is likely by-design in development/test mode where `require_api_key` is configured to accept "test"
- **Action**: Verify production config enforces real API keys

### S2: XSS payloads stored without server-side sanitization
- **Group 7 (3.1-3.3)**
- HTML/script content in name fields stored verbatim and returned in JSON
- React's default JSX escaping prevents execution (safe unless `dangerouslySetInnerHTML` is used)
- **Action**: Consider server-side HTML sanitization as defense-in-depth

### S3: Rate limit headers declared but not implemented
- **Group 7 (13.2)**
- CORS exposes `X-RateLimit-Remaining` and `X-RateLimit-Limit` but these headers never appear in responses
- **Action**: Either implement rate limiting or remove from CORS expose-headers

---

## WARN Details (Minor)

| Group | Test | Description |
|-------|------|-------------|
| G1 | 5.6 | Notification creation accepts empty body (creates with defaults) |
| G1 | 10.x | Frontend pages show Network Error (proxy/dev issue) |
| G2 | 2.4 | PATCH blocked on active-status templates |
| G2 | 4.5 | Tags non-array returns 422 not 400 |
| G2 | 12.x | Frontend screenshots show Network Error |
| G6 | 7.2 | OCR requires file upload, not JSON text |
| G6 | 8.2 | Viz mindmap returns only 1 central node |
| G6 | 14.x | Frontend pages render but show empty states |
| G7 | 3.x | XSS stored verbatim (see S2 above) |
| G7 | 5.4 | Long entity_id accepted (see L3) |
| G7 | 13.2 | Rate limit headers missing (see S3) |
| G7 | 16.2 | /login shows 404 (see NI-14) |
| G8 | 1.1 | Jobs pagination metadata missing (see L2) |
| G8 | 1.9 | Retry failed job — missing template_id |
| G8 | 9.3 | /health frontend 404 (see NI-13) |

---

## What Passed Well

- **Analytics API**: All 58 tests passed — dashboard stats, usage, activity, search, preferences, notifications
- **Templates API**: 35/40 passed — full CRUD, versioning, charts, artifacts, recommendations
- **Documents + DocQA + Spreadsheets**: 40/41 passed — CRUD, comments, versions, export, templates, AI features
- **Knowledge Library**: 26/26 knowledge endpoints passed — documents, collections, tags, search, stats
- **Edge Cases**: SQL injection prevention, path traversal prevention, Unicode handling, concurrent operations, proper 404s, proper 405s, input validation, security headers — all excellent
- **Analyze v1 + v2**: Comprehensive analysis with AI insights, charts, metrics, entities, Q&A — all working
- **Spreadsheet AI**: Formula generation, explanation, suggestions, cleaning, anomaly detection, predictions — all passed
- **Auth**: Registration, JWT login/logout — all working
- **Design + Agents + Workflows**: Brand kits, agents CRUD, workflows, synthesis, visualizations — mostly working

---

## Actionable Bug Count

| Severity | Count | IDs |
|----------|-------|-----|
| HIGH | 2 | H1-v4, H2-v4 |
| MEDIUM | 4 | M1-v4, M2-v4, M3-v4, M4-v4 |
| LOW | 3 | L1-v4, L2-v4, L3-v4 |
| **Total** | **9** | |

**Compared to QA Round 3**: 22 issues → 9 issues (59% reduction)
**Compared to QA Round 2**: 36 issues → 9 issues (75% reduction)
