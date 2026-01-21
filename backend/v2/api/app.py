"""
FastAPI application factory.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .dependencies import create_dependencies, set_dependencies, Dependencies
from .routes import templates, connections, reports, jobs, health

logger = logging.getLogger("neura.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    deps: Dependencies = app.state.dependencies

    # Start worker pool
    if deps.worker_pool:
        await deps.worker_pool.start()
        logger.info("Worker pool started")

    # Start scheduler
    if deps.scheduler:
        await deps.scheduler.start()
        logger.info("Scheduler started")

    yield

    # Stop scheduler
    if deps.scheduler:
        await deps.scheduler.stop()
        logger.info("Scheduler stopped")

    # Stop worker pool
    if deps.worker_pool:
        await deps.worker_pool.stop()
        logger.info("Worker pool stopped")


def create_app(
    dependencies: Optional[Dependencies] = None,
    enable_cors: bool = True,
    cors_origins: list[str] | None = None,
) -> FastAPI:
    """
    Create the FastAPI application.

    Args:
        dependencies: Pre-configured dependencies (for testing)
        enable_cors: Whether to enable CORS
        cors_origins: Allowed CORS origins

    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title="NeuraReport API v2",
        description="Report generation and template management API",
        version="2.0.0",
        lifespan=lifespan,
    )

    # Set up dependencies
    deps = dependencies or create_dependencies()
    set_dependencies(deps)
    app.state.dependencies = deps

    # CORS
    if enable_cors:
        origins = cors_origins or [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Include routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
    app.include_router(connections.router, prefix="/api/connections", tags=["Connections"])
    app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
    app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])

    return app
