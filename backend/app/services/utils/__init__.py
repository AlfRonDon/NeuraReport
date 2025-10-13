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
from .validation import (
    validate_contract_schema,
    validate_mapping_schema,
)  # noqa: F401
from .context import get_correlation_id, set_correlation_id  # noqa: F401

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
    "validate_contract_schema",
    "validate_mapping_schema",
    "get_correlation_id",
    "set_correlation_id",
]
