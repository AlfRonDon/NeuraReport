# NeuraReport — Comprehensive Project Plan

**Last Updated**: 2026-02-22
**Status**: QA Round 4 Complete — 388 tests, 82.2% pass rate, 9 actionable bugs remaining

---

## 1. Project Architecture

### Stack
- **Frontend**: React 19 + MUI 7 + Zustand + Vite 7 + TanStack React Query
- **Backend**: FastAPI + SQLAlchemy + Pydantic + uvicorn (port 9070)
- **Database**: SQLite (primary), PostgreSQL (via connections)
- **State**: JSON-based StateStore for dashboards/favorites/notifications/widgets
- **AI**: Claude CLI, OpenAI (optional), local LLM adapters
- **Embedding**: NeuraReport is served inside webshell iframe, proxied via `/neurareport` → `localhost:9071`, `/neurareport-api` → `localhost:9070`

### Key Directories
```
NeuraReport/
├── frontend/src/           # React SPA source
│   ├── app/                # App.jsx, theme.js, router config
│   ├── features/           # Feature containers (per-page)
│   ├── components/         # Shared components (layout, common)
│   ├── stores/             # Zustand store slices
│   └── styles/             # Shared styled components
├── backend/                # Source backend (development)
│   └── app/
│       ├── api/routes/     # FastAPI routers
│       ├── services/       # Business logic services
│       ├── schemas/        # Pydantic models
│       └── repositories/   # State store, DB access
├── prodo/                  # Production deployment snapshot
│   ├── backend/            # Running backend (systemd service)
│   └── frontend/           # Built frontend assets
└── screenshots/qa4/        # QA Round 4 screenshots (22 pages)
```

### Service Management
```bash
systemctl --user restart neurareport-backend.service   # Restart backend
cd frontend && npx vite --port 9071 --host             # Dev frontend
```

---

## 2. Frontend Pages (35 Routes)

| # | Route | Page | Status |
|---|-------|------|--------|
| 1 | `/` / `/dashboard` | DashboardPage | Working |
| 2 | `/connections` | ConnectionsPage | Working |
| 3 | `/templates` | TemplatesPage | Working |
| 4 | `/templates/new/chat` | TemplateChatCreatePage | Working |
| 5 | `/templates/:id/edit` | TemplateEditorPage | Working |
| 6 | `/jobs` | JobsPage | Working |
| 7 | `/reports` | ReportsPage | Working |
| 8 | `/schedules` | SchedulesPage | Working |
| 9 | `/analyze` | EnhancedAnalyzePage | Working |
| 10 | `/analyze/legacy` | AnalyzePage | Working |
| 11 | `/settings` | SettingsPage | Working |
| 12 | `/activity` | ActivityPage | Working |
| 13 | `/history` | HistoryPage | Working |
| 14 | `/stats` | UsageStatsPage | Working |
| 15 | `/ops` | OpsConsolePage | Working |
| 16 | `/query` | QueryBuilderPage | Working |
| 17 | `/enrichment` | EnrichmentConfigPage | Working |
| 18 | `/federation` | SchemaBuilderPage | Working |
| 19 | `/synthesis` | SynthesisPage | Working |
| 20 | `/docqa` | DocumentQAPage | Working |
| 21 | `/summary` | SummaryPage | Working |
| 22 | `/documents` | DocumentEditorPage | Working |
| 23 | `/spreadsheets` | SpreadsheetEditorPage | Working |
| 24 | `/dashboard-builder` | DashboardBuilderPage | Working |
| 25 | `/connectors` | ConnectorsPage | Working |
| 26 | `/workflows` | WorkflowBuilderPage | Working |
| 27 | `/agents` | AgentsPage | Working |
| 28 | `/search` | SearchPage | Working (API not implemented) |
| 29 | `/visualization` | VisualizationPage | Working |
| 30 | `/knowledge` | KnowledgePage | Working |
| 31 | `/design` | DesignPage | Working |
| 32 | `/ingestion` | IngestionPage | Working (API not implemented) |
| 33 | `/widgets` | WidgetsPage | Working |
| 34 | `/logger` | LoggerPage | Working |
| 35 | `/setup/wizard` | SetupWizard | Working |

**Special Routes**: `/generate` redirects to `/reports`, `*` catch-all → NotFoundPage

---

## 3. Backend API Groups (43 Groups, 502 Endpoints)

