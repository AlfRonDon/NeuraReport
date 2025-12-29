# mypy: ignore-errors
from __future__ import annotations

import logging
import os
import time
import uuid
import warnings
from contextlib import asynccontextmanager
from pathlib import Path

# Silence noisy deprecations from dependencies during import/test
warnings.filterwarnings("ignore", message=".*on_event is deprecated.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*Support for class-based `config` is deprecated.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*SwigPy.*has no __module__ attribute", category=DeprecationWarning)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.utils.static_files import UploadsStaticFiles
from src.utils.connection_utils import db_path_from_payload_or_default as _db_path_from_payload_or_default

from .app.core.event_bus import EventBus, logging_middleware, metrics_middleware
from src.routes import router as v1_router
from src.services.report_service import scheduler_runner as report_scheduler_runner

from .app.config import load_settings, log_settings
from .app.env_loader import load_env_file

from .app.services.utils import get_correlation_id, set_correlation_id
from .app.services.jobs.report_scheduler import ReportScheduler
from backend.app.services.mapping.HeaderMapping import get_parent_child_info
from src.services.mapping.helpers import compute_db_signature
from backend.app.services.contract.ContractBuilderV2 import build_or_load_contract_v2
from backend.app.services.templates.TemplateVerify import render_html_to_png, render_panel_preview
from backend.app.services.generator.GeneratorAssetsV1 import build_generator_assets_from_payload
from src.services.report_service import _schedule_report_job, _run_report_with_email, _run_report_job_sync


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
SETTINGS = load_settings()
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

    if not SCHEDULER_DISABLED and SCHEDULER is None:
        poll_seconds = max(int(os.getenv("NEURA_SCHEDULER_INTERVAL", "60") or "60"), 15)
        SCHEDULER = ReportScheduler(_scheduler_runner, poll_seconds=poll_seconds)
    if SCHEDULER and not SCHEDULER_DISABLED:
        await SCHEDULER.start()

    yield

    if SCHEDULER and not SCHEDULER_DISABLED:
        await SCHEDULER.stop()


app = FastAPI(title="NeuraReport API", lifespan=lifespan)

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


app.include_router(v1_router)

def _scheduler_runner(payload: dict, kind: str) -> dict:
    return report_scheduler_runner(payload, kind)
