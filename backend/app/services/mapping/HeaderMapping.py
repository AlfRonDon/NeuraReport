# mypy: ignore-errors
from __future__ import annotations

import logging
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable

logger = logging.getLogger("neura.mapping")

UNRESOLVED = "UNRESOLVED"
INPUT_SAMPLE = "INPUT_SAMPLE"
REPORT_SELECTED_VALUE = "LATER_SELECTED"
REPORT_SELECTED_DISPLAY = "To Be Selected in report generator"
UNRESOLVED_CHOICES = {UNRESOLVED, INPUT_SAMPLE, REPORT_SELECTED_VALUE}


def get_parent_child_info(db_path: Path) -> Dict[str, object]:
    """Inspect the SQLite database and infer suitable parent/child tables.

    Behavior:
      - If there is exactly ONE user table, treat it as BOTH parent and child (single-table report).
      - Else, prefer ('batches', 'batch_lines') if present.
      - Else, pick the first table that declares a foreign key as child and its referenced table as parent.
      - If none of the above applies, raise a clear error.
    """
    with sqlite3.connect(str(db_path)) as con:
        cur = con.cursor()

        cur.execute(
            "SELECT name FROM sqlite_master " "WHERE type='table' AND name NOT LIKE 'sqlite_%' " "ORDER BY name;"
        )
        tables = [r[0] for r in cur.fetchall()]

        if not tables:
            raise RuntimeError("No user tables found in database.")

        # --- NEW: single-table fallback ---
        if len(tables) == 1:
            t = tables[0]
            # fetch columns once
            cur.execute(f"PRAGMA table_info('{t}')")
            cols = [row[1] for row in cur.fetchall()]
            return {
                "child table": t,
                "parent table": t,
                "child_columns": cols,
                "parent_columns": cols,
                "common_names": sorted(set(cols)),  # same table on both sides
            }

        # collect columns for all tables
        cols: Dict[str, list[str]] = {}
        for table in tables:
            cur.execute(f"PRAGMA table_info('{table}')")
            cols[table] = [row[1] for row in cur.fetchall()]

        # preferred pair by name
        preferred_child, preferred_parent = "batch_lines", "batches"
        if preferred_child in tables and preferred_parent in tables:
            child, parent = preferred_child, preferred_parent
        else:
            # first-FK-wins fallback
            child = parent = None
            for table in tables:
                cur.execute(f"PRAGMA foreign_key_list('{table}')")
                rows = cur.fetchall()
                if rows:
                    child = table
                    parent = rows[0][2]  # referenced table name
                    break

    if not child or not parent:
        raise RuntimeError("Could not determine parent/child tables from schema.")

    child_cols = cols.get(child, [])
    parent_cols = cols.get(parent, [])
    common = sorted(set(child_cols).intersection(parent_cols))

    return {
        "child table": child,
        "parent table": parent,
        "child_columns": child_cols,
        "parent_columns": parent_cols,
        "common_names": common,
    }


def _choice_key(choice: str) -> str:
    return str(choice or "").strip()


def is_unresolved_choice(choice: str) -> bool:
    return _choice_key(choice) in UNRESOLVED_CHOICES


def approval_errors(
    mapping: Dict[str, str], unresolved_tokens: Iterable[str] = UNRESOLVED_CHOICES
) -> list[dict[str, str]]:
    """Return issues that should block approval (unresolved or duplicate mappings)."""
    unresolved_set = {_choice_key(tok) for tok in unresolved_tokens}
    reverse = defaultdict(list)
    issues: list[dict[str, str]] = []

    for label, choice in mapping.items():
        normalized = _choice_key(choice)
        if normalized in unresolved_set:
            issues.append({"label": label, "issue": normalized})
        else:
            reverse[normalized].append(label)

    for colid, labels in reverse.items():
        if len(labels) > 1:
            issues.append({"label": "; ".join(labels), "issue": f"Duplicate mapping to {colid}"})

    return issues