| # | Group | Prefix | Endpoints | QA Status |
|---|-------|--------|-----------|-----------|
| 1 | auth | `/auth`, `/users` | 3 | Tested (G7) — PASS |
| 2 | health | root | 7 | Tested (G8) — 5 PASS, 2 WARN (sub-endpoints not built) |
| 3 | connections | `/connections` | 6 | Tested (G5) — PASS |
| 4 | templates | `/templates` | 28 | Tested (G2) — 35/40 PASS |
| 5 | excel | `/excel` | 14 | Tested (G2) — PASS |
| 6 | reports | `/reports` | 10 | Tested (G2) — PASS |
| 7 | jobs | `/jobs` | 9 | Tested (G8) — 7 PASS, 2 WARN |
| 8 | schedules | `/reports/schedules` | 11 | Tested (G8) — PASS |
| 9 | analyze v1 | `/analyze` | ~15 | Tested (G8) — All PASS |
| 10 | analyze v2 | `/analyze/v2` | ~22 | Tested (G8) — 19 PASS, 3 FAIL (routing) |
| 11 | analytics | `/analytics` | 25 | Tested (G1) — All PASS |
| 12 | ai | `/ai` | 14 | Tested (G6, G8) — PASS |
| 13 | nl2sql | `/nl2sql` | 8 | Not tested |
| 14 | enrichment | `/enrichment` | 8 | Tested (G6) — All PASS |
| 15 | federation | `/federation` | 4 | Tested (G5) — 1 FAIL (500) |
| 16 | recommendations | `/recommendations` | 3 | Tested (G6) — All PASS |
| 17 | charts | `/charts` | 3 | Tested (G6) — All PASS |
| 18 | summary | `/summary` | 2 | Tested (G4) — PASS |
| 19 | synthesis | `/synthesis` | 7 | Tested (G6) — PASS |
| 20 | docqa | `/docqa` | 8 | Tested (G3) — All PASS |
| 21 | docai | `/docai` | 10 | Tested (G6) — 3 PASS, 1 FAIL, 3 WARN |
| 22 | documents | `/documents` | 28 | Tested (G3) — All PASS |
| 23 | spreadsheets | `/spreadsheets` | 26 | Tested (G3) — 9 PASS, 1 WARN |
| 24 | dashboards | `/dashboards` | 24 | Tested (G1, G5) — Most PASS, routing bugs |
| 25 | connectors | `/connectors` | 18 | Tested (G5) — PASS |
| 26 | workflows | `/workflows` | 23 | Tested (G6) — All PASS |
| 27 | export | `/export` | 23 | Tested (G6) — 1 PASS, 2 FAIL (not generic) |
| 28 | design | `/design` | 19 | Tested (G6) — 5 PASS, 2 FAIL |
| 29 | knowledge | `/knowledge` | 19 | Tested (G4) — All PASS |
| 30 | ingestion | `/ingestion` | 23 | Tested (G4) — All FAIL (not implemented) |
| 31 | search | `/search` | 14 | Tested (G4) — All FAIL (not implemented) |
| 32 | visualization | `/visualization` | 17 | Tested (G6) — 3 PASS, 1 WARN |
| 33 | widgets | `/widgets` | 9 | Tested (G5) — Partial |
| 34 | agents v1 | `/agents` | 27 | Tested (G6) — All PASS |
| 35 | agents v2 | `/agents/v2` | 38 | Tested (G6) — All PASS |
| 36 | logger | `/logger` | 9 | Tested (G6) — PASS |
| 37 | audit | `/audit` | 3 | Tested (G7) — All PASS |
| 38 | settings | `/settings` | 1 | Tested (G7) — PASS |
| 39 | preferences | `/preferences` | 1 | Tested (G1) — PASS |
| 40 | favorites | `/favorites` | 2 | Tested (G1) — PASS |
| 41 | notifications | `/notifications` | 3 | Tested (G1) — PASS |
| 42 | state | `/state` | 2 | Not tested |
| 43 | legacy | `/legacy` | 13 | Not tested |

---

## 4. QA Testing History

### Round 1 (Initial)
- Baseline testing, discovered fundamental issues

### Round 2
- **36 issues found** across all severity levels
- All 36 fixed

### Round 3 (314 test cases)
- **22 issues found** (H: 2, M: 9, L: 6, false positives: 5)
- Issues fixed:
  - H1: Document /templates endpoint 404 → registered route before `/{id}` catch-all
  - H2: Document content search broken → fixed search to include content field
  - M1-M9: xlsx flag, dashboard templates 500, dashboard share 500, knowledge query, etc.
  - L1-L4: Connections pagination, notifications POST/DELETE, favorites validation
