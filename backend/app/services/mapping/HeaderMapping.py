from __future__ import annotations

import json
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, Sequence

from ..templates.TemplateVerify import MODEL, get_openai_client

UNRESOLVED = "UNRESOLVED"


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
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name;"
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


# add near the imports
_HTML_STRIP_RE = re.compile(
    r"(?is)<!--.*?-->|<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>"
)

def _sanitize_html_for_llm(html_text: str) -> str:
    text = _HTML_STRIP_RE.sub("", html_text)
    # collapse long whitespace
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def llm_pick_with_chat_completions_full_html(
    full_html: str,
    catalog: Sequence[str],
    image_contents: Iterable[dict] | None = None,
) -> Dict[str, str]:
    """Ask the LLM to map headers in the full HTML (not a scoped batch block)."""
    catalog_list = list(catalog)
    html_for_llm = _sanitize_html_for_llm(full_html)

    prompt = (
        "Task:\n"
        "You are given the FULL HTML of a report template. Identify all visible header/label texts that correspond\n"
        "to data fields (table headers, field labels, totals, etc.). For repeating sections (e.g., tables, cards),\n"
        "infer the per-row/per-item labels from the structure.\n\n"
        "Goal:\n"
        "Map each discovered header/label to exactly one database column from the allow-list CATALOG.\n\n"
        "Rules:\n"
        "- Choose strictly from CATALOG (fully-qualified 'table.column').\n"
        "- If no clear column exists, set the value to UNRESOLVED.\n"
        "- Do not invent headers or duplicate mappings.\n"
        "- Prefer concise, human-visible labels (strip punctuation/colons).\n\n"
        "Inputs:\n"
        "[FULL_HTML]\n" + html_for_llm + "\n\n"
        "[CATALOG]\n" + json.dumps(catalog_list, ensure_ascii=False) + "\n\n"
        "Return strict JSON only in this shape:\n{\n  \"<header>\": \"<table.column or UNRESOLVED>\",\n  ...\n}\n"
    )

    user_content = [{"type": "text", "text": prompt}]
    if image_contents:
        user_content.extend(image_contents)

    client = get_openai_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": user_content}],
        # response_format={"type": "json_object"},  # enable only if MODEL supports it
    )
    raw_text = (response.choices[0].message.content or "").strip()

    try:
        mapping = json.loads(raw_text)
        if not isinstance(mapping, dict):
            raise ValueError("Expected a JSON object")
    except Exception:
        fallback = re.search(r"\{[\s\S]*\}", raw_text)
        if not fallback:
            raise RuntimeError("Could not parse JSON mapping from model output.")
        mapping = json.loads(fallback.group(0))
        if not isinstance(mapping, dict):
            raise RuntimeError("Parsed JSON is not an object.")

    return {str(k): str(v) for k, v in mapping.items()}


def approval_errors(mapping: Dict[str, str], unresolved_token: str = UNRESOLVED) -> list[dict[str, str]]:
    """Return issues that should block approval (unresolved or duplicate mappings)."""
    reverse = defaultdict(list)
    issues: list[dict[str, str]] = []

    for label, choice in mapping.items():
        if choice == unresolved_token:
            issues.append({"label": label, "issue": unresolved_token})
        else:
            reverse[choice].append(label)

    for colid, labels in reverse.items():
        if len(labels) > 1:
            issues.append({"label": "; ".join(labels), "issue": f"Duplicate mapping to {colid}"})

    return issues
