from __future__ import annotations

from pathlib import Path

from backend.app.config import load_settings

SETTINGS = load_settings()
APP_VERSION = SETTINGS.version
APP_COMMIT = SETTINGS.commit

UPLOAD_ROOT: Path = SETTINGS.uploads_root
EXCEL_UPLOAD_ROOT: Path = SETTINGS.excel_uploads_root


def get_settings():
    return SETTINGS
