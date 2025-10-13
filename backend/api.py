from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import logging
import os
import re
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Optional

from email.utils import formatdate
from urllib.parse import parse_qs, quote

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# â... DB helpers
from .app.services.connections.db_connection import (
    resolve_db_path,
    verify_sqlite,
    save_connection,
)

# â... Template building helpers (TemplateVerify.py)
from .app.services.templates.TemplateVerify import (
    pdf_to_pngs,
    request_schema_for_page,
    request_initial_html,
    save_html,
    render_html_to_png,  # <-- used to produce the thumbnail from final_html
)
from .app.services.templates.layout_hints import get_layout_hints

# â... Header-mapping helpers
from .app.services.mapping.HeaderMapping import (
    get_parent_child_info,
    approval_errors,
)

# Prefer full-HTML mapper if present; else fallback to legacy
try:
    from .app.services.mapping.HeaderMapping import (
        llm_pick_with_chat_completions_full_html as _llm_map_full_html,
    )
except Exception:
    from .app.services.mapping.HeaderMapping import (
        llm_pick_with_chat_completions as _legacy_llm_scope_mapper,
    )

    def _llm_map_full_html(full_html: str, catalog, image_contents=None):
        return _legacy_llm_scope_mapper(full_html, catalog, image_contents)

# â... Discovery helpers (build_or_load_contract is re-exported here but implemented in auto_fill.py)
from .app.services.reports.discovery import (
    build_or_load_contract,
    discover_batches_and_counts,
)

# â... Auto-fill after Approve Mapping (this produces `final_html`)
from .app.services.mapping.auto_fill import run_after_approve
from .app.config import load_settings, log_settings
from .app.services.utils import (
    write_json_atomic,
    acquire_template_lock,
    TemplateLockError,
    write_artifact_manifest,
    validate_mapping_schema,
    validate_contract_schema,
    get_correlation_id,
    set_correlation_id,
)
from .app.services.utils.artifacts import load_manifest
from .app.services.state import state_store


# ---------- App & CORS ----------
logger = logging.getLogger("neura.api")
SETTINGS = load_settings()
log_settings(logger, SETTINGS)
app = FastAPI(title="NeuraReport API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
    set_correlation_id(correlation_id)
    request.state.correlation_id = correlation_id
    started = time.time()
    logger.info(
        "request_start",
        extra={
            "event": "request_start",
            "path": request.url.path,
            "method": request.method,
            "correlation_id": correlation_id,
        },
    )
    try:
        response = await call_next(request)
    except Exception:
        elapsed = int((time.time() - started) * 1000)
        logger.exception(
            "request_error",
            extra={
                "event": "request_error",
                "path": request.url.path,
                "method": request.method,
                "elapsed_ms": elapsed,
                "correlation_id": correlation_id,
            },
        )
        set_correlation_id(None)
        raise

    elapsed = int((time.time() - started) * 1000)
    logger.info(
        "request_end",
        extra={
            "event": "request_end",
            "path": request.url.path,
            "method": request.method,
            "status_code": response.status_code,
            "elapsed_ms": elapsed,
            "correlation_id": correlation_id,
        },
    )
    content_type = response.headers.get("Content-Type", "")
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    if content_type.startswith(("application/json", "text/html", "application/x-ndjson")):
        response.headers.setdefault("Cache-Control", "no-store")
    set_correlation_id(None)
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_state = getattr(request, "state", None)
    correlation_id = getattr(request_state, "correlation_id", None) or get_correlation_id()
    pipeline_started = time.time()
    detail = exc.detail
    if not isinstance(detail, dict) or not {"status", "code", "message"} <= set(detail.keys()):
        detail = {
            "status": "error",
            "code": f"http_{exc.status_code}",
            "message": detail if isinstance(detail, str) else str(detail),
        }
    detail["correlation_id"] = correlation_id
    return JSONResponse(status_code=exc.status_code, content=detail)
# ---------- Static upload root ----------
APP_DIR = Path(__file__).parent.resolve()
UPLOAD_ROOT = SETTINGS.uploads_root
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
UPLOAD_ROOT_BASE = UPLOAD_ROOT.resolve()
APP_VERSION = SETTINGS.version
APP_COMMIT = SETTINGS.commit


_DEFAULT_VERIFY_PDF_BYTES: int | None = None


def _format_bytes(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} bytes"
    value = num_bytes / 1024
    unit = "KiB"
    if value >= 1024:
        value /= 1024
        unit = "MiB"
        if value >= 1024:
            value /= 1024
            unit = "GiB"
    human = f"{value:.1f}".rstrip("0").rstrip(".")
    return f"{human} {unit}"


def _resolve_pdf_upload_limit() -> int | None:
    raw = os.getenv("NEURA_MAX_VERIFY_PDF_BYTES")
    if raw is None or raw.strip() == "":
        return _DEFAULT_VERIFY_PDF_BYTES
    try:
        value = int(raw)
    except ValueError:
        logger.warning(
            "invalid_pdf_upload_limit",
            extra={
                "event": "invalid_pdf_upload_limit",
                "value": raw,
            },
        )
        return _DEFAULT_VERIFY_PDF_BYTES
    if value <= 0:
        return None
    return value


MAX_VERIFY_PDF_BYTES = _resolve_pdf_upload_limit()


class UploadsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            return response
        query_params = {}
        if scope:
            raw_qs = scope.get("query_string") or b""
            if raw_qs:
                try:
                    query_params = parse_qs(raw_qs.decode("utf-8", errors="ignore"))
                except Exception:
                    query_params = {}
        try:
            full_path, stat_result = await self.lookup_path(path)
        except Exception:
            full_path = None
            stat_result = None
        if full_path and stat_result:
            etag = f"\"{stat_result.st_mtime_ns:x}-{stat_result.st_size:x}\""
            response.headers["Cache-Control"] = "no-store, max-age=0"
            response.headers["ETag"] = etag
            response.headers["Last-Modified"] = formatdate(stat_result.st_mtime, usegmt=True)
            if query_params.get("download"):
                filename = Path(full_path).name
                quoted = quote(filename)
                response.headers["Content-Disposition"] = (
                    f'attachment; filename="{filename}"; filename*=UTF-8\'\'{quoted}'
                )
        return response


app.mount("/uploads", UploadsStaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


# ---------- Health ----------
@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Models ----------
class TestPayload(BaseModel):
    db_url: Optional[str] = None
    db_type: Optional[str] = None
    database: Optional[str] = None


class MappingPayload(BaseModel):
    # UI currently posts { "<header or token>": "table.col" | "UNRESOLVED" | "INPUT_SAMPLE", ... }
    mapping: dict[str, str]
    connection_id: Optional[str] = None
    user_values_text: Optional[str] = None


class ConnectionUpsertPayload(BaseModel):
    id: Optional[str] = None
    name: str
    db_type: str
    db_url: Optional[str] = None
    database: Optional[str] = None
    status: Optional[str] = None
    latency_ms: Optional[float] = None
    tags: Optional[list[str]] = None


class LastUsedPayload(BaseModel):
    connection_id: Optional[str] = None
    template_id: Optional[str] = None


class RunPayload(BaseModel):
    template_id: str
    connection_id: Optional[str] = None
    start_date: str
    end_date: str
    batch_ids: Optional[list[str]] = None


class DiscoverPayload(BaseModel):
    template_id: str
    connection_id: Optional[str] = None
    start_date: str
    end_date: str


# ---------- Helpers for connections ----------
def _db_path_from_payload_or_default(conn_id: Optional[str]) -> Path:
    if conn_id:
        secrets = state_store.get_connection_secrets(conn_id)
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])
        try:
            return resolve_db_path(connection_id=conn_id, db_url=None, db_path=None)
        except Exception:
            pass

    last_used = state_store.get_last_used()
    if last_used.get("connection_id"):
        secrets = state_store.get_connection_secrets(last_used["connection_id"])
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])

    env_db = os.getenv("NR_DEFAULT_DB") or os.getenv("DB_PATH")
    if env_db:
        return Path(env_db)

    latest = state_store.get_latest_connection()
    if latest and latest.get("database_path"):
        return Path(latest["database_path"])

    raise _http_error(
        400,
        "db_missing",
        "No database configured. Connect once or set NR_DEFAULT_DB/DB_PATH env.",
    )


