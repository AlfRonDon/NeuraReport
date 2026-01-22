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

from fastapi import FastAPI


from .app.core.static_files import UploadsStaticFiles

from .app.core.event_bus import EventBus, logging_middleware, metrics_middleware
from .app.core.errors import add_exception_handlers
from .app.core.middleware import add_middlewares
from backend.app.api.router import register_routes
from src.services.report_service import (
    _run_report_job_sync as _run_report_job_sync,
    _run_report_with_email as _run_report_with_email,
    _schedule_report_job as _schedule_report_job,
    scheduler_runner as report_scheduler_runner,
)

from .app.core.config import get_settings, log_settings
from .app.core.auth import init_auth_db
from .app.env_loader import load_env_file

from .app.services.jobs.report_scheduler import ReportScheduler


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
