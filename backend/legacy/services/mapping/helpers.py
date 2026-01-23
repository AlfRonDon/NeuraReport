from __future__ import annotations

import hashlib
import json
import logging
import re
import time
import uuid
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

from fastapi import HTTPException

from backend.app.services.dataframes.sqlite_loader import get_loader
from backend.app.services.mapping.HeaderMapping import REPORT_SELECTED_VALUE
from backend.app.services.mapping.auto_fill import _compute_db_signature as _compute_db_signature_impl
from backend.app.services.utils import write_json_atomic
from backend.legacy.utils.mapping_utils import load_mapping_keys, mapping_keys_path, normalize_key_tokens, write_mapping_keys
from backend.legacy.utils.template_utils import artifact_url, find_reference_pdf, find_reference_png, template_dir

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"^\s*\{\{?.+?\}?\}\s*$")
_PARAM_REF_RE = re.compile(r"^params\.[A-Za-z_][\w]*$")
_DIRECT_COLUMN_RE = re.compile(
    r'''
    ["`\[]?
    (?P<table>[A-Za-z_][\w]*)
    ["`\]]?
    \.
    ["`\[]?
    (?P<column>[A-Za-z_][\w]*)
    ["`\]]?
    ''',
    re.VERBOSE,
)
_REPORT_DATE_PREFIXES = {"from", "to", "start", "end", "begin", "finish", "through", "thru"}
_REPORT_DATE_KEYWORDS = {"date", "dt", "day", "period", "range", "time", "timestamp", "window", "month", "year"}


def http_error(status_code: int, code: str, message: str, details: str | None = None) -> HTTPException:
    payload: dict[str, Any] = {"status": "error", "code": code, "message": message}
    if details:
        payload["details"] = details
    return HTTPException(status_code=status_code, detail=payload)