def _display_name_for_path(db_path: Path, db_type: str = "sqlite") -> str:
    try:
        return f"{db_type}@{db_path.name or db_path}"
    except Exception:
        return f"{db_type}@{db_path}"


# ---------- Mapping normalization (NEW) ----------
_TOKEN_RE = re.compile(r"^\s*\{\{?.+?\}?\}\s*$")


def _norm_placeholder(name: str) -> str:
    """Ensure we store a placeholder token form. If already {name} or {{name}}, keep it; else wrap in { }."""
    if _TOKEN_RE.match(name):
        return name.strip()
    core = name.strip()
    core = core.strip("{} ")
    return "{" + core + "}"


def _template_dir(template_id: str, *, must_exist: bool = True, create: bool = False) -> Path:
    """
    Resolve the uploads directory for a template_id with validation to prevent path traversal.
    """
    try:
        tid = uuid.UUID(str(template_id))
    except (ValueError, TypeError):
        raise _http_error(400, "invalid_template_id", "Invalid template_id format")

    tdir = (UPLOAD_ROOT_BASE / str(tid)).resolve()
    if UPLOAD_ROOT_BASE not in tdir.parents:
        raise _http_error(400, "invalid_template_path", "Invalid template_id path")

    if must_exist and not tdir.exists():
        raise _http_error(404, "template_not_found", "template_id not found")

    if create:
        tdir.mkdir(parents=True, exist_ok=True)

    return tdir


def _http_error(status_code: int, code: str, message: str, details: str | None = None) -> HTTPException:
    payload = {"status": "error", "code": code, "message": message}
    if details:
        payload["details"] = details
    return HTTPException(status_code=status_code, detail=payload)


def _normalize_mapping_for_autofill(mapping: dict[str, str]) -> list[dict]:
    """
    Convert UI dict to the list format expected by auto_fill:
      [{"header": <key>, "placeholder": "{Token}", "mapping": "table.col"|"UNRESOLVED"|"INPUT_SAMPLE"}, ...]
    """
    out: list[dict] = []
    for k, v in mapping.items():
        out.append(
            {
                "header": k,
                "placeholder": _norm_placeholder(k),
                "mapping": v,
            }
        )
    return out


def _save_image_contents(template_id: str, contents: list[dict]) -> None:
    """
    Persist the Step-1 image_contents so later endpoints (e.g., /reports/discover)
    can reuse the exact same PDF image grounding.
    """
    tdir = _template_dir(template_id, must_exist=False, create=True)
    path = tdir / "_image_contents.json"
    try:
        write_json_atomic(path, contents, ensure_ascii=False, indent=2, step="image_contents")
        logger.info(
            "image_contents_saved",
            extra={"event": "image_contents_saved", "template_id": template_id, "path": str(path)},
        )
    except Exception:
        logger.exception(
            "image_contents_save_failed",
            extra={"event": "image_contents_save_failed", "template_id": template_id, "path": str(path)},
        )


def _load_image_contents(template_id: str) -> list[dict]:
    """
    Load previously saved image_contents; returns [] if missing.
    """
    try:
        tdir = _template_dir(template_id, must_exist=False)
    except HTTPException:
        return []
    path = tdir / "_image_contents.json"
    if not path.exists():
        logger.info(
            "image_contents_missing",
            extra={"event": "image_contents_missing", "template_id": template_id},
        )
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        logger.exception(
            "image_contents_load_failed",
            extra={"event": "image_contents_load_failed", "template_id": template_id, "path": str(path)},
        )
        return []


