# app/services/connections/db_connection.py
from __future__ import annotations

import argparse
import json
import os
import tempfile
import uuid
from pathlib import Path
from urllib.parse import urlparse

from ..dataframes import SQLiteDataFrameLoader
from ..state import state_store

STORAGE = os.path.join(tempfile.gettempdir(), "neura_connections.jsonl")


def _strip_quotes(s: str | None) -> str | None:
    if s is None:
        return None
    return s.strip().strip("'\"")


def _sqlite_path_from_url(db_url: str) -> str:
    u = urlparse(db_url)
    raw = (u.netloc + u.path) if u.netloc else (u.path or "")
    # /C:/Users/... -> C:/Users/...
    if raw.startswith("/") and len(raw) >= 3 and raw[2] == ":":
        raw = raw.lstrip("/")
    return raw.replace("/", os.sep)


def resolve_db_path(connection_id: str | None, db_url: str | None, db_path: str | None) -> Path:
    # a) connection_id -> lookup in STORAGE
    if connection_id:
        secrets = state_store.get_connection_secrets(connection_id)
        if secrets and secrets.get("database_path"):
            return Path(secrets["database_path"])
        if os.path.exists(STORAGE):
            with open(STORAGE, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                        if rec.get("id") == connection_id:
                            cfg = rec.get("cfg") or {}
                            db = cfg.get("database")
                            if db:
                                # migrate legacy record into new store
                                state_store.upsert_connection(
                                    conn_id=connection_id,
                                    name=cfg.get("name") or f"{cfg.get('db_type') or 'sqlite'}@{Path(db).name}",
                                    db_type=cfg.get("db_type") or "sqlite",
                                    database_path=str(db),
                                    secret_payload={"database": str(db), "db_url": cfg.get("db_url")},
                                )
                                return Path(db)
                    except Exception:
                        continue
        raise RuntimeError(f"connection_id {connection_id!r} not found in storage")

    # b) db_url (preferred)
    db_url = _strip_quotes(db_url)
    if db_url:
        if not db_url.startswith("sqlite:"):
            raise RuntimeError("Only sqlite URLs are supported for now")
        return Path(_sqlite_path_from_url(db_url))

    # c) db_path (legacy)
    db_path = _strip_quotes(db_path)
    if db_path:
        return Path(db_path)

    # d) env fallback
    env_path = _strip_quotes(os.getenv("DB_PATH"))
    if env_path:
        return Path(env_path)

    raise RuntimeError("No DB specified. Provide --connection-id OR --db-url OR --db-path (or DB_PATH env).")


def verify_sqlite(path: Path) -> None:
    """Raise when the backing SQLite file cannot be materialized into DataFrames."""
    db_file = Path(path)
    if not db_file.exists():
        raise FileNotFoundError(f"SQLite DB not found: {path}")
    try:
        loader = SQLiteDataFrameLoader(db_file)
        loader.table_names()
    except Exception as exc:  # pragma: no cover - surfaced to API caller
        raise RuntimeError(f"SQLite->DataFrame load error: {exc}") from exc


def save_connection(cfg: dict) -> str:
    """Persist a minimal record and return a connection_id."""
    cid = cfg.get("id") or str(uuid.uuid4())
    db_type = cfg.get("db_type") or "sqlite"
    database = cfg.get("database")
    db_url = cfg.get("db_url")
    if db_url and not database:
        database = _sqlite_path_from_url(db_url)
    database_path = str(database) if database else ""
    name = cfg.get("name") or f"{db_type}@{Path(database_path).name if database_path else cid}"
    state_store.upsert_connection(
        conn_id=cid,
        name=name,
        db_type=db_type,
        database_path=database_path,
        secret_payload={"database": database_path, "db_url": db_url},
        status=cfg.get("status"),
        latency_ms=cfg.get("latency_ms"),
        tags=cfg.get("tags"),
    )
    return cid


# ---- CLI only (safe to import in API) ----
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeuraReport DB resolver")
    parser.add_argument("--connection-id")
    parser.add_argument("--db-url")  # e.g. sqlite:///C:/Users/you/file.db
    parser.add_argument("--db-path")  # legacy: direct path
    args = parser.parse_args()

    DB_PATH = resolve_db_path(
        connection_id=_strip_quotes(args.connection_id) or _strip_quotes(os.getenv("CONNECTION_ID")),
        db_url=_strip_quotes(args.db_url) or _strip_quotes(os.getenv("DB_URL")),
        db_path=_strip_quotes(args.db_path) or _strip_quotes(os.getenv("DB_PATH")),
    )
    verify_sqlite(DB_PATH)
    print(f"Resolved DB path: {DB_PATH}")
