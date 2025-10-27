# Release Notes

## 2025-10-23 - Phase 6: End-to-End Integration

### Highlights
- Completed the full verification -> mapping -> contract -> generator -> run pipeline with streaming NDJSON updates and per-stage manifests.
- Added auto-mapping Call 3, corrections Call 3.5, contract builder (Call 4), and generator asset builder (Call 5) with cache-aware re-entry points.
- State store now tracks mapping keys, generator metadata, and last-used selections, enabling the React client to hydrate instantly.
- Documentation overhaul: updated `requirements.md`, `CONFIG.md`, `immediateRequirements.md`, `PIPELINE_DOCUMENTATION.md`, and this README to reflect the implemented stack.

### Backend
- `/templates/verify` streams stage events, supports size limits via `NEURA_MAX_VERIFY_PDF_BYTES`, and records panel renders plus schema artifacts.
- `/templates/{id}/mapping/preview` produces `mapping_step3.json`, `constant_replacements.json`, and updated HTML with cache keys.
- `/templates/{id}/mapping/approve` persists `mapping_pdf_labels.json`, builds contracts and generator assets, renders thumbnails, and updates manifests in one streaming response.
- `/reports/discover` and `/reports/run` expose the new discovery/fill pipeline backed by the `ReportGenerate.fill_and_print` engine.
- Template-level locking prevents double submissions; manifests capture SHA lineage for regression tooling.

### Frontend
- Setup page redesigned with 25% navigation rail and 75% work area, matching the spec in `immediateRequirements.md`.
- Streaming progress bars cover verification, mapping, approval, and generator steps with toast feedback on every action.
- Templates view renders thumbnail cards with tags, output badges, and quick download affordances; state hydrates from `/state/bootstrap`.

### Operations
- New environment variables: `NEURA_MAX_VERIFY_PDF_BYTES`, `MAX_FIX_PASSES`, `VERIFY_FIX_HTML_ENABLED`, `LLM_RAW_OUTPUT_PATH`, and expanded health-check configuration (`NEURA_HEALTH_EXTERNAL_HEAD`).
- `scripts/verify_pipeline.py` and `scripts/artifact_stats.py` updated to validate new manifest entries and generator outputs.
- `llm_raw_outputs.md` logging can be redirected via `LLM_RAW_OUTPUT_PATH` for compliance-friendly retention.

### Upgrade Notes
1. Reinstall backend dependencies to ensure Playwright, OpenCV, and Skimage versions match (`pip install -r backend/requirements.txt`).
2. Supply `NEURA_STATE_SECRET` in environments that need stable encryption keys before upgrading.
3. If existing templates lack `mapping_pdf_labels.json`, run `/templates/{id}/mapping/approve` once to populate the new artifacts.

### Rollback Guide
1. `git reset --hard <previous_commit>` to revert code changes.
2. Reinstall dependencies if versions changed.
3. Remove newly created manifest entries (`mapping_pdf_labels.json`, generator bundles) if the previous release cannot read them.
4. Point the frontend back to the prior API build (`VITE_API_BASE_URL`) if rolling back only the backend.

---

## 2025-09-30 - Phase 5: Hardening

### Highlights
- Centralised configuration loader with version/commit logging and environment validation.
- `/healthz` and `/readyz` endpoints perform filesystem write checks, clock skew detection, and optional external HEAD probes.
- Standardised security headers, manifest APIs, and correlation-aware logging across all routes.
- Added HTML sanitisation regression tests, per-template locking coverage, and manifest-driven artifact checks (`scripts/artifact_stats.py`).
- CI workflow runs pre-commit, pytest, pipeline verifier, and artifact stats with the configured thresholds.

### Frontend Impact
- Mapping and preview flows revalidate manifests after approvals to guarantee fresh HTML and PNG assets.

### Rollback Guide
1. `git reset --hard <previous_commit>` on the backend.
2. `pip install -r backend/requirements.txt` if dependency versions changed.
3. Redeploy the previous backend build; frontend only needs an updated API target.
