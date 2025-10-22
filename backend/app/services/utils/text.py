from __future__ import annotations

import re

_FENCE_PATTERN = re.compile(r"^\s*```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def strip_code_fences(text: str) -> str:
    """
    Remove surrounding markdown code fences (plaintext or ```json```),
    returning the inner payload trimmed. Mirrors the helper previously
    duplicated in mapping modules.
    """
    if not text:
        return ""
    match = _FENCE_PATTERN.search(text)
    if match:
        return match.group(1).strip()
    return text.strip()


__all__ = ["strip_code_fences"]
