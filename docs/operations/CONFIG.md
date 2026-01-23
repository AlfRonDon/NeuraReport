# Configuration Reference

NeuraReport reads the following environment variables and settings when launching the backend, scripts, and frontend.

## Backend Environment Variables

### Core service

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes (prod) | _none_ | API token used for every LLM call. Allow missing only for offline testing. |
| `NEURA_ALLOW_MISSING_OPENAI` | No | `false` | Set to `true` to bypass the API key requirement when running offline. |
| `OPENAI_MODEL` | No | `gpt-5` | Model identifier passed to OpenAI for Calls 1-5. |
| `UPLOAD_ROOT` | No | `backend/uploads` | Directory that stores per-template artifacts and manifests. Created on boot. |
| `EXCEL_UPLOAD_ROOT` | No | `backend/uploads_excel` | Directory for Excel pipeline artifacts and manifests. Created on boot. |
| `NR_DEFAULT_DB` | No | _none_ | Default SQLite database path used when the UI omits a connection id. |
| `DB_PATH` | No | _none_ | Legacy fallback path for the default database (`NR_DEFAULT_DB` takes precedence). |
| `NEURA_STATE_DIR` | No | `backend/state` | Location of the encrypted state store (`state.json`) and generated secret. |
| `NEURA_STATE_SECRET` | No | auto-generated | Base64 Fernet key. Provide to share state across installs or retain secrets. |
| `NEURA_MAX_VERIFY_PDF_BYTES` | No | unlimited | Maximum upload size (bytes) for `/templates/verify`. `0` or unset disables the limit. |
| `PDF_DPI` | No | `400` | DPI used when rasterising PDFs to PNG during verification. |
| `MAX_FIX_PASSES` | No | `1` | Number of refinement passes attempted during Call 2 (`VERIFY_FIX_HTML_ENABLED` must be true). |
| `VERIFY_FIX_HTML_ENABLED` | No | `true` | Disable (`false`/`0`) to skip the Call 2 HTML refinement stage. |
| `ARTIFACT_WARN_BYTES` | No | `5242880` (5 MiB) | Threshold used by `scripts/artifact_stats.py` and CI for artifact sizes. |
| `ARTIFACT_WARN_RENDER_MS` | No | `2000` | Threshold used by `scripts/artifact_stats.py` and CI for render durations. |
| `NEURA_VERSION` | No | `version.json` value or `dev` | Overrides the version stamped on logs and health endpoints. |
| `NEURA_COMMIT` | No | `version.json` value or `unknown` | Overrides the commit hash exposed in logs and health endpoints. |

### LLM behaviour

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENAI_REQUEST_TIMEOUT_SECONDS` | No | _none_ | Per-request timeout in seconds. Leave unset or `0` to disable. |
| `OPENAI_MAX_ATTEMPTS` | No | `3` | Retry count for `call_chat_completion`. |
| `OPENAI_BACKOFF_SECONDS` | No | `1.5` | Initial backoff delay between retries (seconds). |
| `OPENAI_BACKOFF_MULTIPLIER` | No | `2.0` | Multiplier applied to each retry delay. |
| `LLM_RAW_OUTPUT_PATH` | No | `llm_raw_outputs.md` | Absolute or relative path for dumping raw LLM responses. |

### Health & diagnostics

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEURA_HEALTH_EXTERNAL_HEAD` | No | `https://api.openai.com/v1/models` | Optional URL probed via HTTP HEAD in `/healthz` and `/readyz`. |
| `NEURA_FAIL_AFTER_STEP` | No | _none_ | Testing hook that raises after the named pipeline step (for rollback drills). |

### CLI / tooling helpers

| Variable | Used by | Description |
| --- | --- | --- |
| `CONNECTION_ID` | `backend/app/services/connections/db_connection.py` CLI | Supplies a connection id when resolving DB paths via the helper script. |
| `DB_URL` | same | Alternative to `--db-url` when running the helper script. |
| `DB_PATH` | same | Legacy override for SQLite paths (also used as a backend fallback). |

## Frontend (Vite) Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | No | `http://127.0.0.1:8000` | Base URL used by the frontend HTTP client. |
| `VITE_USE_MOCK` | No | `true` | Serve mock API responses when set to `true`. Use `false` for real backend integration. |

## Ports

- Backend (FastAPI via uvicorn): `8000`
- Frontend (Vite dev server): `5173`

## Key Paths

- Backend source: `backend/`
- Template uploads: `backend/uploads/<template_id>/`
- Artifact manifest: `backend/uploads/<template_id>/artifact_manifest.json`
- State store: `backend/state/state.json`
- LLM output log: `llm_raw_outputs.md` (configurable)
- Scripts: `scripts/*.py`

## Runtime Validation

On startup the backend:

1. Ensures `OPENAI_API_KEY` is present unless `NEURA_ALLOW_MISSING_OPENAI=true`.
2. Creates/verifies the uploads directory (`UPLOAD_ROOT`).
3. Logs a sanitized configuration summary (model, version, commit, storage paths).
4. Generates `NEURA_STATE_SECRET` if absent and persists it next to `state.json`.

## Example Session Configuration

Windows PowerShell:

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:UPLOAD_ROOT = "$PWD\\backend\\uploads"
$env:NEURA_STATE_SECRET = "my-shared-secret"
uvicorn backend.api:app --reload
```

Unix shells:

```bash
export OPENAI_API_KEY="sk-..."
export UPLOAD_ROOT="$PWD/backend/uploads"
export NEURA_STATE_SECRET="my-shared-secret"
uvicorn backend.api:app --reload
```
