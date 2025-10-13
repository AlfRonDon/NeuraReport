from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from typing import Dict, List

# Reuse your existing helpers exactly as requested
from ..mapping.HeaderMapping import get_parent_child_info  # (still used by callers elsewhere)

# Re-export the centralized contract builder from auto_fill.py
# so existing imports don't break: `from ...reports.discovery import build_or_load_contract`
try:
    from ..mapping.auto_fill import build_or_load_contract  # type: ignore
except Exception:
    try:
        from .auto_fill import build_or_load_contract  # type: ignore
    except Exception as exc:  # pragma: no cover
        # Surface a clear error when neither location is present
        def build_or_load_contract(*args, **kwargs):  # type: ignore
            raise RuntimeError(
                "build_or_load_contract unavailable. Ensure mapping.auto_fill.build_or_load_contract exists."
            ) from exc


# ======================================================================
# (2) DATE / TYPE HELPERS (used for BOTH parent_date and child_date)
# ======================================================================

def _get_col_type(db_path: Path, table: str, col: str) -> str:
    """
    Return the SQLite column type string (uppercased) for table.col
    or '' if not found.
    """
    if not col:
        return ""
    with sqlite3.connect(str(db_path)) as con:
        cur = con.cursor()
        try:
            cur.execute(f"PRAGMA table_info('{table}')")
        except Exception:
            return ""
        for _, name, ctype, *_ in cur.fetchall():
            if str(name).lower() == str(col).lower():
                return (ctype or "").upper()
    return ""


def _mk_between_pred_for_date(col: str, col_type: str) -> tuple[str, callable]:
    """
    Returns (sql_predicate, param_adapter) for a date/time column.
    - For INTEGER: treats big magnitudes as epoch millis -> normalize to seconds.
    - For TEXT/NUMERIC/empty: uses datetime(col) BETWEEN datetime(?).
    - For missing/invalid column: returns "1=1" and an adapter that takes (s,e) → ().
    """
    if not col or not col_type:
        # no usable date column — run unfiltered
        return "1=1", (lambda s, e: tuple())

    t = (col_type or "").upper()

    if "INT" in t:
        pred = (
            f"(CASE WHEN ABS({col}) > 32503680000 THEN {col}/1000 ELSE {col} END) "
            f"BETWEEN strftime('%s', ?) AND strftime('%s', ?)"
        )
        adapt = lambda s, e: (s, e)
        return pred, adapt

    # default: TEXT/NUMERIC/etc.
    pred = f"datetime({col}) BETWEEN datetime(?) AND datetime(?)"
    adapt = lambda s, e: (s, e)
    return pred, adapt


# ======================================================================
# (4) DISCOVERY — BATCH IDS + PARENT / CHILD COUNTS BETWEEN DATES
# ======================================================================

def _concat_key_expr(cols: List[str]) -> str:
    parts = [f"COALESCE(CAST({c} AS TEXT),'')" for c in cols]
    expr = parts[0]
    for p in parts[1:]:
        expr = f"{expr} || '|' || {p}"
    return expr


def discover_batches_and_counts(
    *,
    db_path: Path,
    contract: dict,
    start_date: str,
    end_date: str,
) -> dict:
    """
    Discover distinct batch IDs and count:
      - parent: number of parent rows (i.e., batches) per id in range
      - rows:   number of child rows per id in range
    Returns:
      {
        "batches": [{"id": "...", "parent": <int>, "rows": <int>}...],
        "batches_count": <int>,   # number of parent batches
        "rows_total": <int>       # sum of child rows
      }
    """
    JOIN = contract["join"]
    DATE_COLUMNS = contract["date_columns"]

    parent_table = JOIN["parent_table"]
    child_table  = JOIN["child_table"]
    parent_key   = JOIN["parent_key"]
    child_key    = JOIN["child_key"]

    parent_date  = DATE_COLUMNS.get(parent_table, "")
    child_date   = DATE_COLUMNS.get(child_table, "")

    def _split_keys(s: str) -> List[str]:
        return [c.strip() for c in str(s).split(",") if c and c.strip()]

    pcols = _split_keys(parent_key)
    ccols = _split_keys(child_key)

    # Type-aware BETWEEN predicates (gracefully handle missing/invalid date columns)
    parent_type = _get_col_type(db_path, parent_table, parent_date)
    child_type  = _get_col_type(db_path, child_table,  child_date)
    parent_pred, adapt_parent = _mk_between_pred_for_date(parent_date, parent_type)
    child_pred,  adapt_child  = _mk_between_pred_for_date(child_date,  child_type)
    parent_params = adapt_parent(start_date, end_date)  # () if predicate is 1=1
    child_params  = adapt_child(start_date, end_date)   # () if predicate is 1=1

    with sqlite3.connect(str(db_path)) as con:
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        # 1) Distinct parent ids in range (this is our batch list)
        if len(pcols) == 1:
            sql = f"SELECT DISTINCT {pcols[0]} AS bid FROM {parent_table} WHERE {parent_pred}"
            parent_ids = [r["bid"] for r in cur.execute(sql, parent_params)]
        else:
            sql = f"SELECT DISTINCT {_concat_key_expr(pcols)} AS bid FROM {parent_table} WHERE {parent_pred}"
            parent_ids = [r["bid"] for r in cur.execute(sql, parent_params)]

        # Fallback to child ids if parent had none
        if not parent_ids:
            if len(ccols) == 1:
                sql = f"SELECT DISTINCT {ccols[0]} AS bid FROM {child_table} WHERE {child_pred}"
                parent_ids = [r["bid"] for r in cur.execute(sql, child_params)]
            else:
                sql = f"SELECT DISTINCT {_concat_key_expr(ccols)} AS bid FROM {child_table} WHERE {child_pred}"
                parent_ids = [r["bid"] for r in cur.execute(sql, child_params)]

        # 2) Per-batch counts: parent (batches) + child (rows)
        batches: List[Dict[str, object]] = []
        rows_total = 0

        for bid in parent_ids:
            # parent count
            if len(pcols) == 1:
                sqlp = f"SELECT COUNT(*) AS n FROM {parent_table} WHERE {pcols[0]} = ? AND {parent_pred}"
                params_p = (bid,) + tuple(parent_params)
                parent_cnt = cur.execute(sqlp, params_p).fetchone()["n"]
            else:
                parts = bid.split("|")
                where = " AND ".join([f"{c} = ?" for c in pcols])
                sqlp = f"SELECT COUNT(*) AS n FROM {parent_table} WHERE {where} AND {parent_pred}"
                params_p = tuple(parts) + tuple(parent_params)
                parent_cnt = cur.execute(sqlp, params_p).fetchone()["n"]

            # child rows
            if len(ccols) == 1:
                sqlc = f"SELECT COUNT(*) AS n FROM {child_table} WHERE {ccols[0]} = ? AND {child_pred}"
                params_c = (bid,) + tuple(child_params)
                child_cnt = cur.execute(sqlc, params_c).fetchone()["n"]
            else:
                parts = bid.split("|")
                where = " AND ".join([f"{c} = ?" for c in ccols])
                sqlc = f"SELECT COUNT(*) AS n FROM {child_table} WHERE {where} AND {child_pred}"
                params_c = tuple(parts) + tuple(child_params)
                child_cnt = cur.execute(sqlc, params_c).fetchone()["n"]

            rows_total += int(child_cnt)
            batches.append({"id": bid, "parent": int(parent_cnt), "rows": int(child_cnt)})

    return {
        "batches": batches,
        "batches_count": len(batches),
        "rows_total": rows_total,
    }
