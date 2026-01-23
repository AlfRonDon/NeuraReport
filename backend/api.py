# mypy: ignore-errors
from __future__ import annotations

import logging
import os
import warnings
from contextlib import asynccontextmanager
from pathlib import Path

# Silence noisy deprecations from dependencies during import/test
warnings.filterwarnings("ignore", message=".*on_event is deprecated.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*Support for class-based `config` is deprecated.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*SwigPy.*has no __module__ attribute", category=DeprecationWarning)

from fastapi import FastAPI, UploadFile


from backend.app.services.static_files import UploadsStaticFiles

from backend.app.utils.event_bus import EventBus, logging_middleware, metrics_middleware
from backend.app.services.errors import add_exception_handlers
from backend.app.api.middleware import add_middlewares  # ARCH-EXC-002
from backend.app.api.router import register_routes  # ARCH-EXC-002
from backend.legacy.services.report_service import (
    _run_report_job_sync as _run_report_job_sync,
    _run_report_with_email as _run_report_with_email,
    _schedule_report_job as _schedule_report_job,
    scheduler_runner as report_scheduler_runner,
)
from backend.legacy.services.report_service import JobRunTracker as JobRunTracker

from backend.legacy.services import report_service as report_service

from backend.app.services.config import get_settings, log_settings
from backend.app.services.auth import init_auth_db
from backend.app.utils.env_loader import load_env_file

from backend.app.services.jobs.report_scheduler import ReportScheduler
from backend.app.services.background_tasks import mark_incomplete_jobs_failed


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

# ---------- App & CORS ----------
load_env_file()

logger = logging.getLogger("neura.api")
EVENT_BUS = EventBus(middlewares=[logging_middleware(logger), metrics_middleware(logger)])
SETTINGS = get_settings()
log_settings(logger, SETTINGS)
ERROR_LOG_PATH: Path | None = None
SCHEDULER: ReportScheduler | None = None
SCHEDULER_DISABLED = os.getenv("NEURA_SCHEDULER_DISABLED", "false").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ERROR_LOG_PATH, SCHEDULER
    if not ERROR_LOG_PATH:
        ERROR_LOG_PATH = _configure_error_log_handler(logging.getLogger())
        if ERROR_LOG_PATH:
            logger.info("error_log_configured", extra={"event": "error_log_configured", "path": str(ERROR_LOG_PATH)})

    try:
        await init_auth_db()
    except Exception as exc:
        logger.warning("auth_db_init_failed", extra={"event": "auth_db_init_failed", "error": str(exc)})

    if not SCHEDULER_DISABLED and SCHEDULER is None:
        poll_seconds = max(int(os.getenv("NEURA_SCHEDULER_INTERVAL", "60") or "60"), 15)
        SCHEDULER = ReportScheduler(_scheduler_runner, poll_seconds=poll_seconds)
    if SCHEDULER and not SCHEDULER_DISABLED:
        await SCHEDULER.start()

    recover_jobs = os.getenv("NEURA_RECOVER_JOBS_ON_STARTUP", "true").lower() in {"1", "true", "yes"}
    if recover_jobs:
        try:
            recovered = report_service.recover_report_jobs()
            if recovered:
                logger.info(
                    "report_jobs_recovered",
                    extra={"event": "report_jobs_recovered", "count": recovered},
                )
        except Exception as exc:
            logger.warning(
                "report_job_recovery_failed",
                extra={"event": "report_job_recovery_failed", "error": str(exc)},
            )
        try:
            updated = mark_incomplete_jobs_failed(skip_types={"run_report"})
            if updated:
                logger.info(
                    "background_jobs_marked_failed",
                    extra={"event": "background_jobs_marked_failed", "count": updated},
                )
        except Exception as exc:
            logger.warning(
                "background_job_cleanup_failed",
                extra={"event": "background_job_cleanup_failed", "error": str(exc)},
            )

    yield

    if SCHEDULER and not SCHEDULER_DISABLED:
        await SCHEDULER.stop()


app = FastAPI(title=SETTINGS.api_title, version=SETTINGS.api_version, lifespan=lifespan)
add_middlewares(app, SETTINGS)
add_exception_handlers(app)


