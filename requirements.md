# One‑liner

Tauri desktop app with React frontend and Python backend that lets users connect to a database, ingest PDF report templates for AI‑assisted mapping, and generate/download reports in batches by date range.

---

## 1) Goals & Non‑Goals

**Goals**

- Zero‑install end‑user experience (single desktop app; no separate servers required by default).
- Support common SQL sources (PostgreSQL, MySQL/MariaDB, SQL Server, SQLite) with schema introspection.
- AI‑assisted template understanding and schema→template field mapping, with user approval.
- Deterministic, reproducible report generation with progress, logs, and downloadable outputs.
- Batch runs (multiple templates, date ranges), with job queue and resumability.

**Non‑Goals (v1)**

- Realtime dashboards, streaming, or live charts.
- Multi‑tenant cloud SaaS; default is local‑first. (Remote runner optional; see Architecture.)
- Arbitrary ML training. The AI is only for mapping/validation, not for predictive analytics.

---

## 2) User Roles & Primary Flows

- **Operator**: Connects to DB, uploads template(s), approves field mapping, runs reports.
- **Admin/Power User** (optional): Manages connections, credentials policy, output locations, LLM mode (local vs cloud), advanced logging.

**Two‑tab flow**

1. **Setup**: Connect DB → Upload/Verify Template → Preview → Approve & Save.
2. **Generate**: Pick template(s) → Pick date range(s) → Choose output format(s) → Run → Download.

---

## 3) Tech Stack

**Desktop shell**

- Tauri (Rust core) for lightweight, secure desktop packaging on Windows/macOS/Linux.
- Sidecar process to run Python backend locally; app auto‑manages lifecycle.

**Frontend**

- React 18 (use JavaScript, dont use typescript).
- UI system: use MUI wherever needed.
- State mgmt: lightweight store (Zustand) + React Query (server state) for fetching/progress.
- Forms & validation: Zod or Yup for robust input handling.

**Backend (local)**

- Python 3.11+ with FastAPI (HTTP over localhost) for a clean API boundary.
- PDF tooling: PyMuPDF (layout extraction/preview), pdfplumber (text/table heuristics), ReportLab (programmatic PDF render), pikepdf (merge/stamp).
- DB access: SQLAlchemy + drivers (psycopg/pg8000, mysqlclient/asyncmy, pyodbc for SQL Server). Safe connection test + schema import.
- Job runner: Async background tasks (FastAPI + asyncio), with a local SQLite job table; pluggable to a remote worker if enabled.
- AI layer: Pluggable LLM orchestration. Modes:

  - Local: ship with a small on‑device model (optional) or use embeddings + rules.
  - Cloud: configurable providers (OpenAI, Azure, etc.). All off by default until user opts in.

**Storage**

- App data dir: `connections.json` (encrypted), `templates/`, `mappings/`, `runs/`, `outputs/`, `logs/`, and `jobs.db` (SQLite).
- Encryption at rest via OS keychain + optional passphrase for sensitive fields.

**Packaging & Updates**

- Tauri bundler for installers; code‑signed; delta updates.

---

## 4) Architecture Overview

**Local‑first (default)**

- React UI (WebView) ↔ FastAPI (localhost) ↔ Python services ↔ DB drivers ↔ External DB.
- File I/O local to machine; no network egress unless user enables cloud LLM.

**Optional Remote Runner**

- For heavy OCR/LLM tasks, user can point to a remote job runner (same API). Desktop remains the control plane.

**Key Services**

- **Connection Manager**: Test/save DB credentials, fetch schema (tables, columns, types, relations), cache metadata.
- **Template Service**: Ingest PDF, extract layout, identify placeholders, compute a normalized “Template Layout JSON”.
- **Mapping Assistant**: Suggest mapping from layout fields to SQL expressions using schema + LLM/embeddings; returns mapping with confidence and rationales.
- **Report Engine**: Execute queries safely (limits, timeouts), paginate data, render to PDF/CSV/XLSX, stitch pages, embed images, and write outputs.
- **Jobs & Logs**: Queue runs, track progress states, store run metadata and logs for download/debugging.

---

## 5) Data & File Model (v1)

**Entities**

- **Connection**: id, name, db_type, host/port, db_name, auth (username/secret ref), ssl options, created/updated_at.
- **Template**: id, name, description, tags, source_pdf_path, layout_json_path, version, status (draft/approved), created_by, created_at.
- **Mapping**: id, template_id, mapping_json (field→SQL/expr), confidence_scores, examples, version, approved_by, approved_at.
- **Run**: id, name, templates\[], date_range(s), output_formats\[], status, progress, started_at, finished_at.
- **Output**: id, run_id, template_id, file_path, file_type, checksum, size, created_at.
- **Log**: id, run_id, level, message, timestamp.

**Key Files**

