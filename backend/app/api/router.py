from __future__ import annotations

from fastapi import FastAPI

from .routes import connections, health, templates


def register_routes(app: FastAPI) -> None:
    app.include_router(health.router, tags=["health"])
    app.include_router(connections.router, prefix="/connections", tags=["connections"])
    app.include_router(templates.router, prefix="/templates", tags=["templates"])

