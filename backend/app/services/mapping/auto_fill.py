from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
from pathlib import Path
from typing import Optional

logger = logging.getLogger("neura.auto_fill")


def _compute_db_signature(db_path: Path) -> Optional[str]:
    """
    Build a stable fingerprint of the SQLite schema (user tables only).
    Captures table columns and foreign keys to detect schema drift.
    """
    schema: dict[str, dict[str, list[dict[str, object]]]] = {}
    con: Optional[sqlite3.Connection] = None
    try:
        con = sqlite3.connect(str(db_path))
    except Exception as exc:
        logger.warning(
            "db_signature_connect_failed",
            extra={
                "event": "db_signature_connect_failed",
                "db_path": str(db_path),
            },
            exc_info=exc,
        )
        return None

    try:
        cur = con.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master " "WHERE type='table' AND name NOT LIKE 'sqlite_%' " "ORDER BY name;"
        )
        tables = [row[0] for row in cur.fetchall()]

        for table in tables:
            table_entry: dict[str, list[dict[str, object]]] = {"columns": [], "foreign_keys": []}

            try:
                cur.execute(f"PRAGMA table_info('{table}')")
                columns = [
                    {
                        "name": str(col[1]),
                        "type": str(col[2] or ""),
                        "notnull": int(col[3] or 0),
                        "pk": int(col[5] or 0),
                    }
                    for col in cur.fetchall()
                ]
                table_entry["columns"] = columns
            except Exception:
                table_entry["columns"] = []

            try:
                cur.execute(f"PRAGMA foreign_key_list('{table}')")
                fks = [
                    {
                        "id": int(fk[0]),
                        "seq": int(fk[1]),
                        "table": str(fk[2] or ""),
                        "from": str(fk[3] or ""),
                        "to": str(fk[4] or ""),
                    }
                    for fk in cur.fetchall()
                ]
                table_entry["foreign_keys"] = fks
            except Exception:
                table_entry["foreign_keys"] = []

            schema[table] = table_entry
    except Exception as exc:
        logger.warning(
            "db_signature_pragmas_failed",
            extra={
                "event": "db_signature_pragmas_failed",
                "db_path": str(db_path),
            },
            exc_info=exc,
        )
        return None
    finally:
        if con is not None:
            try:
                con.close()
            except Exception:
                pass

    payload = json.dumps(schema, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