def _check_fs_writable(root: Path) -> tuple[bool, str]:
    probe = root / f".health.{uuid.uuid4()}"
    try:
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True, "ok"
    except Exception as exc:
        with contextlib.suppress(FileNotFoundError):
            probe.unlink(missing_ok=True)
        return False, str(exc)


def _check_clock() -> tuple[bool, str]:
    from datetime import datetime, timezone

    unix_now = time.time()
    utc_now = datetime.now(timezone.utc).timestamp()
    skew = abs(unix_now - utc_now)
    return (skew < 300, f"skew={skew:.2f}s")


def _check_external_head(url: str, api_key: str | None) -> tuple[bool, str]:
    import urllib.request
    import urllib.error

    req = urllib.request.Request(url, method="HEAD")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # pragma: no cover - network path optional
            status = getattr(resp, "status", resp.getcode())
            ok = 200 <= status < 400
            return ok, f"status={status}"
    except urllib.error.HTTPError as exc:  # pragma: no cover - network path optional
        if exc.code in {401, 403, 405}:
            return True, f"status={exc.code}"
        return False, str(exc)
    except Exception as exc:  # pragma: no cover - network path optional
        return False, str(exc)


def _health_response(request: Request, checks: dict[str, tuple[bool, str]]) -> JSONResponse:
    status_ok = all(ok for ok, _ in checks.values())
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    payload = {
        "status": "ok" if status_ok else "error",
        "checks": {name: {"ok": ok, "detail": detail} for name, (ok, detail) in checks.items()},
        "version": APP_VERSION,
        "commit": APP_COMMIT,
        "correlation_id": correlation_id,
    }
    return JSONResponse(status_code=200 if status_ok else 503, content=payload)


@app.get("/healthz")
def healthz(request: Request):
    checks: dict[str, tuple[bool, str]] = {}
    checks["fs_write"] = _check_fs_writable(UPLOAD_ROOT_BASE)
    checks["clock"] = _check_clock()
    external_url = os.getenv("NEURA_HEALTH_EXTERNAL_HEAD")
    if external_url:
        checks["external"] = _check_external_head(external_url, SETTINGS.openai_api_key or None)
    return _health_response(request, checks)


@app.get("/readyz")
def readyz(request: Request):
    checks: dict[str, tuple[bool, str]] = {}
    checks["fs_write"] = _check_fs_writable(UPLOAD_ROOT_BASE)
    checks["clock"] = _check_clock()
    checks["openai_key"] = (bool(SETTINGS.openai_api_key), "configured" if SETTINGS.openai_api_key else "missing")
    external_url = os.getenv("NEURA_HEALTH_EXTERNAL_HEAD") or "https://api.openai.com/v1/models"
    checks["external"] = _check_external_head(external_url, SETTINGS.openai_api_key or None)
    return _health_response(request, checks)


@app.get("/templates/{template_id}/artifacts/manifest")
def get_artifact_manifest(template_id: str, request: Request):
    tdir = _template_dir(template_id)
    manifest = load_manifest(tdir)
    if not manifest:
        raise _http_error(404, "manifest_missing", "artifact manifest not found")
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {"status": "ok", "manifest": manifest, "correlation_id": correlation_id}


@app.get("/templates/{template_id}/artifacts/head")
def get_artifact_head(template_id: str, request: Request, name: str):
    tdir = _template_dir(template_id)
    safe_name = Path(name).name
    target = (tdir / safe_name).resolve()
    if not str(target).startswith(str(tdir.resolve())):
        raise _http_error(400, "invalid_artifact", "Artifact path is not allowed")

    manifest = load_manifest(tdir) or {}
    files = manifest.get("files") or {}
    produced_at = manifest.get("produced_at")
    manifest_rel = files.get(safe_name) or files.get(target.name)

    exists = target.exists()
    size = target.stat().st_size if exists else 0
    last_modified = target.stat().st_mtime if exists else None
    etag = (
        f"\"{target.stat().st_mtime_ns:x}-{target.stat().st_size:x}\"" if exists else None
    )
    checksum = (manifest.get("file_checksums") or {}).get(safe_name) or (manifest.get("file_checksums") or {}).get(
        target.name
    )

    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {
        "status": "ok",
        "correlation_id": correlation_id,
        "artifact": {
            "name": safe_name,
            "exists": exists,
            "size": size,
            "checksum": checksum,
            "produced_at": produced_at,
            "manifest_path": manifest_rel,
            "etag": etag,
            "last_modified": formatdate(last_modified, usegmt=True) if last_modified else None,
        },
    }


# ---------- Routes ----------
@app.post("/connections/test")
def test_connection(p: TestPayload, request: Request):
    t0 = time.time()
    try:
        db_path: Path = resolve_db_path(
            connection_id=None,
            db_url=p.db_url,
            db_path=p.database if (p.db_type or "").lower() == "sqlite" else None,
        )
        verify_sqlite(db_path)
    except Exception as e:
        raise _http_error(400, "connection_invalid", str(e))

    latency_ms = int((time.time() - t0) * 1000)
    resolved = Path(db_path).resolve()
    display_name = _display_name_for_path(resolved, "sqlite")
    cfg = {
        "db_type": "sqlite",
        "database": str(resolved),
        "db_url": p.db_url,
        "name": display_name,
        "status": "connected",
        "latency_ms": latency_ms,
    }
    cid = save_connection(cfg)
    state_store.record_connection_ping(
        cid,
        status="connected",
        detail=f"Connected ({display_name})",
        latency_ms=latency_ms,
    )
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()

    return {
        "ok": True,
        "details": f"Connected ({display_name})",
        "latency_ms": latency_ms,
        "connection_id": cid,
        "normalized": {
            "db_type": "sqlite",
            "database": str(resolved),
        },
        "correlation_id": correlation_id,
    }


