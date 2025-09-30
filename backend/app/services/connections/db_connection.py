# app/services/connections/db_connection.py
from __future__ import annotations

import os, json, tempfile, argparse
from pathlib import Path
from urllib.parse import urlparse
import sqlite3
import time
import uuid

STORAGE = os.path.join(tempfile.gettempdir(), "neura_connections.jsonl")

def _strip_quotes(s: str | None) -> str | None:
    if s is None:
        return None
    return s.strip().strip('\'"')

def _sqlite_path_from_url(db_url: str) -> str:
    u = urlparse(db_url)
    raw = (u.netloc + u.path) if u.netloc else (u.path or "")
    # /C:/Users/... -> C:/Users/...
    if raw.startswith("/") and len(raw) >= 3 and raw[2] == ":":
        raw = raw.lstrip("/")
    return raw.replace("/", os.sep)

def resolve_db_path(connection_id: str | None, db_url: str | None, db_path: str | None) -> Path:
    # a) connection_id -> lookup in STORAGE
    if connection_id and os.path.exists(STORAGE):
        with open(STORAGE, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    if rec.get("id") == connection_id:
                        return Path(rec["cfg"]["database"])
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
    """Raise on missing file or connection failure."""
    if not Path(path).exists():
        raise FileNotFoundError(f"SQLite DB not found: {path}")
    try:
        con = sqlite3.connect(str(path), timeout=2)
        con.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;").fetchone()
        con.close()
    except Exception as e:
        raise RuntimeError(f"SQLite error: {e}")

def save_connection(cfg: dict) -> str:
    """Persist a minimal record and return a connection_id."""
    cid = str(uuid.uuid4())
    rec = {"id": cid, "cfg": cfg, "ts": time.time()}
    with open(STORAGE, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
    return cid


# ---- CLI only (safe to import in API) ----
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeuraReport DB resolver")
    parser.add_argument("--connection-id")
    parser.add_argument("--db-url")     # e.g. sqlite:///C:/Users/you/file.db
    parser.add_argument("--db-path")    # legacy: direct path
    args = parser.parse_args()

    DB_PATH = resolve_db_path(
        connection_id=_strip_quotes(args.connection_id) or _strip_quotes(os.getenv("CONNECTION_ID")),
        db_url=_strip_quotes(args.db_url) or _strip_quotes(os.getenv("DB_URL")),
        db_path=_strip_quotes(args.db_path) or _strip_quotes(os.getenv("DB_PATH")),
    )
    verify_sqlite(DB_PATH)
    print(f"Resolved DB path: {DB_PATH}")
