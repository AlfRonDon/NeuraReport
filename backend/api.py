# mypy: ignore-errors
from __future__ import annotations

import asyncio
import concurrent.futures
import contextlib
import hashlib
import json
import logging
import os
import re
import shutil
from .app.services.dataframes import sqlite_shim as sqlite3
import tempfile
import time
import uuid
import warnings
from email.utils import formatdate
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, ContextManager, Iterable, Iterator, Mapping, Optional, Callable
from urllib.parse import parse_qs, quote

# Silence noisy deprecations from dependencies during import/test
warnings.filterwarnings("ignore", message=".*on_event is deprecated.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*Support for class-based `config` is deprecated.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*SwigPy.*has no __module__ attribute", category=DeprecationWarning)

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .app.config import load_settings, log_settings
from .app.env_loader import load_env_file

# DB helpers
from .app.services.connections.db_connection import (
    resolve_db_path,
    save_connection,
    verify_sqlite,
)
from .app.services.contract.ContractBuilderV2 import (
    ContractBuilderError,
    build_or_load_contract_v2,
    load_contract_v2,
)
from .app.services.generator.GeneratorAssetsV1 import (
    GeneratorAssetsError,
    build_generator_assets_from_payload,
    load_generator_assets_bundle,
)
from .app.services.mapping.auto_fill import (
    _compute_db_signature as _compute_db_signature_impl,
)

# Mapping + downstream LLM pipelines
from .app.services.mapping.AutoMapInline import MappingInlineValidationError
from .app.services.mapping.AutoMapInline import catalog_sha256 as _catalog_sha256
from .app.services.mapping.AutoMapInline import run_llm_call_3
from .app.services.mapping.AutoMapInline import schema_sha256 as _schema_sha256
from .app.services.mapping.CorrectionsPreview import (
    CorrectionsPreviewError,
    run_corrections_preview,
)

# Header-mapping helpers
from .app.features.generate.schemas.charts import ChartSuggestPayload, ChartSuggestResponse
from .app.features.generate.schemas.reports import DiscoverPayload, RunPayload
from .app.features.generate.routes.saved_charts_routes import build_saved_charts_router
from .app.features.generate.routes.chart_suggest_routes import build_chart_suggest_router
from .app.features.generate.routes.discover_routes import build_discover_router
from .app.features.generate.routes.run_routes import build_run_router
from .app.features.generate.services.chart_suggestions_service import suggest_charts as suggest_charts_service
from .app.features.generate.services.discovery_service import discover_reports as discover_reports_service
from .app.services.mapping.HeaderMapping import (
    REPORT_SELECTED_VALUE,
    approval_errors,
    get_parent_child_info,
)
from .app.services.prompts.llm_prompts import (
    PROMPT_VERSION,
    PROMPT_VERSION_3_5,
    PROMPT_VERSION_4,
)

# Discovery helpers
from .app.services.reports.discovery import discover_batches_and_counts
from .app.services.dataframes.sqlite_loader import get_loader
from .app.services.reports.discovery_excel import (
    discover_batches_and_counts as discover_batches_and_counts_excel,
)
from .app.services.reports.discovery_metrics import (
    build_batch_field_catalog_and_stats,
    build_batch_metrics,
)
_build_sample_data_rows = lambda batches, metadata=None, limit=100: build_batch_metrics(  # noqa: E731
    batches,
    metadata or {},
    limit=limit,
)
from .app.services.reports.docx_export import html_file_to_docx, pdf_file_to_docx
from .app.services.reports.xlsx_export import html_file_to_xlsx
from .app.services.state import state_store
from .app.services.templates.catalog import build_unified_template_catalog
from .app.services.templates.layout_hints import get_layout_hints
from .app.services.prompts.llm_prompts_templates import recommend_templates_from_catalog
from .app.services.prompts.llm_prompts_charts import (
    CHART_SUGGEST_PROMPT_VERSION,
    build_chart_suggestions_prompt,
)

# Template building helpers (TemplateVerify.py)
# isort: off
from .app.services.templates.TemplateVerify import (
    MODEL,
    pdf_to_pngs,
    rasterize_html_to_png as _template_rasterize_html_to_png,
    render_html_to_png,
    render_panel_preview,
    request_fix_html,
    request_initial_html,
    save_html,
    save_png as _template_save_png,
    get_openai_client,
)
from .app.services.excel.ExcelVerify import xlsx_to_html_preview

# isort: on

from .app.services.utils import (
    TemplateLockError,
    acquire_template_lock,
    get_correlation_id,
    set_correlation_id,
    validate_contract_schema,
    validate_mapping_schema,
    write_artifact_manifest,
    write_json_atomic,
    write_text_atomic,
    call_chat_completion,
    strip_code_fences,
)
from .app.services.jobs.report_scheduler import ReportScheduler
from .app.services.utils.artifacts import load_manifest
from .app.services.utils.mailer import send_report_email
from .app.services.utils.zip_tools import (
    create_zip_from_dir,
    extract_zip_to_dir,
    detect_zip_root,
)
from .app.services.prompts.llm_prompts_template_edit import (
    TEMPLATE_EDIT_PROMPT_VERSION,
    build_template_edit_prompt,
)

# Keep a public alias so tests can monkeypatch api.rasterize_html_to_png.
def _configure_error_log_handler(target_logger: logging.Logger | None = None) -> Path | None:
    """
    Attach a file handler that records backend errors for desktop/frontend debugging.
    Path defaults to backend/logs/backend_errors.log but can be overridden via NEURA_ERROR_LOG.
    """
    target_logger = target_logger or logging.getLogger("neura.api")
    log_target = os.getenv("NEURA_ERROR_LOG")
    if log_target:
        log_file = Path(log_target).expanduser()
    else:
        backend_dir = Path(__file__).resolve().parent
        logs_dir = backend_dir / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_file = logs_dir / "backend_errors.log"

    log_file.parent.mkdir(parents=True, exist_ok=True)
    log_file.touch(exist_ok=True)

    for handler in target_logger.handlers:
        if isinstance(handler, logging.FileHandler) and getattr(handler, "baseFilename", "") == str(log_file):
            return log_file

    try:
        handler = logging.FileHandler(log_file, encoding="utf-8")
    except OSError:
        return None

    handler.setLevel(logging.ERROR)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    target_logger.addHandler(handler)
    return log_file


rasterize_html_to_png = _template_rasterize_html_to_png
save_png = _template_save_png

# ---------- App & CORS ----------
load_env_file()

logger = logging.getLogger("neura.api")
SETTINGS = load_settings()
log_settings(logger, SETTINGS)
ERROR_LOG_PATH: Path | None = None
app = FastAPI(title="NeuraReport API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEDULER: ReportScheduler | None = None
SCHEDULER_DISABLED = os.getenv("NEURA_SCHEDULER_DISABLED", "false").lower() == "true"

_JOB_MAX_WORKERS = max(int(os.getenv("NEURA_JOB_MAX_WORKERS", "4") or "4"), 1)
REPORT_JOB_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=_JOB_MAX_WORKERS,
    thread_name_prefix="nr-job",
)
_JOB_TASKS: set[asyncio.Task] = set()


def _track_background_task(task: asyncio.Task) -> None:
    _JOB_TASKS.add(task)

    def _cleanup(t: asyncio.Task) -> None:
        _JOB_TASKS.discard(t)

    task.add_done_callback(_cleanup)


DEFAULT_JOB_STEP_PROGRESS = {
    "dataLoad": 5.0,
    "contractCheck": 15.0,
    "renderPdf": 60.0,
    "renderDocx": 75.0,
    "renderXlsx": 85.0,
    "finalize": 95.0,
    "email": 100.0,
}


def _job_error_message(detail: Any) -> str:
    if isinstance(detail, Mapping):
        message = detail.get("message") or detail.get("detail")
        if message:
            return str(message)
        return json.dumps(detail, ensure_ascii=False)
    return str(detail)


def _build_job_steps(payload: RunPayload, *, kind: str) -> list[dict[str, str]]:
    steps: list[dict[str, str]] = [
        {"name": "dataLoad", "label": "Load database"},
        {"name": "contractCheck", "label": "Prepare contract"},
        {"name": "renderPdf", "label": "Render PDF"},
    ]
    # DOCX rendering is effectively always attempted for PDF/Excel runs.
    steps.append({"name": "renderDocx", "label": "Render DOCX"})
    if kind == "excel" or bool(payload.xlsx):
        steps.append({"name": "renderXlsx", "label": "Render XLSX"})
    steps.append({"name": "finalize", "label": "Finalize artifacts"})
    if _normalize_email_targets(payload.email_recipients):
        steps.append({"name": "email", "label": "Send email"})
    return steps


def _step_progress_from_steps(steps: Iterable[Mapping[str, Any]]) -> dict[str, float]:
    progress: dict[str, float] = {}
    for step in steps:
        name = str(step.get("name") or "").strip()
        if not name:
            continue
        progress[name] = DEFAULT_JOB_STEP_PROGRESS.get(name, 0.0)
    return progress


class JobRunTracker:
    def __init__(
        self,
        job_id: str | None,
        *,
        correlation_id: str | None = None,
        step_progress: Optional[Mapping[str, float]] = None,
    ) -> None:
        self.job_id = job_id
        self.correlation_id = correlation_id
        self.step_progress = {k: float(v) for k, v in (step_progress or {}).items()}
        self._step_names = set(self.step_progress.keys()) if self.step_progress else None

    def _should_track(self, name: str) -> bool:
        if not name:
            return False
        if self._step_names is None:
            return True
        return name in self._step_names

    def has_step(self, name: str) -> bool:
        return self._should_track(name)

    def start(self) -> None:
        if not self.job_id:
            return
        try:
            state_store.record_job_start(self.job_id)
        except Exception:
            logger.exception(
                "job_start_record_failed",
                extra={"event": "job_start_record_failed", "job_id": self.job_id, "correlation_id": self.correlation_id},
            )

    def progress(self, value: float) -> None:
        if not self.job_id:
            return
        try:
            state_store.record_job_progress(self.job_id, value)
        except Exception:
            logger.exception(
                "job_progress_record_failed",
                extra={"event": "job_progress_record_failed", "job_id": self.job_id, "correlation_id": self.correlation_id},
            )

    def _record_step(
        self,
        name: str,
        status: str,
        *,
        error: Optional[str] = None,
        progress: Optional[float] = None,
        label: Optional[str] = None,
    ) -> None:
        if not self.job_id or not self._should_track(name):
            return
        try:
            state_store.record_job_step(
                self.job_id,
                name,
                status=status,
                error=error,
                progress=progress,
                label=label,
            )
        except Exception:
            logger.exception(
                "job_step_record_failed",
                extra={
                    "event": "job_step_record_failed",
                    "job_id": self.job_id,
                    "step": name,
                    "correlation_id": self.correlation_id,
                },
            )

    def step_running(self, name: str, *, label: Optional[str] = None) -> None:
        self._record_step(name, "running", label=label)

    def step_succeeded(self, name: str, *, progress: Optional[float] = None) -> None:
        progress_value = progress if progress is not None else self.step_progress.get(name)
        self._record_step(name, "succeeded")
        if progress_value is not None:
            self.progress(progress_value)

    def step_failed(self, name: str, error: str) -> None:
        self._record_step(name, "failed", error=str(error))

    def succeed(self, result: Optional[Mapping[str, Any]]) -> None:
        if not self.job_id:
            return
        self.progress(100.0)
        try:
            state_store.record_job_completion(self.job_id, status="succeeded", error=None, result=result)
        except Exception:
            logger.exception(
                "job_completion_record_failed",
                extra={"event": "job_completion_record_failed", "job_id": self.job_id, "correlation_id": self.correlation_id},
            )

    def fail(self, error: str, *, status: str = "failed") -> None:
        if not self.job_id:
            return
        try:
            state_store.record_job_completion(self.job_id, status=status, error=str(error), result=None)
        except Exception:
            logger.exception(
                "job_completion_record_failed",
                extra={"event": "job_completion_record_failed", "job_id": self.job_id, "correlation_id": self.correlation_id},
            )


def _run_report_job_sync(
    job_id: str,
    payload_data: Mapping[str, Any],
    kind: str,
    correlation_id: str,
    step_progress: Mapping[str, float],
) -> None:
    tracker = JobRunTracker(job_id, correlation_id=correlation_id, step_progress=step_progress)
    tracker.start()
    try:
        run_payload = RunPayload(**payload_data)
    except Exception as exc:
        tracker.fail(f"Invalid payload: {exc}")
        logger.exception(
            "report_job_payload_invalid",
            extra={"event": "report_job_payload_invalid", "job_id": job_id, "error": str(exc)},
        )
        return
    try:
        result = _run_report_with_email(run_payload, kind=kind, correlation_id=correlation_id, job_tracker=tracker)
    except HTTPException as exc:
        tracker.fail(_job_error_message(exc.detail))
        logger.exception(
            "report_job_http_error",
            extra={
                "event": "report_job_http_error",
                "job_id": job_id,
                "template_id": run_payload.template_id,
                "correlation_id": correlation_id,
            },
        )
    except Exception as exc:
        tracker.fail(str(exc))
        logger.exception(
            "report_job_failed",
            extra={
                "event": "report_job_failed",
                "job_id": job_id,
                "template_id": run_payload.template_id,
                "correlation_id": correlation_id,
            },
        )
    else:
        tracker.succeed(result)


def _schedule_report_job(
    job_id: str,
    payload_data: Mapping[str, Any],
    kind: str,
    correlation_id: str,
    step_progress: Mapping[str, float],
) -> None:
    async def runner() -> None:
        try:
            await asyncio.get_running_loop().run_in_executor(
                REPORT_JOB_EXECUTOR,
                _run_report_job_sync,
                job_id,
                payload_data,
                kind,
                correlation_id,
                step_progress,
            )
        except Exception:
            logger.exception(
                "report_job_task_failed",
                extra={"event": "report_job_task_failed", "job_id": job_id, "correlation_id": correlation_id},
            )

    task = asyncio.create_task(runner())
    _track_background_task(task)


