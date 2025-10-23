﻿from __future__ import annotations

import base64
import copy
import hashlib
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Sequence

from ..templates.TemplateVerify import MODEL, get_openai_client
from ..prompts import llm_prompts
from ..utils import call_chat_completion, extract_tokens, strip_code_fences, validate_mapping_inline_v4
from ..utils.validation import normalize_mapping_inline_payload
from .HeaderMapping import REPORT_SELECTED_VALUE

logger = logging.getLogger("neura.mapping.inline")

ALLOWED_SPECIAL_VALUES = {"UNRESOLVED", "INPUT_SAMPLE", REPORT_SELECTED_VALUE}
LEGACY_WRAPPER_RE = re.compile(r"(?i)\b(DERIVED\s*:|TABLE_COLUMNS\s*\[|COLUMN_EXP\s*\[|PARAM\s*:)")
PARAM_REF_RE = re.compile(r"^params\.[A-Za-z_][\w]*$")
_TOKEN_DATE_RE = re.compile(r"(date|time|month|year)", re.IGNORECASE)
_REPORT_DATE_PREFIXES = {
    "from",
    "to",
    "start",
    "end",
    "begin",
    "finish",
    "through",
    "thru",
}
_REPORT_DATE_KEYWORDS = {
    "date",
    "dt",
    "day",
    "period",
    "range",
    "time",
    "timestamp",
    "window",
    "month",
    "year",
}
_REPORT_SELECTED_EXACT = {
    "page_info",
    "page_number",
    "page_no",
    "page_num",
    "page_count",
    "page_total",
    "page_total_count",
}
_REPORT_SELECTED_KEYWORDS = {
    "page",
    "sheet",
}
_REPORT_SELECTED_SUFFIXES = {
    "info",
    "number",
    "no",
    "num",
    "count",
    "label",
    "total",
}
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
_SQL_EXPR_HINT_RE = re.compile(
    r"""
    [()+\-*/%]|
    ::|
    \b(
        SUM|AVG|COUNT|MIN|MAX|
        CASE|COALESCE|NULLIF|
        ROW_NUMBER|DENSE_RANK|RANK|NTILE|OVER|
        LEAD|LAG|
        ABS|ROUND|TRIM|UPPER|LOWER|SUBSTR|CAST|
        DATE|DATETIME|IFNULL|IIF|
        CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|
        LOCALTIME|LOCALTIMESTAMP|NOW|GETDATE|SYSDATE|STRFTIME
    )\b
    """,
    re.IGNORECASE | re.VERBOSE,
)

def _normalized_token_parts(token: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(token or "").lower())
    return [part for part in normalized.split("_") if part]


def _is_report_generator_date_token(token: str) -> bool:
    parts = _normalized_token_parts(token)
    if not parts:
        return False
    lowered_token = (token or "").lower()
    if lowered_token in _REPORT_SELECTED_EXACT:
        return True
    if any(part in _REPORT_SELECTED_KEYWORDS for part in parts) and any(
        part in _REPORT_SELECTED_SUFFIXES for part in parts
    ):
        return True

    has_prefix = any(part in _REPORT_DATE_PREFIXES for part in parts)
    has_keyword = any(part in _REPORT_DATE_KEYWORDS for part in parts)
    if has_prefix and has_keyword:
        return True

    # allow tokens like date_from or period_to
    if parts[0] in _REPORT_DATE_KEYWORDS and any(part in _REPORT_DATE_PREFIXES for part in parts[1:]):
        return True
    if parts[-1] in _REPORT_DATE_KEYWORDS and any(part in _REPORT_DATE_PREFIXES for part in parts[:-1]):
        return True

    return False


def _normalize_report_date_mapping(mapping: dict[str, str]) -> None:
    """Coerce report date tokens to INPUT_SAMPLE so the UI can treat them as report filters."""
    for key, value in list(mapping.items()):
        if not _is_report_generator_date_token(key):
            continue
        normalized_value = (value or "").strip()
        if not normalized_value:
            continue
        lowered = normalized_value.lower()
        if PARAM_REF_RE.match(normalized_value) or lowered.startswith("to be selected"):
            mapping[key] = REPORT_SELECTED_VALUE


class MappingInlineValidationError(RuntimeError):
    """Raised when the LLM output fails validation."""


@dataclass
class MappingInlineResult:
    html_constants_applied: str
    mapping: dict[str, str]
    constant_replacements: dict[str, str]
    token_samples: dict[str, str]
    meta: dict[str, Any]
    prompt_meta: dict[str, Any]
    raw_payload: dict[str, Any]


def _read_png_as_data_uri(png_path: Path) -> str | None:
    if not png_path.exists():
        return None
    try:
        data = base64.b64encode(png_path.read_bytes()).decode("utf-8")
    except Exception:
        logger.exception("mapping_inline_png_read_failed", extra={"path": str(png_path)})
        return None
    return f"data:image/png;base64,{data}"


