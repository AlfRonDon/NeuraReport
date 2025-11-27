from __future__ import annotations

import re
from typing import Iterable, Optional


def normalize_email_targets(raw: Optional[Iterable[str] | str]) -> list[str]:
    """Normalize comma/semicolon-delimited inputs, deduplicated and trimmed."""
    if raw is None:
        return []
    candidates = []
    if isinstance(raw, str):
        candidates = [piece for piece in re.split(r"[;,]", raw) if piece is not None]
    else:
        candidates = list(raw)

    normalized: list[str] = []
    seen: set[str] = set()
    for value in candidates:
        text = str(value or "").strip()
        if not text:
            continue
        lower = text.lower()
        if lower in seen:
            continue
        seen.add(lower)
        normalized.append(text)
    return normalized
