"""Centralized API Router Registration.

This module registers all API routes in a single location, providing
a unified entry point for the FastAPI application.
"""
from __future__ import annotations

from fastapi import FastAPI

from .routes import (
    analytics,
    charts,
    connections,
    docqa,
    enrichment,
    excel,
    federation,
    health,
    jobs,
    nl2sql,
    recommendations,
    reports,
    schedules,
    state,
    summary,
    synthesis,
    templates,
)
from backend.app.features.analyze.routes import router as analyze_router
from backend.app.features.analyze.routes import enhanced_analysis_routes
from backend.app.core.auth import auth_backend, fastapi_users, UserCreate, UserRead, UserUpdate


def register_routes(app: FastAPI) -> None:
    """Register all API routes with the FastAPI application.

    Route prefixes:
    - /health, /healthz, /ready, /readyz - Health checks
    - /connections - Database connection management
    - /templates - Template CRUD, verification, editing
    - /excel - Excel-specific template operations
    - /reports - Report generation and history
    - /jobs - Background job management
    - /schedules - Report scheduling
    - /state - Application state management
    - /analyze - Document analysis
    - /analytics - Dashboard analytics and bulk operations
    - /nl2sql - Natural language to SQL
    - /enrichment - Data enrichment
    - /federation - Cross-database queries
    - /recommendations - AI recommendations
    - /charts - Chart generation
    - /summary - Document summarization
    - /synthesis - Multi-document synthesis
    - /docqa - Document Q&A chat
    """
    # Core routes
    app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
    app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
    app.include_router(fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"])
    app.include_router(health.router, tags=["health"])
    app.include_router(connections.router, prefix="/connections", tags=["connections"])
    app.include_router(templates.router, prefix="/templates", tags=["templates"])
    app.include_router(excel.router, prefix="/excel", tags=["excel"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
    app.include_router(schedules.router, prefix="/reports/schedules", tags=["schedules"])
    app.include_router(state.router, prefix="/state", tags=["state"])

    # Document analysis
    app.include_router(analyze_router, prefix="/analyze", tags=["analyze"])
    app.include_router(enhanced_analysis_routes.router)

    # Analytics and bulk operations
    app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

    # AI Features
    app.include_router(nl2sql.router, prefix="/nl2sql", tags=["nl2sql"])
    app.include_router(enrichment.router, prefix="/enrichment", tags=["enrichment"])
    app.include_router(federation.router, prefix="/federation", tags=["federation"])
    app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
    app.include_router(charts.router, prefix="/charts", tags=["charts"])
    app.include_router(summary.router, prefix="/summary", tags=["summary"])
    app.include_router(synthesis.router, prefix="/synthesis", tags=["synthesis"])
    app.include_router(docqa.router, prefix="/docqa", tags=["docqa"])
