"""
Utility helpers shared across backend services.

This package currently provides:
    - Atomic filesystem helpers (`fs`).
    - LLM call helpers with retries/backoff (`llm`).
"""

# Re-export convenience functions for tidy imports.
from .fs import write_text_atomic, write_json_atomic  # noqa: F401
from .llm import call_chat_completion  # noqa: F401
from .prompts import load_prompt, available_prompts  # noqa: F401
from .lock import acquire_template_lock, TemplateLockError  # noqa: F401
from .artifacts import write_artifact_manifest, compute_checksums  # noqa: F401
from .html import sanitize_html  # noqa: F401
from .render import render_html_to_png  # noqa: F401
from .text import strip_code_fences  # noqa: F401
from .validation import (
    validate_contract_schema,
    validate_contract_v2,
    validate_mapping_schema,
    validate_mapping_inline_v4,
    validate_llm_call_3_5,
    validate_step5_requirements,
    validate_generator_sql_pack,
    validate_generator_output_schemas,
)  # noqa: F401
from .context import get_correlation_id, set_correlation_id  # noqa: F401
from .tokens import normalize_token_braces, extract_tokens  # noqa: F401

__all__ = [
    "write_text_atomic",
    "write_json_atomic",
    "call_chat_completion",
    "load_prompt",
    "available_prompts",
    "acquire_template_lock",
    "TemplateLockError",
    "write_artifact_manifest",
    "compute_checksums",
    "sanitize_html",
    "render_html_to_png",
    "strip_code_fences",
    "normalize_token_braces",
    "extract_tokens",
    "validate_contract_schema",
    "validate_contract_v2",
    "validate_mapping_schema",
    "validate_mapping_inline_v4",
    "validate_llm_call_3_5",
    "validate_step5_requirements",
    "validate_generator_sql_pack",
    "validate_generator_output_schemas",
    "get_correlation_id",
    "set_correlation_id",
]
