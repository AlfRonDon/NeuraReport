from __future__ import annotations

from fastapi import Depends, Header

from .config import get_settings
from .errors import AppError


async def require_api_key(x_api_key: str | None = Header(None), settings=Depends(get_settings)) -> None:
    """
    Lightweight API key gate. If NEURA_API_KEY is unset, the dependency is a no-op.
    """
    if not settings.api_key:
        return
    if x_api_key != settings.api_key:
        raise AppError(code="unauthorized", message="Invalid API key", status_code=401)

