from __future__ import annotations

import hashlib
import re
import os
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, Optional

from ..prompts.llm_prompts import build_llm_call_4_prompt, PROMPT_VERSION_4
from ..templates.TemplateVerify import get_openai_client
from ..utils import (
    call_chat_completion,
    write_artifact_manifest,
    write_json_atomic,
    write_text_atomic,
)

logger = logging.getLogger("neura.contract.builder_v2")

_META_FILENAME = "contract_v2_meta.json"
_CONTRACT_FILENAME = "contract.json"
_OVERVIEW_FILENAME = "overview.md"
_STEP5_REQ_FILENAME = "step5_requirements.json"


class ContractBuilderError(RuntimeError):
    """Raised when contract construction fails."""


def _ensure_schema(schema: Mapping[str, Any] | None) -> dict[str, list[str]]:
    payload = dict(schema or {})
    payload.setdefault("scalars", [])
    payload.setdefault("row_tokens", [])
    payload.setdefault("totals", [])
    return {
        "scalars": [str(tok) for tok in payload.get("scalars", [])],
        "row_tokens": [str(tok) for tok in payload.get("row_tokens", [])],
        "totals": [str(tok) for tok in payload.get("totals", [])],
    }


def _normalize_key_tokens(values: Iterable[str] | None) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for raw in values:
        text = str(raw or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def _compute_input_signature(
    *,
    final_template_html: str,
    page_summary: str,
    schema: Mapping[str, Any],
    auto_mapping_proposal: Mapping[str, Any],
    mapping_override: Mapping[str, Any] | None,
    user_instructions: str,
    catalog: Iterable[str],
    dialect_hint: str | None,
    key_tokens: Iterable[str],
) -> str:
    normalized_payload = {
        "final_html_sha256": hashlib.sha256((final_template_html or "").encode("utf-8")).hexdigest(),
        "page_summary_sha256": hashlib.sha256((page_summary or "").encode("utf-8")).hexdigest(),
        "schema": schema,
        "auto_mapping_proposal": auto_mapping_proposal,
        "mapping_override": dict(mapping_override or {}),
        "user_instructions": user_instructions or "",
        "catalog": list(catalog),
        "dialect_hint": dialect_hint or "",
        "key_tokens": list(key_tokens),
    }
    payload_bytes = json.dumps(normalized_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload_bytes).hexdigest()


def _load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise
    except Exception as exc:  # pragma: no cover - treated as cache miss
        logger.warning(
            "contract_v2_json_load_failed",
            extra={"event": "contract_v2_json_load_failed", "path": str(path)},
            exc_info=exc,
        )
        raise


def _load_cached_payload(
    template_dir: Path,
) -> Optional[dict[str, Any]]:
    contract_path = template_dir / _CONTRACT_FILENAME
    overview_path = template_dir / _OVERVIEW_FILENAME
    step5_path = template_dir / _STEP5_REQ_FILENAME
    meta_path = template_dir / _META_FILENAME

    required_files = (overview_path, step5_path, meta_path)
    for required in required_files:
        if not required.exists():
            return None

    try:
        meta = _load_json(meta_path)
        step5 = _load_json(step5_path)
        overview = overview_path.read_text(encoding="utf-8")
        contract = None

        if contract_path.exists():
            try:
                contract = _load_json(contract_path)
            except Exception:
                contract = None

        if contract is None:
            contract = meta.get("contract_payload")
        elif isinstance(meta, dict):
            meta["contract_payload"] = contract
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    if contract is None:
        return None

    return {
        "meta": meta,
        "contract": contract,
        "overview_md": overview,
        "step5_requirements": step5,
        "artifacts": {
            "overview": overview_path,
            "step5_requirements": step5_path,
            "meta": meta_path,
            **({"contract": contract_path} if contract_path.exists() else {}),
        },
        "key_tokens": list(meta.get("key_tokens") or []),
    }


def _load_mapping_override_from_disk(template_dir: Path) -> dict[str, str]:
    path = template_dir / "mapping_pdf_labels.json"
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning(
            "contract_v2_mapping_override_load_failed",
            extra={
                "event": "contract_v2_mapping_override_load_failed",
                "path": str(path),
            },
            exc_info=True,
        )
        return {}
    if not isinstance(payload, list):
        return {}
    mapping: dict[str, str] = {}
    for entry in payload:
        if not isinstance(entry, dict):
            continue
        token = str(entry.get("header") or "").strip()
        value = str(entry.get("mapping") or "").strip()
        if token:
            mapping[token] = value
    return mapping


def _load_page_summary(template_dir: Path) -> str:
    summary_path = template_dir / "page_summary.txt"
    if summary_path.exists():
        try:
            return summary_path.read_text(encoding="utf-8")
        except Exception:
            logger.warning(
                "contract_v2_page_summary_read_failed",
                extra={"event": "contract_v2_page_summary_read_failed", "path": str(summary_path)},
                exc_info=True,
            )
    stage_path = template_dir / "stage_3_5.json"
    if stage_path.exists():
        try:
            stage_payload = _load_json(stage_path)
        except Exception:
            stage_payload = None
        if isinstance(stage_payload, Mapping):
            processed = stage_payload.get("processed")
            if isinstance(processed, Mapping):
                summary = processed.get("page_summary")
                if isinstance(summary, str) and summary.strip():
                    return summary
            raw_response = stage_payload.get("raw_response")
            if isinstance(raw_response, Mapping):
                summary = raw_response.get("page_summary")
                if isinstance(summary, str) and summary.strip():
                    return summary
    return ""


def _augment_contract_for_compat(contract: dict[str, Any]) -> dict[str, Any]:
    tokens = contract.get("tokens") or {}
    scalars = list(tokens.get("scalars") or [])
    row_tokens = list(tokens.get("row_tokens") or [])
    totals = list(tokens.get("totals") or [])

    contract.setdefault("header_tokens", scalars)
    contract.setdefault("row_tokens", row_tokens)

    if "totals" not in contract:
        mapping = contract.get("mapping") or {}
        contract["totals"] = {tok: str(mapping.get(tok, "")) for tok in totals}

    if "row_order" not in contract:
        rows_order = []
        order_by = contract.get("order_by") or {}
        rows_spec = order_by.get("rows")
        if isinstance(rows_spec, list) and rows_spec:
            rows_order = [str(item) for item in rows_spec]
        contract["row_order"] = rows_order or ["ROWID"]

    contract.setdefault("literals", contract.get("literals", {}))
    return contract


def _prepare_messages(system_text: str, payload_messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    messages = [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": system_text,
                }
            ],
        }
    ]
    messages.extend(payload_messages)
    return messages


