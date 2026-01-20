from __future__ import annotations

import importlib
import os
from pathlib import Path
from typing import Optional

from fastapi import HTTPException

from backend.app.services.connections.db_connection import resolve_db_path
from backend.app.services.state import store as state_store_module


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"status": "error", "code": code, "message": message})


def _state_store():
    return state_store_module.state_store


def display_name_for_path(db_path: Path, db_type: str = "sqlite") -> str:
    base = db_path.name
    if db_type.lower() == "sqlite":
        return base
    return f"{db_type}:{base}"


def db_path_from_payload_or_default(conn_id: Optional[str]) -> Path:
    """
    Resolve a database path using the same precedence as the legacy api.py helper.
    """
    try:
        api_mod = importlib.import_module("backend.api")
        override = getattr(api_mod, "_db_path_from_payload_or_default", None)
        if override and override is not db_path_from_payload_or_default:
            return override(conn_id)
    except Exception:
        pass

    if conn_id:
        secrets = _state_store().get_connection_secrets(conn_id)
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])
        try:
            return resolve_db_path(connection_id=conn_id, db_url=None, db_path=None)
        except Exception:
            pass

    last_used = _state_store().get_last_used()
    if last_used.get("connection_id"):
        secrets = _state_store().get_connection_secrets(last_used["connection_id"])
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])

    env_db = os.getenv("NR_DEFAULT_DB") or os.getenv("DB_PATH")
    if env_db:
        return Path(env_db)

    latest = _state_store().get_latest_connection()
    if latest and latest.get("database_path"):
        return Path(latest["database_path"])

    raise _http_error(
        400,
        "db_missing",
        "No database configured. Connect once or set NR_DEFAULT_DB/DB_PATH env.",
    )