def _mapping_allowlist_errors(mapping: dict[str, str], catalog: Iterable[str]) -> list[str]:
    allowed_catalog = {val.strip() for val in catalog if val}
    allowed = set(allowed_catalog)
    allowed.update(ALLOWED_SPECIAL_VALUES)
    errors: list[str] = []
    for key, value in mapping.items():
        normalized = (value or "").strip()
        if not normalized:
            errors.append(f"{key!r} -> {value!r}")
            continue
        if LEGACY_WRAPPER_RE.search(normalized):
            errors.append(f"{key!r} -> uses legacy wrapper (DERIVED/TABLE_COLUMNS/COLUMN_EXP)")
            continue
        if normalized in allowed:
            continue
        if PARAM_REF_RE.match(normalized):
            continue
        referenced: list[str] = [
            f"{match.group('table')}.{match.group('column')}"
            for match in _COLUMN_REF_RE.finditer(normalized)
        ]
        if not referenced and not _SQL_EXPR_HINT_RE.search(normalized):
            errors.append(
                f"{key!r} -> value is not a catalog column, params reference, or recognizable SQL expression"
            )
            continue
        invalid = [col for col in referenced if col not in allowed_catalog]
        if invalid:
            errors.append(f"{key!r} -> references columns outside catalog: {sorted(invalid)}")
    return errors


def _validate_constant_replacements(
    template_html: str,
    replacements: Mapping[str, Any],
    schema: dict[str, Any] | None,
) -> set[str]:
    if replacements is None:
        return set()
    if not isinstance(replacements, Mapping):
        raise MappingInlineValidationError("constant_replacements must be an object")

    available_tokens = set(extract_tokens(template_html))
    if not available_tokens and replacements:
        raise MappingInlineValidationError("Template does not contain any placeholders to replace")

    schema_tokens: set[str] = set()
    if isinstance(schema, dict):
        for key in ("row_tokens", "totals"):
            values = schema.get(key)
            if isinstance(values, list):
                schema_tokens.update(str(v).strip() for v in values if v)

    seen: set[str] = set()
    inline_tokens: set[str] = set()
    for raw_token, raw_value in replacements.items():
        token = str(raw_token or "").strip()
        if not token:
            raise MappingInlineValidationError("constant_replacements keys must be non-empty strings")
        if token in seen:
            raise MappingInlineValidationError(f"Duplicate constant token recorded: {token}")
        seen.add(token)

        if token not in available_tokens:
            raise MappingInlineValidationError(f"Token '{token}' not present in template HTML")
        if token in schema_tokens:
            raise MappingInlineValidationError(f"Token '{token}' is defined as dynamic in the schema")
        if _TOKEN_DATE_RE.search(token):
            raise MappingInlineValidationError(f"Date-like token '{token}' cannot be treated as a constant")

        if raw_value is None:
            raise MappingInlineValidationError(f"constant_replacements['{token}'] cannot be null")

        inline_tokens.add(token)

    return inline_tokens


def _replace_token(html: str, token: str, value: str) -> str:
    patterns = [
        re.compile(rf"\{{\{{\s*{re.escape(token)}\s*\}}\}}"),
        re.compile(rf"\{{\s*{re.escape(token)}\s*\}}"),
    ]
    for pattern in patterns:
        html = pattern.sub(value, html)
    return html


def _apply_constant_replacements(html: str, replacements: Mapping[str, Any]) -> str:
    updated = html
    for token, raw_value in replacements.items():
        value = str(raw_value)
        updated = _replace_token(updated, str(token), value)
    return updated


def _normalize_token_samples(
    token_samples_raw: Mapping[str, Any] | None, expected_tokens: set[str]
) -> dict[str, str]:
    if not isinstance(token_samples_raw, Mapping):
        raise MappingInlineValidationError("token_samples must be an object with token -> literal value")

    normalized: dict[str, str] = {}
    for raw_key, raw_value in token_samples_raw.items():
        token = str(raw_key or "").strip()
        if not token:
            raise MappingInlineValidationError("token_samples keys must be non-empty token names")
        if token in normalized:
            raise MappingInlineValidationError(f"Duplicate token_samples entry for '{token}'")

        if raw_value is None:
            value = ""
        else:
            value = str(raw_value)
        if not value.strip():
            raise MappingInlineValidationError(
                f"token_samples['{token}'] must be a non-empty literal string (use NOT_VISIBLE/UNREADABLE when necessary)"
            )

        normalized[token] = value

    missing = sorted(expected_tokens - set(normalized))
    if missing:
        raise MappingInlineValidationError(f"token_samples missing entries for tokens: {missing}")

    extras = sorted(set(normalized) - expected_tokens)
    if extras:
        raise MappingInlineValidationError(f"token_samples contains unknown tokens: {extras}")

    return normalized