- All 22 resolved (10 code fixes, 2 false positives)

### Round 4 (388 test cases, 8 parallel groups)
- **319 PASS (82.2%) / 36 FAIL (9.3%) / 33 WARN (8.5%)**

| Group | Scope | Tests | Pass | Fail | Warn |
|-------|-------|-------|------|------|------|
| G1 | Analytics, Dashboard, Notifications, Preferences | 61 | 58 | 0 | 3 |
| G2 | Templates, Excel, Charts | 40 | 35 | 1 | 4 |
| G3 | Docs, Spreadsheets, DocQA | 41 | 40 | 0 | 1 |
| G4 | Knowledge, Search, Ingestion | 42 | 28 | 12 | 2 |
| G5 | Connections, Dashboards, Widgets | 38 | 27 | 8 | 3 |
| G6 | Design, Agents, AI, Workflows | 53 | 38 | 6 | 9 |
| G7 | Edge Cases, Security | 60 | 50 | 2 | 8 |
| G8 | Jobs, Schedules, Health, Analyze | 53 | 43 | 7 | 3 |

**Fail breakdown**: 9 actionable bugs + 14 not-implemented features + 13 expected 404s for endpoints never built

---

## 5. Current Actionable Bugs (9 remaining)

### HIGH (2)
| ID | Description | Root Cause | Fix |
|----|-------------|------------|-----|
| H1-v4 | `GET /analyze/v2/sources` and `/integrations` return 404 | "sources" treated as `{analysis_id}` by catch-all route | Register static GET routes before `/{analysis_id}` |
| H2-v4 | `GET /dashboards/stats` returns 404 | "stats" treated as `{dashboard_id}` by catch-all route | Register `/stats` before `/{dashboard_id}` |

### MEDIUM (4)
| ID | Description | Root Cause | Fix |
|----|-------------|------------|-----|
| M1-v4 | Dashboard metadata not in GET response | `create_dashboard()` doesn't include metadata key | Add metadata to dashboard dict on create |
| M2-v4 | Dashboard sharing write-only | Share endpoint stores data but GET doesn't return it | Include shared_with in dashboard GET |
| M3-v4 | Dashboard widget update returns 500 | Internal error in widget update handler | Debug and fix handler |
| M4-v4 | Brand kit accepts invalid hex colors | No color format validation in schema | Add hex color regex validation |

### LOW (3)
| ID | Description | Root Cause | Fix |
|----|-------------|------------|-----|
| L1-v4 | Spreadsheet detail returns empty sheets | Sheets metadata not persisted on create | Persist sheet definitions |
| L2-v4 | Jobs list lacks pagination metadata | Response only has `[jobs, correlation_id]` | Add total/limit/offset to response |
| L3-v4 | Favorites entity_id no length limit | No max_length on FavoriteRequest.entity_id | Add max_length=255 validation |

---

## 6. Not Implemented Features (14 items — informational)

These endpoints exist in the OpenAPI spec but were never built. They are NOT bugs.

| # | Feature | Endpoints | Notes |
|---|---------|-----------|-------|
| 1 | Ingestion API | 7 endpoints | `/ingestion/*` — all 404 |
| 2 | Global Search API | 4 endpoints | `/search/*` — all 404 |
| 3 | Health sub-endpoints | 4 endpoints | `/health/db`, `/ai`, `/storage`, `/dependencies` — use `/health/detailed` |
| 4 | Export generic endpoints | 2 endpoints | Export is document-scoped, not generic |
| 5 | Design layouts | 1 endpoint | `/design/layouts` — 404 |
| 6 | Excel templates | 1 endpoint | `/excel/templates` — 404 |
| 7 | Connector per-type config | 1 endpoint | Config embedded in `/connectors/types` |
| 8 | Dashboard template POST | 1 endpoint | Templates are read-only (405) |
| 9 | Dashboard widgets GET | 1 endpoint | Widgets embedded in dashboard GET (405) |
| 10 | Summary mode "brief" | Config mismatch | Valid modes: executive, data, quick, comprehensive, action_items, risks, opportunities |
| 11 | DocAI /summarize | Path mismatch | Actual: `/docai/summarize/multi` |
| 12 | Frontend /export | No route | Export is document-scoped |
| 13 | Frontend /health | No route | Health is API-only |
| 14 | Frontend /login | No route | Auth via iframe/Keycloak |