- **Template Layout JSON**: normalized primitives: text blocks, images, tables, boundaries, variables (placeholders), fonts.
- **Mapping JSON**: stable DSL that binds placeholders to SQL sources; supports transforms (formatting, currency, date, rounding, concat) and guards (null‑safe defaults).

---

## 6) AI‑Assisted Mapping — How It Works

1. **Template Ingest**: Parse PDF; detect text boxes, labels, tables, images; identify likely placeholders by delimiters or heuristics.
2. **Schema Import**: Fetch tables/columns, types, FK hints, and sample values (limited, anonymized) for context.
3. **Candidate Mapping**: Use embedding similarity and rules to propose matches (e.g., “Invoice No.” ↔ `orders.invoice_id`).
4. **SQL Suggestion**: Compose safe SQL/CTEs per placeholder, with parameter slots for date range. Enforce LIMITs during preview.
5. **User Review**: Show proposals with confidence and rationale; allow edit, test preview, and mark approved.
6. **Save**: Version mapping; changes tracked for audit.

**Fallbacks**

- If AI confidence is low, default to manual field binding via a guided UI (pick table/column, add simple transforms).

---

## 7) Security & Privacy

- **Secrets** stored via OS keychain; optional passphrase unlock on app start.
- **No data leaves device** unless user explicitly enables cloud LLM and consents per run.
- **SQL Safety**: parameterized queries, read‑only connections where possible, query timeouts, row limits for previews.
- **Audit**: every approve/run logged with user, time, template version, mapping version, and DB connection used.

---

## 8) Performance Targets

- Cold start < 2s on typical dev laptop; first run setup may be longer.
- Template ingest for a 5–10 page PDF: < 8s local (no OCR); < 20s if OCR is required.
- Report render 100–500 rows with mixed text/tables/images: < 10s per template on local CPU.
- Memory footprint steady‑state: < 500MB.

---

## 9) UI/UX Spec (Two‑Tab App)

### Tab 1 — Setup

**Layout**: Two‑pane layout with a right‑side stepper nav: 1) Connect DB, 2) Upload Template, 3) Verify, 4) Preview, 5) Approve & Save.

**Connect DB section**

- Inputs: DB type, host/port, DB name, username/password (show/hide), SSL toggle.
- Actions: Test Connection, Save Connection; status chip (Connected/Failed) with details dropdown.
- Empty state: “No connection yet — test and save to continue.”
- Errors: Inline field errors + toast; copyable error details for support.

**Upload & Verify Template**

- Drag‑and‑drop for PDF; file card with name, pages, size, detected fonts.
- **AI Verification modal**: shows progress bar with stages: Parse → Detect Placeholders → Build Layout JSON → Sanity Checks. If pass: green tick; if fail: red state + suggestions.

**Preview & Approve**

- Split view: left = interactive PDF preview; right = detected placeholders list with statuses and suggestions.
- Tools: zoom, pan, click‑to‑inspect placeholder highlight.
- Actions: Accept suggestion, Edit mapping, Mark unresolved.
- Save as Template: name, description, tags; version auto‑increments.

### Tab 2 — Generate

**Template Picker**

- Grid/list of templates with search/tags; multi‑select; filter by status (approved only by default).

**Run Config**

- Date range picker (start datetime, end datetime, timezone). Optional per‑template overrides.
- Output formats: PDF, XLSX, CSV, ZIP (bundled). Output directory picker.
- Run button with safeguards (warn if no approved mapping).

**Run Monitor**

- Job list with statuses (Queued, Running, Rendering, Complete, Failed), per‑template progress bars.
- Collapsible run logs (INFO/WARN/ERROR) and per‑template mini‑preview thumbnails when ready.
- Buttons: Open folder, Download all, Download single, Re‑run failed.

**Empty & Error States**

- No templates yet: CTA to go to Setup tab.
- Failed run: show error summary and link to logs; offer “Retry with safe defaults.”

---

## 10) Edge Cases & Handling

- **Scanned PDFs/OCR**: Optional OCR step using Tesseract; mark low‑confidence regions for manual mapping.
- **Dynamic tables across pages**: Table continuation markers and column match; enforce page breaks.
- **Images & logos**: Preserve DPI; if missing, allow replacement.
- **Fonts**: Embed or substitute; warn on missing fonts; use fallbacks.
- **Localization**: Number/date formats per locale; consistent timezone handling for queries.
- **Large datasets**: Pagination or summary sections; cap rows; warn on heavy queries.

---

## 11) Determinism & QA

- **Golden PDF Regression**: User can save a run output as a “golden.” Future runs compare via SSIM/PDiff and textual diff (extracted text); fail or warn on threshold.
- **Snapshotting**: Store mapping version + DB schema hash with run; detect drift and request re‑approval if schema changes.

---

## 13) Nice‑to‑Haves (Post‑v1)

- Scheduling (cron‑like) and email export.
- Multi‑DB joins via views or staging tables.
- Role‑based access (multiple operators on shared machine).
- Template marketplace/importer.