def _ensure_dict(value: Any, label: str) -> dict:
    if not isinstance(value, dict):
        raise MappingInlineValidationError(f"{label} must be an object")
    return value


def _build_messages(
    system_text: str,
    user_text: str,
    attachments: Sequence[dict[str, Any]],
    png_data_uri: str | None,
    validation_feedback: str | None,
) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    if system_text:
        messages.append({"role": "system", "content": [{"type": "text", "text": system_text}]})

    user_content: list[dict[str, Any]] = [{"type": "text", "text": user_text}]
    user_content.extend(attachments or [])
    if png_data_uri:
        user_content.append({"type": "image_url", "image_url": {"url": png_data_uri}})
    if validation_feedback:
        user_content.append(
            {
                "type": "text",
                "text": (
                    "VALIDATION_FEEDBACK:\n"
                    f"{validation_feedback}\n"
                    "Please correct the issues above and resend a compliant JSON response."
                ),
            }
        )
    messages.append({"role": "user", "content": user_content})
    return messages


def catalog_sha256(catalog: Sequence[str]) -> str:
    normalized = sorted({str(item).strip() for item in catalog if item})
    serialized = "\n".join(normalized).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest()


def schema_sha256(schema: dict[str, Any] | None) -> str:
    if schema is None:
        return hashlib.sha256(b"null").hexdigest()
    payload = json.dumps(schema, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def prompt_sha256(system_text: str, user_text: str) -> str:
    combined = f"{system_text.strip()}\n---\n{user_text.strip()}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


def run_llm_call_3(
    template_html: str,
    catalog: Sequence[str],
    schema: dict[str, Any] | None,
    prompt_version: str,
    png_path: str,
    cache_key: str,
) -> MappingInlineResult:
    prompt_payload = llm_prompts.build_llm_call_3_prompt(template_html, catalog, schema)
    system_text = prompt_payload.get("system", "")
    user_text = prompt_payload.get("user", "")
    attachments = prompt_payload.get("attachments", [])

    prompt_hash = prompt_sha256(system_text, user_text)
    catalog_hash = catalog_sha256(catalog)
    schema_hash = schema_sha256(schema)
    pre_html_hash = hashlib.sha256((template_html or "").encode("utf-8")).hexdigest()

    png_uri = _read_png_as_data_uri(Path(png_path)) if png_path else None

    client = get_openai_client()
    validation_feedback: str | None = None
    last_error: Exception | None = None

    for attempt in (1, 2):
        messages = _build_messages(system_text, user_text, attachments, png_uri, validation_feedback)
        try:
            logger.info(
                "mapping_inline_call_start",
                extra={
                    "event": "mapping_inline_call_start",
                    "attempt": attempt,
                    "prompt_version": prompt_version,
                    "prompt_sha256": prompt_hash,
                    "catalog_sha256": catalog_hash,
                    "schema_sha256": schema_hash,
                    "cache_key": cache_key,
                },
            )
            response = call_chat_completion(
                client,
                model=MODEL,
                messages=messages,
                description=f"{prompt_version}",
            )
        except Exception as exc:
            logger.exception(
                "mapping_inline_call_failed",
                extra={
                    "event": "mapping_inline_call_failed",
                    "attempt": attempt,
                    "prompt_version": prompt_version,
                    "cache_key": cache_key,
                },
            )
            raise RuntimeError(f"LLM call failed for {prompt_version}") from exc

        raw_text = (response.choices[0].message.content or "").strip()
        parsed_text = strip_code_fences(raw_text)
        try:
            payload = json.loads(parsed_text)
        except Exception as exc:
            last_error = MappingInlineValidationError(f"Invalid JSON response: {exc}")
            logger.warning(
                "mapping_inline_json_parse_failed",
                extra={
                    "event": "mapping_inline_json_parse_failed",
                    "attempt": attempt,
                    "prompt_version": prompt_version,
                    "cache_key": cache_key,
                },
            )
            validation_feedback = str(last_error)
            continue

        payload = normalize_mapping_inline_payload(payload)
        raw_payload = copy.deepcopy(payload)

        try:
            validate_mapping_inline_v4(payload)
            mapping_raw = _ensure_dict(payload.get("mapping"), "mapping")
            mapping = {str(k): str(v) for k, v in mapping_raw.items()}
            _normalize_report_date_mapping(mapping)

            allowlist_errors = _mapping_allowlist_errors(mapping, catalog)
            if allowlist_errors:
                raise MappingInlineValidationError(
                    "Mapping values outside allow-list: " + ", ".join(allowlist_errors)
                )

            original_tokens = set(extract_tokens(template_html))

            token_samples = _normalize_token_samples(payload.get("token_samples"), original_tokens)
            constant_tokens = original_tokens - set(mapping.keys())
            constant_entries = {token: token_samples[token] for token in constant_tokens}
            inline_token_set = _validate_constant_replacements(template_html, constant_entries, schema)

            missing_tokens = [token for token in list(mapping.keys()) if token not in original_tokens]
            if missing_tokens:
                logger.warning(
                    "mapping_inline_missing_tokens",
                    extra={
                        "event": "mapping_inline_missing_tokens",
                        "attempt": attempt,
                        "tokens": sorted(missing_tokens),
                        "prompt_version": prompt_version,
                        "cache_key": cache_key,
                    },
                )
                for token in missing_tokens:
                    mapping.pop(token, None)

            overlap = inline_token_set.intersection(set(mapping.keys()))
            if overlap:
                raise MappingInlineValidationError(
                    f"Constant tokens still present in mapping: {sorted(overlap)}"
                )

            html_constants_applied = _apply_constant_replacements(template_html, constant_entries)

            updated_tokens = set(extract_tokens(html_constants_applied))
            added_tokens = updated_tokens - original_tokens
            if added_tokens:
                raise MappingInlineValidationError(f"New tokens introduced: {sorted(added_tokens)}")
            removed_tokens = original_tokens - updated_tokens
            if removed_tokens != inline_token_set:
                raise MappingInlineValidationError(
                    f"Token removal mismatch. Expected removal {sorted(inline_token_set)}, "
                    f"observed {sorted(removed_tokens)}"
                )

            meta = _ensure_dict(payload.get("meta"), "meta")
            if missing_tokens:
                dropped_tokens = meta.get("dropped_tokens")
                if isinstance(dropped_tokens, list):
                    dropped_tokens.extend(sorted(missing_tokens))
                else:
                    meta["dropped_tokens"] = sorted(missing_tokens)

            unresolved = meta.get("unresolved")
            if isinstance(unresolved, list):
                meta["unresolved"] = [tok for tok in unresolved if tok in updated_tokens]

            ambiguous = meta.get("ambiguous")
            if isinstance(ambiguous, list):
                meta["ambiguous"] = [
                    entry
                    for entry in ambiguous
                    if isinstance(entry, dict) and entry.get("header") in mapping
                ]

            hints = meta.get("hints")
            if isinstance(hints, dict):
                meta["hints"] = {key: value for key, value in hints.items() if key in mapping}

            confidence = meta.get("confidence")
            if isinstance(confidence, dict):
                meta["confidence"] = {key: value for key, value in confidence.items() if key in mapping}

            replacements_clean = {str(k): str(v) for k, v in constant_entries.items()}
            raw_payload["token_samples"] = token_samples
            raw_payload["constant_replacements"] = replacements_clean
            post_html_hash = hashlib.sha256(html_constants_applied.encode("utf-8")).hexdigest()

            logger.info(
                "mapping_inline_call_success",
                extra={
                    "event": "mapping_inline_call_success",
                    "attempt": attempt,
                    "prompt_version": prompt_version,
                    "prompt_sha256": prompt_hash,
                    "pre_html_sha256": pre_html_hash,
                    "post_html_sha256": post_html_hash,
                    "cache_key": cache_key,
                },
            )

            return MappingInlineResult(
                html_constants_applied=html_constants_applied,
                mapping=mapping,
                constant_replacements=replacements_clean,
                token_samples=token_samples,
                meta=meta,
                prompt_meta={
                    "version": prompt_version,
                    "prompt_sha256": prompt_hash,
                    "catalog_sha256": catalog_hash,
                    "schema_sha256": schema_hash,
                    "cache_key": cache_key,
                    "pre_html_sha256": pre_html_hash,
                    "post_html_sha256": post_html_hash,
                },
                raw_payload=raw_payload,
            )
        except MappingInlineValidationError as exc:
            last_error = exc
            logger.warning(
                "mapping_inline_validation_failed",
                extra={
                    "event": "mapping_inline_validation_failed",
                    "attempt": attempt,
                    "error": str(exc),
                    "prompt_version": prompt_version,
                    "cache_key": cache_key,
                },
            )
            validation_feedback = str(exc)
            continue

    assert last_error is not None
    logger.error(
        "mapping_inline_failed",
        extra={
            "event": "mapping_inline_failed",
            "prompt_version": prompt_version,
            "cache_key": cache_key,
        },
    )
    raise MappingInlineValidationError(str(last_error)) from last_error


__all__ = [
    "MappingInlineResult",
    "run_llm_call_3",
    "catalog_sha256",
    "schema_sha256",
    "prompt_sha256",
    "MappingInlineValidationError",
]