# ---------- Static upload root ----------
APP_DIR = Path(__file__).parent.resolve()
UPLOAD_ROOT = SETTINGS.uploads_root
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
EXCEL_UPLOAD_ROOT = SETTINGS.excel_uploads_root
EXCEL_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
UPLOAD_ROOT_BASE = UPLOAD_ROOT.resolve()
EXCEL_UPLOAD_ROOT_BASE = EXCEL_UPLOAD_ROOT.resolve()
_UPLOAD_KIND_BASES: dict[str, tuple[Path, str]] = {
    "pdf": (UPLOAD_ROOT_BASE, "/uploads"),
    "excel": (EXCEL_UPLOAD_ROOT_BASE, "/excel-uploads"),
}
APP_VERSION = SETTINGS.version
APP_COMMIT = SETTINGS.commit


app.mount("/uploads", UploadsStaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")
app.mount("/excel-uploads", UploadsStaticFiles(directory=str(EXCEL_UPLOAD_ROOT)), name="excel-uploads")

# Register all API routes from consolidated router
register_routes(app)

def _scheduler_runner(payload: dict, kind: str, *, job_tracker: JobRunTracker | None = None) -> dict:
    return report_scheduler_runner(payload, kind, job_tracker=job_tracker)


# ---------------------------------------------------------------------------
# Compatibility exports (tests + legacy backend/legacy override hooks)
# ---------------------------------------------------------------------------
from fastapi import HTTPException

from backend.app.repositories.connections.db_connection import resolve_db_path as resolve_db_path
from backend.app.repositories.connections.db_connection import verify_sqlite as verify_sqlite
from backend.app.services.contract.ContractBuilderV2 import build_or_load_contract_v2 as build_or_load_contract_v2
from backend.app.services.generator.GeneratorAssetsV1 import (
    build_generator_assets_from_payload as build_generator_assets_from_payload,
)
from backend.app.services.mapping.AutoMapInline import run_llm_call_3 as run_llm_call_3
from backend.app.services.mapping.HeaderMapping import get_parent_child_info as get_parent_child_info
from backend.app.services.render.html_raster import rasterize_html_to_png as rasterize_html_to_png
from backend.app.services.render.html_raster import save_png as save_png
from backend.app.services.reports.docx_export import html_file_to_docx as html_file_to_docx
from backend.app.services.reports.xlsx_export import html_file_to_xlsx as html_file_to_xlsx
from backend.app.repositories.state import state_store as state_store
from backend.app.services.templates.TemplateVerify import pdf_to_pngs as pdf_to_pngs
from backend.app.services.templates.TemplateVerify import render_html_to_png as render_html_to_png
from backend.app.services.templates.TemplateVerify import render_panel_preview as render_panel_preview
from backend.app.services.templates.TemplateVerify import request_fix_html as request_fix_html
from backend.app.services.templates.TemplateVerify import request_initial_html as request_initial_html
from backend.app.services.templates.TemplateVerify import save_html as save_html
from backend.app.services.templates.layout_hints import get_layout_hints as get_layout_hints
from backend.app.services.utils import validate_contract_schema as validate_contract_schema
from backend.app.services.utils import write_artifact_manifest as write_artifact_manifest
from backend.legacy.services.file_service.verify import verify_template as _verify_template_service
from backend.legacy.services.mapping.helpers import build_catalog_from_db as _build_catalog_from_db
from backend.legacy.services.mapping.helpers import compute_db_signature as compute_db_signature
from backend.legacy.services.mapping.preview import _mapping_preview_pipeline as _mapping_preview_pipeline


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"status": "error", "code": code, "message": message})


def _db_path_from_payload_or_default(conn_id: str | None) -> Path:
    """
    Legacy override hook used by src/utils/connection_utils.py.

    This implementation mirrors the same precedence rules but lives here so
    tests can monkeypatch it without causing import recursion.
    """
    if conn_id:
        secrets = state_store.get_connection_secrets(conn_id)
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])
        record = state_store.get_connection_record(conn_id)
        if record and record.get("database_path"):
            return Path(record["database_path"])
        try:
            return resolve_db_path(connection_id=conn_id, db_url=None, db_path=None)
        except Exception:
            pass

    last_used = state_store.get_last_used()
    if last_used.get("connection_id"):
        connection_id = str(last_used["connection_id"])
        secrets = state_store.get_connection_secrets(connection_id)
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])
        record = state_store.get_connection_record(connection_id)
        if record and record.get("database_path"):
            return Path(record["database_path"])

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


async def verify_template(file: UploadFile, connection_id: str | None, request, refine_iters: int = 0):
    """
    Async wrapper for the sync verify pipeline to support tests calling it via `await`.
    """
    return _verify_template_service(file=file, connection_id=connection_id, request=request, refine_iters=refine_iters)
