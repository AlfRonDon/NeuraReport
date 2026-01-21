"""FastAPI application factory."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.errors import NeuraError, NotFoundError, ValidationError
from backend.core.events import Event, publish_sync
from .dependencies import AppConfig, init_dependencies, get_dependencies
from .routes import health, templates, connections, reports, jobs

logger = logging.getLogger("neura.api")


def error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global error handler for NeuraError types."""
    if isinstance(exc, ValidationError):
        return JSONResponse(
            status_code=400,
            content=exc.to_dict(),
        )
    elif isinstance(exc, NotFoundError):
        return JSONResponse(
            status_code=404,
            content=exc.to_dict(),
        )
    elif isinstance(exc, NeuraError):
        return JSONResponse(
            status_code=500,
            content=exc.to_dict(),
        )
    else:
        logger.exception("unhandled_error", extra={"path": request.url.path})
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "message": "An unexpected error occurred",
            },
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    deps = get_dependencies()

    # Start worker pool
    if deps.worker_pool:
        await deps.worker_pool.start()
        logger.info("worker_pool_started", extra={"event": "worker_pool_started"})

    # Start scheduler
    if deps.scheduler:
        await deps.scheduler.start()
        logger.info("scheduler_started", extra={"event": "scheduler_started"})

    publish_sync(Event(name="app.started", payload={}))

    yield

    # Shutdown
    if deps.scheduler:
        await deps.scheduler.stop()
        logger.info("scheduler_stopped", extra={"event": "scheduler_stopped"})

    if deps.worker_pool:
        await deps.worker_pool.stop()
        logger.info("worker_pool_stopped", extra={"event": "worker_pool_stopped"})

    await deps.executor.shutdown()
    logger.info("executor_shutdown", extra={"event": "executor_shutdown"})

    publish_sync(Event(name="app.stopped", payload={}))


def create_app(
    config: Optional[AppConfig] = None,
    *,
    title: str = "NeuraReport API",
    version: str = "2.0.0",
) -> FastAPI:
    """Create and configure the FastAPI application."""

    # Default config
    if config is None:
        config = AppConfig(
            upload_root=Path("./runtime/uploads").resolve(),
            excel_upload_root=Path("./runtime/excel-uploads").resolve(),
            state_file=Path("./runtime/state.json").resolve(),
        )

    # Ensure directories exist
    config.upload_root.mkdir(parents=True, exist_ok=True)
    config.excel_upload_root.mkdir(parents=True, exist_ok=True)
    config.state_file.parent.mkdir(parents=True, exist_ok=True)

    # Initialize dependencies
    init_dependencies(config)

    # Create app
    app = FastAPI(
        title=title,
        version=version,
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add error handlers
    app.add_exception_handler(NeuraError, error_handler)

    # Register routes
    app.include_router(health.router, tags=["health"])
    app.include_router(templates.router, prefix="/templates", tags=["templates"])
    app.include_router(connections.router, prefix="/connections", tags=["connections"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])

    logger.info(
        "app_created",
        extra={
            "event": "app_created",
            "title": title,
            "version": version,
        },
    )

    return app