@app.get("/connections")
def list_connections(request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {
        "status": "ok",
        "connections": state_store.list_connections(),
        "correlation_id": correlation_id,
    }


@app.post("/connections")
def upsert_connection(payload: ConnectionUpsertPayload, request: Request):
    if not payload.db_url and not payload.database and not payload.id:
        raise _http_error(400, "invalid_payload", "Provide db_url or database when creating a connection.")

    existing = state_store.get_connection_record(payload.id) if payload.id else None
    try:
        if payload.db_url:
            db_path = resolve_db_path(connection_id=None, db_url=payload.db_url, db_path=None)
        elif payload.database:
            db_path = Path(payload.database)
        elif existing and existing.get("database_path"):
            db_path = Path(existing["database_path"])
        else:
            raise RuntimeError("No database information supplied.")
    except Exception as exc:
        raise _http_error(400, "invalid_database", f"Invalid database reference: {exc}")

    db_type = (payload.db_type or (existing or {}).get("db_type") or "sqlite").lower()
    if db_type != "sqlite":
        raise _http_error(400, "unsupported_db", "Only sqlite connections are supported in this build.")

    secret_payload = None
    if payload.db_url or payload.database:
        secret_payload = {
            "db_url": payload.db_url,
            "database": str(db_path),
        }

    record = state_store.upsert_connection(
        conn_id=payload.id,
        name=payload.name or _display_name_for_path(Path(db_path), db_type),
        db_type=db_type,
        database_path=str(db_path),
        secret_payload=secret_payload,
        status=payload.status,
        latency_ms=payload.latency_ms,
        tags=payload.tags,
    )

    if payload.status:
        state_store.record_connection_ping(
            record["id"],
            status=payload.status,
            detail=None,
            latency_ms=payload.latency_ms,
        )

    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {
        "status": "ok",
        "connection": record,
        "correlation_id": correlation_id,
    }


@app.delete("/connections/{connection_id}")
def delete_connection(connection_id: str, request: Request):
    removed = state_store.delete_connection(connection_id)
    if not removed:
        raise _http_error(404, "connection_not_found", "Connection not found.")
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {"status": "ok", "connection_id": connection_id, "correlation_id": correlation_id}


@app.post("/connections/{connection_id}/health")
def healthcheck_connection(connection_id: str, request: Request):
    t0 = time.time()
    try:
        db_path = resolve_db_path(connection_id=connection_id, db_url=None, db_path=None)
        verify_sqlite(db_path)
    except Exception as exc:
        state_store.record_connection_ping(
            connection_id,
            status="failed",
            detail=str(exc),
            latency_ms=None,
        )
        raise _http_error(400, "connection_unhealthy", str(exc))

    latency_ms = int((time.time() - t0) * 1000)
    state_store.record_connection_ping(
        connection_id,
        status="connected",
        detail="Healthcheck succeeded",
        latency_ms=latency_ms,
    )
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {
        "status": "ok",
        "connection_id": connection_id,
        "latency_ms": latency_ms,
        "correlation_id": correlation_id,
    }

@app.get("/state/bootstrap")
def bootstrap_state(request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {
        "status": "ok",
        "connections": state_store.list_connections(),
        "templates": state_store.list_templates(),
        "last_used": state_store.get_last_used(),
        "correlation_id": correlation_id,
    }


@app.post("/state/last-used")
def set_last_used(payload: LastUsedPayload, request: Request):
    data = state_store.set_last_used(payload.connection_id, payload.template_id)
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {"status": "ok", "last_used": data, "correlation_id": correlation_id}


@app.get("/templates")
def list_templates_endpoint(request: Request, status: Optional[str] = None):
    templates = state_store.list_templates()
    if status:
        status_lower = status.lower()
        templates = [t for t in templates if (t.get("status") or "").lower() == status_lower]
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {"status": "ok", "templates": templates, "correlation_id": correlation_id}


@app.post("/templates/verify")
async def verify_template(
    file: UploadFile = File(...),
    connection_id: str = Form(...),
    refine_iters: int = Form(0),  # retained for compatibility (unused)
    request: Request = None,
):
    tid = str(uuid.uuid4())
    tdir = _template_dir(tid, must_exist=False, create=True)
    pdf_path = tdir / "source.pdf"
    html_path = tdir / "template_p1.html"

    request_state = getattr(request, "state", None)
    correlation_id = getattr(request_state, "correlation_id", None) or get_correlation_id()

    logger.info(
        "verify_template_start",
        extra={
            "event": "verify_template_start",
            "template_id": tid,
            "filename": getattr(file, "filename", None),
            "correlation_id": correlation_id,
        },
    )

    def event_stream():
        pipeline_started = time.time()

        def emit(event: str, **payload):
            data = {"event": event, **payload}
            return (json.dumps(data, ensure_ascii=False) + "\n").encode("utf-8")

        def log_stage(stage_name: str, status: str, started: float) -> None:
            logger.info(
                "verify_template_stage",
                extra={
                    "event": "verify_template_stage",
                    "template_id": tid,
                    "stage": stage_name,
                    "status": status,
                    "elapsed_ms": int((time.time() - started) * 1000),
                    "correlation_id": correlation_id,
                },
            )

        try:
            stage_name = "Uploading source PDF..."
            stage_started = time.time()
            yield emit(
                "stage",
                stage=stage_name,
                progress=5,
                template_id=tid,
            )
            tmp = tempfile.NamedTemporaryFile(
                dir=str(tdir),
                prefix="source.",
                suffix=".pdf.tmp",
                delete=False,
            )
            try:
                with tmp:
                    total_bytes = 0
                    limit_bytes = MAX_VERIFY_PDF_BYTES
                    while True:
                        chunk = file.file.read(1024 * 1024)
                        if not chunk:
                            break
                        total_bytes += len(chunk)
                        if limit_bytes is not None and total_bytes > limit_bytes:
                            log_stage(stage_name, "error", stage_started)
                            logger.warning(
                                "verify_template_pdf_too_large",
                                extra={
                                    "event": "verify_template_pdf_too_large",
                                    "template_id": tid,
                                    "limit_bytes": limit_bytes,
                                    "received_bytes": total_bytes,
                                    "correlation_id": correlation_id,
                                },
                            )
                            raise RuntimeError(
                                f"Uploaded PDF exceeds {_format_bytes(limit_bytes)} limit."
                            )
                        tmp.write(chunk)
                    tmp.flush()
                    with contextlib.suppress(OSError):
                        os.fsync(tmp.fileno())
                Path(tmp.name).replace(pdf_path)
            finally:
                with contextlib.suppress(FileNotFoundError):
                    Path(tmp.name).unlink(missing_ok=True)
            file.file.close()
            log_stage(stage_name, "ok", stage_started)

            stage_name = "Rendering first page preview..."
            stage_started = time.time()
            yield emit(
                "stage",
                stage=stage_name,
                progress=25,
                template_id=tid,
            )
            ref_pngs = pdf_to_pngs(pdf_path, tdir, dpi=int(os.getenv("PDF_DPI", "400")))
            if not ref_pngs:
                raise RuntimeError("No pages rendered from PDF")
            png_path = ref_pngs[0]
            layout_hints = get_layout_hints(pdf_path, 0)
            log_stage(stage_name, "ok", stage_started)

            stage_name = "Inferring table and header schema..."
            stage_started = time.time()
            yield emit(
                "stage",
                stage=stage_name,
                progress=55,
                template_id=tid,
            )
            schema = request_schema_for_page(png_path, layout_hints=layout_hints)
            log_stage(stage_name, "ok", stage_started)

            stage_name = "Synthesizing HTML photocopy..."
            stage_started = time.time()
            yield emit(
                "stage",
                stage=stage_name,
                progress=80,
                template_id=tid,
            )
            html_text = request_initial_html(png_path, schema, layout_hints=layout_hints)
            save_html(html_path, html_text)

            try:
                write_artifact_manifest(
                    tdir,
                    step="templates_verify",
                    files={
                        "source.pdf": pdf_path,
                        "reference_p1.png": png_path,
                        "template_p1.html": html_path,
                    },
                    inputs=[str(pdf_path)],
                    correlation_id=correlation_id,
                )
            except Exception:
                logger.exception(
                    "verify_template_manifest_failed",
                    extra={
                        "event": "verify_template_manifest_failed",
                        "template_id": tid,
                        "correlation_id": correlation_id,
                    },
                )
            log_stage(stage_name, "ok", stage_started)

            template_name = Path(getattr(file, "filename", "") or "").stem or f"Template {tid[:8]}"
            state_store.upsert_template(
                tid,
                name=template_name,
                status="draft",
                artifacts={
                    "template_html_url": f"/uploads/{tid}/template_p1.html",
                    "thumbnail_url": f"/uploads/{tid}/reference_p1.png",
                    "pdf_url": f"/uploads/{tid}/source.pdf",
                },
                connection_id=connection_id or None,
            )
            state_store.set_last_used(connection_id or None, tid)

            yield emit(
                "result",
                stage="Verification complete.",
                progress=100,
                template_id=tid,
                schema=schema,
                artifacts={
                    "pdf_url": f"/uploads/{tid}/source.pdf",
                    "png_url": f"/uploads/{tid}/reference_p1.png",
                    "html_url": f"/uploads/{tid}/template_p1.html",
                },
            )
            logger.info(
                "verify_template_complete",
                extra={
                    "event": "verify_template_complete",
                    "template_id": tid,
                    "schema_keys": list(schema.keys()),
                    "correlation_id": correlation_id,
                    "elapsed_ms": int((time.time() - pipeline_started) * 1000),
                },
            )
        except Exception as e:
            detail = str(e)
            yield emit(
                "error",
                stage="Verification failed.",
                detail=detail,
                template_id=tid,
            )
            logger.exception(
                "verify_template_failed",
                extra={"event": "verify_template_failed", "template_id": tid, "correlation_id": correlation_id},
            )
        finally:
            with contextlib.suppress(Exception):
                file.file.close()

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")
@app.post("/templates/{template_id}/mapping/preview")
def mapping_preview(template_id: str, connection_id: str, request: Request):
    logger.info(
        "mapping_preview_start",
        extra={
            "event": "mapping_preview_start",
            "template_id": template_id,
            "connection_id": connection_id,
            "correlation_id": getattr(request.state, "correlation_id", None),
        },
    )
    # 1) DB
    try:
        db_path: Path = resolve_db_path(
            connection_id=connection_id, db_url=None, db_path=None
        )
        verify_sqlite(db_path)
    except Exception as e:
        raise _http_error(400, "connection_invalid", f"Invalid connection_id: {e}")

    # 2) HTML
    tdir = _template_dir(template_id)
    html_path = tdir / "report_final.html"
    if not html_path.exists():
        html_path = tdir / "template_p1.html"
    if not html_path.exists():
        raise _http_error(404, "template_not_ready", "Run /templates/verify first")
    template_html = html_path.read_text(encoding="utf-8", errors="ignore")

    image_contents = _load_image_contents(template_id)
    if not image_contents:
        ref_png = tdir / "reference_p1.png"
        if ref_png.exists():
            try:
                b64 = base64.b64encode(ref_png.read_bytes()).decode("utf-8")
                image_contents = [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    }
                ]
                _save_image_contents(template_id, image_contents)
            except Exception:
                image_contents = []

    # 3) catalog
    try:
        info = get_parent_child_info(db_path)
    except Exception as e:
        raise _http_error(500, "db_introspection_failed", f"DB introspection failed: {e}")

    parent = info["parent table"]
    child = info["child table"]
    catalog = [*(f"{parent}.{c}" for c in info["parent_columns"])]
    catalog += [*(f"{child}.{c}" for c in info["child_columns"])]

    # 4) map
    try:
        mapping = _llm_map_full_html(
            template_html,
            catalog,
            image_contents=image_contents or None,
        )
        errors = approval_errors(mapping)
    except Exception as e:
        raise _http_error(500, "auto_mapping_failed", f"Auto-mapping failed: {e}")

    result = {
        "mapping": mapping,
        "errors": errors,
        "schema_info": info,
        "catalog": catalog,
    }
    logger.info(
        "mapping_preview_complete",
        extra={
            "event": "mapping_preview_complete",
            "template_id": template_id,
            "schema_parent": info.get("parent table"),
            "schema_child": info.get("child table"),
            "catalog_size": len(catalog),
            "correlation_id": getattr(request.state, "correlation_id", None),
        },
    )
    return result


@app.post("/templates/{template_id}/mapping/approve")
def mapping_approve(template_id: str, payload: MappingPayload, request: Request):
    """
    Save approved mapping as a LIST of objects that include header+placeholder+mapping,
    then run the auto-fill to generate the FINAL HTML (auto_fill.final_html).
    We also render a PNG thumbnail from that HTML and return both URLs so the UI
    can refresh immediately (mapping dialog preview, verify page, template cards).
    """
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "mapping_approve_start",
        extra={
            "event": "mapping_approve_start",
            "template_id": template_id,
            "connection_id": payload.connection_id,
            "mapping_size": len(payload.mapping or {}),
            "correlation_id": correlation_id,
        },
    )
    tdir = _template_dir(template_id)

    user_values_text = (payload.user_values_text or "").strip()

    try:
        lock_ctx = acquire_template_lock(tdir, "mapping_approve", correlation_id)
    except TemplateLockError:
        raise _http_error(
            status_code=409,
            code="template_locked",
            message="Template is currently processing another request.",
        )

    def event_stream():
        pipeline_started = time.time()

        def log_stage(stage_name: str, status: str, started: float) -> None:
            logger.info(
                "mapping_approve_stage",
                extra={
                    "event": "mapping_approve_stage",
                    "template_id": template_id,
                    "stage": stage_name,
                    "status": status,
                    "elapsed_ms": int((time.time() - started) * 1000),
                    "correlation_id": correlation_id,
                },
            )

        def emit(event: str, **payload_data):
            data = {"event": event, **payload_data}
            return (json.dumps(data, ensure_ascii=False) + "\n").encode("utf-8")

        mapping_path = tdir / "mapping_pdf_labels.json"
        result: dict[str, object] = {}
        imgc = []
        contract_ready = False
        png_url = None

        with lock_ctx:
            # 1) normalize and save mapping (list form used by auto_fill)
            stage_name = "Saving approved mapping..."
            stage_started = time.time()
            try:
                yield emit(
                    "stage",
                    stage=stage_name,
                    progress=5,
                    template_id=template_id,
                )
                normalized_list = _normalize_mapping_for_autofill(payload.mapping)
                validate_mapping_schema(normalized_list)
                write_json_atomic(mapping_path, normalized_list, indent=2, ensure_ascii=False, step="mapping_save")
                logger.info(
                    "mapping_saved",
                    extra={
                        "event": "mapping_saved",
                        "template_id": template_id,
                        "mapping_entries": len(normalized_list),
                        "path": str(mapping_path),
                        "correlation_id": correlation_id,
                    },
                )
                log_stage(stage_name, "ok", stage_started)
            except Exception as e:
                log_stage(stage_name, "error", stage_started)
                logger.exception(
                    "mapping_save_failed",
                    extra={"event": "mapping_save_failed", "template_id": template_id, "correlation_id": correlation_id},
                )
                yield emit(
                    "error",
                    stage="Saving mapping failed.",
                    detail=str(e),
                    template_id=template_id,
                )
                return

            # 2) run post-approve flow (this writes final_html and returns its path/url)
            stage_name = "Generating final HTML (sample picks & user values)..."
            stage_started = time.time()
            try:
                yield emit(
                    "stage",
                    stage=stage_name,
                    progress=45,
                    template_id=template_id,
                )
                result = run_after_approve(template_id=template_id, uploads_root=UPLOAD_ROOT, user_values_text=user_values_text)
                imgc = result.get("image_contents") or []
                if isinstance(imgc, list):
                    _save_image_contents(template_id, imgc)
                else:
                    imgc = []
                logger.info(
                    "run_after_approve_complete",
                    extra={
                        "event": "run_after_approve_complete",
                        "template_id": template_id,
                        "token_map_size": result.get("token_map_size"),
                        "correlation_id": correlation_id,
                    },
                )
                log_stage(stage_name, "ok", stage_started)
            except HTTPException as exc:
                log_stage(stage_name, "error", stage_started)
                logger.warning(
                    "run_after_approve_failed",
                    extra={
                        "event": "run_after_approve_failed",
                        "template_id": template_id,
                        "detail": exc.detail,
                        "correlation_id": correlation_id,
                    },
                )
                yield emit(
                    "error",
                    stage="Auto-fill after approve failed.",
                    detail=exc.detail,
                    template_id=template_id,
                )
                return
            except Exception as e:
                log_stage(stage_name, "error", stage_started)
                logger.exception(
                    "run_after_approve_failed",
                    extra={"event": "run_after_approve_failed", "template_id": template_id, "correlation_id": correlation_id},
                )
                yield emit(
                    "error",
                    stage="Auto-fill after approve failed.",
                    detail=str(e),
                    template_id=template_id,
                )
                return

            # 3) Build or update contract.json immediately so downstream discover runs use the cache
            stage_name = "Building contract cache..."
            stage_started = time.time()
            try:
                yield emit(
                    "stage",
                    stage=stage_name,
                    progress=65,
                    template_id=template_id,
                )
                db_path = _db_path_from_payload_or_default(payload.connection_id)
            except HTTPException as exc:
                log_stage(stage_name, "error", stage_started)
                logger.warning(
                    "contract_build_connection_failed",
                    extra={
                        "event": "contract_build_connection_failed",
                        "template_id": template_id,
                        "detail": exc.detail,
                        "correlation_id": correlation_id,
                    },
                )
                yield emit(
                    "error",
                    stage="Contract build failed.",
                    detail=f"Contract build requires a valid connection: {exc.detail}",
                    template_id=template_id,
                )
                return
            except Exception as exc:
                log_stage(stage_name, "error", stage_started)
                logger.exception(
                    "contract_build_prep_failed",
                    extra={"event": "contract_build_prep_failed", "template_id": template_id, "correlation_id": correlation_id},
                )
                yield emit(
                    "error",
                    stage="Contract build failed.",
                    detail=str(exc),
                    template_id=template_id,
                )
                return

            try:
                from .app.services.reports.ReportGenerate import (
                    client as openai_client,
                    MODEL as OPENAI_MODEL,
                )
            except Exception as e:
                logger.exception(
                    "openai_client_unavailable",
                    extra={"event": "openai_client_unavailable", "template_id": template_id, "correlation_id": correlation_id},
                )
                yield emit(
                    "error",
                    stage="OpenAI client unavailable for contract build.",
                    detail=str(e),
                    template_id=template_id,
                )
                return

            try:
                build_or_load_contract(
                    uploads_root=UPLOAD_ROOT,
                    template_id=template_id,
                    db_path=db_path,
                    openai_client=openai_client,
                    model=OPENAI_MODEL,
                    image_contents=imgc if imgc else _load_image_contents(template_id),
                )
                contract_ready = True
                logger.info(
                    "contract_cached",
                    extra={
                        "event": "contract_cached",
                        "template_id": template_id,
                        "db_path": str(db_path),
                        "correlation_id": correlation_id,
                    },
                )
                log_stage(stage_name, "ok", stage_started)
            except Exception as e:
                log_stage(stage_name, "error", stage_started)
                logger.exception(
                    "contract_build_failed",
                    extra={"event": "contract_build_failed", "template_id": template_id, "correlation_id": correlation_id},
                )
                yield emit(
                    "error",
                    stage="Contract build failed.",
                    detail=str(e),
                    template_id=template_id,
                )
                return

            # 4) Render a PNG thumbnail from the final HTML (best-effort)
            final_html_path_str = result.get("final_html_path")
            if final_html_path_str:
                stage_name = "Rendering template thumbnail..."
                stage_started = time.time()
                try:
                    yield emit(
                        "stage",
                        stage=stage_name,
                        progress=85,
                        template_id=template_id,
                    )
                    final_html_path = Path(final_html_path_str)
                    thumb_path = final_html_path.parent / "report_final.png"
                    asyncio.run(render_html_to_png(final_html_path, thumb_path))
                    png_url = f"/uploads/{template_id}/{thumb_path.name}"
                    write_artifact_manifest(
                        tdir,
                        step="mapping_thumbnail",
                        files={
                            "report_final.html": tdir / "report_final.html",
                            "template_p1.html": tdir / "template_p1.html",
                            "report_final.png": thumb_path,
                        },
                        inputs=[str(mapping_path)],
                        correlation_id=correlation_id,
                    )
                    log_stage(stage_name, "ok", stage_started)
                except Exception:
                    png_url = None
                    log_stage(stage_name, "error", stage_started)

            manifest_data = load_manifest(tdir) or {}
            manifest_url = f"/templates/{template_id}/artifacts/manifest"
            existing_tpl = state_store.get_template_record(template_id) or {}
            tpl_name = existing_tpl.get("name") or f"Template {template_id[:8]}"
            artifacts_payload = {
                "template_html_url": result.get("template_html_url"),
                "final_html_url": result.get("final_html_url"),
                "thumbnail_url": png_url,
                "manifest_url": manifest_url,
            }
            state_store.upsert_template(
                template_id,
                name=tpl_name,
                status="approved" if contract_ready else "pending",
                artifacts={k: v for k, v in artifacts_payload.items() if v},
                connection_id=payload.connection_id or existing_tpl.get("last_connection_id"),
            )
            state_store.set_last_used(payload.connection_id or existing_tpl.get("last_connection_id"), template_id)
            yield emit(
                "result",
                stage="Approval complete.",
                progress=100,
                template_id=template_id,
                saved=f"/uploads/{template_id}/mapping_pdf_labels.json",
                final_html_path=result.get("final_html_path"),
                final_html_url=result.get("final_html_url"),
                template_html_url=result.get("template_html_url"),
                thumbnail_url=png_url,
                contract_ready=contract_ready,
                token_map_size=result.get("token_map_size", 0),
                user_values_supplied=bool(user_values_text),
                manifest=manifest_data,
                manifest_url=manifest_url,
            )
            logger.info(
                "mapping_approve_complete",
                extra={
                    "event": "mapping_approve_complete",
                    "template_id": template_id,
                    "final_html": result.get("final_html_url"),
                    "contract_ready": contract_ready,
                    "thumbnail_url": png_url,
                    "correlation_id": correlation_id,
                    "elapsed_ms": int((time.time() - pipeline_started) * 1000),
                },
            )

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")