def _normalize_contract_payload(contract: Mapping[str, Any] | None) -> dict[str, Any]:
    """
    Ensure the contract payload meets schema expectations before validation.
    """
    normalized: dict[str, Any] = json.loads(json.dumps(contract or {}, ensure_ascii=False))
    join = normalized.get("join")
    if isinstance(join, dict):
        for key in ("parent_table", "parent_key", "child_table", "child_key"):
            value = join.get(key)
            if value is None:
                join[key] = ""
            elif not isinstance(value, str):
                join[key] = str(value)
    return normalized


def _clean_sql_fragment(value: Any) -> str:
    text = str(value or "").strip()
    if _LEGACY_WRAPPER_RE.search(text):
        raise ContractBuilderError(
            "contract mapping contains legacy wrappers (DERIVED/TABLE_COLUMNS/COLUMN_EXP). "
            "Supply the executable SQL fragment directly."
        )
    return text


def _normalize_sql_mapping_sections(
    contract: dict[str, Any],
    *,
    allow_list: Iterable[str],
) -> None:
    allow_catalog = {str(item).strip() for item in allow_list if str(item).strip()}
    allowed_tables = {entry.split(".")[0] for entry in allow_catalog if "." in entry}

    def _validate_expr(token: str, expr: str) -> str:
        cleaned = _clean_sql_fragment(expr)
        if not cleaned:
            raise ContractBuilderError(f"contract mapping for '{token}' is empty after normalization.")
        if _SUBQUERY_RE.search(cleaned):
            raise ContractBuilderError(f"contract mapping for '{token}' contains disallowed SQL (subqueries or statements).")
        referenced = {
            f"{match.group('table')}.{match.group('column')}"
            for match in _COLUMN_REF_RE.finditer(cleaned)
        }
        invalid = [
            ref
            for ref in referenced
            if ref not in allow_catalog and ref.split(".")[0] in allowed_tables
        ]
        if invalid:
            raise ContractBuilderError(
                f"contract mapping for '{token}' references columns outside catalog: {sorted(invalid)}"
            )
        return cleaned

    mapping_section = contract.get("mapping")
    if isinstance(mapping_section, dict):
        contract["mapping"] = {
            str(token): _validate_expr(str(token), expr)
            for token, expr in mapping_section.items()
        }

    for section in ("totals", "row_computed", "totals_math"):
        block = contract.get(section)
        if isinstance(block, dict):
            contract[section] = {
                str(token): _validate_expr(str(token), expr)
                for token, expr in block.items()
            }


