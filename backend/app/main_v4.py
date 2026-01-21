from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI

from src.routes import router as v1_router
from src.utils.static_files import UploadsStaticFiles

from backend.app.api.router import register_routes
from backend.app.core.config import get_settings
from backend.app.core.errors import add_exception_handlers
from backend.app.core.middleware import add_middlewares


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.api_title, version=settings.api_version)
    add_middlewares(app, settings)
    add_exception_handlers(app)
    uploads_root = Path(__file__).resolve().parents[2] / "uploads"
    excel_uploads_root = Path(__file__).resolve().parents[2] / "uploads_excel"
    uploads_root.mkdir(parents=True, exist_ok=True)
    excel_uploads_root.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", UploadsStaticFiles(directory=str(uploads_root)), name="uploads")
    app.mount("/excel-uploads", UploadsStaticFiles(directory=str(excel_uploads_root)), name="excel-uploads")
    app.include_router(v1_router)
    register_routes(app)
    return app


app = create_app()
