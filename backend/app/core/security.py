from __future__ import annotations

import hmac
import secrets

from fastapi import Depends, Header

from .config import get_settings
from .errors import AppError


def constant_time_compare(a: str | None, b: str | None) -> bool:
    """
    Compare two strings in constant time to prevent timing attacks.
    Returns True if both strings are non-None and equal.
    """
    if a is None or b is None:
        return False
    # Use hmac.compare_digest for constant-time comparison
    # Encode to bytes for the comparison
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


async def require_api_key(x_api_key: str | None = Header(None), settings=Depends(get_settings)) -> None:
    """
    Lightweight API key gate. If NEURA_API_KEY is unset, the dependency is a no-op.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not settings.api_key:
        return
    if not constant_time_compare(x_api_key, settings.api_key):
        raise AppError(code="unauthorized", message="Invalid API key", status_code=401)