def _serialize_contract(contract: dict[str, Any]) -> dict[str, Any]:
    """
    Return a deep-ish copy safe for persistence (ensures JSON serialisable values).
    """
    return json.loads(json.dumps(contract, ensure_ascii=False))


def build_or_load_contract_v2(
    template_dir: Path,
    catalog: Iterable[str],
    final_template_html: str,
    schema: Mapping[str, Any],
    auto_mapping_proposal: Mapping[str, Any],
    mapping_override: Mapping[str, Any] | None,
    user_instructions: str,
    dialect_hint: str | None,
    *,
    db_signature: str | None = None,
    key_tokens: Iterable[str] | None = None,
) -> dict[str, Any]:
    """
    Build (or return cached) contract artifacts using LLM Call 4.
    """
    template_dir = template_dir.resolve()
    template_dir.mkdir(parents=True, exist_ok=True)

    page_summary = _load_page_summary(template_dir)
    page_summary_sha = hashlib.sha256((page_summary or "").encode("utf-8")).hexdigest()
    schema_payload = _ensure_schema(schema)
    allow_list = [str(item) for item in catalog]
    mapping_override_payload = dict(mapping_override or {})
    if not mapping_override_payload:
        mapping_override_payload = _load_mapping_override_from_disk(template_dir)

    key_tokens_list = _normalize_key_tokens(key_tokens)

    input_signature = _compute_input_signature(
        final_template_html=final_template_html,
        page_summary=page_summary,
        schema=schema_payload,
        auto_mapping_proposal=auto_mapping_proposal,
        mapping_override=mapping_override_payload,
        user_instructions=user_instructions,
        catalog=allow_list,
        dialect_hint=dialect_hint,
        key_tokens=key_tokens_list,
    )

    cached = _load_cached_payload(template_dir)
    if cached:
        meta = cached.get("meta") or {}
        if (
            meta.get("input_signature") == input_signature
            and (db_signature is None or meta.get("db_signature") == db_signature)
        ):
            logger.info(
                "contract_v2_cache_hit",
                extra={
                    "event": "contract_v2_cache_hit",
                    "template_dir": str(template_dir),
                },
            )
            result = dict(cached)
            result["cached"] = True
            return result

    logger.info(
        "contract_v2_build_start",
        extra={
            "event": "contract_v2_build_start",
            "template_dir": str(template_dir),
        },
    )

    prompt_payload = build_llm_call_4_prompt(
        final_template_html=final_template_html,
        page_summary=page_summary,
        schema=schema_payload,
        auto_mapping_proposal=auto_mapping_proposal,
        mapping_override=mapping_override_payload,
        user_instructions=user_instructions,
        catalog=allow_list,
        dialect_hint=dialect_hint,
        key_tokens=key_tokens_list,
    )

    system_text = prompt_payload.get("system", "")
    base_messages = prompt_payload.get("messages") or []
    if not base_messages:
        raise ContractBuilderError("Prompt builder did not return a user message for LLM Call 4.")

    messages = _prepare_messages(system_text, base_messages)
    client = get_openai_client()

    model_name = os.getenv("OPENAI_MODEL", "gpt-5")

    try:
        raw_response = call_chat_completion(
            client,
            model=model_name,
            messages=messages,
            description="contract_build_v2",
        )
    except Exception as exc:  # pragma: no cover - network issues bubble up
        raise ContractBuilderError(f"LLM Call 4 request failed: {exc}") from exc

    content = (raw_response.choices[0].message.content or "").strip()
    try:
        llm_payload = json.loads(content)
    except json.JSONDecodeError as exc:
        snippet = content[:200]
        raise ContractBuilderError(f"LLM Call 4 response was not valid JSON (snippet: {snippet!r})") from exc

    overview_md = str(llm_payload.get("overview_md", ""))
    step5_requirements = llm_payload.get("step5_requirements") or {}
    contract = _normalize_contract_payload(llm_payload.get("contract"))
    assumptions = list(llm_payload.get("assumptions") or [])
    warnings = list(llm_payload.get("warnings") or [])
    validation = llm_payload.get("validation") or {}

    if not overview_md.strip():
        raise ContractBuilderError("overview_md must be a non-empty string.")

    validation.setdefault("unknown_columns", [])
    validation.setdefault("unknown_tokens", [])
    validation.setdefault(
        "token_coverage",
        {
            "scalars_mapped_pct": 0,
            "row_tokens_mapped_pct": 0,
            "totals_mapped_pct": 0,
        },
    )

    contract = _augment_contract_for_compat(_serialize_contract(contract))
    _normalize_sql_mapping_sections(contract, allow_list=allow_list)

    now = int(time.time())
    overview_path = template_dir / _OVERVIEW_FILENAME
    step5_path = template_dir / _STEP5_REQ_FILENAME
    meta_path = template_dir / _META_FILENAME

    write_text_atomic(overview_path, overview_md, encoding="utf-8", step="contract_v2_overview_write")
    write_json_atomic(step5_path, step5_requirements, indent=2, ensure_ascii=False, step="contract_v2_step5_write")

    meta_payload = {
        "prompt_version": PROMPT_VERSION_4,
        "model": model_name,
        "input_signature": input_signature,
        "db_signature": db_signature,
        "page_summary_sha256": page_summary_sha,
        "generated_at": now,
        "assumptions": assumptions,
        "warnings": warnings,
        "validation": validation,
        "overview_path": _OVERVIEW_FILENAME,
        "step5_requirements_path": _STEP5_REQ_FILENAME,
        "contract_payload": contract,
        "key_tokens": key_tokens_list,
    }
    write_json_atomic(meta_path, meta_payload, indent=2, ensure_ascii=False, step="contract_v2_meta_write")

    write_artifact_manifest(
        template_dir,
        step="contract_build_v2",
        files={
            _OVERVIEW_FILENAME: overview_path,
            _STEP5_REQ_FILENAME: step5_path,
            _META_FILENAME: meta_path,
        },
        inputs=[
            f"contract_v2_input_signature={input_signature}",
            f"dialect_hint={dialect_hint or ''}",
        ],
        correlation_id=None,
    )

    logger.info(
        "contract_v2_build_complete",
        extra={
            "event": "contract_v2_build_complete",
            "template_dir": str(template_dir),
        },
    )

    return {
        "contract": contract,
        "overview_md": overview_md,
        "step5_requirements": step5_requirements,
        "assumptions": assumptions,
        "warnings": warnings,
        "validation": validation,
        "artifacts": {
            "overview": overview_path,
            "step5_requirements": step5_path,
            "meta": meta_path,
        },
        "meta": meta_payload,
        "cached": False,
        "key_tokens": key_tokens_list,
    }


def load_contract_v2(template_dir: Path) -> Optional[dict[str, Any]]:
    """
    Load persisted contract v2 artifacts without triggering a rebuild.
    Returns None if any required artifact is missing.
    """
    cached = _load_cached_payload(template_dir.resolve())
    if cached is None:
        return None
    cached["cached"] = True
    return cached
_COLUMN_REF_RE = re.compile(
    r"""
    ["`\[]?
    (?P<table>[A-Za-z_][\w]*)
    ["`\]]?
    \.
    ["`\[]?
    (?P<column>[A-Za-z_][\w]*)
    ["`\]]?
    """,
    re.VERBOSE,
)
_SUBQUERY_RE = re.compile(r"(?is)\bSELECT\b|;", re.IGNORECASE)
_LEGACY_WRAPPER_RE = re.compile(r"(?i)\b(DERIVED\s*:|TABLE_COLUMNS\s*\[|COLUMN_EXP\s*\[)")