def load_json_file(path: Path) -> Optional[dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def load_mapping_step3(template_dir_path: Path) -> tuple[Optional[dict[str, Any]], Path]:
    mapping_path = template_dir_path / "mapping_step3.json"
    return load_json_file(mapping_path), mapping_path


def sha256_path(path: Path | None) -> Optional[str]:
    if path is None or not path.exists():
        return None
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_schema_ext(template_dir_path: Path) -> Optional[dict[str, Any]]:
    schema_path = template_dir_path / "schema_ext.json"
    if not schema_path.exists():
        return None
    try:
        return json.loads(schema_path.read_text(encoding="utf-8"))
    except Exception:
        return None


def build_catalog_from_db(db_path: Path) -> list[str]:
    catalog: list[str] = []
    try:
        loader = get_loader(db_path)
        for table in loader.table_names():
            frame = loader.frame(table)
            for col in frame.columns:
                col_name = str(col or "").strip()
                if col_name:
                    catalog.append(f"{table}.{col_name}")
    except Exception as exc:
        logger.exception(
            "catalog_build_failed",
            extra={"event": "catalog_build_failed", "db_path": str(db_path)},
            exc_info=exc,
        )
        return []
    return catalog


def compute_db_signature(db_path: Path) -> Optional[str]:
    try:
        return _compute_db_signature_impl(db_path)
    except Exception:
        logger.exception("db_signature_failed", extra={"event": "db_signature_failed", "db_path": str(db_path)})
        return None


def normalize_artifact_map(artifacts: Mapping[str, Any] | None) -> dict[str, str]:
    normalized: dict[str, str] = {}
    if not artifacts:
        return normalized
    for name, raw in artifacts.items():
        url: Optional[str] = None
        if isinstance(raw, Path):
            url = artifact_url(raw)
        elif isinstance(raw, str):
            url = raw if raw.startswith("/") else artifact_url(Path(raw))
        else:
            continue
        if url:
            normalized[str(name)] = url
    return normalized


def token_parts_for_report_filters(token: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(token or "").lower())
    return [part for part in normalized.split("_") if part]


def is_report_generator_date_token_label(token: str) -> bool:
    parts = token_parts_for_report_filters(token)
    if not parts:
        return False
    has_prefix = any(part in _REPORT_DATE_PREFIXES for part in parts)
    has_keyword = any(part in _REPORT_DATE_KEYWORDS for part in parts)
    if has_prefix and has_keyword:
        return True
    if parts[0] in _REPORT_DATE_KEYWORDS and any(part in _REPORT_DATE_PREFIXES for part in parts[1:]):
        return True
    if parts[-1] in _REPORT_DATE_KEYWORDS and any(part in _REPORT_DATE_PREFIXES for part in parts[:-1]):
        return True
    return False


def norm_placeholder(name: str) -> str:
    if _TOKEN_RE.match(name):
        return name.strip()
    core = name.strip().strip("{} ")
    return "{" + core + "}"


def normalize_mapping_for_autofill(mapping: dict[str, str]) -> list[dict]:
    out: list[dict] = []
    for k, v in mapping.items():
        mapping_value = v
        if isinstance(mapping_value, str) and is_report_generator_date_token_label(k):
            normalized_value = mapping_value.strip()
            lowered = normalized_value.lower()
            if not normalized_value:
                mapping_value = ""
            elif _PARAM_REF_RE.match(normalized_value) or lowered.startswith("to be selected"):
                mapping_value = REPORT_SELECTED_VALUE
            elif lowered == "input_sample":
                mapping_value = "INPUT_SAMPLE"
        out.append({"header": k, "placeholder": norm_placeholder(k), "mapping": mapping_value})
    return out


def normalize_tokens_request(tokens: str | None, keys_available: list[str]) -> list[str]:
    if not tokens:
        return list(keys_available)
    requested = [token.strip() for token in str(tokens).split(",") if token.strip()]
    return [token for token in requested if token in keys_available]


def build_mapping_lookup(mapping_doc: list[dict[str, Any]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for entry in mapping_doc:
        if not isinstance(entry, dict):
            continue
        header = entry.get("header")
        mapping_value = entry.get("mapping")
        if isinstance(header, str) and isinstance(mapping_value, str):
            lookup[header] = mapping_value.strip()
    return lookup


def extract_contract_metadata(contract_data: dict[str, Any]) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    required: dict[str, str] = {}
    optional: dict[str, str] = {}
    date_columns: dict[str, str] = {}
    filters_section = contract_data.get("filters") or {}
    if isinstance(filters_section, dict):
        required_map = filters_section.get("required") or {}
        optional_map = filters_section.get("optional") or {}
        if isinstance(required_map, dict):
            for key, expr in required_map.items():
                if isinstance(key, str) and isinstance(expr, str):
                    required[key] = expr.strip()
        if isinstance(optional_map, dict):
            for key, expr in optional_map.items():
                if isinstance(key, str) and isinstance(expr, str):
                    optional[key] = expr.strip()
    date_columns_section = contract_data.get("date_columns") or {}
    if isinstance(date_columns_section, dict):
        for table_name, column_name in date_columns_section.items():
            if not isinstance(table_name, str) or not isinstance(column_name, str):
                continue
            table_clean = table_name.strip(' "`[]').lower()
            column_clean = column_name.strip(' "`[]')
            if table_clean and column_clean:
                date_columns[table_clean] = column_clean
    return required, optional, date_columns


def resolve_token_binding(
    token: str,
    mapping_lookup: Mapping[str, str],
    contract_filters_required: Mapping[str, str],
    contract_filters_optional: Mapping[str, str],
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    expr = mapping_lookup.get(token, "")
    match = _DIRECT_COLUMN_RE.match(expr)
    if match:
        table_raw = match.group("table")
        column_raw = match.group("column")
        table_clean = table_raw.strip(' "`[]') if isinstance(table_raw, str) else ""
        column_clean = column_raw.strip(' "`[]') if isinstance(column_raw, str) else ""
        if table_clean and column_clean:
            return table_clean, column_clean, "mapping"
    filter_expr = contract_filters_required.get(token) or contract_filters_optional.get(token)
    if isinstance(filter_expr, str):
        match_filter = _DIRECT_COLUMN_RE.match(filter_expr)
        if match_filter:
            table_raw = match_filter.group("table")
            column_raw = match_filter.group("column")
            table_clean = table_raw.strip(' "`[]') if isinstance(table_raw, str) else ""
            column_clean = column_raw.strip(' "`[]') if isinstance(column_raw, str) else ""
            if table_clean and column_clean:
                return table_clean, column_clean, "contract_filter"
    return None, None, None


def execute_token_query(
    con,
    *,
    token: str,
    table_clean: str,
    column_clean: str,
    date_column_name: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    limit_value: int,
) -> tuple[list[str], dict[str, Any]]:
    quoted_table = f'"{table_clean}"'
    quoted_column = f'"{column_clean}"'
    base_conditions = [f"{quoted_column} IS NOT NULL", f"TRIM(CAST({quoted_column} AS TEXT)) <> ''"]
    conditions = list(base_conditions)
    params: list[str] = []
    ident_re = re.compile(r"^[A-Za-z_][\w]*$")
    if date_column_name and ident_re.match(date_column_name):
        quoted_date_column = f'"{date_column_name}"'
        if start_date and end_date:
            conditions.append(f"{quoted_date_column} BETWEEN ? AND ?")
            params.extend([start_date, end_date])
        elif start_date:
            conditions.append(f"{quoted_date_column} >= ?")
            params.append(start_date)
        elif end_date:
            conditions.append(f"{quoted_date_column} <= ?")
            params.append(end_date)

    debug_info: dict[str, Any] = {
        "table": table_clean,
        "column": column_clean,
        "date_column": date_column_name,
        "applied_date_filters": len(params) > 0,
        "sql": None,
        "params": None,
        "fallback_used": False,
        "error": None,
        "row_count": 0,
    }

    def run_query(where_clause: str, query_params: list[str]) -> tuple[list[str], Optional[str]]:
        sql = (
            f"SELECT DISTINCT {quoted_column} AS value FROM {quoted_table} "
            f"WHERE {where_clause} ORDER BY {quoted_column} ASC LIMIT ?"
        )
        params_with_limit = tuple(list(query_params) + [limit_value])
        try:
            rows = [
                str(row["value"]) for row in con.execute(sql, params_with_limit) if row and row["value"] is not None
            ]
            return rows, None
        except Exception as exc:
            return [], str(exc)

    where_clause = " AND ".join(conditions) if conditions else "1=1"
    rows, error = run_query(where_clause, params)
    debug_info.update({"sql": where_clause, "params": params, "row_count": len(rows)})
    if error:
        debug_info["error"] = error
    if not rows and params:
        fallback_clause = " AND ".join(base_conditions)
        fallback_rows, fallback_error = run_query(fallback_clause, [])
        debug_info["fallback_used"] = True
        debug_info["fallback_sql"] = fallback_clause
        debug_info["fallback_error"] = fallback_error
        if fallback_rows:
            rows = fallback_rows
            debug_info["row_count"] = len(rows)
            debug_info["error"] = fallback_error
    return rows, debug_info


def write_debug_log(template_id: str, *, kind: str, event: str, payload: Mapping[str, Any]) -> None:
    try:
        tdir = template_dir(template_id, kind=kind, must_exist=False, create=True)
        debug_dir = tdir / "_debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = debug_dir / f"{event}-{timestamp}-{uuid.uuid4().hex[:6]}.json"
        write_json_atomic(
            filename,
            {
                "event": event,
                "timestamp": timestamp,
                "template_id": template_id,
                "template_kind": kind,
                **{k: v for k, v in payload.items()},
            },
            ensure_ascii=False,
            indent=2,
            step="debug_log",
        )
    except Exception:
        logger.exception(
            "debug_log_write_failed",
            extra={"event": "debug_log_write_failed", "template_id": template_id, "template_kind": kind},
        )


__all__ = [
    "http_error",
    "load_json_file",
    "load_mapping_step3",
    "sha256_path",
    "sha256_text",
    "load_schema_ext",
    "build_catalog_from_db",
    "compute_db_signature",
    "normalize_artifact_map",
    "normalize_mapping_for_autofill",
    "normalize_tokens_request",
    "build_mapping_lookup",
    "extract_contract_metadata",
    "resolve_token_binding",
    "execute_token_query",
    "write_debug_log",
    "load_mapping_keys",
    "mapping_keys_path",
    "normalize_key_tokens",
    "write_mapping_keys",
    "template_dir",
    "artifact_url",
    "find_reference_pdf",
    "find_reference_png",
]
