from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Callable, Tuple


def get_col_type(db_path: Path, table: str, col: str) -> str:
    """
    Return the SQLite column type string (uppercased) for table.col or '' when unavailable.
    Matches the tolerant behaviour previously duplicated across report modules.
    """
    if not col:
        return ""
    try:
        with sqlite3.connect(str(db_path)) as con:
            cur = con.cursor()
            cur.execute(f"PRAGMA table_info('{table}')")
            for _, name, ctype, *_ in cur.fetchall():
                if str(name).lower() == str(col).lower():
                    return (ctype or "").upper()
    except Exception:
        return ""
    return ""


def mk_between_pred_for_date(col: str, col_type: str) -> Tuple[str, Callable[[str, str], tuple]]:
    """
    Returns (predicate_sql, adapter) used to build BETWEEN date filters.
    The adapter receives (start, end) and returns a tuple of parameters.
    When the column is missing or unusable, the predicate degenerates to '1=1'
    and the adapter returns an empty tuple – preserving the existing fail-open behaviour.
    """
    if not col or not col_type:
        return "1=1", lambda _s, _e: tuple()

    t = col_type.upper()
    if "INT" in t:
        predicate = (
            f"(CASE WHEN ABS({col}) > 32503680000 THEN {col}/1000 ELSE {col} END) "
            f"BETWEEN strftime('%s', ?) AND strftime('%s', ?)"
        )
        return predicate, lambda start, end: (start, end)

    predicate = f"datetime({col}) BETWEEN datetime(?) AND datetime(?)"
    return predicate, lambda start, end: (start, end)


__all__ = ["get_col_type", "mk_between_pred_for_date"]
