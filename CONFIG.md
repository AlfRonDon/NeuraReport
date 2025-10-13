# Configuration Reference

This document is the single source of truth for configuring NeuraReport across
backend services, scripts, and the frontend. All values are ASCII to keep the
file portable between Windows, macOS, and Linux.

## Backend Environment Variables

| Variable | Required | Default | Notes / Example |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes (prod) | _none_ | OpenAI API token. Set `NEURA_ALLOW_MISSING_OPENAI=true` only for local tests. |
| `NEURA_ALLOW_MISSING_OPENAI` | No | `false` | Permits startup without an API key for offline/local runs. |
| `OPENAI_MODEL` | No | `gpt-5` | Chat model used for schema, HTML, and contract prompts. |
| `OPENAI_REQUEST_TIMEOUT_SECONDS` | No | _none_ | Optional timeout (seconds) for LLM calls. Leave unset or `0` to disable. |
| `OPENAI_MAX_ATTEMPTS` | No | `3` | Number of retry attempts for LLM calls. |
| `OPENAI_BACKOFF_SECONDS` | No | `1.5` | Initial exponential backoff delay (seconds). |
| `OPENAI_BACKOFF_MULTIPLIER` | No | `2.0` | Multiplier applied to each retry delay. |
| `PDF_DPI` | No | `400` | DPI when rasterizing templates into PNG during verification. |
| `NEURA_MAX_VERIFY_PDF_BYTES` | No | _none_ (disabled) | Maximum allowed size for PDF uploads during verification; set a positive value to enforce a limit (`0` disables the check). |
| `REFINE_ITERS` | No | `1` | Number of LLM refinement passes during template verification. |
| `UPLOAD_ROOT` | No | `backend/uploads` | Absolute/relative path where artifacts are stored. |
| `NR_DEFAULT_DB` | No | _none_ | Default SQLite database used when the UI does not provide one. |
| `DB_PATH` | No | _none_ | Legacy path override for the default DB (takes precedence over `NR_DEFAULT_DB`). |
| `NEURA_STATE_DIR` | No | `backend/state` | Directory that stores encrypted state (connections, last-used template). |
| `NEURA_STATE_SECRET` | No | Auto-generated | Base64 Fernet key for encrypting state; supply for deterministic deployments. |
| `NEURA_HEALTH_EXTERNAL_HEAD` | No | `https://api.openai.com/v1/models` (used by `/readyz`) | Optional external service checked via HTTP HEAD. |
| `NEURA_FAIL_AFTER_STEP` | No | _none_ | Testing hook; set to a pipeline step name (e.g., `mapping_save`) to simulate rollback failures. |
| `NEURA_VERSION` | No | Version from `backend/app/version.json` or `dev` | Override logged application version. |
| `NEURA_COMMIT` | No | Commit from `backend/app/version.json` or `unknown` | Override logged Git commit hash. |
| `ARTIFACT_WARN_BYTES` | No | `5242880` (5 MiB) | Size threshold used by `scripts/artifact_stats.py` and CI. |
| `ARTIFACT_WARN_RENDER_MS` | No | `2000` | Render time threshold used by `scripts/artifact_stats.py` and CI. |

### Script/CLI Helpers

These variables are optional and only used by developer utilities.

| Variable | Used By | Notes |
| --- | --- | --- |
| `CONNECTION_ID` / `DB_URL` / `DB_PATH` | `backend/app/services/connections/db_connection.py` CLI | Provide defaults when running the connection helper script directly. |
| `PDF_PATH` | `backend/app/services/templates/TemplateVerify.py` demo script | Path to a PDF when running the verification module as a standalone script. |

## Frontend (Vite) Environment Variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | No | `http://127.0.0.1:8000` | Backend base URL for API calls. |
| `VITE_USE_MOCK` | No | `true` | Enables mock API data for local development; set to `false` for real backend integration. |

## Ports

- Backend FastAPI (uvicorn): `8000`
- Frontend Vite dev server: `5173`

## Key File Paths

- Backend source: `backend/`
- Uploads root: `backend/uploads/<template_id>/`
- Artifact manifest: `backend/uploads/<template_id>/artifact_manifest.json`
- JSON Schemas: `backend/app/schemas/*.schema.json`
- Scripts: `scripts/*.py`

## Windows vs. Unix Notes

- Commands in this document use PowerShell syntax. On macOS/Linux replace `python` with `python3` and use `export VAR=value`.
- File locking uses exclusive creates (`os.O_EXCL`), which work on NTFS and modern POSIX filesystems.
- Paths stored in manifests are relative, so they are portable across operating systems.

## Runtime Validation

On startup the backend:

1. Ensures `OPENAI_API_KEY` is present unless `NEURA_ALLOW_MISSING_OPENAI=true`.
2. Creates/verifies the uploads directory specified by `UPLOAD_ROOT`.
3. Logs sanitized configuration along with the application version and commit.

## Example Commands

Windows PowerShell (persist for current session):

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:UPLOAD_ROOT = "C:\neura\uploads"
```

Unix shells:

```bash
export OPENAI_API_KEY="sk-..."
export UPLOAD_ROOT="$PWD/backend/uploads"
```
