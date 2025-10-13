# Release Notes – Phase 5 Hardening

## Highlights

- Centralized configuration loader now enforces environment validation and logs sanitized settings with version and commit metadata at startup.
- Added `/healthz` and `/readyz` endpoints that exercise filesystem write access, clock skew checks, and optional external HTTP HEAD reachability.
- Standardized security headers, artifact manifest APIs, and correlation-aware logging for every backend request and error envelope.
- Hardened pipeline utilities with HTML sanitization regression tests, per-template locking coverage, and manifest-driven artifact checks (including `scripts/artifact_stats.py`).
- CI workflow runs pre-commit (lint/format/mypy), pytest, the pipeline verifier, and `artifact_stats.py` with configured thresholds to guard releases.

## Frontend Impact

- Mapping and preview flows revalidate manifests immediately after approvals, ensuring fresh HTML and PNG assets without UX regressions.

## Rollback Guide

1. `git reset --hard <previous_commit>` on the backend repository.
2. Reinstall backend dependencies (`pip install -r backend/requirements.txt`) if tooling versions changed.
3. Redeploy the prior backend build; the frontend requires no additional rollback beyond pointing to the restored API.
