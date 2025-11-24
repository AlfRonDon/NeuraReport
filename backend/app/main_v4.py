from __future__ import annotations

from fastapi import FastAPI

from backend.app.api.router import register_routes
from backend.app.core.config import get_settings
from backend.app.core.errors import add_exception_handlers
from backend.app.core.middleware import add_middlewares


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.api_title, version=settings.api_version)
    add_middlewares(app, settings)
    add_exception_handlers(app)
    register_routes(app)
    return app


app = create_app()