# ---------- Discover ----------
@app.post("/reports/discover")
def discover_reports(p: DiscoverPayload):
    db_path = _db_path_from_payload_or_default(p.connection_id)
    if not db_path.exists():
        raise _http_error(400, "db_not_found", f"DB not found: {db_path}")

    # OpenAI client/env indirection (as in your repo)
    try:
        from .app.services.reports.ReportGenerate import (
            client as openai_client,
            MODEL as OPENAI_MODEL,
        )
    except Exception as e:
        raise _http_error(500, "openai_unavailable", f"OpenAI client unavailable: {e}")

    # Load the SAME image_contents captured during mapping_approve() / run_after_approve()
    image_contents = _load_image_contents(p.template_id)

    try:
        OBJ = build_or_load_contract(
            uploads_root=UPLOAD_ROOT,
            template_id=p.template_id,
            db_path=db_path,
            openai_client=openai_client,
            model=OPENAI_MODEL,
            # optional, but reuses the exact PDF image grounding
            image_contents=image_contents,
        )
    except Exception as e:
        raise _http_error(500, "contract_load_failed", f"Contract build/load failed: {e}")

    try:
        summary = discover_batches_and_counts(
            db_path=db_path,
            contract=OBJ,
            start_date=p.start_date,
            end_date=p.end_date,
        )
    except Exception as e:
        raise _http_error(500, "discovery_failed", f"Discovery failed: {e}")

    manifest_data = load_manifest(_template_dir(p.template_id, must_exist=False)) or {}
    manifest_url = f"/templates/{p.template_id}/artifacts/manifest"
    tpl_record = state_store.get_template_record(p.template_id) or {}
    tpl_name = tpl_record.get("name") or f"Template {p.template_id[:8]}"
    state_store.set_last_used(p.connection_id, p.template_id)

    return {
        "template_id": p.template_id,
        "name": tpl_name,
        "batches": [
            {
                "id": b["id"],
                "rows": b["rows"],
                "parent": b["parent"],
                "selected": True,
            }
            for b in summary["batches"]
        ],
        "batches_count": summary["batches_count"],
        "rows_total": summary["rows_total"],
        "manifest_url": manifest_url,
        "manifest_produced_at": manifest_data.get("produced_at"),
    }


