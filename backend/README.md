Backend services are implemented with FastAPI and orchestrate PDF template verification,
mapping, and report generation.

## Environment

Refer to `CONFIG.md` for the complete list of supported environment variables. The bare minimum for production is:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults to `gpt-5`)
- `UPLOAD_ROOT` (defaults to `backend/uploads`)
- `NEURA_STATE_SECRET` (optional but recommended so encrypted state survives restarts)

Set variables in PowerShell with:

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:UPLOAD_ROOT = "$PWD\backend\uploads"
```

macOS/Linux shells:

```bash
export OPENAI_API_KEY="sk-..."
export UPLOAD_ROOT="$PWD/backend/uploads"
```

## Running Locally

```bash
pip install -r backend/requirements.txt
uvicorn backend.api:app --reload
```

Static artifacts such as verified templates and mapping results are written to `uploads/`.

## Persistent State

Database connection metadata, template records, and the last-used selections live in `backend/state/state.json`. Secrets (e.g., connection strings) are encrypted with Fernet; provide `NEURA_STATE_SECRET` for deterministic keys or keep the generated secret safe.

All HTTP responses include a correlation ID and standardized error envelope (`status`, `code`, `message`, `correlation_id`).

## Health Checks (PowerShell)

```powershell
curl.exe http://127.0.0.1:8000/healthz
curl.exe http://127.0.0.1:8000/readyz
```

## Verification Workflow (PowerShell)

```powershell
python scripts/verify_pipeline.py --template-id ad6a0b1f-d98a-41c2-8ffe-8b651de9100f --uploads-root .\backend\uploads
python scripts/verify_pipeline.py --template-id ad6a0b1f-d98a-41c2-8ffe-8b651de9100f --simulate mapping_save
python scripts/artifact_stats.py --template-id ad6a0b1f-d98a-41c2-8ffe-8b651de9100f --uploads-root .\backend\uploads
```

## Automated Tests

```bash
pytest backend/tests/test_pipeline_verification.py
pytest backend/tests/test_locking.py
pytest backend/tests/test_html_sanitizer.py
```