async def _queue_report_job(p: RunPayload, request: Request, *, kind: str) -> dict:
    correlation_id = getattr(request.state, "correlation_id", None) or f"job-{uuid.uuid4().hex[:10]}"
    steps = _build_job_steps(p, kind=kind)
    template_rec = state_store.get_template_record(p.template_id) or {}
    job_record = state_store.create_job(
        job_type="run_report",
        template_id=p.template_id,
        connection_id=p.connection_id,
        template_name=template_rec.get("name") or f"Template {p.template_id[:8]}",
        template_kind=template_rec.get("kind") or kind,
        schedule_id=p.schedule_id,
        correlation_id=correlation_id,
        steps=steps,
        meta={
            "start_date": p.start_date,
            "end_date": p.end_date,
            "docx": bool(p.docx),
            "xlsx": bool(p.xlsx),
        },
    )
    payload_data = p.dict()
    step_progress = _step_progress_from_steps(steps)
    _schedule_report_job(job_record["id"], payload_data, kind, correlation_id, step_progress)
    logger.info(
        "job_enqueued",
        extra={
            "event": "job_enqueued",
            "job_id": job_record["id"],
            "template_id": p.template_id,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    return {"job_id": job_record["id"]}

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


@app.on_event("startup")
async def configure_error_logging():
    global ERROR_LOG_PATH
    if ERROR_LOG_PATH:
        return
    ERROR_LOG_PATH = _configure_error_log_handler(logging.getLogger())
    if ERROR_LOG_PATH:
        logger.info(
            "error_log_configured",
            extra={"event": "error_log_configured", "path": str(ERROR_LOG_PATH)},
        )


@app.on_event("startup")
async def start_scheduler_loop():
    global SCHEDULER
    if SCHEDULER_DISABLED:
        logger.info(
            "scheduler_disabled",
            extra={"event": "scheduler_disabled"},
        )
        return
    if SCHEDULER is None:
        poll_seconds = max(int(os.getenv("NEURA_SCHEDULER_INTERVAL", "60") or "60"), 15)
        SCHEDULER = ReportScheduler(_scheduler_runner, poll_seconds=poll_seconds)
    await SCHEDULER.start()


@app.on_event("shutdown")
async def stop_scheduler_loop():
    global SCHEDULER
    if SCHEDULER and not SCHEDULER_DISABLED:
        await SCHEDULER.stop()


@app.on_event("shutdown")
async def shutdown_job_executor():
    REPORT_JOB_EXECUTOR.shutdown(wait=False)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_state = getattr(request, "state", None)
    correlation_id = getattr(request_state, "correlation_id", None) or get_correlation_id()
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
EXCEL_UPLOAD_ROOT = SETTINGS.excel_uploads_root
EXCEL_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
EXCEL_UPLOAD_ROOT_BASE = EXCEL_UPLOAD_ROOT.resolve()
APP_VERSION = SETTINGS.version
APP_COMMIT = SETTINGS.commit

_UPLOAD_KIND_PREFIXES: dict[str, str] = {
    "pdf": "/uploads",
    "excel": "/excel-uploads",
}


def _build_upload_kind_bases() -> dict[str, tuple[Path, str]]:
    return {
        "pdf": (UPLOAD_ROOT_BASE, _UPLOAD_KIND_PREFIXES["pdf"]),
        "excel": (EXCEL_UPLOAD_ROOT_BASE, _UPLOAD_KIND_PREFIXES["excel"]),
    }


# Legacy dict kept for compatibility with existing tests that monkeypatch these paths.
_UPLOAD_KIND_BASES: dict[str, tuple[Path, str]] = _build_upload_kind_bases()


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
            etag = f'"{stat_result.st_mtime_ns:x}-{stat_result.st_size:x}"'
            response.headers["Cache-Control"] = "no-store, max-age=0"
            response.headers["ETag"] = etag
            response.headers["Last-Modified"] = formatdate(stat_result.st_mtime, usegmt=True)
            if query_params.get("download"):
                filename = Path(full_path).name
                quoted = quote(filename)
                response.headers[
                    "Content-Disposition"
                ] = f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quoted}"
        return response


app.mount("/uploads", UploadsStaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")
app.mount("/excel-uploads", UploadsStaticFiles(directory=str(EXCEL_UPLOAD_ROOT)), name="excel-uploads")


# ---------- Health ----------
@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Models ----------
class TestPayload(BaseModel):
    db_url: Optional[str] = None
    db_type: Optional[str] = None
    database: Optional[str] = None


class TemplateManualEditPayload(BaseModel):
    html: str


class TemplateAiEditPayload(BaseModel):
    instructions: str
    html: Optional[str] = None


class MappingPayload(BaseModel):
    # UI currently posts { "<header or token>": "table.col" | "params.value" | "UNRESOLVED" | "INPUT_SAMPLE" | "To Be Selected in report generator" | "SQL fragment", ... }
    mapping: dict[str, str]
    connection_id: Optional[str] = None
    user_values_text: Optional[str] = None
    user_instructions: Optional[str] = None
    dialect_hint: Optional[str] = None
    catalog_allowlist: Optional[list[str]] = None
    params_spec: Optional[list[str]] = None
    sample_params: Optional[dict[str, Any]] = None
    generator_dialect: Optional[str] = None
    force_generator_rebuild: bool = False
    keys: Optional[list[str]] = None

    class Config:
        extra = "allow"


class GeneratorAssetsPayload(BaseModel):
    step4_output: Optional[dict[str, Any]] = None
    contract: Optional[dict[str, Any]] = None
    overview_md: Optional[str] = None
    final_template_html: Optional[str] = None
    reference_pdf_image: Optional[str] = None
    catalog: Optional[list[str]] = None
    dialect: Optional[str] = "duckdb"
    params: Optional[list[str]] = None
    sample_params: Optional[dict[str, Any]] = None
    force_rebuild: bool = False
    key_tokens: Optional[list[str]] = None

    class Config:
        extra = "allow"


class CorrectionsPreviewPayload(BaseModel):
    user_input: Optional[str] = ""
    page: int = 1
    mapping_override: Optional[dict[str, Any]] = None
    sample_tokens: Optional[list[str]] = None
    model_selector: Optional[str] = None

    class Config:
        extra = "allow"


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


class ScheduleCreatePayload(BaseModel):
    template_id: str
    connection_id: str
    start_date: str
    end_date: str
    key_values: Optional[dict[str, Any]] = None
    batch_ids: Optional[list[str]] = None
    docx: bool = False
    xlsx: bool = False
    email_recipients: Optional[list[str]] = None
    email_subject: Optional[str] = None
    email_message: Optional[str] = None
    frequency: str = "daily"
    interval_minutes: Optional[int] = None
    name: Optional[str] = None
    active: bool = True


class TemplateRecommendPayload(BaseModel):
    requirement: str
    kind: Optional[str] = None
    domain: Optional[str] = None
    schema_snapshot: Optional[dict[str, Any]] = None
    tables: Optional[list[str]] = None

    class Config:
        extra = "allow"


class TemplateRecommendation(BaseModel):
    template: dict[str, Any]
    explanation: str
    score: float


class TemplateRecommendResponse(BaseModel):
    recommendations: list[TemplateRecommendation]


class ChartField(BaseModel):
    name: str
    type: str
    description: Optional[str] = None




_SCHEDULE_INTERVALS = {
    "hourly": 60,
    "six_hours": 360,
    "daily": 1440,
    "weekly": 10080,
}


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _normalize_email_targets(raw: Optional[Iterable[str] | str]) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        candidates = re.split(r"[;,]", raw)
    else:
        candidates = raw
    normalized: list[str] = []
    seen: set[str] = set()
    for value in candidates:
        text = str(value or "").strip()
        if not text:
            continue
        lower = text.lower()
        if lower in seen:
            continue
        seen.add(lower)
        normalized.append(text)
    return normalized


def _clean_key_values(raw: Optional[Mapping[str, Any]]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {}
    if isinstance(raw, dict):
        for token, value in raw.items():
            name = str(token or "").strip()
            if not name or value is None:
                continue
            cleaned[name] = value
    return cleaned


def _resolve_schedule_interval(frequency: str, override: Optional[int]) -> int:
    if override and override > 0:
        return max(int(override), 5)
    if not frequency:
        return 60
    key = frequency.strip().lower()
    return _SCHEDULE_INTERVALS.get(key, 60)


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


_REPORT_DATE_PREFIXES = {
    "from",
    "to",
    "start",
    "end",
    "begin",
    "finish",
    "through",
    "thru",
}
_REPORT_DATE_KEYWORDS = {
    "date",
    "dt",
    "day",
    "period",
    "range",
    "time",
    "timestamp",
    "window",
    "month",
    "year",
}
_PARAM_REF_RE = re.compile(r"^params\.[A-Za-z_][\w]*$")
_TEMPLATE_ID_SAFE_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{2,180}$")


def _slugify_template_name(value: str | None) -> str:
    """
    Build a filesystem-safe slug for template folders from user-provided names.
    """
    raw = str(value or "").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return slug[:60].strip("-")


def _normalize_template_id(template_id: str) -> str:
    raw = str(template_id or "").strip()
    candidate = raw.replace("\\", "/").split("/")[-1].strip()
    if not candidate or candidate in {".", ".."}:
        raise _http_error(400, "invalid_template_id", "Invalid template_id format")
    normalized = candidate.lower()
    if _TEMPLATE_ID_SAFE_RE.fullmatch(normalized):
        return normalized
    try:
        return str(uuid.UUID(candidate))
    except (ValueError, TypeError):
        raise _http_error(400, "invalid_template_id", "Invalid template_id format")


def _resolve_template_kind(template_id: str) -> str:
    record = state_store.get_template_record(template_id) or {}
    kind = str(record.get("kind") or "").lower()
    if kind in _UPLOAD_KIND_PREFIXES:
        return kind
    tid = _normalize_template_id(template_id)
    excel_dir = EXCEL_UPLOAD_ROOT_BASE / tid
    if excel_dir.exists():
        return "excel"
    return "pdf"


def _token_parts_for_report_filters(token: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(token or "").lower())
    return [part for part in normalized.split("_") if part]


def _is_report_generator_date_token_label(token: str) -> bool:
    parts = _token_parts_for_report_filters(token)
    if not parts:
        return False
    has_prefix = any(part in _REPORT_DATE_PREFIXES for part in parts)
    has_keyword = any(part in _REPORT_DATE_KEYWORDS for part in parts)
    if has_prefix and has_keyword:
        return True
    if parts[0] in _REPORT_DATE_KEYWORDS and any(part in _REPORT_DATE_PREFIXES for part in parts[1:]):
        return True
    if parts[-1] in _REPORT_DATE_KEYWORDS and any(part in _REPORT_DATE_PREFIXES for part in parts[:-1]):
        return True
    return False


def _template_dir(
    template_id: str,
    *,
    must_exist: bool = True,
    create: bool = False,
    kind: str = "pdf",
) -> Path:
    """Resolve the uploads directory for a template_id within the selected kind root."""

    normalized_kind = (kind or "pdf").lower()
    if normalized_kind not in _UPLOAD_KIND_PREFIXES:
        raise _http_error(400, "invalid_template_kind", f"Unsupported template kind: {kind}")

    base_dir = UPLOAD_ROOT_BASE if normalized_kind == "pdf" else EXCEL_UPLOAD_ROOT_BASE
    tid = _normalize_template_id(template_id)

    tdir = (base_dir / tid).resolve()
    if base_dir not in tdir.parents:
        raise _http_error(400, "invalid_template_path", "Invalid template_id path")

    if must_exist and not tdir.exists():
        raise _http_error(404, "template_not_found", "template_id not found")

    if create:
        tdir.mkdir(parents=True, exist_ok=True)

    return tdir


def _template_id_exists(template_id: str, *, kind: str = "pdf") -> bool:
    """Check both state and filesystem for an existing template id."""
    try:
        if state_store.get_template_record(template_id):
            return True
    except Exception:
        pass
    try:
        tdir = _template_dir(template_id, must_exist=False, create=False, kind=kind)
    except HTTPException:
        return False
    return tdir.exists()


def _maybe_reuse_template_id(raw_id: str | None, *, kind: str = "pdf") -> str | None:
    if not raw_id:
        return None
    try:
        normalized = _normalize_template_id(raw_id)
    except HTTPException:
        return None
    if _template_id_exists(normalized, kind=kind):
        return None
    return normalized


def _generate_template_id(base_name: str | None = None, *, kind: str = "pdf") -> str:
    """
    Generate a readable template id derived from a user-facing name.
    """
    slug = _slugify_template_name(base_name)
    if not slug:
        slug = "template"
    for _ in range(10):
        suffix = uuid.uuid4().hex[:6]
        candidate = f"{slug}-{suffix}"
        if _TEMPLATE_ID_SAFE_RE.fullmatch(candidate) and not _template_id_exists(candidate, kind=kind):
            return candidate
    fallback = f"{slug}-{uuid.uuid4().hex[:10]}"
    if _TEMPLATE_ID_SAFE_RE.fullmatch(fallback) and not _template_id_exists(fallback, kind=kind):
        return fallback
    return uuid.uuid4().hex


def _http_error(status_code: int, code: str, message: str, details: str | None = None) -> HTTPException:
    payload = {"status": "error", "code": code, "message": message}
    if details:
        payload["details"] = details
    return HTTPException(status_code=status_code, detail=payload)


def _normalize_mapping_for_autofill(mapping: dict[str, str]) -> list[dict]:
    """
    Convert UI dict to the list format expected by auto_fill:
      [{"header": <key>, "placeholder": "{Token}", "mapping": "table.col"|"UNRESOLVED"|"INPUT_SAMPLE"|"LATER_SELECTED"}, ...]
    """
    out: list[dict] = []
    for k, v in mapping.items():
        mapping_value = v
        if isinstance(mapping_value, str) and _is_report_generator_date_token_label(k):
            normalized_value = mapping_value.strip()
            lowered = normalized_value.lower()
            if not normalized_value:
                mapping_value = ""
            elif _PARAM_REF_RE.match(normalized_value) or lowered.startswith("to be selected"):
                mapping_value = REPORT_SELECTED_VALUE
            elif lowered == "input_sample":
                mapping_value = "INPUT_SAMPLE"
        out.append(
            {
                "header": k,
                "placeholder": _norm_placeholder(k),
                "mapping": mapping_value,
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
            extra={
                "event": "image_contents_saved",
                "template_id": template_id,
                "path": str(path),
            },
        )
    except Exception:
        logger.exception(
            "image_contents_save_failed",
            extra={
                "event": "image_contents_save_failed",
                "template_id": template_id,
                "path": str(path),
            },
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
            extra={
                "event": "image_contents_load_failed",
                "template_id": template_id,
                "path": str(path),
            },
        )
        return []


def _artifact_url(path: Path | None) -> Optional[str]:
    if path is None:
        return None
    try:
        resolved = path.resolve()
    except Exception:
        return None
    if not resolved.exists():
        return None
    for kind, (base_dir, prefix) in _UPLOAD_KIND_BASES.items():
        try:
            rel = resolved.relative_to(base_dir)
        except ValueError:
            continue
        return f"{prefix}/{rel.as_posix()}"
    fallback_pairs = [
        (UPLOAD_ROOT_BASE, _UPLOAD_KIND_PREFIXES["pdf"]),
        (EXCEL_UPLOAD_ROOT_BASE, _UPLOAD_KIND_PREFIXES["excel"]),
    ]
    for base_dir, prefix in fallback_pairs:
        try:
            rel = resolved.relative_to(base_dir)
        except ValueError:
            continue
        return f"{prefix}/{rel.as_posix()}"
    return None


_EXCEL_SCALE_RE = re.compile(r"--excel-print-scale:\s*([0-9]*\.?[0-9]+)")


def _extract_excel_print_scale_from_html(html_path: Path) -> Optional[float]:
    try:
        html_text = html_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None
    match = _EXCEL_SCALE_RE.search(html_text)
    if not match:
        return None
    try:
        value = float(match.group(1))
    except (TypeError, ValueError):
        return None
    if value <= 0 or value > 1.0:
        return None
    return value


def _manifest_endpoint(template_id: str, kind: str = "pdf") -> str:
    return (
        f"/excel/{template_id}/artifacts/manifest"
        if (kind or "pdf").lower() == "excel"
        else f"/templates/{template_id}/artifacts/manifest"
    )


def _normalize_artifact_map(artifacts: Mapping[str, Any] | None) -> dict[str, str]:
    normalized: dict[str, str] = {}
    if not artifacts:
        return normalized
    for name, raw in artifacts.items():
        url: Optional[str] = None
        if isinstance(raw, Path):
            url = _artifact_url(raw)
        elif isinstance(raw, str):
            if raw.startswith("/"):
                url = raw
            else:
                url = _artifact_url(Path(raw))
        else:
            continue
        if url:
            normalized[str(name)] = url
    return normalized


def _ensure_template_mapping_keys(records: list[dict]) -> list[dict]:
    hydrated: list[dict] = []
    for record in records:
        mapping_keys = record.get("mappingKeys") or []
        if mapping_keys:
            hydrated.append(record)
            continue
        template_id = record.get("id")
        if not template_id:
            hydrated.append(record)
            continue

        kind = record.get("kind") or "pdf"
        try:
            tdir = _template_dir(template_id, must_exist=False, create=False, kind=kind)
        except HTTPException:
            hydrated.append(record)
            continue

        keys = _load_mapping_keys(tdir)
        if not keys:
            hydrated.append(record)
            continue

        new_record = dict(record)
        new_record["mappingKeys"] = keys
        hydrated.append(new_record)

        try:
            state_store.upsert_template(
                template_id,
                name=record.get("name") or f"Template {template_id[:8]}",
                status=record.get("status") or "unknown",
                artifacts=record.get("artifacts") or {},
                tags=record.get("tags") or [],
                connection_id=record.get("lastConnectionId"),
                mapping_keys=keys,
                template_type=kind,
            )
        except Exception:
            logger.exception(
                "mapping_keys_state_update_failed",
                extra={
                    "event": "mapping_keys_state_update_failed",
                    "template_id": template_id,
                    "template_kind": kind,
                },
            )
    return hydrated


def _write_debug_log(template_id: str, *, kind: str, event: str, payload: Mapping[str, Any]) -> None:
    try:
        tdir = _template_dir(template_id, kind=kind, must_exist=False, create=True)
        debug_dir = tdir / "_debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = debug_dir / f"{event}-{timestamp}-{uuid.uuid4().hex[:6]}.json"
        write_json_atomic(
            filename,
            {
                "event": event,
                "timestamp": timestamp,
                "template_id": template_id,
                "template_kind": kind,
                **{k: v for k, v in payload.items()},
            },
            ensure_ascii=False,
            indent=2,
            step="debug_log",
        )
    except Exception:
        logger.exception(
            "debug_log_write_failed",
            extra={
                "event": "debug_log_write_failed",
                "template_id": template_id,
                "template_kind": kind,
            },
        )


def _sha256_path(path: Path | None) -> Optional[str]:
    if path is None or not path.exists():
        return None
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _load_schema_ext(template_dir: Path) -> Optional[dict[str, Any]]:
    schema_path = template_dir / "schema_ext.json"
    if not schema_path.exists():
        return None
    try:
        return json.loads(schema_path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning(
            "schema_ext_parse_failed",
            extra={
                "event": "schema_ext_parse_failed",
                "template_dir": str(template_dir),
                "path": str(schema_path),
            },
        )
        return None


def _build_catalog_from_db(db_path: Path) -> list[str]:
    catalog: list[str] = []
    try:
        loader = get_loader(db_path)
        for table in loader.table_names():
            frame = loader.frame(table)
            for col in frame.columns:
                col_name = str(col or "").strip()
                if col_name:
                    catalog.append(f"{table}.{col_name}")
    except Exception as exc:
        logger.exception(
            "catalog_build_failed",
            extra={"event": "catalog_build_failed", "db_path": str(db_path)},
            exc_info=exc,
        )
        return []
    return catalog


def compute_db_signature(db_path: Path) -> Optional[str]:
    try:
        return _compute_db_signature_impl(db_path)
    except Exception:
        logger.exception(
            "db_signature_failed",
            extra={"event": "db_signature_failed", "db_path": str(db_path)},
        )
        return None


def _find_reference_pdf(template_dir: Path) -> Optional[Path]:
    for name in ("source.pdf", "upload.pdf", "template.pdf", "report.pdf"):
        candidate = template_dir / name
        if candidate.exists():
            return candidate
    return None


def _find_reference_png(template_dir: Path) -> Optional[Path]:
    for name in ("report_final.png", "reference_p1.png", "render_p1.png"):
        candidate = template_dir / name
        if candidate.exists():
            return candidate
    return None


def _load_json_file(path: Path) -> Optional[dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning(
            "json_load_failed",
            extra={"event": "json_load_failed", "path": str(path)},
            exc_info=True,
        )
        return None


def _load_mapping_step3(template_dir: Path) -> tuple[Optional[dict[str, Any]], Path]:
    mapping_path = template_dir / "mapping_step3.json"
    return _load_json_file(mapping_path), mapping_path


_MAPPING_KEYS_FILENAME = "mapping_keys.json"
_COLUMN_REF_CAPTURE_RE = re.compile(
    r"""
    ["`\[]?
    (?P<table>[A-Za-z_][\w]*)
    ["`\]]?
    \.
    ["`\[]?
    (?P<column>[A-Za-z_][\w]*)
    ["`\]]?
    """,
    re.VERBOSE,
)


def _mapping_keys_path(template_dir: Path) -> Path:
    return template_dir / _MAPPING_KEYS_FILENAME


_DIRECT_COLUMN_RE = re.compile(r"^(?P<table>[A-Za-z_][\w]*)\.(?P<column>[A-Za-z_][\w]*)$")


def _normalize_key_tokens(raw: Iterable[str] | None) -> list[str]:
    if raw is None:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for item in raw:
        text = str(item or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def _load_mapping_keys(template_dir: Path) -> list[str]:
    path = _mapping_keys_path(template_dir)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning(
            "mapping_keys_load_failed",
            extra={"event": "mapping_keys_load_failed", "path": str(path)},
            exc_info=True,
        )
        return []

    if isinstance(data, dict):
        raw_keys = data.get("keys")
    elif isinstance(data, list):
        raw_keys = data
    else:
        raw_keys = None
    return _normalize_key_tokens(raw_keys if isinstance(raw_keys, Iterable) else None)


def _write_mapping_keys(template_dir: Path, keys: Iterable[str]) -> list[str]:
    normalized = _normalize_key_tokens(keys)
    path = _mapping_keys_path(template_dir)
    payload = {
        "keys": normalized,
        "updated_at": int(time.time()),
    }
    write_json_atomic(path, payload, ensure_ascii=False, indent=2, step="mapping_keys")
    return normalized


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
    import urllib.error
    import urllib.request

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
    checks["openai_key"] = (
        bool(SETTINGS.openai_api_key),
        "configured" if SETTINGS.openai_api_key else "missing",
    )
    external_url = os.getenv("NEURA_HEALTH_EXTERNAL_HEAD") or "https://api.openai.com/v1/models"
    checks["external"] = _check_external_head(external_url, SETTINGS.openai_api_key or None)
    return _health_response(request, checks)


def _artifact_manifest_response(template_id: str, request: Request, *, kind: str) -> dict:
    tdir = _template_dir(template_id, kind=kind)
    manifest = load_manifest(tdir)
    if not manifest:
        raise _http_error(404, "manifest_missing", "artifact manifest not found")
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return {"status": "ok", "manifest": manifest, "correlation_id": correlation_id}


@app.get("/templates/{template_id}/artifacts/manifest")
def get_artifact_manifest(template_id: str, request: Request):
    return _artifact_manifest_response(template_id, request, kind="pdf")


@app.get("/excel/{template_id}/artifacts/manifest")
def get_artifact_manifest_excel(template_id: str, request: Request):
    return _artifact_manifest_response(template_id, request, kind="excel")


def _artifact_head_response(template_id: str, request: Request, name: str, *, kind: str) -> dict:
    tdir = _template_dir(template_id, kind=kind)
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
    etag = f'"{target.stat().st_mtime_ns:x}-{target.stat().st_size:x}"' if exists else None
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


@app.get("/templates/{template_id}/artifacts/head")
def get_artifact_head(template_id: str, request: Request, name: str):
    return _artifact_head_response(template_id, request, name, kind="pdf")


@app.get("/excel/{template_id}/artifacts/head")
def get_artifact_head_excel(template_id: str, request: Request, name: str):
    return _artifact_head_response(template_id, request, name, kind="excel")


def _template_history_path(template_dir: Path) -> Path:
    return template_dir / "template_history.json"


def _read_template_history(template_dir: Path) -> list[dict]:
    path = _template_history_path(template_dir)
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(raw, list):
        return [entry for entry in raw if isinstance(entry, dict)]
    return []


def _append_template_history_entry(template_dir: Path, entry: dict) -> list[dict]:
    history = _read_template_history(template_dir)
    history.append(entry)
    write_json_atomic(
        _template_history_path(template_dir),
        history,
        ensure_ascii=False,
        indent=2,
        step="template_history",
    )
    return history


def _load_template_generator_summary(template_id: str) -> dict[str, Any]:
    record = state_store.get_template_record(template_id) or {}
    generator = record.get("generator") or {}
    raw_summary = generator.get("summary") or {}
    if isinstance(raw_summary, dict):
        return dict(raw_summary)
    return {}


def _update_template_generator_summary_for_edit(
    template_id: str,
    *,
    edit_type: str,
    notes: str | None = None,
) -> dict[str, Any]:
    summary = _load_template_generator_summary(template_id)
    now_iso = _utcnow_iso()
    summary["lastEditType"] = edit_type
    summary["lastEditAt"] = now_iso
    if notes is not None:
        summary["lastEditNotes"] = notes
    state_store.update_template_generator(template_id, summary=summary)
    return summary


def _build_template_html_response(
    *,
    template_id: str,
    kind: str,
    html: str,
    source: str,
    template_dir: Path,
    history: Optional[list[dict]] = None,
    summary: Optional[Mapping[str, Any]] = None,
    ai_summary: Optional[list[str]] = None,
    correlation_id: str | None = None,
) -> dict:
    prev_path = template_dir / "report_final_prev.html"
    effective_history = history if history is not None else _read_template_history(template_dir)
    summary_payload = dict(summary or {})
    metadata = {
        "lastEditType": summary_payload.get("lastEditType"),
        "lastEditAt": summary_payload.get("lastEditAt"),
        "lastEditNotes": summary_payload.get("lastEditNotes"),
        "historyCount": len(effective_history),
    }
    result: dict[str, Any] = {
        "status": "ok",
        "template_id": template_id,
        "kind": kind,
        "html": html,
        "source": source,
        "can_undo": prev_path.exists(),
        "metadata": metadata,
        "history": effective_history,
    }
    if ai_summary:
        result["summary"] = ai_summary
    if correlation_id:
        result["correlation_id"] = correlation_id
    return result


def _resolve_template_html_paths(template_id: str, *, kind: str) -> tuple[Path, Path, Path, str]:
    template_dir = _template_dir(template_id, kind=kind)
    final_path = template_dir / "report_final.html"
    base_path = template_dir / "template_p1.html"
    if final_path.exists():
        return template_dir, final_path, base_path, "report_final"
    if base_path.exists():
        return template_dir, final_path, base_path, "template_p1"
    raise _http_error(
        404,
        "template_html_missing",
        "Template HTML not found (report_final.html or template_p1.html). Run template verification first.",
    )


def _run_template_edit_llm(template_html: str, instructions: str) -> tuple[str, list[str]]:
    if not instructions or not str(instructions).strip():
        raise _http_error(400, "missing_instructions", "instructions is required for AI template edit.")
    prompt_payload = build_template_edit_prompt(template_html, instructions)
    messages = prompt_payload.get("messages") or []
    if not messages:
        raise _http_error(500, "prompt_build_failed", "Failed to build template edit prompt.")
    try:
        client = get_openai_client()
    except Exception as exc:
        logger.exception(
            "template_edit_llm_client_unavailable",
            extra={"event": "template_edit_llm_client_unavailable"},
        )
        raise _http_error(503, "llm_unavailable", f"LLM client is unavailable: {exc}")

    try:
        response = call_chat_completion(
            client,
            model=MODEL,
            messages=messages,
            description=TEMPLATE_EDIT_PROMPT_VERSION,
        )
    except Exception as exc:
        logger.exception(
            "template_edit_llm_failed",
            extra={"event": "template_edit_llm_failed"},
        )
        raise _http_error(502, "llm_call_failed", f"Template edit LLM call failed: {exc}")

    raw_text = (response.choices[0].message.content or "").strip()
    parsed_text = strip_code_fences(raw_text)
    try:
        payload = json.loads(parsed_text)
    except Exception as exc:
        logger.warning(
            "template_edit_llm_invalid_json",
            extra={"event": "template_edit_llm_invalid_json"},
        )
        raise _http_error(502, "llm_invalid_response", f"LLM did not return valid JSON: {exc}")

    if not isinstance(payload, dict):
        raise _http_error(502, "llm_invalid_response", "LLM response was not a JSON object.")

    updated_html = payload.get("updated_html")
    if not isinstance(updated_html, str) or not updated_html.strip():
        raise _http_error(502, "llm_invalid_response", "LLM response missing 'updated_html' string.")

    summary_raw = payload.get("summary")
    summary: list[str] = []
    if isinstance(summary_raw, list):
        for item in summary_raw:
            text = str(item).strip()
            if text:
                summary.append(text)
    elif isinstance(summary_raw, str):
        text = summary_raw.strip()
        if text:
            summary.append(text)

    return updated_html, summary


@app.get("/templates/{template_id}/html")
def get_template_html(template_id: str, request: Request):
    template_kind = _resolve_template_kind(template_id)
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    template_dir, final_path, base_path, source = _resolve_template_html_paths(template_id, kind=template_kind)
    if source == "report_final":
        active_path = final_path
    else:
        active_path = base_path
    html_text = active_path.read_text(encoding="utf-8", errors="ignore")
    history = _read_template_history(template_dir)
    summary = _load_template_generator_summary(template_id)
    return _build_template_html_response(
        template_id=template_id,
        kind=template_kind,
        html=html_text,
        source=source,
        template_dir=template_dir,
        history=history,
        summary=summary,
        correlation_id=correlation_id,
    )


@app.post("/templates/{template_id}/edit-manual")
def edit_template_manual(template_id: str, payload: TemplateManualEditPayload, request: Request):
    template_kind = _resolve_template_kind(template_id)
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    template_dir, final_path, base_path, source = _resolve_template_html_paths(template_id, kind=template_kind)
    try:
        lock_ctx = acquire_template_lock(template_dir, "template_edit_manual", correlation_id)
    except TemplateLockError:
        raise _http_error(
            409,
            "template_locked",
            "Template is currently processing another request.",
        )

    with lock_ctx:
        current_path = final_path if final_path.exists() else base_path
        if not current_path.exists():
            raise _http_error(
                404,
                "template_html_missing",
                "Template HTML not found (report_final.html or template_p1.html).",
            )
        current_html = current_path.read_text(encoding="utf-8", errors="ignore")
        prev_path = template_dir / "report_final_prev.html"
        write_text_atomic(prev_path, current_html, encoding="utf-8", step="template_edit_prev")

        new_html = payload.html or ""
        write_text_atomic(final_path, new_html, encoding="utf-8", step="template_edit_manual")

        notes = "Manual HTML edit via template editor"
        summary = _update_template_generator_summary_for_edit(
            template_id,
            edit_type="manual",
            notes=notes,
        )
        history_entry = {
            "timestamp": summary.get("lastEditAt") or _utcnow_iso(),
            "type": "manual",
            "notes": notes,
        }
        history = _append_template_history_entry(template_dir, history_entry)

    return _build_template_html_response(
        template_id=template_id,
        kind=template_kind,
        html=new_html,
        source="report_final",
        template_dir=template_dir,
        history=history,
        summary=summary,
        correlation_id=correlation_id,
    )


@app.post("/templates/{template_id}/edit-ai")
def edit_template_ai(template_id: str, payload: TemplateAiEditPayload, request: Request):
    template_kind = _resolve_template_kind(template_id)
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    template_dir, final_path, base_path, source = _resolve_template_html_paths(template_id, kind=template_kind)
    try:
        lock_ctx = acquire_template_lock(template_dir, "template_edit_ai", correlation_id)
    except TemplateLockError:
        raise _http_error(
            409,
            "template_locked",
            "Template is currently processing another request.",
        )

    with lock_ctx:
        current_path = final_path if final_path.exists() else base_path
        if not current_path.exists():
            raise _http_error(
                404,
                "template_html_missing",
                "Template HTML not found (report_final.html or template_p1.html).",
            )

        # Versioning: persist the on-disk current HTML as the previous version.
        current_disk_html = current_path.read_text(encoding="utf-8", errors="ignore")
        prev_path = template_dir / "report_final_prev.html"
        write_text_atomic(prev_path, current_disk_html, encoding="utf-8", step="template_edit_prev")

        # Base HTML for the LLM can come from the request payload (unsaved edits) or disk.
        if isinstance(payload.html, str) and payload.html.strip():
            llm_input_html = payload.html
        else:
            llm_input_html = current_disk_html

        updated_html, change_summary = _run_template_edit_llm(llm_input_html, payload.instructions or "")
        write_text_atomic(final_path, updated_html, encoding="utf-8", step="template_edit_ai")

        notes = "AI-assisted HTML edit via template editor"
        summary = _update_template_generator_summary_for_edit(
            template_id,
            edit_type="ai",
            notes=notes,
        )
        history_entry = {
            "timestamp": summary.get("lastEditAt") or _utcnow_iso(),
            "type": "ai",
            "notes": notes,
            "instructions": payload.instructions or "",
            "summary": change_summary,
        }
        history = _append_template_history_entry(template_dir, history_entry)

    return _build_template_html_response(
        template_id=template_id,
        kind=template_kind,
        html=updated_html,
        source="report_final",
        template_dir=template_dir,
        history=history,
        summary=summary,
        ai_summary=change_summary,
        correlation_id=correlation_id,
    )


@app.post("/templates/{template_id}/undo-last-edit")
def undo_last_template_edit(template_id: str, request: Request):
    template_kind = _resolve_template_kind(template_id)
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    template_dir = _template_dir(template_id, kind=template_kind)
    final_path = template_dir / "report_final.html"
    prev_path = template_dir / "report_final_prev.html"

    if not prev_path.exists():
        raise _http_error(400, "no_previous_version", "No previous template version found to undo.")
    if not final_path.exists():
        raise _http_error(404, "template_html_missing", "Current template HTML not found for undo.")

    try:
        lock_ctx = acquire_template_lock(template_dir, "template_edit_undo", correlation_id)
    except TemplateLockError:
        raise _http_error(
            409,
            "template_locked",
            "Template is currently processing another request.",
        )

    with lock_ctx:
        tmp_path = template_dir / "report_final_undo_tmp.html"
        with contextlib.suppress(FileNotFoundError):
            tmp_path.unlink()

        final_path.rename(tmp_path)
        prev_path.rename(final_path)
        tmp_path.rename(prev_path)

        restored_html = final_path.read_text(encoding="utf-8", errors="ignore")

        notes = "Undo last template HTML edit"
        summary = _update_template_generator_summary_for_edit(
            template_id,
            edit_type="undo",
            notes=notes,
        )
        history_entry = {
            "timestamp": summary.get("lastEditAt") or _utcnow_iso(),
            "type": "undo",
            "notes": notes,
        }
        history = _append_template_history_entry(template_dir, history_entry)

    return _build_template_html_response(
        template_id=template_id,
        kind=template_kind,
        html=restored_html,
        source="report_final",
        template_dir=template_dir,
        history=history,
        summary=summary,
        correlation_id=correlation_id,
    )


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
        raise _http_error(
            400,
            "invalid_payload",
            "Provide db_url or database when creating a connection.",
        )

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
        raise _http_error(
            400,
            "unsupported_db",
            "Only sqlite connections are supported in this build.",
        )

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
    return {
        "status": "ok",
        "connection_id": connection_id,
        "correlation_id": correlation_id,
    }


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
    templates = state_store.list_templates()
    hydrated_templates = _ensure_template_mapping_keys(templates)
    return {
        "status": "ok",
        "connections": state_store.list_connections(),
        "templates": hydrated_templates,
        "last_used": state_store.get_last_used(),
        "correlation_id": correlation_id,
    }


@app.get("/templates/catalog")
def templates_catalog(request: Request):
    """
    Return a unified catalog of company + starter templates with lightweight metadata
    suitable for recommendation and UI browsing.
    """
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    catalog = build_unified_template_catalog()
    return {
        "status": "ok",
        "templates": catalog,
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
    hydrated = _ensure_template_mapping_keys(templates)
    return {"status": "ok", "templates": hydrated, "correlation_id": correlation_id}


@app.post("/templates/recommend", response_model=TemplateRecommendResponse)
def recommend_templates_endpoint(payload: TemplateRecommendPayload, request: Request):
    """
    LLM-backed template recommender. Accepts a free-text requirement and optional
    context hints, returning a ranked list of templates with explanations.
    """
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    catalog = build_unified_template_catalog()

    hints: dict[str, Any] = {}
    if payload.kind:
        hints["kind"] = payload.kind
    if payload.domain:
        hints["domain"] = payload.domain
    if payload.schema_snapshot:
        hints["schema_snapshot"] = payload.schema_snapshot
    if payload.tables:
        hints["tables"] = payload.tables

    raw_recs = recommend_templates_from_catalog(
        catalog,
        requirement=payload.requirement,
        hints=hints,
        max_results=6,
    )

    catalog_by_id: dict[str, dict[str, Any]] = {}
    for item in catalog:
        if isinstance(item, dict):
            tid = str(item.get("id") or "").strip()
            if tid and tid not in catalog_by_id:
                catalog_by_id[tid] = item

    recommendations: list[TemplateRecommendation] = []
    for rec in raw_recs:
        tid = str(rec.get("id") or "").strip()
        if not tid:
            continue
        template = catalog_by_id.get(tid)
        if not template:
            continue
        explanation = str(rec.get("explanation") or "").strip()
        try:
            score = float(rec.get("score") or 0.0)
        except Exception:
            score = 0.0
        recommendations.append(
            TemplateRecommendation(
                template=template,
                explanation=explanation,
                score=score,
            )
        )

    return TemplateRecommendResponse(recommendations=recommendations)


@app.delete("/templates/{template_id}")
def delete_template_endpoint(template_id: str, request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    existing_record = state_store.get_template_record(template_id)
    template_kind = _resolve_template_kind(template_id)
    try:
        tdir = _template_dir(template_id, must_exist=False, create=False, kind=template_kind)
    except HTTPException:
        raise

    lock_ctx: ContextManager[None] = contextlib.nullcontext()
    if tdir.exists():
        try:
            lock_ctx = acquire_template_lock(tdir, "template_delete", correlation_id)
        except TemplateLockError:
            raise _http_error(
                409,
                "template_locked",
                "Template is currently processing another request.",
            )

    removed_dir = False
    with lock_ctx:
        if tdir.exists():
            try:
                shutil.rmtree(tdir)
                removed_dir = True
            except FileNotFoundError:
                removed_dir = False
            except Exception as exc:
                logger.error(
                    "template_delete_failed",
                    extra={
                        "event": "template_delete_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                    exc_info=True,
                )
                raise _http_error(
                    500,
                    "template_delete_failed",
                    f"Failed to remove template files: {exc}",
                )

        removed_state = state_store.delete_template(template_id)

    if not removed_state and not removed_dir and existing_record is None:
        raise _http_error(404, "template_not_found", "template_id not found")

    logger.info(
        "template_deleted",
        extra={
            "event": "template_deleted",
            "template_id": template_id,
            "correlation_id": correlation_id,
        },
    )

    return {
        "status": "ok",
        "template_id": template_id,
        "correlation_id": correlation_id,
    }


# ----------------------------
# Template ZIP export/import
# ----------------------------


@app.get("/templates/{template_id}/export.zip")
def export_template_zip(template_id: str, request: Request):
    """Export the entire template folder under uploads as a zip (includes previews by default)."""
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    tdir = _template_dir(template_id, must_exist=True, create=False, kind="pdf")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp_path = Path(tmp.name)
    tmp.close()
    try:
        create_zip_from_dir(tdir, tmp_path, include_root=True)
    except Exception as exc:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise _http_error(500, "export_failed", f"Failed to create zip: {exc}")

    filename = f"template-{template_id[:8]}.zip"

    def iterfile():
        with open(tmp_path, "rb") as fh:
            while True:
                chunk = fh.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    headers = {
        "Content-Disposition": f"attachment; filename=\"{filename}\"",
        "x-correlation-id": correlation_id or "",
    }
    return StreamingResponse(iterfile(), media_type="application/zip", headers=headers)


@app.post("/templates/import-zip")
async def import_template_zip(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    request: Request = None,
):
    """Import a zip previously exported (or a replica of an uploads folder). No encryption or password expected."""
    request_state = getattr(request, "state", None)
    correlation_id = getattr(request_state, "correlation_id", None) or get_correlation_id()

    # Persist incoming upload to a temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp_path = Path(tmp.name)
    try:
        content = await file.read()
        tmp.write(content)
    finally:
        tmp.close()

    # Decide template_id from zip root folder if possible; otherwise generate one
    zip_contains_excel = False
    try:
        import zipfile

        with zipfile.ZipFile(tmp_path, mode="r") as zf:
            members = list(zf.infolist())
            root_name = detect_zip_root(m.filename for m in members)
            for member in members:
                member_name = Path(member.filename).name.lower()
                if member_name == "source.xlsx":
                    zip_contains_excel = True
                    break
    except Exception:
        root_name = None

    template_kind = "excel" if zip_contains_excel else "pdf"
    candidate_id = _maybe_reuse_template_id(root_name, kind=template_kind)
    name_hint = name or root_name or getattr(file, "filename", "")
    template_id = candidate_id or _generate_template_id(name_hint, kind=template_kind)
    if _template_id_exists(template_id, kind=template_kind):
        template_id = _generate_template_id(name_hint, kind=template_kind)

    tdir = _template_dir(template_id, must_exist=False, create=True, kind=template_kind)

    try:
        # Extract the zip safely; strip a single root folder if present
        extract_zip_to_dir(tmp_path, tdir, strip_root=True)
    except Exception as exc:
        try:
            shutil.rmtree(tdir, ignore_errors=True)
        except Exception:
            pass
        raise _http_error(400, "import_failed", f"Failed to extract zip: {exc}")
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    # Build artifact URLs for state
    html_path = tdir / "template_p1.html"
    if template_kind == "excel":
        thumb_path = None
        for candidate in ("reference_p1.png", "report_final.png", "render_p1.png"):
            candidate_path = tdir / candidate
            if candidate_path.exists():
                thumb_path = candidate_path
                break
    else:
        thumb_path = (tdir / "render_p1.png") if (tdir / "render_p1.png").exists() else (
            (tdir / "report_final.png") if (tdir / "report_final.png").exists() else None
        )
    contract_path = tdir / "contract.json"
    gen_dir = tdir / "generator"
    sql_pack_path = gen_dir / "sql_pack.sql"
    gen_meta_path = gen_dir / "generator_assets.json"
    out_schemas_path = gen_dir / "output_schemas.json"

    manifest_url = _manifest_endpoint(template_id, kind=template_kind)
    if template_kind == "excel":
        sample_rows_path = tdir / "sample_rows.json"
        reference_html_path = tdir / "reference_p1.html"
        xlsx_path = tdir / "source.xlsx"
        artifacts_payload = {
            "template_html_url": _artifact_url(html_path) if html_path.exists() else None,
            "thumbnail_url": _artifact_url(thumb_path) if thumb_path else None,
            "contract_url": _artifact_url(contract_path) if contract_path.exists() else None,
            "generator_sql_pack_url": _artifact_url(sql_pack_path) if sql_pack_path.exists() else None,
            "generator_output_schemas_url": _artifact_url(out_schemas_path) if out_schemas_path.exists() else None,
            "generator_assets_url": _artifact_url(gen_meta_path) if gen_meta_path.exists() else None,
            "sample_rows_url": _artifact_url(sample_rows_path) if sample_rows_path.exists() else None,
            "reference_html_url": _artifact_url(reference_html_path) if reference_html_path.exists() else None,
            "xlsx_url": _artifact_url(xlsx_path) if xlsx_path.exists() else None,
            "manifest_url": manifest_url,
        }
    else:
        artifacts_payload = {
            "template_html_url": _artifact_url(html_path) if html_path.exists() else None,
            "thumbnail_url": _artifact_url(thumb_path) if thumb_path else None,
            "contract_url": _artifact_url(contract_path) if contract_path.exists() else None,
            "generator_sql_pack_url": _artifact_url(sql_pack_path) if sql_pack_path.exists() else None,
            "generator_output_schemas_url": _artifact_url(out_schemas_path) if out_schemas_path.exists() else None,
            "generator_assets_url": _artifact_url(gen_meta_path) if gen_meta_path.exists() else None,
            "manifest_url": manifest_url,
        }

    # Decide a name
    display_name = (name or "").strip()
    if not display_name:
        overview_path = tdir / "overview.md"
        if overview_path.exists():
            try:
                first = (overview_path.read_text(encoding="utf-8", errors="ignore").splitlines() or [""])[0]
                display_name = first.strip() or display_name
            except Exception:
                pass
    if not display_name:
        display_name = f"Template {template_id[:8]}"

    status = "approved" if contract_path.exists() else "draft"

    mapping_keys = _load_mapping_keys(tdir)
    state_store.upsert_template(
        template_id,
        name=display_name,
        status=status,
        artifacts={k: v for k, v in artifacts_payload.items() if v},
        connection_id=None,
        mapping_keys=mapping_keys,
        template_type=template_kind,
    )

    # If generator bundle present, update generator metadata for UI
    try:
        bundle = load_generator_assets_bundle(tdir)
        if bundle:
            state_store.update_template_generator(
                template_id,
                dialect=bundle.get("dialect"),
                params=bundle.get("params"),
                invalid=bool(bundle.get("invalid")),
                needs_user_fix=bundle.get("needs_user_fix") or [],
                summary=bundle.get("summary"),
                dry_run=bundle.get("dry_run"),
                cached=bundle.get("cached"),
            )
    except Exception:
        # Non-fatal: importing should succeed even if generator meta parse fails
        pass

    return {
        "status": "ok",
        "template_id": template_id,
        "name": display_name,
        "artifacts": {k: v for k, v in artifacts_payload.items() if v},
        "correlation_id": correlation_id,
    }


@app.post("/templates/verify")
async def verify_template(
    file: UploadFile = File(...),
    connection_id: str = Form(...),
    refine_iters: int = Form(0),  # retained for compatibility (unused)
    request: Request = None,
):
    original_filename = getattr(file, "filename", "") or ""
    template_name_hint = Path(original_filename).stem if original_filename else ""
    tid = _generate_template_id(template_name_hint, kind="pdf")
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
            "upload_filename": getattr(file, "filename", None),
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

        stage_timings: dict[str, float] = {}

        def start_stage(stage_key: str, label: str, progress: int | float, **payload: Any) -> bytes:
            stage_timings[stage_key] = time.time()
            event_payload: dict[str, Any] = {
                "stage": stage_key,
                "label": label,
                "status": "started",
                "progress": progress,
                "template_id": tid,
            }
            if payload:
                event_payload.update(payload)
            return emit("stage", **event_payload)

        def finish_stage(
            stage_key: str,
            label: str,
            *,
            progress: int | float | None = None,
            status: str = "complete",
            **payload: Any,
        ) -> bytes:
            started = stage_timings.pop(stage_key, None)
            elapsed_ms = int((time.time() - started) * 1000) if started else None
            event_payload: dict[str, Any] = {
                "stage": stage_key,
                "label": label,
                "status": status,
                "template_id": tid,
            }
            if progress is not None:
                event_payload["progress"] = progress
            if elapsed_ms is not None:
                event_payload["elapsed_ms"] = elapsed_ms
            if payload:
                event_payload.update(payload)
            return emit("stage", **event_payload)

        try:
            stage_key = "verify.upload_pdf"
            stage_label = "Uploading your PDF"
            stage_started = time.time()
            yield start_stage(stage_key, stage_label, progress=5)
            total_bytes = 0
            try:
                tmp = tempfile.NamedTemporaryFile(
                    dir=str(tdir),
                    prefix="source.",
                    suffix=".pdf.tmp",
                    delete=False,
                )
                try:
                    with tmp:
                        limit_bytes = MAX_VERIFY_PDF_BYTES
                        while True:
                            chunk = file.file.read(1024 * 1024)
                            if not chunk:
                                break
                            total_bytes += len(chunk)
                            if limit_bytes is not None and total_bytes > limit_bytes:
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
                                raise RuntimeError(f"Uploaded PDF exceeds {_format_bytes(limit_bytes)} limit.")
                            tmp.write(chunk)
                        tmp.flush()
                        with contextlib.suppress(OSError):
                            os.fsync(tmp.fileno())
                    Path(tmp.name).replace(pdf_path)
                finally:
                    with contextlib.suppress(FileNotFoundError):
                        Path(tmp.name).unlink(missing_ok=True)
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=5,
                    status="error",
                    detail=str(exc),
                    size_bytes=total_bytes or None,
                )
                raise
            else:
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(stage_key, stage_label, progress=20, size_bytes=total_bytes)

            stage_key = "verify.render_reference_preview"
            stage_label = "Rendering a preview image"
            stage_started = time.time()
            yield start_stage(stage_key, stage_label, progress=25)
            png_path: Path | None = None
            layout_hints: dict[str, Any] | None = None
            try:
                ref_pngs = pdf_to_pngs(pdf_path, tdir, dpi=int(os.getenv("PDF_DPI", "400")))
                if not ref_pngs:
                    raise RuntimeError("No pages rendered from PDF")
                png_path = ref_pngs[0]
                layout_hints = get_layout_hints(pdf_path, 0)
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                yield finish_stage(stage_key, stage_label, progress=25, status="error", detail=str(exc))
                raise
            else:
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(stage_key, stage_label, progress=60)

            stage_key = "verify.generate_html"
            stage_label = "Converting preview to HTML"
            stage_started = time.time()
            yield start_stage(stage_key, stage_label, progress=70)
            try:
                initial_result = request_initial_html(png_path, None, layout_hints=layout_hints)
                html_text = initial_result.html
                schema_payload = initial_result.schema or {}
                save_html(html_path, html_text)
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                yield finish_stage(stage_key, stage_label, progress=70, status="error", detail=str(exc))
                raise

            schema_path = tdir / "schema_ext.json"
            if schema_payload:
                try:
                    write_json_atomic(
                        schema_path,
                        schema_payload,
                        indent=2,
                        ensure_ascii=False,
                        step="verify_schema_ext",
                    )
                except Exception:
                    logger.exception(
                        "verify_schema_write_failed",
                        extra={
                            "event": "verify_schema_write_failed",
                            "template_id": tid,
                            "correlation_id": correlation_id,
                        },
                    )
            else:
                with contextlib.suppress(FileNotFoundError):
                    schema_path.unlink()

            log_stage(stage_label, "ok", stage_started)
            yield finish_stage(stage_key, stage_label, progress=78)

            # Render HTML to PNG for comparison
            render_png_path = tdir / "render_p1.png"
            tight_render_png_path = render_png_path
            stage_key = "verify.render_html_preview"
            stage_label = "Rendering the HTML preview"
            stage_started = time.time()
            yield start_stage(stage_key, stage_label, progress=80)
            try:
                render_html_to_png(html_path, render_png_path)
                panel_png_path = render_png_path.with_name("render_p1_llm.png")
                render_panel_preview(html_path, panel_png_path, fallback_png=render_png_path)
                tight_render_png_path = panel_png_path if panel_png_path.exists() else render_png_path
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(stage_key, stage_label, progress=88)
            except Exception as exc:  # pragma: no cover - surfaced to client
                log_stage(stage_label, "error", stage_started)
                yield finish_stage(stage_key, stage_label, progress=80, status="error", detail=str(exc))
                raise

            # Optional HTML refinement pass
            stage_key = "verify.refine_html_layout"
            stage_label = "Refining HTML layout fidelity..."
            stage_started = time.time()
            max_fix_passes = int(os.getenv("MAX_FIX_PASSES", "1"))
            fix_enabled = os.getenv("VERIFY_FIX_HTML_ENABLED", "true").lower() not in {
                "false",
                "0",
            }

            yield start_stage(
                stage_key,
                stage_label,
                progress=90,
                max_fix_passes=max_fix_passes,
                fix_enabled=fix_enabled,
            )

            fix_result: Optional[dict[str, Any]] = None
            render_after_path: Optional[Path] = None
            render_after_full_path: Optional[Path] = None
            metrics_path: Optional[Path] = None
            fix_attempted = fix_enabled and max_fix_passes > 0

            if fix_attempted:
                try:
                    fix_result = request_fix_html(
                        tdir,
                        html_path,
                        schema_path if schema_payload else None,
                        png_path,
                        tight_render_png_path,
                        0.0,
                    )
                except Exception:
                    logger.exception(
                        "verify_template_fix_html_failed",
                        extra={
                            "event": "verify_template_fix_html_failed",
                            "template_id": tid,
                            "correlation_id": correlation_id,
                        },
                    )
                else:
                    render_after_path = fix_result.get("render_after_path")
                    render_after_full_path = fix_result.get("render_after_full_path")
                    metrics_path = fix_result.get("metrics_path")

            log_stage(stage_label, "ok", stage_started)
            yield finish_stage(
                stage_key,
                stage_label,
                progress=96,
                skipped=not fix_attempted,
                fix_attempted=fix_attempted,
                fix_accepted=bool(fix_result and fix_result.get("accepted")),
                render_after=_artifact_url(render_after_path) if render_after_path else None,
                metrics=_artifact_url(metrics_path) if metrics_path else None,
            )

            schema_url = _artifact_url(schema_path) if schema_payload else None
            render_url = _artifact_url(tight_render_png_path)
            render_after_url = _artifact_url(render_after_path) if render_after_path else None
            metrics_url = _artifact_url(metrics_path) if metrics_path else None

            manifest_files: dict[str, Path] = {
                "source.pdf": pdf_path,
                "reference_p1.png": png_path,
                "template_p1.html": html_path,
                "render_p1.png": render_png_path,
            }
            if tight_render_png_path and tight_render_png_path.exists():
                manifest_files["render_p1_llm.png"] = tight_render_png_path
            if schema_payload:
                manifest_files["schema_ext.json"] = schema_path
            if render_after_path:
                manifest_files["render_p1_after.png"] = render_after_path
            if render_after_full_path and render_after_full_path.exists():
                manifest_files["render_p1_after_full.png"] = render_after_full_path
            if metrics_path:
                manifest_files["fix_metrics.json"] = metrics_path

            stage_key = "verify.save_artifacts"
            stage_label = "Saving verification artifacts"
            stage_started = time.time()
            yield start_stage(stage_key, stage_label, progress=97)
            try:
                write_artifact_manifest(
                    tdir,
                    step="templates_verify",
                    files=manifest_files,
                    inputs=[str(pdf_path)],
                    correlation_id=correlation_id,
                )
            except Exception as exc:  # pragma: no cover - logging only
                logger.exception(
                    "verify_template_manifest_failed",
                    extra={
                        "event": "verify_template_manifest_failed",
                        "template_id": tid,
                        "correlation_id": correlation_id,
                    },
                )
                log_stage(stage_label, "error", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=97,
                    status="error",
                    detail=str(exc),
                )
            else:
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=99,
                    manifest_files=len(manifest_files),
                    schema_url=schema_url,
                    render_url=render_url,
                    render_after_url=render_after_url,
                    metrics_url=metrics_url,
                )

            template_name = template_name_hint or f"Template {tid[:8]}"
            artifacts_for_state = {
                "template_html_url": _artifact_url(html_path),
                "thumbnail_url": _artifact_url(png_path),
                "pdf_url": _artifact_url(pdf_path),
            }
            if schema_url:
                artifacts_for_state["schema_ext_url"] = schema_url
            if render_url:
                artifacts_for_state["render_png_url"] = render_url
            if render_after_url:
                artifacts_for_state["render_after_png_url"] = render_after_url
            if metrics_url:
                artifacts_for_state["fix_metrics_url"] = metrics_url
            manifest_url = _manifest_endpoint(tid, kind="pdf")
            artifacts_for_state["manifest_url"] = manifest_url

            state_store.upsert_template(
                tid,
                name=template_name,
                status="draft",
                artifacts=artifacts_for_state,
                connection_id=connection_id or None,
                template_type="pdf",
            )
            state_store.set_last_used(connection_id or None, tid)

            total_elapsed_ms = int((time.time() - pipeline_started) * 1000)
            yield emit(
                "result",
                stage="Verification complete.",
                progress=100,
                template_id=tid,
                schema=schema_payload,
                elapsed_ms=total_elapsed_ms,
                artifacts={
                    "pdf_url": _artifact_url(pdf_path),
                    "png_url": _artifact_url(png_path),
                    "html_url": _artifact_url(html_path),
                    "manifest_url": manifest_url,
                    **({"schema_ext_url": schema_url} if schema_url else {}),
                    **({"render_png_url": render_url} if render_url else {}),
                    **({"render_after_png_url": render_after_url} if render_after_url else {}),
                    **({"fix_metrics_url": metrics_url} if metrics_url else {}),
                },
            )
            logger.info(
                "verify_template_complete",
                extra={
                    "event": "verify_template_complete",
                    "template_id": tid,
                    "schema_keys": list(schema_payload.keys()),
                    "correlation_id": correlation_id,
                    "elapsed_ms": total_elapsed_ms,
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
                extra={
                    "event": "verify_template_failed",
                    "template_id": tid,
                    "correlation_id": correlation_id,
                },
            )
        finally:
            with contextlib.suppress(Exception):
                file.file.close()

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")


@app.post("/excel/verify")
async def verify_template_excel(
    file: UploadFile = File(...),
    connection_id: str = Form(""),
    request: Request = None,
):
    template_kind = "excel"
    original_filename = getattr(file, "filename", "") or ""
    template_name_hint = Path(original_filename).stem if original_filename else ""
    tid = _generate_template_id(template_name_hint or "Workbook", kind=template_kind)
    tdir = _template_dir(tid, must_exist=False, create=True, kind=template_kind)
    xlsx_path = tdir / "source.xlsx"

    request_state = getattr(request, "state", None)
    correlation_id = getattr(request_state, "correlation_id", None) or get_correlation_id()

    logger.info(
        "excel_verify_start",
        extra={
            "event": "excel_verify_start",
            "template_id": tid,
            "upload_filename": getattr(file, "filename", None),
            "correlation_id": correlation_id,
        },
    )

    def event_stream():
        pipeline_started = time.time()

        def emit(event: str, **payload):
            data = {"event": event, **payload}
            return (json.dumps(data, ensure_ascii=False) + "\n").encode("utf-8")

        stage_timings: dict[str, float] = {}

        def start_stage(stage_key: str, label: str, progress: int | float, **payload: Any) -> bytes:
            stage_timings[stage_key] = time.time()
            event_payload = {
                "stage": stage_key,
                "label": label,
                "status": "started",
                "progress": progress,
                "template_id": tid,
                "kind": template_kind,
            }
            if payload:
                event_payload.update(payload)
            return emit("stage", **event_payload)

        def finish_stage(
            stage_key: str,
            label: str,
            *,
            progress: int | float | None = None,
            status: str = "complete",
            **payload: Any,
        ) -> bytes:
            started = stage_timings.pop(stage_key, None)
            elapsed_ms = int((time.time() - started) * 1000) if started else None
            event_payload = {
                "stage": stage_key,
                "label": label,
                "status": status,
                "template_id": tid,
                "kind": template_kind,
            }
            if progress is not None:
                event_payload["progress"] = progress
            if elapsed_ms is not None:
                event_payload["elapsed_ms"] = elapsed_ms
            if payload:
                event_payload.update(payload)
            return emit("stage", **event_payload)

        try:
            # Stage: upload Excel
            stage_key = "excel.upload_file"
            stage_label = "Uploading your workbook"
            yield start_stage(stage_key, stage_label, progress=5)
            total_bytes = 0
            try:
                tmp = tempfile.NamedTemporaryFile(
                    dir=str(tdir),
                    prefix="source.",
                    suffix=".xlsx.tmp",
                    delete=False,
                )
                try:
                    with tmp:
                        while True:
                            chunk = file.file.read(1024 * 1024)
                            if not chunk:
                                break
                            total_bytes += len(chunk)
                            tmp.write(chunk)
                        tmp.flush()
                        with contextlib.suppress(OSError):
                            os.fsync(tmp.fileno())
                    Path(tmp.name).replace(xlsx_path)
                finally:
                    with contextlib.suppress(FileNotFoundError):
                        Path(tmp.name).unlink(missing_ok=True)
            except Exception as exc:
                yield finish_stage(stage_key, stage_label, progress=5, status="error", detail=str(exc))
                raise
            else:
                yield finish_stage(stage_key, stage_label, progress=25, size_bytes=total_bytes)

            # Stage: build HTML + preview
            stage_key = "excel.generate_html"
            stage_label = "Building preview HTML"
            yield start_stage(stage_key, stage_label, progress=45)
            try:
                preview = xlsx_to_html_preview(xlsx_path, tdir)
                html_path = preview.html_path
                png_path = preview.png_path
            except Exception as exc:
                yield finish_stage(stage_key, stage_label, progress=45, status="error", detail=str(exc))
                raise
            else:
                yield finish_stage(stage_key, stage_label, progress=80)

            # Stage: write manifest
            schema_path = tdir / "schema_ext.json"
            sample_rows_path = tdir / "sample_rows.json"
            reference_html_path = tdir / "reference_p1.html"
            reference_png_path = tdir / "reference_p1.png"
            manifest_files: dict[str, Path] = {"source.xlsx": xlsx_path, "template_p1.html": html_path}
            if png_path and png_path.exists():
                manifest_files[png_path.name] = png_path
            if reference_png_path.exists():
                manifest_files[reference_png_path.name] = reference_png_path
            if sample_rows_path.exists():
                manifest_files[sample_rows_path.name] = sample_rows_path
            if reference_html_path.exists():
                manifest_files[reference_html_path.name] = reference_html_path
            if schema_path.exists():
                manifest_files[schema_path.name] = schema_path

            stage_key = "excel.save_artifacts"
            stage_label = "Saving verification artifacts"
            yield start_stage(stage_key, stage_label, progress=90)
            try:
                write_artifact_manifest(
                    tdir,
                    step="excel_verify",
                    files=manifest_files,
                    inputs=[str(xlsx_path)],
                    correlation_id=correlation_id,
                )
            except Exception as exc:
                yield finish_stage(stage_key, stage_label, progress=90, status="error", detail=str(exc))
                raise
            else:
                yield finish_stage(stage_key, stage_label, progress=96, manifest_files=len(manifest_files))

            manifest_url = _manifest_endpoint(tid, kind=template_kind)
            html_url = _artifact_url(html_path)
            png_url = _artifact_url(png_path)
            xlsx_url = _artifact_url(xlsx_path)
            sample_rows_url = _artifact_url(sample_rows_path) if sample_rows_path.exists() else None
            reference_html_url = _artifact_url(reference_html_path) if reference_html_path.exists() else None
            reference_png_url = _artifact_url(reference_png_path) if reference_png_path.exists() else None
            schema_url = _artifact_url(schema_path) if schema_path.exists() else None

            template_display_name = template_name_hint or "Workbook"
            if not template_display_name:
                template_display_name = f"Template {tid[:8]}"
            state_store.upsert_template(
                tid,
                name=template_display_name,
                status="draft",
                artifacts={
                    "template_html_url": html_url,
                    "thumbnail_url": png_url,
                    "xlsx_url": xlsx_url,
                    "manifest_url": manifest_url,
                    **({"sample_rows_url": sample_rows_url} if sample_rows_url else {}),
                    **({"reference_html_url": reference_html_url} if reference_html_url else {}),
                    **({"reference_png_url": reference_png_url} if reference_png_url else {}),
                    **({"schema_ext_url": schema_url} if schema_url else {}),
                },
                connection_id=connection_id or None,
                template_type=template_kind,
            )
            state_store.set_last_used(connection_id or None, tid)

            total_elapsed_ms = int((time.time() - pipeline_started) * 1000)
            yield emit(
                "result",
                stage="Excel verification complete.",
                progress=100,
                template_id=tid,
                kind=template_kind,
                schema=None,
                elapsed_ms=total_elapsed_ms,
                artifacts={
                    "xlsx_url": xlsx_url,
                    "png_url": png_url,
                    "html_url": html_url,
                    "manifest_url": manifest_url,
                    **({"sample_rows_url": sample_rows_url} if sample_rows_url else {}),
                    **({"reference_html_url": reference_html_url} if reference_html_url else {}),
                    **({"reference_png_url": reference_png_url} if reference_png_url else {}),
                    **({"schema_ext_url": schema_url} if schema_url else {}),
                },
            )
            logger.info(
                "excel_verify_complete",
                extra={
                    "event": "excel_verify_complete",
                    "template_id": tid,
                    "correlation_id": correlation_id,
                    "elapsed_ms": total_elapsed_ms,
                },
            )
        except Exception as exc:  # pragma: no cover - best-effort diagnostics
            yield emit(
                "error",
                stage="Excel verification failed.",
                detail=str(exc),
                template_id=tid,
                kind=template_kind,
            )
            logger.exception(
                "excel_verify_failed",
                extra={
                    "event": "excel_verify_failed",
                    "template_id": tid,
                    "correlation_id": correlation_id,
                },
            )
        finally:
            with contextlib.suppress(Exception):
                file.file.close()

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")


def _mapping_preview_pipeline(
    template_id: str,
    connection_id: Optional[str],
    request: Optional[Request],
    *,
    correlation_id: Optional[str] = None,
    force_refresh: bool = False,
    kind: str = "pdf",
) -> Iterator[dict[str, Any]]:
    correlation_id = correlation_id or (getattr(request.state, "correlation_id", None) if request else None)
    yield {
        "event": "stage",
        "stage": "mapping_preview",
        "status": "start",
        "template_id": template_id,
        "correlation_id": correlation_id,
        "prompt_version": PROMPT_VERSION,
    }

    template_dir = _template_dir(template_id, kind=kind)
    mapping_keys_path = _mapping_keys_path(template_dir)
    html_path = template_dir / "template_p1.html"
    if not html_path.exists():
        raise _http_error(404, "template_not_ready", "Run /templates/verify first")
    template_html = html_path.read_text(encoding="utf-8", errors="ignore")

    schema_ext = _load_schema_ext(template_dir) or {}

    db_path = _db_path_from_payload_or_default(connection_id)
    verify_sqlite(db_path)

    try:
        schema_info = get_parent_child_info(db_path)
    except Exception as exc:
        logger.exception(
            "mapping_preview_schema_probe_failed",
            extra={
                "event": "mapping_preview_schema_probe_failed",
                "template_id": template_id,
            },
        )
        raise _http_error(500, "db_introspection_failed", f"DB introspection failed: {exc}")

    catalog = list(dict.fromkeys(_build_catalog_from_db(db_path)))
    pdf_sha = _sha256_path(_find_reference_pdf(template_dir)) or ""
    png_path = _find_reference_png(template_dir)
    db_sig = compute_db_signature(db_path) or ""
    html_pre_sha = _sha256_text(template_html)
    catalog_sha = _catalog_sha256(catalog)
    schema_sha = _schema_sha256(schema_ext)
    saved_keys = _load_mapping_keys(template_dir)

    cache_payload = {
        "pdf_sha": pdf_sha,
        "db_signature": db_sig,
        "html_sha": html_pre_sha,
        "prompt_version": PROMPT_VERSION,
        "catalog_sha": catalog_sha,
        "schema_sha": schema_sha,
    }
    cache_key = hashlib.sha256(json.dumps(cache_payload, sort_keys=True).encode("utf-8")).hexdigest()

    cached_doc, mapping_path = _load_mapping_step3(template_dir)
    constants_path = template_dir / "constant_replacements.json"
    if not force_refresh and cached_doc:
        prompt_meta = cached_doc.get("prompt_meta") or {}
        post_sha = prompt_meta.get("post_html_sha256")
        pre_sha_cached = prompt_meta.get("pre_html_sha256")
        cache_key_stored = prompt_meta.get("cache_key")
        html_matches_pre = pre_sha_cached == html_pre_sha
        html_matches_post = bool(post_sha and post_sha == html_pre_sha)
        cache_key_matches = cache_key_stored == cache_key
        cache_match = (cache_key_matches and (html_matches_pre or html_matches_post)) or (
            html_matches_post and cache_key_stored and not cache_key_matches
        )
        if cache_match:
            effective_cache_key = cache_key if cache_key_matches else (cache_key_stored or cache_key)
            mapping = cached_doc.get("mapping") or {}
            constant_replacements = cached_doc.get("constant_replacements") or {}
            if not constant_replacements and isinstance(cached_doc.get("raw_payload"), dict):
                constant_replacements = cached_doc["raw_payload"].get("constant_replacements") or {}
            errors = approval_errors(mapping)
            cached_prompt_version = prompt_meta.get("prompt_version") or PROMPT_VERSION
            yield {
                "event": "stage",
                "stage": "mapping_preview",
                "status": "cached",
                "template_id": template_id,
                "cache_key": effective_cache_key,
                "correlation_id": correlation_id,
                "prompt_version": cached_prompt_version,
            }
            return {
                "mapping": mapping,
                "errors": errors,
                "schema_info": schema_info,
                "catalog": catalog,
                "cache_key": effective_cache_key,
                "cached": True,
                "constant_replacements": constant_replacements,
                "constant_replacements_count": len(constant_replacements),
                "prompt_version": cached_prompt_version,
                "keys": saved_keys,
            }

    try:
        lock_ctx = acquire_template_lock(template_dir, "mapping_preview", correlation_id)
    except TemplateLockError:
        raise _http_error(409, "template_locked", "Template is currently processing another request.")

    with lock_ctx:
        try:
            result = run_llm_call_3(
                template_html,
                catalog,
                schema_ext,
                PROMPT_VERSION,
                str(png_path) if png_path else "",
                cache_key,
            )
        except MappingInlineValidationError as exc:
            raise _http_error(422, "mapping_llm_invalid", str(exc))
        except Exception as exc:
            logger.exception(
                "mapping_preview_llm_failed",
                extra={
                    "event": "mapping_preview_llm_failed",
                    "template_id": template_id,
                },
            )
            raise _http_error(500, "mapping_llm_failed", str(exc))

        html_applied = result.html_constants_applied
        write_text_atomic(html_path, html_applied, encoding="utf-8", step="mapping_preview_html")
        html_post_sha = _sha256_text(html_applied)

        mapping_doc = {
            "mapping": result.mapping,
            "meta": result.meta,
            "prompt_meta": {
                **(result.prompt_meta or {}),
                "cache_key": cache_key,
                "pre_html_sha256": html_pre_sha,
                "post_html_sha256": html_post_sha,
                "prompt_version": PROMPT_VERSION,
                "catalog_sha256": catalog_sha,
                "schema_sha256": schema_sha,
                "pdf_sha256": pdf_sha,
                "db_signature": db_sig,
            },
            "raw_payload": result.raw_payload,
            "constant_replacements": result.constant_replacements,
            "token_samples": result.token_samples,
        }
        write_json_atomic(
            mapping_path,
            mapping_doc,
            ensure_ascii=False,
            indent=2,
            step="mapping_preview_mapping",
        )
        write_json_atomic(
            constants_path,
            result.constant_replacements,
            ensure_ascii=False,
            indent=2,
            step="mapping_preview_constants",
        )
        files_payload = {
            html_path.name: html_path,
            mapping_path.name: mapping_path,
            constants_path.name: constants_path,
        }
        if mapping_keys_path.exists():
            files_payload[mapping_keys_path.name] = mapping_keys_path
        write_artifact_manifest(
            template_dir,
            step="mapping_inline_llm_call_3",
            files=files_payload,
            inputs=[
                f"cache_key={cache_key}",
                f"catalog_sha256={catalog_sha}",
                f"schema_sha256={schema_sha}",
                f"html_pre_sha256={html_pre_sha}",
                f"html_post_sha256={html_post_sha}",
            ],
            correlation_id=correlation_id,
        )

    errors = approval_errors(result.mapping)
    constant_replacements = result.constant_replacements

    record = state_store.get_template_record(template_id) or {}
    template_name = record.get("name") or f"Template {template_id[:8]}"
    artifacts = {
        "template_html_url": _artifact_url(html_path),
        "mapping_step3_url": _artifact_url(mapping_path),
    }
    constants_url = _artifact_url(constants_path)
    if constants_url:
        artifacts["constants_inlined_url"] = constants_url
    if mapping_keys_path.exists():
        artifacts["mapping_keys_url"] = _artifact_url(mapping_keys_path)
    schema_path = template_dir / "schema_ext.json"
    schema_url = _artifact_url(schema_path) if schema_path.exists() else None
    if schema_url:
        artifacts["schema_ext_url"] = schema_url
    state_store.upsert_template(
        template_id,
        name=template_name,
        status="mapping_previewed",
        artifacts={k: v for k, v in artifacts.items() if v},
        connection_id=connection_id or record.get("last_connection_id"),
        mapping_keys=saved_keys,
        template_type=kind,
    )

    yield {
        "event": "stage",
        "stage": "mapping_preview",
        "status": "ok",
        "template_id": template_id,
        "cache_key": cache_key,
        "correlation_id": correlation_id,
        "prompt_version": PROMPT_VERSION,
    }

    return {
        "mapping": result.mapping,
        "errors": errors,
        "schema_info": schema_info,
        "catalog": catalog,
        "cache_key": cache_key,
        "cached": False,
        "constant_replacements": constant_replacements,
        "constant_replacements_count": len(constant_replacements),
        "prompt_version": PROMPT_VERSION,
        "keys": saved_keys,
    }


def _mapping_preview_route(
    template_id: str,
    connection_id: str,
    request: Request,
    force_refresh: bool = False,
    *,
    kind: str = "pdf",
) -> dict:
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "mapping_preview_start",
        extra={
            "event": "mapping_preview_start",
            "template_id": template_id,
            "connection_id": connection_id,
            "force_refresh": force_refresh,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    pipeline = _mapping_preview_pipeline(
        template_id,
        connection_id,
        request,
        correlation_id=correlation_id,
        force_refresh=force_refresh,
        kind=kind,
    )
    try:
        while True:
            next(pipeline)
    except StopIteration as stop:
        payload = stop.value or {}

    logger.info(
        "mapping_preview_complete",
        extra={
            "event": "mapping_preview_complete",
            "template_id": template_id,
            "connection_id": connection_id,
            "cache_key": payload.get("cache_key"),
            "cached": payload.get("cached", False),
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    return payload


@app.post("/templates/{template_id}/mapping/preview")
def mapping_preview(template_id: str, connection_id: str, request: Request, force_refresh: bool = False):
    return _mapping_preview_route(
        template_id,
        connection_id,
        request,
        force_refresh,
        kind="pdf",
    )


@app.post("/excel/{template_id}/mapping/preview")
def mapping_preview_excel(template_id: str, connection_id: str, request: Request, force_refresh: bool = False):
    return _mapping_preview_route(
        template_id,
        connection_id,
        request,
        force_refresh,
        kind="excel",
    )


def _mapping_approve_route(
    template_id: str,
    payload: MappingPayload,
    request: Request,
    *,
    kind: str = "pdf",
):
    """Persist approved mapping, rebuild contract artifacts, and refresh generator assets."""
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "mapping_approve_start",
        extra={
            "event": "mapping_approve_start",
            "template_id": template_id,
            "connection_id": payload.connection_id,
            "mapping_size": len(payload.mapping or {}),
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )

    template_dir = _template_dir(template_id, kind=kind)
    require_contract_join = (kind or "pdf").lower() != "excel"
    base_template_path = template_dir / "template_p1.html"
    final_html_path = template_dir / "report_final.html"
    mapping_path = template_dir / "mapping_pdf_labels.json"
    mapping_keys_path = _mapping_keys_path(template_dir)
    incoming_keys = _normalize_key_tokens(payload.keys)
    mapping_dict = payload.mapping or {}
    keys_clean = [key for key in incoming_keys if key in mapping_dict]

    try:
        db_path = _db_path_from_payload_or_default(payload.connection_id)
        verify_sqlite(db_path)
    except HTTPException:
        raise
    except Exception as exc:
        raise _http_error(400, "db_invalid", f"Invalid database reference: {exc}")

    schema_ext = _load_schema_ext(template_dir) or {}
    auto_mapping_doc, _ = _load_mapping_step3(template_dir)
    auto_mapping_proposal = auto_mapping_doc or {}
    catalog = list(dict.fromkeys(_build_catalog_from_db(db_path)))
    db_sig = compute_db_signature(db_path)

    try:
        lock_ctx = acquire_template_lock(template_dir, "mapping_approve", correlation_id)
    except TemplateLockError:
        raise _http_error(
            status_code=409,
            code="template_locked",
            message="Template is currently processing another request.",
        )

    def event_stream():
        pipeline_started = time.time()
        nonlocal keys_clean

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

        def emit(event: str, **payload_data: Any) -> bytes:
            data = {"event": event, **payload_data}
            return (json.dumps(data, ensure_ascii=False) + "\n").encode("utf-8")

        stage_timings: dict[str, float] = {}

        def start_stage(stage_key: str, label: str, progress: int | float, **payload_data: Any) -> bytes:
            stage_timings[stage_key] = time.time()
            payload = {
                "stage": stage_key,
                "label": label,
                "status": "started",
                "progress": progress,
                "template_id": template_id,
            }
            payload.update(payload_data)
            return emit("stage", **payload)

        def finish_stage(
            stage_key: str,
            label: str,
            *,
            progress: int | float | None = None,
            status: str = "complete",
            **payload_data: Any,
        ) -> bytes:
            started = stage_timings.pop(stage_key, None)
            elapsed_ms = int((time.time() - started) * 1000) if started else None
            payload: dict[str, Any] = {
                "stage": stage_key,
                "label": label,
                "status": status,
                "template_id": template_id,
            }
            if progress is not None:
                payload["progress"] = progress
            if elapsed_ms is not None:
                payload["elapsed_ms"] = elapsed_ms
            payload.update(payload_data)
            return emit("stage", **payload)

        contract_ready = False
        contract_stage_summary: dict[str, Any] | None = None
        generator_stage_summary: dict[str, Any] | None = None
        contract_result: dict[str, Any] = {}
        generator_result: dict[str, Any] | None = None
        generator_artifacts_urls: dict[str, str] = {}

        with lock_ctx:
            # 1) Persist normalized mapping
            stage_key = "mapping.save"
            stage_label = "Saving mapping changes"
            stage_started = time.time()
            try:
                yield start_stage(stage_key, stage_label, progress=5)
                normalized_list = _normalize_mapping_for_autofill(payload.mapping)
                # retain only tokens present in normalized mapping
                normalized_headers = {entry["header"] for entry in normalized_list}
                keys_clean = [key for key in keys_clean if key in normalized_headers]
                validate_mapping_schema(normalized_list)
                write_json_atomic(
                    mapping_path,
                    normalized_list,
                    indent=2,
                    ensure_ascii=False,
                    step="mapping_save",
                )
                keys_clean = _write_mapping_keys(template_dir, keys_clean)
                manifest_files = {mapping_path.name: mapping_path}
                if mapping_keys_path.exists():
                    manifest_files[mapping_keys_path.name] = mapping_keys_path
                write_artifact_manifest(
                    template_dir,
                    step="mapping_save",
                    files=manifest_files,
                    inputs=[
                        f"mapping_tokens={len(normalized_list)}",
                        f"mapping_keys={len(keys_clean)}",
                    ],
                    correlation_id=correlation_id,
                )
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=20,
                    mapping_tokens=len(normalized_list),
                )
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                logger.exception(
                    "mapping_save_failed",
                    extra={
                        "event": "mapping_save_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                yield finish_stage(stage_key, stage_label, progress=5, status="error", detail=str(exc))
                yield emit(
                    "error",
                    stage=stage_key,
                    label=stage_label,
                    detail=str(exc),
                    template_id=template_id,
                )
                return

            # 2) Ensure final HTML exists for downstream steps
            stage_key = "mapping.prepare_template"
            stage_label = "Preparing template shell"
            stage_started = time.time()
            try:
                yield start_stage(stage_key, stage_label, progress=25)
                if not base_template_path.exists():
                    raise FileNotFoundError("template_p1.html not found. Run /templates/verify first.")
                if not final_html_path.exists():
                    final_html_path.write_text(
                        base_template_path.read_text(encoding="utf-8", errors="ignore"),
                        encoding="utf-8",
                    )
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(stage_key, stage_label, progress=50)
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                logger.exception(
                    "mapping_prepare_final_html_failed",
                    extra={
                        "event": "mapping_prepare_final_html_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                yield finish_stage(stage_key, stage_label, progress=25, status="error", detail=str(exc))
                yield emit(
                    "error",
                    stage=stage_key,
                    label=stage_label,
                    detail=str(exc),
                    template_id=template_id,
                )
                return

            final_html_url = _artifact_url(final_html_path)
            template_html_url = final_html_url or _artifact_url(base_template_path)
            tokens_mapped = len(payload.mapping or {})

            # 3) Contract build (LLM Call 4)
            stage_key = "contract_build_v2"
            stage_label = "Drafting contract package"
            stage_started = time.time()
            yield start_stage(
                stage_key,
                stage_label,
                progress=55,
                contract_ready=False,
                blueprint_ready=bool(auto_mapping_proposal),
                overview_md=None,
                cached=False,
                warnings=[],
                assumptions=[],
                validation={},
                prompt_version=PROMPT_VERSION_4,
            )
            try:
                final_html_text = final_html_path.read_text(encoding="utf-8", errors="ignore")
                contract_result = build_or_load_contract_v2(
                    template_dir=template_dir,
                    catalog=catalog,
                    final_template_html=final_html_text,
                    schema=schema_ext,
                    auto_mapping_proposal=auto_mapping_proposal,
                    mapping_override=payload.mapping,
                    user_instructions=payload.user_instructions or "",
                    dialect_hint=payload.dialect_hint,
                    db_signature=db_sig,
                    key_tokens=keys_clean,
                )
                contract_ready = True
                contract_artifacts_urls = _normalize_artifact_map(contract_result.get("artifacts"))
                contract_stage_summary = {
                    "stage": stage_key,
                    "status": "done",
                    "contract_ready": True,
                    "overview_md": contract_result.get("overview_md"),
                    "cached": contract_result.get("cached"),
                    "warnings": contract_result.get("warnings"),
                    "assumptions": contract_result.get("assumptions"),
                    "validation": contract_result.get("validation"),
                    "artifacts": contract_artifacts_urls,
                    "prompt_version": PROMPT_VERSION_4,
                }
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=75,
                    contract_ready=True,
                    overview_md=contract_result.get("overview_md"),
                    cached=contract_result.get("cached"),
                    warnings=contract_result.get("warnings"),
                    assumptions=contract_result.get("assumptions"),
                    validation=contract_result.get("validation"),
                    artifacts=contract_artifacts_urls,
                    prompt_version=PROMPT_VERSION_4,
                )
            except ContractBuilderError as exc:
                log_stage(stage_label, "error", stage_started)
                logger.exception(
                    "contract_build_failed",
                    extra={
                        "event": "contract_build_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=55,
                    status="error",
                    detail=str(exc),
                    prompt_version=PROMPT_VERSION_4,
                )
                yield emit(
                    "error",
                    stage=stage_key,
                    label=stage_label,
                    detail=str(exc),
                    template_id=template_id,
                    prompt_version=PROMPT_VERSION_4,
                )
                return
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                logger.exception(
                    "contract_build_failed",
                    extra={
                        "event": "contract_build_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=55,
                    status="error",
                    detail=str(exc),
                    prompt_version=PROMPT_VERSION_4,
                )
                yield emit(
                    "error",
                    stage=stage_key,
                    label=stage_label,
                    detail=str(exc),
                    template_id=template_id,
                    prompt_version=PROMPT_VERSION_4,
                )
                return

            # 4) Generator assets (LLM Call 5)
            stage_key = "generator_assets_v1"
            stage_label = "Creating generator assets"
            stage_started = time.time()
            generator_dialect = payload.generator_dialect or payload.dialect_hint or "duckdb"
            yield start_stage(stage_key, stage_label, progress=80, dialect=generator_dialect)
            try:
                generator_result = build_generator_assets_from_payload(
                    template_dir=template_dir,
                    step4_output=contract_result,
                    final_template_html=final_html_path.read_text(encoding="utf-8", errors="ignore"),
                    reference_pdf_image=None,
                    catalog_allowlist=payload.catalog_allowlist or catalog,
                    dialect=generator_dialect,
                    params_spec=payload.params_spec,
                    sample_params=payload.sample_params,
                    force_rebuild=payload.force_generator_rebuild,
                    key_tokens=keys_clean,
                    require_contract_join=require_contract_join,
                )
                generator_artifacts_urls = _normalize_artifact_map(generator_result.get("artifacts"))
                generator_stage_summary = {
                    "stage": stage_key,
                    "status": "done",
                    "invalid": generator_result.get("invalid"),
                    "needs_user_fix": list(generator_result.get("needs_user_fix") or []),
                    "dialect": generator_result.get("dialect"),
                    "params": generator_result.get("params"),
                    "summary": generator_result.get("summary"),
                    "dry_run": generator_result.get("dry_run"),
                    "cached": generator_result.get("cached"),
                    "artifacts": generator_artifacts_urls,
                }
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=92,
                    invalid=generator_result.get("invalid"),
                    needs_user_fix=list(generator_result.get("needs_user_fix") or []),
                    dialect=generator_result.get("dialect"),
                    params=generator_result.get("params"),
                    summary=generator_result.get("summary"),
                    dry_run=generator_result.get("dry_run"),
                    cached=generator_result.get("cached"),
                    artifacts=generator_artifacts_urls,
                )
            except GeneratorAssetsError as exc:
                log_stage(stage_label, "error", stage_started)
                logger.exception(
                    "generator_assets_failed",
                    extra={
                        "event": "generator_assets_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                generator_stage_summary = {
                    "stage": stage_key,
                    "status": "error",
                    "detail": str(exc),
                }
                generator_artifacts_urls = {}
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=90,
                    status="error",
                    detail=str(exc),
                )
            except Exception as exc:
                log_stage(stage_label, "error", stage_started)
                logger.exception(
                    "generator_assets_failed",
                    extra={
                        "event": "generator_assets_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                generator_stage_summary = {
                    "stage": stage_key,
                    "status": "error",
                    "detail": str(exc),
                }
                generator_artifacts_urls = {}
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=90,
                    status="error",
                    detail=str(exc),
                )

            # 5) Thumbnail snapshot (best-effort)
            stage_key = "mapping.thumbnail"
            stage_label = "Capturing template thumbnail"
            stage_started = time.time()
            thumbnail_url = None
            try:
                yield start_stage(stage_key, stage_label, progress=95)
                thumb_path = final_html_path.parent / "report_final.png"
                asyncio.run(render_html_to_png(final_html_path, thumb_path))
                thumbnail_url = _artifact_url(thumb_path)
                write_artifact_manifest(
                    template_dir,
                    step="mapping_thumbnail",
                    files={
                        "report_final.html": final_html_path,
                        "template_p1.html": base_template_path,
                        "report_final.png": thumb_path,
                    },
                    inputs=[str(mapping_path)],
                    correlation_id=correlation_id,
                )
                log_stage(stage_label, "ok", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=98,
                    thumbnail_url=thumbnail_url,
                )
            except Exception:
                log_stage(stage_label, "error", stage_started)
                yield finish_stage(
                    stage_key,
                    stage_label,
                    progress=95,
                    status="error",
                )

            manifest_data = load_manifest(template_dir) or {}
            manifest_url = _manifest_endpoint(template_id, kind=kind)
            page_summary_path = template_dir / "page_summary.txt"
            page_summary_url = _artifact_url(page_summary_path)

            contract_artifacts = (
                contract_stage_summary.get("artifacts") if isinstance(contract_stage_summary, dict) else {}
            )
            generator_artifacts = (
                generator_stage_summary.get("artifacts") if isinstance(generator_stage_summary, dict) else {}
            )
            if not isinstance(generator_artifacts, dict):
                generator_artifacts = {}

            generator_contract_url = generator_artifacts.get("contract") or generator_artifacts.get("contract.json")
            contract_url = (
                generator_contract_url or contract_artifacts.get("contract") or contract_artifacts.get("contract.json")
            )

            artifacts_payload = {
                "template_html_url": template_html_url,
                "final_html_url": final_html_url,
                "thumbnail_url": thumbnail_url,
                "manifest_url": manifest_url,
                "page_summary_url": page_summary_url,
                "contract_url": contract_url,
                "overview_url": contract_artifacts.get("overview"),
                "step5_requirements_url": contract_artifacts.get("step5_requirements"),
                "generator_sql_pack_url": generator_artifacts.get("sql_pack"),
                "generator_output_schemas_url": generator_artifacts.get("output_schemas"),
                "generator_assets_url": generator_artifacts.get("generator_assets"),
                "mapping_keys_url": _artifact_url(mapping_keys_path) if mapping_keys_path.exists() else None,
            }

            final_contract_ready = bool(generator_contract_url)

            existing_tpl = state_store.get_template_record(template_id) or {}
            state_store.upsert_template(
                template_id,
                name=existing_tpl.get("name") or f"Template {template_id[:8]}",
                status="approved" if final_contract_ready else "pending",
                artifacts={k: v for k, v in artifacts_payload.items() if v},
                connection_id=payload.connection_id or existing_tpl.get("last_connection_id"),
                mapping_keys=keys_clean,
                template_type=kind,
            )

            if generator_result:
                state_store.update_template_generator(
                    template_id,
                    dialect=generator_result.get("dialect"),
                    params=generator_result.get("params"),
                    invalid=bool(generator_result.get("invalid")),
                    needs_user_fix=generator_result.get("needs_user_fix") or [],
                    summary=generator_result.get("summary"),
                    dry_run=generator_result.get("dry_run"),
                )

            state_store.set_last_used(
                payload.connection_id or existing_tpl.get("last_connection_id"),
                template_id,
            )

            total_elapsed_ms = int((time.time() - pipeline_started) * 1000)
            contract_ready = final_contract_ready
            result_payload = {
                "stage": "Approval complete.",
                "progress": 100,
                "template_id": template_id,
                "saved": _artifact_url(mapping_path),
                "final_html_path": str(final_html_path),
                "final_html_url": final_html_url,
                "template_html_url": template_html_url,
                "thumbnail_url": thumbnail_url,
                "contract_ready": contract_ready,
                "token_map_size": tokens_mapped,
                "user_values_supplied": bool((payload.user_values_text or "").strip()),
                "manifest": manifest_data,
                "manifest_url": manifest_url,
                "artifacts": {k: v for k, v in artifacts_payload.items() if v},
                "contract_stage": contract_stage_summary,
                "generator_stage": generator_stage_summary,
                "prompt_versions": {
                    "mapping": PROMPT_VERSION,
                    "corrections": PROMPT_VERSION_3_5,
                    "contract": PROMPT_VERSION_4,
                },
                "elapsed_ms": total_elapsed_ms,
                "keys": keys_clean,
                "keys_count": len(keys_clean),
            }
            yield emit("result", **result_payload)

            logger.info(
                "mapping_approve_complete",
                extra={
                    "event": "mapping_approve_complete",
                    "template_id": template_id,
                    "contract_ready": contract_ready,
                    "thumbnail_url": thumbnail_url,
                    "correlation_id": correlation_id,
                    "elapsed_ms": total_elapsed_ms,
                },
            )

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")


@app.post("/templates/{template_id}/mapping/approve")
def mapping_approve(template_id: str, payload: MappingPayload, request: Request):
    return _mapping_approve_route(template_id, payload, request, kind="pdf")


@app.post("/excel/{template_id}/mapping/approve")
def mapping_approve_excel(template_id: str, payload: MappingPayload, request: Request):
    return _mapping_approve_route(template_id, payload, request, kind="excel")


def _normalize_tokens_request(tokens: str | None, keys_available: list[str]) -> list[str]:
    if not tokens:
        return list(keys_available)
    requested = [token.strip() for token in str(tokens).split(",") if token.strip()]
    return [token for token in requested if token in keys_available]


def _build_mapping_lookup(mapping_doc: list[dict[str, Any]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for entry in mapping_doc:
        if not isinstance(entry, dict):
            continue
        header = entry.get("header")
        mapping_value = entry.get("mapping")
        if isinstance(header, str) and isinstance(mapping_value, str):
            lookup[header] = mapping_value.strip()
    return lookup


def _extract_contract_metadata(contract_data: dict[str, Any]) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    required: dict[str, str] = {}
    optional: dict[str, str] = {}
    date_columns: dict[str, str] = {}
    filters_section = contract_data.get("filters") or {}
    if isinstance(filters_section, dict):
        required_map = filters_section.get("required") or {}
        optional_map = filters_section.get("optional") or {}
        if isinstance(required_map, dict):
            for key, expr in required_map.items():
                if isinstance(key, str) and isinstance(expr, str):
                    required[key] = expr.strip()
        if isinstance(optional_map, dict):
            for key, expr in optional_map.items():
                if isinstance(key, str) and isinstance(expr, str):
                    optional[key] = expr.strip()
    date_columns_section = contract_data.get("date_columns") or {}
    if isinstance(date_columns_section, dict):
        for table_name, column_name in date_columns_section.items():
            if not isinstance(table_name, str) or not isinstance(column_name, str):
                continue
            table_clean = table_name.strip(' "`[]').lower()
            column_clean = column_name.strip(' "`[]')
            if table_clean and column_clean:
                date_columns[table_clean] = column_clean
    return required, optional, date_columns


def _resolve_token_binding(
    token: str,
    mapping_lookup: Mapping[str, str],
    contract_filters_required: Mapping[str, str],
    contract_filters_optional: Mapping[str, str],
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    expr = mapping_lookup.get(token, "")
    match = _DIRECT_COLUMN_RE.match(expr)
    if match:
        table_raw = match.group("table")
        column_raw = match.group("column")
        table_clean = table_raw.strip(' "`[]') if isinstance(table_raw, str) else ""
        column_clean = column_raw.strip(' "`[]') if isinstance(column_raw, str) else ""
        if table_clean and column_clean:
            return table_clean, column_clean, "mapping"
    filter_expr = contract_filters_required.get(token) or contract_filters_optional.get(token)
    if isinstance(filter_expr, str):
        match_filter = _DIRECT_COLUMN_RE.match(filter_expr)
        if match_filter:
            table_raw = match_filter.group("table")
            column_raw = match_filter.group("column")
            table_clean = table_raw.strip(' "`[]') if isinstance(table_raw, str) else ""
            column_clean = column_raw.strip(' "`[]') if isinstance(column_raw, str) else ""
            if table_clean and column_clean:
                return table_clean, column_clean, "contract_filter"
    return None, None, None


def _execute_token_query(
    con: sqlite3.Connection,
    *,
    token: str,
    table_clean: str,
    column_clean: str,
    date_column_name: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    limit_value: int,
) -> tuple[list[str], dict[str, Any]]:
    quoted_table = f'"{table_clean}"'
    quoted_column = f'"{column_clean}"'
    base_conditions = [
        f"{quoted_column} IS NOT NULL",
        f"TRIM(CAST({quoted_column} AS TEXT)) <> ''",
    ]
    conditions = list(base_conditions)
    params: list[str] = []
    ident_re = re.compile(r"^[A-Za-z_][\w]*$")
    if date_column_name and ident_re.match(date_column_name):
        quoted_date_column = f'"{date_column_name}"'
        if start_date and end_date:
            conditions.append(f"{quoted_date_column} BETWEEN ? AND ?")
            params.extend([start_date, end_date])
        elif start_date:
            conditions.append(f"{quoted_date_column} >= ?")
            params.append(start_date)
        elif end_date:
            conditions.append(f"{quoted_date_column} <= ?")
            params.append(end_date)

    debug_info: dict[str, Any] = {
        "table": table_clean,
        "column": column_clean,
        "date_column": date_column_name,
        "applied_date_filters": len(params) > 0,
        "sql": None,
        "params": None,
        "fallback_used": False,
        "error": None,
        "row_count": 0,
    }

    def run_query(where_clause: str, query_params: list[str]) -> tuple[list[str], Optional[str]]:
        sql = (
            f"SELECT DISTINCT {quoted_column} AS value FROM {quoted_table} "
            f"WHERE {where_clause} ORDER BY {quoted_column} ASC LIMIT ?"
        )
        params_with_limit = tuple(list(query_params) + [limit_value])
        try:
            rows = [
                str(row["value"]) for row in con.execute(sql, params_with_limit) if row and row["value"] is not None
            ]
            return rows, None
        except sqlite3.Error as exc:
            return [], str(exc)

    where_clause = " AND ".join(conditions) if conditions else "1=1"
    rows, error = run_query(where_clause, params)
    debug_info.update({"sql": where_clause, "params": params, "row_count": len(rows)})
    if error:
        debug_info["error"] = error
    if not rows and params:
        fallback_clause = " AND ".join(base_conditions)
        fallback_rows, fallback_error = run_query(fallback_clause, [])
        debug_info["fallback_used"] = True
        debug_info["fallback_sql"] = fallback_clause
        debug_info["fallback_error"] = fallback_error
        if fallback_rows:
            rows = fallback_rows
            debug_info["row_count"] = len(rows)
            debug_info["error"] = fallback_error
    return rows, debug_info


def _mapping_key_options_route(
    template_id: str,
    request: Request,
    connection_id: str | None = None,
    tokens: str | None = None,
    limit: int = 50,
    start_date: str | None = None,
    end_date: str | None = None,
    *,
    kind: str = "pdf",
    debug: bool = False,
):
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "mapping_key_options_start",
        extra={
            "event": "mapping_key_options_start",
            "template_id": template_id,
            "connection_id": connection_id,
            "tokens": tokens,
            "limit": limit,
            "start_date": start_date,
            "end_date": end_date,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )

    def _resolve_connection_id(explicit_id: str | None) -> str | None:
        if explicit_id:
            explicit_id = str(explicit_id).strip()
            if explicit_id:
                return explicit_id
        try:
            record = state_store.get_template_record(template_id) or {}
        except Exception:
            record = {}
        last_conn = record.get("last_connection_id")
        if last_conn:
            return str(last_conn)
        last_used = state_store.get_last_used() or {}
        fallback_conn = last_used.get("connection_id")
        return str(fallback_conn) if fallback_conn else None

    effective_connection_id = _resolve_connection_id(connection_id)

    template_dir = _template_dir(template_id, kind=kind)
    keys_available = _load_mapping_keys(template_dir)
    if not keys_available:
        return {"keys": {}}

    token_list = _normalize_tokens_request(tokens, keys_available)

    if not token_list:
        return {"keys": {}}

    try:
        limit_value = int(limit)
    except (TypeError, ValueError):
        limit_value = 500
    limit_value = max(500, min(limit_value, 2000))

    mapping_path = template_dir / "mapping_pdf_labels.json"
    if not mapping_path.exists():
        raise _http_error(404, "mapping_not_found", "Approved mapping not found for template.")
    try:
        mapping_doc = json.loads(mapping_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise _http_error(500, "mapping_load_failed", f"Failed to read mapping file: {exc}")

    if not isinstance(mapping_doc, list):
        raise _http_error(500, "mapping_invalid", "Approved mapping is not in the expected format.")
    mapping_lookup = _build_mapping_lookup(mapping_doc)

    contract_filters_required: dict[str, str] = {}
    contract_filters_optional: dict[str, str] = {}
    contract_date_columns: dict[str, str] = {}
    contract_path = template_dir / "contract.json"
    if contract_path.exists():
        try:
            contract_data = json.loads(contract_path.read_text(encoding="utf-8"))
        except Exception:
            contract_data = {}
        (
            contract_filters_required,
            contract_filters_optional,
            contract_date_columns,
        ) = _extract_contract_metadata(contract_data)

    db_path = _db_path_from_payload_or_default(effective_connection_id)
    verify_sqlite(db_path)

    options: dict[str, list[str]] = {}
    debug_payload: dict[str, Any] = {
        "template_id": template_id,
        "connection_id": effective_connection_id,
        "db_path": str(db_path),
        "tokens_available": keys_available,
        "token_details": {},
    }

    with sqlite3.connect(str(db_path)) as con:
        con.row_factory = sqlite3.Row
        for token in token_list:
            table_clean, column_clean, binding_source = _resolve_token_binding(
                token,
                mapping_lookup,
                contract_filters_required,
                contract_filters_optional,
            )
            if not table_clean or not column_clean:
                options[token] = []
                continue
            date_column_name = contract_date_columns.get(table_clean.lower())
            rows, token_debug = _execute_token_query(
                con,
                token=token,
                table_clean=table_clean,
                column_clean=column_clean,
                date_column_name=date_column_name,
                start_date=start_date,
                end_date=end_date,
                limit_value=limit_value,
            )
            if binding_source:
                token_debug["binding_source"] = binding_source
            options[token] = rows
            if token_debug.get("error"):
                logger.warning(
                    "mapping_key_query_failed",
                    extra={
                        "event": "mapping_key_query_failed",
                        "template_id": template_id,
                        "token": token,
                        "table": table_clean,
                        "column": column_clean,
                        "db_path": str(db_path),
                        "error": token_debug["error"],
                        "correlation_id": correlation_id,
                    },
                )
            debug_payload["token_details"][token] = token_debug

    logger.info(
        "mapping_key_options_complete",
        extra={
            "event": "mapping_key_options_complete",
            "template_id": template_id,
            "tokens": token_list,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    response: dict[str, Any] = {"keys": options}
    _write_debug_log(
        template_id,
        kind=kind,
        event="mapping_key_options",
        payload=debug_payload,
    )
    if debug:
        response["debug"] = debug_payload
    return response


@app.get("/templates/{template_id}/keys/options")
def mapping_key_options(
    template_id: str,
    request: Request,
    connection_id: str | None = None,
    tokens: str | None = None,
    limit: int = 500,
    start_date: str | None = None,
    end_date: str | None = None,
    debug: bool = False,
):
    return _mapping_key_options_route(
        template_id,
        request,
        connection_id,
        tokens,
        limit,
        start_date,
        end_date,
        kind="pdf",
        debug=debug,
    )


@app.get("/excel/{template_id}/keys/options")
def mapping_key_options_excel(
    template_id: str,
    request: Request,
    connection_id: str | None = None,
    tokens: str | None = None,
    limit: int = 500,
    start_date: str | None = None,
    end_date: str | None = None,
    debug: bool = False,
):
    return _mapping_key_options_route(
        template_id,
        request,
        connection_id,
        tokens,
        limit,
        start_date,
        end_date,
        kind="excel",
        debug=debug,
    )


def _mapping_corrections_preview_route(
    template_id: str,
    payload: CorrectionsPreviewPayload,
    request: Request,
    *,
    kind: str = "pdf",
):
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "corrections_preview_start",
        extra={
            "event": "corrections_preview_start",
            "template_id": template_id,
            "correlation_id": correlation_id,
            "template_kind": kind,
        },
    )

    template_dir = _template_dir(template_id, kind=kind)
    template_html_path = template_dir / "template_p1.html"
    mapping_step3_path = template_dir / "mapping_step3.json"
    schema_ext_path = template_dir / "schema_ext.json"

    page_index = max(1, int(payload.page or 1))
    reference_png = template_dir / f"reference_p{page_index}.png"
    page_png_path = reference_png if reference_png.exists() else None

    def event_stream():
        started = time.time()

        def emit(event: str, **data: Any) -> bytes:
            return (json.dumps({"event": event, **data}, ensure_ascii=False) + "\n").encode("utf-8")

        yield emit(
            "stage",
            stage="corrections_preview",
            status="start",
            progress=10,
            template_id=template_id,
            correlation_id=correlation_id,
            prompt_version=PROMPT_VERSION_3_5,
        )
        try:
            result = run_corrections_preview(
                upload_dir=template_dir,
                template_html_path=template_html_path,
                mapping_step3_path=mapping_step3_path,
                schema_ext_path=schema_ext_path,
                user_input=payload.user_input or "",
                page_png_path=page_png_path,
                model_selector=payload.model_selector,
                mapping_override=payload.mapping_override,
                sample_tokens=payload.sample_tokens,
            )
        except CorrectionsPreviewError as exc:
            logger.warning(
                "corrections_preview_failed",
                extra={
                    "event": "corrections_preview_failed",
                    "template_id": template_id,
                    "correlation_id": correlation_id,
                },
            )
            yield emit(
                "error",
                stage="corrections_preview",
                detail=str(exc),
                template_id=template_id,
            )
            return
        except Exception as exc:
            logger.exception(
                "corrections_preview_unexpected",
                extra={
                    "event": "corrections_preview_unexpected",
                    "template_id": template_id,
                    "correlation_id": correlation_id,
                },
            )
            yield emit(
                "error",
                stage="corrections_preview",
                detail=str(exc),
                template_id=template_id,
            )
            return

        artifacts_raw = result.get("artifacts") or {}
        artifacts: dict[str, str] = {}
        for name, value in artifacts_raw.items():
            resolved: Optional[Path]
            if isinstance(value, Path):
                resolved = value
            else:
                try:
                    resolved = Path(value)
                except Exception:
                    resolved = None
            url = _artifact_url(resolved)
            if url:
                artifacts[str(name)] = url

        template_html_url = artifacts.get("template_html")
        page_summary_url = artifacts.get("page_summary")
        if template_html_url or page_summary_url:
            existing_tpl = state_store.get_template_record(template_id) or {}
            artifacts_for_state: dict[str, str] = {}
            if template_html_url:
                artifacts_for_state["template_html_url"] = template_html_url
            if page_summary_url:
                artifacts_for_state["page_summary_url"] = page_summary_url
            if artifacts_for_state:
                existing_status = (existing_tpl.get("status") or "").lower()
                next_status = existing_tpl.get("status") or "mapping_corrections_previewed"
                if existing_status != "approved":
                    next_status = "mapping_corrections_previewed"
                state_store.upsert_template(
                    template_id,
                    name=existing_tpl.get("name") or f"Template {template_id[:8]}",
                    status=next_status,
                    artifacts=artifacts_for_state,
                    connection_id=existing_tpl.get("last_connection_id"),
                    template_type=kind,
                )

        yield emit(
            "stage",
            stage="corrections_preview",
            status="done",
            progress=90,
            template_id=template_id,
            correlation_id=correlation_id,
            cache_hit=bool(result.get("cache_hit")),
            prompt_version=PROMPT_VERSION_3_5,
        )

        yield emit(
            "result",
            template_id=template_id,
            summary=result.get("summary") or {},
            processed=result.get("processed") or {},
            artifacts=artifacts,
            cache_key=result.get("cache_key"),
            cache_hit=bool(result.get("cache_hit")),
            prompt_version=PROMPT_VERSION_3_5,
        )

        logger.info(
            "corrections_preview_complete",
            extra={
                "event": "corrections_preview_complete",
                "template_id": template_id,
                "elapsed_ms": int((time.time() - started) * 1000),
                "correlation_id": correlation_id,
            },
        )

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")


@app.post("/templates/{template_id}/mapping/corrections-preview")
def mapping_corrections_preview(template_id: str, payload: CorrectionsPreviewPayload, request: Request):
    return _mapping_corrections_preview_route(template_id, payload, request, kind="pdf")


@app.post("/excel/{template_id}/mapping/corrections-preview")
def mapping_corrections_preview_excel(template_id: str, payload: CorrectionsPreviewPayload, request: Request):
    return _mapping_corrections_preview_route(template_id, payload, request, kind="excel")


def _generator_assets_route(
    template_id: str,
    payload: GeneratorAssetsPayload,
    request: Request,
    *,
    kind: str = "pdf",
):
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "generator_assets_v1_start",
        extra={
            "event": "generator_assets_v1_start",
            "template_id": template_id,
            "correlation_id": correlation_id,
            "force_rebuild": bool(payload.force_rebuild),
            "template_kind": kind,
        },
    )

    template_dir = _template_dir(template_id, kind=kind)
    require_contract_join = (kind or "pdf").lower() != "excel"
    base_template_path = template_dir / "template_p1.html"
    final_template_path = template_dir / "report_final.html"
    contract_path = template_dir / "contract.json"
    overview_path = template_dir / "overview.md"
    step5_path = template_dir / "step5_requirements.json"

    def _load_step4_payload() -> dict[str, Any]:
        contract_payload = payload.step4_output.get("contract") if payload.step4_output else None
        overview_md = payload.step4_output.get("overview_md") if payload.step4_output else None
        step5_requirements = payload.step4_output.get("step5_requirements") if payload.step4_output else None

        if contract_payload is None:
            if payload.contract is not None:
                contract_payload = payload.contract
            elif contract_path.exists():
                contract_payload = json.loads(contract_path.read_text(encoding="utf-8"))
        if contract_payload is None:
            raise HTTPException(
                status_code=422,
                detail="Contract payload is required to build generator assets.",
            )

        if overview_md is None:
            if payload.overview_md is not None:
                overview_md = payload.overview_md
            elif overview_path.exists():
                overview_md = overview_path.read_text(encoding="utf-8")

        if step5_requirements is None:
            if step5_path.exists():
                try:
                    step5_requirements = json.loads(step5_path.read_text(encoding="utf-8"))
                except Exception:
                    step5_requirements = {}
            else:
                step5_requirements = {}

        return {
            "contract": contract_payload,
            "overview_md": overview_md,
            "step5_requirements": step5_requirements or {},
        }

    if payload.step4_output:
        step4_output = payload.step4_output
    else:
        step4_output = _load_step4_payload()

    final_template_html = payload.final_template_html
    if final_template_html is None:
        source_path = final_template_path if final_template_path.exists() else base_template_path
        if not source_path.exists():
            raise HTTPException(
                status_code=422,
                detail="Template HTML not found. Run mapping approval first.",
            )
        final_template_html = source_path.read_text(encoding="utf-8", errors="ignore")

    catalog_allowlist = payload.catalog or None
    params_spec = payload.params or None
    sample_params = payload.sample_params or None
    dialect = payload.dialect or "duckdb"
    if payload.key_tokens is not None:
        incoming_key_tokens = _normalize_key_tokens(payload.key_tokens)
    else:
        incoming_key_tokens = _load_mapping_keys(template_dir)

    try:
        lock_ctx = acquire_template_lock(template_dir, "generator_assets_v1", correlation_id)
    except TemplateLockError:
        raise _http_error(
            status_code=409,
            code="template_locked",
            message="Template is currently processing another request.",
        )

    def event_stream():
        started = time.time()

        def emit(event: str, **data: Any) -> bytes:
            return (json.dumps({"event": event, **data}, ensure_ascii=False) + "\n").encode("utf-8")

        with lock_ctx:
            yield emit(
                "stage",
                stage="generator_assets_v1",
                status="start",
                progress=10,
                template_id=template_id,
                correlation_id=correlation_id,
            )
            try:
                result = build_generator_assets_from_payload(
                    template_dir=template_dir,
                    step4_output=step4_output,
                    final_template_html=final_template_html,
                    reference_pdf_image=payload.reference_pdf_image,
                    catalog_allowlist=catalog_allowlist,
                    dialect=dialect,
                    params_spec=params_spec,
                    sample_params=sample_params,
                    force_rebuild=payload.force_rebuild,
                    key_tokens=incoming_key_tokens,
                    require_contract_join=require_contract_join,
                )
            except GeneratorAssetsError as exc:
                logger.warning(
                    "generator_assets_v1_failed",
                    extra={
                        "event": "generator_assets_v1_failed",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                yield emit(
                    "error",
                    stage="generator_assets_v1",
                    detail=str(exc),
                    template_id=template_id,
                )
                return
            except Exception as exc:
                logger.exception(
                    "generator_assets_v1_unexpected",
                    extra={
                        "event": "generator_assets_v1_unexpected",
                        "template_id": template_id,
                        "correlation_id": correlation_id,
                    },
                )
                yield emit(
                    "error",
                    stage="generator_assets_v1",
                    detail=str(exc),
                    template_id=template_id,
                )
                return

            artifacts_urls = _normalize_artifact_map(result.get("artifacts"))
            yield emit(
                "stage",
                stage="generator_assets_v1",
                status="done",
                progress=90,
                template_id=template_id,
                correlation_id=correlation_id,
                invalid=result.get("invalid"),
                needs_user_fix=result.get("needs_user_fix") or [],
                dialect=result.get("dialect"),
                params=result.get("params"),
                summary=result.get("summary"),
                dry_run=result.get("dry_run"),
                cached=result.get("cached"),
                artifacts=artifacts_urls,
            )

            manifest = load_manifest(template_dir) or {}
            manifest_url = _manifest_endpoint(template_id, kind=kind)

            existing_tpl = state_store.get_template_record(template_id) or {}
            artifacts_payload = {
                "contract_url": artifacts_urls.get("contract"),
                "generator_sql_pack_url": artifacts_urls.get("sql_pack"),
                "generator_output_schemas_url": artifacts_urls.get("output_schemas"),
                "generator_assets_url": artifacts_urls.get("generator_assets"),
                "manifest_url": manifest_url,
            }
            state_store.upsert_template(
                template_id,
                name=existing_tpl.get("name") or f"Template {template_id[:8]}",
                status=existing_tpl.get("status") or "approved",
                artifacts={k: v for k, v in artifacts_payload.items() if v},
                connection_id=existing_tpl.get("last_connection_id"),
                template_type=kind,
            )
            state_store.update_template_generator(
                template_id,
                dialect=result.get("dialect"),
                params=result.get("params"),
                invalid=bool(result.get("invalid")),
                needs_user_fix=result.get("needs_user_fix") or [],
                summary=result.get("summary"),
                dry_run=result.get("dry_run"),
            )

            yield emit(
                "result",
                template_id=template_id,
                invalid=result.get("invalid"),
                needs_user_fix=result.get("needs_user_fix") or [],
                dialect=result.get("dialect"),
                params=result.get("params"),
                summary=result.get("summary"),
                dry_run=result.get("dry_run"),
                cached=result.get("cached"),
                artifacts=artifacts_urls,
                manifest=manifest,
                manifest_url=manifest_url,
            )

            logger.info(
                "generator_assets_v1_complete",
                extra={
                    "event": "generator_assets_v1_complete",
                    "template_id": template_id,
                    "invalid": result.get("invalid"),
                    "needs_user_fix": len(result.get("needs_user_fix") or []),
                    "correlation_id": correlation_id,
                    "elapsed_ms": int((time.time() - started) * 1000),
                },
            )

    headers = {"Content-Type": "application/x-ndjson"}
    return StreamingResponse(event_stream(), headers=headers, media_type="application/x-ndjson")


@app.post("/templates/{template_id}/generator-assets/v1")
def generator_assets_v1(template_id: str, payload: GeneratorAssetsPayload, request: Request):
    return _generator_assets_route(template_id, payload, request, kind="pdf")


@app.post("/excel/{template_id}/generator-assets/v1")
def generator_assets_v1_excel(template_id: str, payload: GeneratorAssetsPayload, request: Request):
    return _generator_assets_route(template_id, payload, request, kind="excel")


def _chart_suggest_route(
    template_id: str,
    payload: ChartSuggestPayload,
    request: Request,
    *,
    kind: str = "pdf",
) -> ChartSuggestResponse:
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    return suggest_charts_service(
        template_id,
        payload,
        kind=kind,
        correlation_id=correlation_id,
        template_dir_fn=lambda tpl: _template_dir(tpl, kind=kind),
        db_path_fn=_db_path_from_payload_or_default,
        load_contract_fn=load_contract_v2,
        clean_key_values_fn=_clean_key_values,
        discover_fn=discover_batches_and_counts if kind == "pdf" else discover_batches_and_counts_excel,
        build_field_catalog_fn=build_batch_field_catalog_and_stats,
        build_metrics_fn=lambda batches, batch_metadata, limit=100: _build_sample_data_rows(
            batches, batch_metadata, limit=limit
        ),
        build_prompt_fn=build_chart_suggestions_prompt,
        call_chat_completion_fn=lambda **kwargs: call_chat_completion(
            get_openai_client(),
            description=CHART_SUGGEST_PROMPT_VERSION,
            **kwargs,
        ),
        model=MODEL,
        strip_code_fences_fn=strip_code_fences,
        logger=logger,
    )


def _ensure_template_exists(template_id: str) -> tuple[str, dict]:
    normalized = _normalize_template_id(template_id)
    record = state_store.get_template_record(normalized)
    if not record:
        raise _http_error(404, "template_not_found", f"Template {template_id} not found")
    return normalized, record


# Include feature routers
saved_charts_router = build_saved_charts_router(_ensure_template_exists, _normalize_template_id)
app.include_router(saved_charts_router)

chart_suggest_router = build_chart_suggest_router(
    template_dir_fn=_template_dir,
    db_path_fn=_db_path_from_payload_or_default,
    load_contract_fn=load_contract_v2,
    clean_key_values_fn=_clean_key_values,
    discover_pdf_fn=discover_batches_and_counts,
    discover_excel_fn=discover_batches_and_counts_excel,
    build_field_catalog_fn=build_batch_field_catalog_and_stats,
    build_metrics_fn=build_batch_metrics,
    build_prompt_fn=build_chart_suggestions_prompt,
    call_chat_completion_fn=lambda **kwargs: call_chat_completion(get_openai_client(), **kwargs, description=CHART_SUGGEST_PROMPT_VERSION),
    model=MODEL,
    strip_code_fences_fn=strip_code_fences,
    get_correlation_id_fn=get_correlation_id,
    logger=logger,
)
app.include_router(chart_suggest_router)

discover_router = build_discover_router(
    template_dir_fn=_template_dir,
    db_path_fn=_db_path_from_payload_or_default,
    load_contract_fn=load_contract_v2,
    clean_key_values_fn=_clean_key_values,
    discover_pdf_fn=discover_batches_and_counts,
    discover_excel_fn=discover_batches_and_counts_excel,
    build_field_catalog_fn=build_batch_field_catalog_and_stats,
    build_batch_metrics_fn=build_batch_metrics,
    load_manifest_fn=load_manifest,
    manifest_endpoint_fn_pdf=lambda tpl_id, kind="pdf": _manifest_endpoint(tpl_id, kind=kind),
    manifest_endpoint_fn_excel=lambda tpl_id, kind="excel": _manifest_endpoint(tpl_id, kind=kind),
    logger=logger,
)
app.include_router(discover_router)


def _discover_reports_route(p: DiscoverPayload, *, kind: str = "pdf") -> dict:
    return discover_reports_service(
        p,
        kind=kind,
        template_dir_fn=lambda tpl: _template_dir(tpl, kind=kind),
        db_path_fn=_db_path_from_payload_or_default,
        load_contract_fn=load_contract_v2,
        clean_key_values_fn=_clean_key_values,
        discover_fn=discover_batches_and_counts if kind == "pdf" else discover_batches_and_counts_excel,
        build_field_catalog_fn=build_batch_field_catalog_and_stats,
        build_batch_metrics_fn=build_batch_metrics,
        load_manifest_fn=load_manifest,
        manifest_endpoint_fn=lambda tpl_id: _manifest_endpoint(tpl_id, kind=kind),
        logger=logger,
    )


@app.post("/reports/discover")
def discover_reports(p: DiscoverPayload):
    return _discover_reports_route(p, kind="pdf")


@app.post("/excel/reports/discover")
def discover_reports_excel(p: DiscoverPayload):
    return _discover_reports_route(p, kind="excel")


# ---------- Run ----------
def _ensure_contract_files(template_id: str, *, kind: str = "pdf") -> tuple[Path, Path]:
    tdir = _template_dir(template_id, kind=kind)

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
            detail=("Missing contract.json. Finish template approval/mapping to create a " "contract for generation."),
        )

    return template_html_path, contract_path


def _run_report_internal(
    p: RunPayload,
    *,
    kind: str = "pdf",
    correlation_id: str | None = None,
    job_tracker: JobRunTracker | None = None,
):
    run_started = time.time()
    logger.info(
        "reports_run_start",
        extra={
            "event": "reports_run_start",
            "template_id": p.template_id,
            "connection_id": p.connection_id,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    if job_tracker:
        job_tracker.step_running("dataLoad", label="Load database connection")
    db_path = _db_path_from_payload_or_default(p.connection_id)
    if not db_path.exists():
        if job_tracker:
            job_tracker.step_failed("dataLoad", f"DB not found: {db_path}")
        raise _http_error(400, "db_not_found", f"DB not found: {db_path}")
    if job_tracker:
        job_tracker.step_succeeded("dataLoad")

    if job_tracker:
        job_tracker.step_running("contractCheck", label="Prepare contract")
    try:
        template_html_path, contract_path = _ensure_contract_files(p.template_id, kind=kind)
    except HTTPException as exc:
        if job_tracker:
            job_tracker.step_failed("contractCheck", _job_error_message(exc.detail))
        raise
    tdir = template_html_path.parent

    try:
        OBJ = json.loads(contract_path.read_text(encoding="utf-8"))
    except Exception as e:
        if job_tracker:
            job_tracker.step_failed("contractCheck", f"Invalid contract.json: {e}")
        raise _http_error(500, "invalid_contract", f"Invalid contract.json: {e}")
    else:
        try:
            validate_contract_schema(OBJ)
        except Exception as exc:
            if job_tracker:
                job_tracker.step_failed("contractCheck", str(exc))
            raise _http_error(500, "invalid_contract", str(exc))
    if job_tracker:
        job_tracker.step_succeeded("contractCheck")

    key_values_payload = _clean_key_values(p.key_values)

    docx_requested = bool(p.docx)
    xlsx_requested = bool(p.xlsx)
    docx_landscape = kind == "excel"
    docx_enabled = docx_requested or docx_landscape or kind == "pdf"
    xlsx_enabled = xlsx_requested or kind == "excel"

    ts = str(int(time.time()))
    out_html = tdir / f"filled_{ts}.html"
    out_pdf = tdir / f"filled_{ts}.pdf"
    out_docx = tdir / f"filled_{ts}.docx" if docx_enabled else None
    out_xlsx = tdir / f"filled_{ts}.xlsx" if xlsx_enabled else None
    tmp_html = out_html.with_name(out_html.name + ".tmp")
    tmp_pdf = out_pdf.with_name(out_pdf.name + ".tmp")
    tmp_docx = out_docx.with_name(out_docx.name + ".tmp") if out_docx else None
    tmp_xlsx = out_xlsx.with_name(out_xlsx.name + ".tmp") if out_xlsx else None
    docx_path: Path | None = None
    docx_font_scale: float | None = None
    xlsx_path: Path | None = None

    try:
        lock_ctx = acquire_template_lock(tdir, "reports_run", correlation_id)
    except TemplateLockError:
        raise _http_error(409, "template_locked", "Template is currently processing another request.")

    with lock_ctx:
        try:
            if job_tracker:
                job_tracker.step_running("renderPdf", label="Render PDF artifacts")
            if kind == "excel":
                from .app.services.reports import (
                    ReportGenerateExcel as report_generate_module,
                )
            else:
                from .app.services.reports import (
                    ReportGenerate as report_generate_module,
                )

            fill_and_print = report_generate_module.fill_and_print

            fill_and_print(
                OBJ=OBJ,
                TEMPLATE_PATH=template_html_path,
                DB_PATH=db_path,
                OUT_HTML=tmp_html,
                OUT_PDF=tmp_pdf,
                START_DATE=p.start_date,
                END_DATE=p.end_date,
                batch_ids=p.batch_ids,
                KEY_VALUES=key_values_payload,
            )
            if tmp_html.exists():
                tmp_html.replace(out_html)
            if tmp_pdf.exists():
                tmp_pdf.replace(out_pdf)
            docx_step_tracked = bool(job_tracker and job_tracker.has_step("renderDocx"))
            if docx_enabled and out_docx and tmp_docx:
                if docx_step_tracked:
                    job_tracker.step_running("renderDocx", label="Render DOCX")
                docx_tmp_result: Path | None = None
                docx_error: str | None = None
                if out_pdf and Path(out_pdf).exists():
                    try:
                        docx_tmp_result = pdf_file_to_docx(out_pdf, tmp_docx)
                    except Exception as exc:
                        with contextlib.suppress(FileNotFoundError):
                            tmp_docx.unlink(missing_ok=True)
                        logger.exception(
                            "docx_pdf_convert_failed",
                            extra={
                                "event": "docx_pdf_convert_failed",
                                "template_id": p.template_id,
                                "template_kind": kind,
                                "correlation_id": correlation_id,
                            },
                        )
                        if docx_step_tracked:
                            docx_error = f"DOCX conversion failed: {exc}"
                if docx_tmp_result is None:
                    if docx_landscape:
                        docx_font_scale = _extract_excel_print_scale_from_html(out_html) or docx_font_scale
                    try:
                        docx_tmp_result = html_file_to_docx(
                            out_html,
                            tmp_docx,
                            landscape=docx_landscape,
                            body_font_scale=docx_font_scale or (0.82 if docx_landscape else None),
                        )
                    except Exception as exc:
                        with contextlib.suppress(FileNotFoundError):
                            tmp_docx.unlink(missing_ok=True)
                        logger.exception(
                            "docx_export_failed",
                            extra={
                                "event": "docx_export_failed",
                                "template_id": p.template_id,
                                "template_kind": kind,
                                "correlation_id": correlation_id,
                            },
                        )
                        if docx_step_tracked:
                            docx_error = f"DOCX export failed: {exc}"
                    else:
                        if docx_tmp_result:
                            docx_tmp_path = Path(docx_tmp_result)
                            if docx_tmp_path != out_docx:
                                docx_tmp_path.replace(out_docx)
                            docx_path = out_docx
                        else:
                            with contextlib.suppress(FileNotFoundError):
                                tmp_docx.unlink(missing_ok=True)
                else:
                    if docx_tmp_result and docx_tmp_result != out_docx:
                        Path(docx_tmp_result).replace(out_docx)
                    docx_path = out_docx
                if docx_step_tracked:
                    if docx_error:
                        job_tracker.step_failed("renderDocx", docx_error)
                    else:
                        job_tracker.step_succeeded("renderDocx")
            xlsx_step_tracked = bool(job_tracker and job_tracker.has_step("renderXlsx"))
            if xlsx_enabled and out_xlsx and tmp_xlsx:
                if xlsx_step_tracked:
                    job_tracker.step_running("renderXlsx", label="Render XLSX")
                xlsx_error: str | None = None
                try:
                    xlsx_tmp_result = html_file_to_xlsx(out_html, tmp_xlsx)
                except Exception as exc:
                    with contextlib.suppress(FileNotFoundError):
                        tmp_xlsx.unlink(missing_ok=True)
                    logger.exception(
                        "xlsx_export_failed",
                        extra={
                            "event": "xlsx_export_failed",
                            "template_id": p.template_id,
                            "template_kind": kind,
                            "correlation_id": correlation_id,
                        },
                    )
                    if xlsx_step_tracked:
                        xlsx_error = f"XLSX export failed: {exc}"
                else:
                    if xlsx_tmp_result:
                        xlsx_tmp_path = Path(xlsx_tmp_result)
                        if xlsx_tmp_path != out_xlsx:
                            xlsx_tmp_path.replace(out_xlsx)
                        xlsx_path = out_xlsx
                    else:
                        with contextlib.suppress(FileNotFoundError):
                            tmp_xlsx.unlink(missing_ok=True)
                if xlsx_step_tracked:
                    if xlsx_error:
                        job_tracker.step_failed("renderXlsx", xlsx_error)
                    else:
                        job_tracker.step_succeeded("renderXlsx")
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
            if tmp_docx is not None:
                with contextlib.suppress(FileNotFoundError):
                        tmp_docx.unlink(missing_ok=True)
            if tmp_xlsx is not None:
                with contextlib.suppress(FileNotFoundError):
                    tmp_xlsx.unlink(missing_ok=True)
            if job_tracker:
                job_tracker.step_failed("renderPdf", f"Report generation failed: {e}")
            raise _http_error(500, "report_generation_failed", f"Report generation failed: {e}")
    if job_tracker:
        job_tracker.step_succeeded("renderPdf")

    artifact_files = {
        out_html.name: out_html,
        out_pdf.name: out_pdf,
    }
    if docx_path and out_docx:
        artifact_files[out_docx.name] = out_docx
    if xlsx_path and out_xlsx:
        artifact_files[out_xlsx.name] = out_xlsx

    if job_tracker and job_tracker.has_step("finalize"):
        job_tracker.step_running("finalize", label="Finalize artifacts")
    write_artifact_manifest(
        tdir,
        step="reports_run",
        files=artifact_files,
        inputs=[str(contract_path), str(db_path)],
        correlation_id=correlation_id,
    )
    if job_tracker and job_tracker.has_step("finalize"):
        job_tracker.step_succeeded("finalize")

    manifest_data = load_manifest(tdir) or {}
    manifest_url = _manifest_endpoint(p.template_id, kind=kind)
    state_store.record_template_run(p.template_id, p.connection_id)
    state_store.set_last_used(p.connection_id, p.template_id)

    logger.info(
        "reports_run_complete",
        extra={
            "event": "reports_run_complete",
            "template_id": p.template_id,
            "html": str(out_html.name),
            "pdf": str(out_pdf.name),
            "docx": str(out_docx.name) if docx_path and out_docx else None,
            "xlsx": str(out_xlsx.name) if xlsx_path and out_xlsx else None,
            "correlation_id": correlation_id,
            "elapsed_ms": int((time.time() - run_started) * 1000),
        },
    )

    result = {
        "ok": True,
        "run_id": str(uuid.uuid4()),
        "template_id": p.template_id,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "html_url": _artifact_url(out_html),
        "pdf_url": _artifact_url(out_pdf),
        "docx_url": _artifact_url(out_docx) if docx_path and out_docx else None,
        "xlsx_url": _artifact_url(out_xlsx) if xlsx_path and out_xlsx else None,
        "manifest_url": manifest_url,
        "manifest_produced_at": manifest_data.get("produced_at"),
        "correlation_id": correlation_id,
    }
    artifact_paths = {
        "html": out_html if out_html.exists() else None,
        "pdf": out_pdf if out_pdf.exists() else None,
        "docx": docx_path if docx_path and docx_path.exists() else None,
        "xlsx": xlsx_path if xlsx_path and xlsx_path.exists() else None,
    }
    return result, artifact_paths


def _maybe_send_email(
    p: RunPayload,
    artifact_paths: Mapping[str, Optional[Path]],
    run_result: Mapping[str, Any],
    *,
    kind: str,
    correlation_id: str | None,
    job_tracker: JobRunTracker | None = None,
) -> None:
    recipients = _normalize_email_targets(p.email_recipients)
    email_step_tracked = bool(job_tracker and job_tracker.has_step("email"))
    if not recipients:
        if email_step_tracked:
            job_tracker.step_succeeded("email")
        return
    if email_step_tracked:
        job_tracker.step_running("email", label="Send notification email")
    attachments: list[Path] = []
    for key in ("pdf", "docx", "xlsx"):
        path = artifact_paths.get(key)
        if isinstance(path, Path) and path.exists():
            attachments.append(path)
    if not attachments:
        fallback = artifact_paths.get("html")
        if isinstance(fallback, Path) and fallback.exists():
            attachments.append(fallback)
    if not attachments:
        return
    template_record = state_store.get_template_record(p.template_id) or {}
    template_name = template_record.get("name") or p.template_id
    default_subject = f"Report run for {template_name}"
    subject = (p.email_subject or default_subject).strip()
    if not subject:
        subject = default_subject
    if p.email_message:
        body = p.email_message.strip()
    else:
        artifact_lines = []
        for key in ("pdf_url", "docx_url", "xlsx_url", "html_url"):
            url = run_result.get(key)
            if url:
                label = key.replace("_url", "").upper()
                artifact_lines.append(f"{label}: {url}")
        lines = [
            f"Template: {template_name} ({p.template_id})",
            f"Run kind: {kind}",
            f"Range: {p.start_date} \u2192 {p.end_date}",
        ]
        if artifact_lines:
            lines.append("")
            lines.append("Artifacts:")
            lines.extend(artifact_lines)
        lines.append("")
        lines.append("This notification was generated automatically by NeuraReport.")
        body = "\n".join(lines)

    success = send_report_email(
        to_addresses=recipients,
        subject=subject,
        body=body,
        attachments=attachments,
    )
    if email_step_tracked:
        if success:
            job_tracker.step_succeeded("email")
        else:
            job_tracker.step_failed("email", "Email delivery failed")
    logger.info(
        "report_email_attempt",
        extra={
            "event": "report_email_attempt",
            "template_id": p.template_id,
            "recipients": len(recipients),
            "correlation_id": correlation_id,
            "status": "sent" if success else "skipped",
        },
    )


def _run_report_with_email(
    p: RunPayload,
    *,
    kind: str,
    correlation_id: str | None = None,
    job_tracker: JobRunTracker | None = None,
) -> dict:
    result, artifact_paths = _run_report_internal(p, kind=kind, correlation_id=correlation_id, job_tracker=job_tracker)
    _maybe_send_email(
        p,
        artifact_paths,
        result,
        kind=kind,
        correlation_id=correlation_id,
        job_tracker=job_tracker,
    )
    return result


def _scheduler_runner(payload: dict, kind: str) -> dict:
    run_payload = RunPayload(**payload)
    correlation_id = payload.get("correlation_id") or f"sched-{payload.get('schedule_id') or uuid.uuid4()}"
    return _run_report_with_email(run_payload, kind=kind, correlation_id=correlation_id)


def _reports_run_route(p: RunPayload, request: Request, *, kind: str = "pdf"):
    correlation_id = getattr(request.state, "correlation_id", None)
    return _run_report_with_email(p, kind=kind, correlation_id=correlation_id)


run_router = build_run_router(
    reports_run_fn=_reports_run_route,
    enqueue_job_fn=_queue_report_job,
)
app.include_router(run_router)


@app.get("/jobs")
def list_jobs_route(
    status: list[str] | None = Query(None),
    job_type: list[str] | None = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=200),
    active_only: bool = Query(False),
):
    jobs = state_store.list_jobs(statuses=status, types=job_type, limit=limit, active_only=active_only)
    return {"jobs": jobs}


@app.get("/jobs/active")
def list_active_jobs(limit: int = Query(20, ge=1, le=200)):
    jobs = state_store.list_jobs(limit=limit, active_only=True)
    return {"jobs": jobs}


@app.get("/jobs/{job_id}")
def get_job_route(job_id: str):
    job = state_store.get_job(job_id)
    if not job:
        raise _http_error(404, "job_not_found", "Job not found.")
    return {"job": job}


# ---------- Schedules ----------
@app.get("/reports/schedules")
def list_report_schedules():
    return {"schedules": state_store.list_schedules()}


@app.post("/reports/schedules")
def create_report_schedule(payload: ScheduleCreatePayload):
    template = state_store.get_template_record(payload.template_id) or {}
    if not template:
        raise _http_error(404, "template_not_found", "Template not found.")
    if str(template.get("status")).lower() != "approved":
        raise _http_error(400, "template_not_ready", "Template must be approved before scheduling runs.")
    connection = state_store.get_connection_record(payload.connection_id)
    if not connection:
        raise _http_error(404, "connection_not_found", "Connection not found.")
    if not payload.start_date or not payload.end_date:
        raise _http_error(400, "invalid_schedule_range", "Provide both start_date and end_date.")
    interval_minutes = _resolve_schedule_interval(payload.frequency, payload.interval_minutes)
    now_iso = _utcnow_iso()
    schedule = state_store.create_schedule(
        name=(payload.name or template.get("name") or f"Schedule {payload.template_id}")[:120],
        template_id=payload.template_id,
        template_name=template.get("name") or payload.template_id,
        template_kind=template.get("kind") or "pdf",
        connection_id=payload.connection_id,
        connection_name=connection.get("name") or connection.get("connection_name") or payload.connection_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        key_values=_clean_key_values(payload.key_values),
        batch_ids=payload.batch_ids,
        docx=payload.docx,
        xlsx=payload.xlsx,
        email_recipients=_normalize_email_targets(payload.email_recipients or []),
        email_subject=payload.email_subject,
        email_message=payload.email_message,
        frequency=payload.frequency,
        interval_minutes=interval_minutes,
        next_run_at=now_iso,
        first_run_at=now_iso,
        active=payload.active,
    )
    return {"schedule": schedule}


@app.delete("/reports/schedules/{schedule_id}")
def delete_report_schedule(schedule_id: str):
    removed = state_store.delete_schedule(schedule_id)
    if not removed:
        raise _http_error(404, "schedule_not_found", "Schedule not found.")
    return {"status": "ok", "schedule_id": schedule_id}