---

## 7. Security Posture

### Passing
- SQL injection prevention (parameterized queries) — 4/4 tests passed
- Path traversal prevention — 2/2 tests passed
- Input validation (type, range, length) — 6/6 tests passed
- 404 handling (no info leak) — 9/9 tests passed
- Concurrent operation safety — 3/3 tests passed
- Method Not Allowed (405) — 3/3 tests passed
- Empty body handling (422) — 5/5 tests passed
- Unicode/special character handling — 4/4 tests passed
- CORS headers properly configured
- Security headers present (X-Content-Type-Options, X-Frame-Options, CSP, etc.)
- CORS preflight handling

### Informational
- API key auth lenient in dev mode (by design — `require_api_key` accepts "test")
- XSS payloads stored verbatim (safe via React auto-escaping, but no server-side sanitization)
- Rate limit headers declared but not implemented in CORS expose-headers
- No length validation on favorites entity_id (L3-v4 — to fix)

---

## 8. Test Scenarios Covered (QA Round 4)

### Group 1: Analytics + Dashboard + Notifications + Preferences (61 tests)
- Analytics dashboard summary (totalConnections, totalTemplates, etc.)
- Usage analytics (monthly, daily breakdowns)
- Report history with pagination
- Activity log CRUD with filtering
- Search analytics with query terms
- Preferences GET/PUT with payload size limits
- Notifications list, create, mark-read, delete
- Dashboard analytics AI summary
- Dashboard preferences persistence
- Screenshots: /analytics, /dashboard

### Group 2: Templates + Excel + Charts (40 tests)
- Template CRUD (create, list, get, update, delete)
- Template versioning and history
- Template sections management
- Template tags (add, remove, filter)
- Template catalog and recommendations
- Template charts (save, list, update, delete)
- Template artifacts and headers
- Template key options
- Excel template operations
- Report run with real connection
- Screenshots: /templates, /reports

### Group 3: Documents + Spreadsheets + DocQA (41 tests)
- Document CRUD with content persistence
- Document search by name and content
- Document template filtering (is_template flag)
- Document versioning (create, list, restore)
- Document comments (add, list, resolve, reply, delete)
- Document export (HTML, Markdown, invalid format 400)
- Document template operations (save as, list, create from)
- PDF operations (merge validation, reorder guard)
- Spreadsheet CRUD (create, list, get, update, delete)
- Spreadsheet import/export (CSV, XLSX)
- DocQA session CRUD (create, list, get, delete)
- AI writing features (grammar, summarize, rewrite)
- Screenshots: /documents, /spreadsheets, /docqa

### Group 4: Knowledge + Search + Ingestion (42 tests)
- Knowledge documents CRUD (JSON, text types)
- Knowledge collections CRUD
- Knowledge tags CRUD
- Knowledge search (semantic, filter by collection/type)
- Knowledge statistics
- Knowledge document query filtering
- Summary generation and config
- Ingestion API (7 endpoints — all not implemented)
- Global search API (4 endpoints — all not implemented)
- Screenshots: /knowledge, /search

### Group 5: Connections + Dashboards + Widgets (38 tests)
- Connections CRUD with pagination (limit/offset)
- Connection schema/preview with SQL injection protection
- Connector types listing
- Dashboard CRUD (create, list, get, update, delete)
- Dashboard templates (list)
- Dashboard stats (routing issue)
- Dashboard favorites (toggle on/off)
- Dashboard sharing (POST works, GET missing)
- Dashboard widgets (add, update, delete)
- Dashboard what-if analysis
- Screenshots: /connections, /dashboards

### Group 6: Design + Agents + AI + Workflows (53 tests)
- Brand kit CRUD (create, list, get, update, delete)
- Design themes listing
- Design layouts (not implemented)
- Color validation (missing)
- Agents v1 (list, types, tasks)
- Agents v2 (types, health, stats, tasks, proofreading, email, research, data analyst)
- Agent repurpose formats
- AI health, tones, generation
- DocAI (classify, entities, summarize)
- Workflows CRUD (create, list, get, update, delete)
- Synthesis sessions and extraction
- Visualization types (charts, diagrams) and generation
- Export jobs listing
- Enrichment sources, types, cache, enrich, preview
- Recommendations catalog and templates
- Logger discovery
- Charts (saved, generate, analyze)
- Screenshots: /design, /agents, /workflows, /visualization, /export