# ---------- Run ----------
def _ensure_contract_files(template_id: str) -> tuple[Path, Path]:
    tdir = _template_dir(template_id)

    template_html_path = tdir / "report_final.html"
    if not template_html_path.exists():
        template_html_path = tdir / "template_p1.html"
    if not template_html_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No template HTML found (report_final.html or template_p1.html).",
        )

    contract_path = tdir / "contract.json"
    if not contract_path.exists():
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing contract.json. Finish template approval/mapping to create a "
                "contract for generation."
            ),
        )

    return template_html_path, contract_path


@app.post("/reports/run")
def start_run(p: RunPayload, request: Request):
    correlation_id = getattr(request.state, "correlation_id", None)
    run_started = time.time()
    logger.info(
        "reports_run_start",
        extra={
            "event": "reports_run_start",
            "template_id": p.template_id,
            "connection_id": p.connection_id,
            "correlation_id": correlation_id,
        },
    )
    db_path = _db_path_from_payload_or_default(p.connection_id)
    if not db_path.exists():
        raise _http_error(400, "db_not_found", f"DB not found: {db_path}")

    template_html_path, contract_path = _ensure_contract_files(p.template_id)
    tdir = template_html_path.parent

    try:
        OBJ = json.loads(contract_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise _http_error(500, "invalid_contract", f"Invalid contract.json: {e}")
    else:
        try:
            validate_contract_schema(OBJ)
        except Exception as exc:
            raise _http_error(500, "invalid_contract", str(exc))

    ts = str(int(time.time()))
    out_html = tdir / f"filled_{ts}.html"
    out_pdf = tdir / f"filled_{ts}.pdf"
    tmp_html = out_html.with_name(out_html.name + ".tmp")
    tmp_pdf = out_pdf.with_name(out_pdf.name + ".tmp")

    try:
        lock_ctx = acquire_template_lock(tdir, "reports_run", correlation_id)
    except TemplateLockError:
        raise _http_error(409, "template_locked", "Template is currently processing another request.")

    with lock_ctx:
        try:
            from .app.services.reports.ReportGenerate import fill_and_print

            fill_and_print(
                OBJ=OBJ,
                TEMPLATE_PATH=template_html_path,
                DB_PATH=db_path,
                OUT_HTML=tmp_html,
                OUT_PDF=tmp_pdf,
                START_DATE=p.start_date,
                END_DATE=p.end_date,
                batch_ids=p.batch_ids,
            )
            if tmp_html.exists():
                tmp_html.replace(out_html)
            if tmp_pdf.exists():
                tmp_pdf.replace(out_pdf)
        except ImportError:
            raise _http_error(
                501,
                "report_module_missing",
                (
                    "Report generation module not found. "
                    "Add .app.services.reports.ReportGenerate.fill_and_print("
                    "OBJ, TEMPLATE_PATH, DB_PATH, OUT_HTML, OUT_PDF, START_DATE, END_DATE, batch_ids=None)."
                ),
            )
        except Exception as e:
            with contextlib.suppress(FileNotFoundError):
                tmp_html.unlink(missing_ok=True)
            with contextlib.suppress(FileNotFoundError):
                tmp_pdf.unlink(missing_ok=True)
            raise _http_error(500, "report_generation_failed", f"Report generation failed: {e}")

    write_artifact_manifest(
        tdir,
        step="reports_run",
        files={
            out_html.name: out_html,
            out_pdf.name: out_pdf,
        },
        inputs=[str(contract_path), str(db_path)],
        correlation_id=correlation_id,
    )

    manifest_data = load_manifest(tdir) or {}
    manifest_url = f"/templates/{p.template_id}/artifacts/manifest"
    state_store.record_template_run(p.template_id, p.connection_id)
    state_store.set_last_used(p.connection_id, p.template_id)

    logger.info(
        "reports_run_complete",
        extra={
            "event": "reports_run_complete",
            "template_id": p.template_id,
            "html": str(out_html.name),
            "pdf": str(out_pdf.name),
            "correlation_id": correlation_id,
            "elapsed_ms": int((time.time() - run_started) * 1000),
        },
    )

    return {
        "ok": True,
        "run_id": str(uuid.uuid4()),
        "template_id": p.template_id,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "html_url": f"/uploads/{p.template_id}/{out_html.name}",
        "pdf_url": f"/uploads/{p.template_id}/{out_pdf.name}",
        "manifest_url": manifest_url,
        "manifest_produced_at": manifest_data.get("produced_at"),
        "correlation_id": correlation_id,
    }




