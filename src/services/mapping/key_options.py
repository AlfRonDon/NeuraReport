from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import Request

from backend.app.services.connections.db_connection import verify_sqlite
from backend.app.services.dataframes import sqlite_shim as sqlite3
from backend.app.services.mapping.HeaderMapping import approval_errors
from backend.app.services.state import state_store
from src.utils.connection_utils import db_path_from_payload_or_default
from src.utils.mapping_utils import load_mapping_keys
from src.utils.template_utils import template_dir
from src.services.mapping.helpers import (
    build_mapping_lookup,
    execute_token_query,
    extract_contract_metadata,
    http_error,
    normalize_tokens_request,
    resolve_token_binding,
    write_debug_log,
)

logger = logging.getLogger(__name__)


def mapping_key_options(
    template_id: str,
    request: Request,
    connection_id: str | None = None,
    tokens: str | None = None,
    limit: int = 50,
    start_date: str | None = None,
    end_date: str | None = None,
    *,
    kind: str = "pdf",
    debug: bool = False,
):
    correlation_id = getattr(request.state, "correlation_id", None)
    logger.info(
        "mapping_key_options_start",
        extra={
            "event": "mapping_key_options_start",
            "template_id": template_id,
            "connection_id": connection_id,
            "tokens": tokens,
            "limit": limit,
            "start_date": start_date,
            "end_date": end_date,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )

    def _resolve_connection_id(explicit_id: str | None) -> str | None:
        if explicit_id:
            explicit_id = str(explicit_id).strip()
            if explicit_id:
                return explicit_id
        try:
            record = state_store.get_template_record(template_id) or {}
        except Exception:
            record = {}
        last_conn = record.get("last_connection_id")
        if last_conn:
            return str(last_conn)
        last_used = state_store.get_last_used() or {}
        fallback_conn = last_used.get("connection_id")
        return str(fallback_conn) if fallback_conn else None

    effective_connection_id = _resolve_connection_id(connection_id)

    template_dir_path = template_dir(template_id, kind=kind)
    keys_available = load_mapping_keys(template_dir_path)
    if not keys_available:
        return {"keys": {}}

    token_list = normalize_tokens_request(tokens, keys_available)
    if not token_list:
        return {"keys": {}}

    try:
        limit_value = int(limit)
    except (TypeError, ValueError):
        limit_value = 50
    limit_value = max(1, min(limit_value, 500))

    mapping_path = template_dir_path / "mapping_pdf_labels.json"
    if not mapping_path.exists():
        raise http_error(404, "mapping_not_found", "Approved mapping not found for template.")
    try:
        mapping_doc = json.loads(mapping_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise http_error(500, "mapping_load_failed", f"Failed to read mapping file: {exc}")

    if not isinstance(mapping_doc, list):
        raise http_error(500, "mapping_invalid", "Approved mapping is not in the expected format.")
    mapping_lookup = build_mapping_lookup(mapping_doc)

    contract_filters_required: dict[str, str] = {}
    contract_filters_optional: dict[str, str] = {}
    contract_date_columns: dict[str, str] = {}
    contract_path = template_dir_path / "contract.json"
    if contract_path.exists():
        try:
            contract_data = json.loads(contract_path.read_text(encoding="utf-8"))
        except Exception:
            contract_data = {}
        (
            contract_filters_required,
            contract_filters_optional,
            contract_date_columns,
        ) = extract_contract_metadata(contract_data)

    db_path = db_path_from_payload_or_default(effective_connection_id)
    verify_sqlite(db_path)

    options: dict[str, list[str]] = {}
    debug_payload: dict[str, Any] = {
        "template_id": template_id,
        "connection_id": effective_connection_id,
        "db_path": str(db_path),
        "tokens_available": keys_available,
        "token_details": {},
    }

    with sqlite3.connect(str(db_path)) as con:
        con.row_factory = sqlite3.Row
        for token in token_list:
            table_clean, column_clean, binding_source = resolve_token_binding(
                token,
                mapping_lookup,
                contract_filters_required,
                contract_filters_optional,
            )
            if not table_clean or not column_clean:
                options[token] = []
                continue
            date_column_name = contract_date_columns.get(table_clean.lower())
            rows, token_debug = execute_token_query(
                con,
                token=token,
                table_clean=table_clean,
                column_clean=column_clean,
                date_column_name=date_column_name,
                start_date=start_date,
                end_date=end_date,
                limit_value=limit_value,
            )
            if binding_source:
                token_debug["binding_source"] = binding_source
            options[token] = rows
            if token_debug.get("error"):
                logger.warning(
                    "mapping_key_query_failed",
                    extra={
                        "event": "mapping_key_query_failed",
                        "template_id": template_id,
                        "token": token,
                        "table": table_clean,
                        "column": column_clean,
                        "db_path": str(db_path),
                        "error": token_debug["error"],
                        "correlation_id": correlation_id,
                    },
                )
            debug_payload["token_details"][token] = token_debug

    logger.info(
        "mapping_key_options_complete",
        extra={
            "event": "mapping_key_options_complete",
            "template_id": template_id,
            "tokens": token_list,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    response: dict[str, Any] = {"keys": options}
    write_debug_log(template_id, kind=kind, event="mapping_key_options", payload=debug_payload)
    if debug:
        response["debug"] = debug_payload
    return response