### Group 7: Edge Cases + Security (60 tests)
- Authentication bypass (no key, wrong key)
- Auth endpoints (register, JWT login/logout)
- XSS prevention (script, img, svg payloads)
- SQL injection prevention (semicolon, OR 1=1, UNION, DROP TABLE)
- Large payload handling (5000-char name, 100KB JSON, 10K message)
- Invalid input types (non-integer limit, negative values, exceeding max)
- 404 handling (9 different resource types)
- Concurrent operations (5 simultaneous creates, reads)
- Method Not Allowed (DELETE/PUT/PATCH on wrong endpoints)
- Empty body handling (5 endpoints)
- Unicode/special characters (Japanese, Spanish, Chinese, Russian)
- Path traversal prevention (../, URL-encoded)
- CORS and security headers
- Rate limit headers
- State/settings/users endpoints
- Audit logging (frontend-error, intent)
- Screenshots: /settings, /login

### Group 8: Jobs + Schedules + Health + Analyze (53 tests)
- Jobs CRUD (list, filter by status, pagination, get by ID, delete)
- Job cancel (409 on terminal) and retry (400 on missing template)
- Health endpoints (main, detailed, healthz, ready, readyz)
- Analyze v1 (upload, extract, get analysis, get data, suggest charts)
- Analyze v2 (upload, get, summary modes, charts, insights, metrics, quality, entities, tables, suggested questions, ask, export)
- Analyze v2 config (chart types, export formats, industries, summary modes)
- Analyze v2 sources and integrations (create works, GET routing conflict)
- Analyze v2 advanced (pipelines, compare, schedules, triggers, webhooks)
- Spreadsheet AI (formula generate/explain/suggest, data clean, anomalies, predict)
- Screenshots: /jobs, /analyze, /health

---

## 9. Architecture Decisions Made

### Route Ordering Pattern
FastAPI matches routes top-to-bottom. Static routes (`/templates`, `/stats`, `/sources`) MUST be registered before dynamic `/{id}` catch-all routes. This pattern was applied in:
- Documents `/templates` route (fixed in QA Round 3)
- Dashboard `/stats` route (to fix — H2-v4)
- Analyze v2 `/sources` and `/integrations` (to fix — H1-v4)

### State Store Pattern
Dashboards, favorites, notifications, widgets, and dashboard templates use the JSON-based StateStore with atomic transactions (`state_store.transaction()`). All writes use `state.setdefault()` + dict mutations inside the transaction context.

### File Sync Pattern
Edits go to `prodo/backend/` (running instance) then sync to `backend/` (source), then restart via `systemctl --user restart neurareport-backend.service`.

### Pydantic Optional Pattern
For distinguishing "not provided" from "explicitly false/zero", use `Optional[T] = None` instead of `T = default_value`. Applied to `RunPayload.xlsx` field (QA Round 3 fix).

---

## 10. Implementation Priorities

### Immediate (Bug Fixes — 9 items from ISSUES_v4.md)
1. Fix route ordering: H1-v4 (analyze), H2-v4 (dashboards)
2. Fix dashboard service: M1-v4 (metadata), M2-v4 (sharing), M3-v4 (widget update)
3. Fix validation: M4-v4 (brand kit colors), L3-v4 (favorites entity_id)
4. Fix data: L1-v4 (spreadsheet sheets), L2-v4 (jobs pagination)

### Short-term (Feature Gaps)
1. Implement ingestion API (23 endpoints, frontend page exists)
2. Implement global search API (14 endpoints, frontend page exists)
3. Implement health sub-endpoints (`/health/db`, `/ai`, `/storage`)
4. Add server-side XSS sanitization as defense-in-depth
5. Implement rate limiting (headers already declared)

### Medium-term (Architecture)
1. Migrate StateStore-backed entities to SQLAlchemy/DB tables
2. Generate typed TypeScript API client from OpenAPI spec
3. Add Playwright smoke tests on all 35 routes
4. Add accessibility audits (698 unnamed actions identified)
5. Unify job orchestration (legacy scheduler + new worker pattern)

### Long-term (SOTA)
1. Vector search + RAG pipeline (pgvector or Qdrant)
2. Prompt versioning and evaluation harness
3. Durable workflow orchestration (Temporal/Celery/Dramatiq)
4. Import-linter for architecture boundary enforcement
5. Contract testing (Schemathesis + Pact)
