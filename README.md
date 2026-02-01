# NeuraReport

NeuraReport is a desktop-first reporting assistant that pairs a FastAPI backend with a React/Tauri front-end. Operators ingest PDF templates, auto-map fields to SQL data, approve the contract, and generate PDF/HTML batches with full artifact traceability. The platform also provides AI agents, document intelligence (DocAI), data enrichment, federated schema queries, knowledge management, NL2SQL, and workflow automation.

## Repository Layout

- `backend/` - FastAPI application, domain/services/features, and tests.
- `backend/app/api/routes/` - 35 route modules covering templates, reports, agents, analytics, connectors, dashboards, documents, enrichment, federation, ingestion, knowledge, NL2SQL, search, spreadsheets, synthesis, visualization, workflows, and more.
- `backend/app/services/` - 40+ service modules (agents, AI writing, analytics, charts, connections, connectors, dashboards, design, DocAI, DocQA, documents, enrichment, export, federation, ingestion, jobs, knowledge, LLM, NL2SQL, reports, search, spreadsheets, summary, synthesis, templates, visualization, workflows).
- `backend/engine/` - Legacy pipeline engine (adapters, orchestration, pipelines) kept for compatibility routes/tests.
- `backend/legacy/` - Legacy service layer still referenced by API compatibility routes.
- `frontend/` - Vite + React 18 SPA with 28 page modules, Zustand state management, and Playwright e2e tests.
- `scripts/` - Developer utilities (`verify_pipeline.py`, `artifact_stats.py`, `enforce_backend_arch.py`, etc.).
- `docs/` - Architecture governance, operations config, pipeline documentation, product requirements, audits, and release notes.
- `backend/uploads/`, `backend/uploads_excel/` - Runtime artifacts/manifests (created at runtime; served via `/uploads` and `/excel-uploads`).
- `backend/state/` - Encrypted state store (`state.json`) plus generated Fernet secret (do not commit).

See `FEATURES.md` for a complete feature inventory, `docs/product/requirements.md` for product goals, and `docs/operations/PIPELINE_DOCUMENTATION.md` for a step-by-step view of the backend pipeline.

## Prerequisites

- Python 3.11+
- Node.js 18+ (or 20 LTS)
- npm 9+ (bundled with Node)
- (Optional) Playwright browsers for end-to-end UI checks (`npx playwright install --with-deps`)

## Quickstart

### One-time setup (recommended)

Windows (PowerShell):

```powershell
.\scripts\setup.ps1
.\scripts\dev.ps1
```

macOS/Linux:

```bash
bash scripts/setup.sh
bash scripts/dev.sh
```

### Backend

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
setx OPENAI_API_KEY "sk-..."   # or $env:OPENAI_API_KEY in the current session
uvicorn backend.api:app --reload
```

Unix shell equivalent:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
export OPENAI_API_KEY="sk-..."
uvicorn backend.api:app --reload
```

The API runs on `http://127.0.0.1:8000`. Static artifacts are served under `/uploads/<template_id>/`.
Review `docs/operations/CONFIG.md` for environment overrides (state directory, upload root, LLM tuning, etc.).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://127.0.0.1:5173`. Copy `frontend/.env.example` to `frontend/.env.local` to configure mock mode; set `VITE_USE_MOCK=false` to hit the live backend (`VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000`).

## Running Tests & Checks

### Backend

```bash
pytest backend/tests
python scripts/verify_pipeline.py --template-id <uuid> --uploads-root ./backend/uploads
python scripts/artifact_stats.py --template-id <uuid>
```

Use `NEURA_FAIL_AFTER_STEP` to simulate rollback scenarios (see `docs/operations/CONFIG.md`).

### Frontend

```bash
cd frontend
npm run lint            # ESLint
npm run build           # Production bundle
npx playwright install  # once per machine
npm run test:ui         # @ui tagged Playwright tests
npm run test:a11y       # Accessibility checks
npm run test:visual     # Visual regression suite
```

Snapshots live under `frontend/playwright-report` and `playwright-results`. Update via `npm run shots:update`.

## Helpful Endpoints

- `GET /health`, `/healthz`, `/readyz` - Readiness/liveness (includes optional external HEAD check).
- `GET /state/bootstrap` - Initial state payload (connections, templates, last-used selection).
- `GET /templates/{template_id}/artifacts/manifest` - Full manifest for a template (files, hashes, produced_at, inputs).
- Streaming endpoints (`/templates/verify`, `/templates/{id}/mapping/approve`, etc.) return NDJSON; progress is emitted with `event: "stage"`.
- `GET /api/v2/agents/tasks` - List agent tasks (research, data analyst, email draft, proofreading, content repurpose).
- `POST /api/connectors/test` - Test external connector health (databases, cloud storage).
- `POST /api/enrichment/enrich` - Enrich records with company, address, or exchange rate data.
- `POST /api/nl2sql/generate` - Convert natural language to SQL queries.
- `POST /api/federation/query` - Run cross-source federated queries.

## Logging & Troubleshooting

- All responses carry `X-Correlation-ID`. Logs are structured (`request_start`, `verify_template_stage`, etc.).
- Enable raw LLM dumps by setting `LLM_RAW_OUTPUT_PATH` (defaults to `llm_raw_outputs.md`).
- Manifests (`artifact_manifest.json`) make it easy to diff pipeline outputs between runs.

## Additional Documentation

- `FEATURES.md` - Complete feature inventory (150+ features).
- `docs/product/requirements.md` - Product requirements and scope.
- `docs/product/immediate-requirements.md` - Detailed UI spec for the Setup flow.
- `docs/operations/CONFIG.md` - Configuration and environment variables.
- `docs/operations/PIPELINE_DOCUMENTATION.md` - Back-end pipeline breakdown.
- `docs/operations/RELEASE_NOTES.md` - Latest release summary and rollback notes.
- `docs/architecture/ARCHITECTURE_GOVERNANCE.md` - Enforced structural rules, dependency boundaries, and contribution contract.
- `docs/API_REFERENCE.md` - API endpoint reference for all 35 route modules.
