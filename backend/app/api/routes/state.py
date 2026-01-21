"""State Management API Routes.

This module contains endpoints for application state management:
- Bootstrap state for app initialization
- Last used connection/template tracking
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional

from backend.app.core.security import require_api_key
from backend.app.services.state import state_store as state_store_module
from src.services.template_service import bootstrap_state

router = APIRouter(dependencies=[Depends(require_api_key)])


class LastUsedPayload(BaseModel):
    connection_id: Optional[str] = None
    template_id: Optional[str] = None


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _state_store():
    return state_store_module.state_store


@router.get("/bootstrap")
def bootstrap_state_route(request: Request):
    """Get bootstrap state for app initialization.

    Returns connections, templates, last used selections, and other
    initialization data needed when the app starts.
    """
    return bootstrap_state(request)


@router.post("/last-used")
def set_last_used_route(payload: LastUsedPayload, request: Request):
    """Record the last-used connection and template IDs for session persistence."""
    last_used = _state_store().set_last_used(
        connection_id=payload.connection_id,
        template_id=payload.template_id,
    )
    return {
        "status": "ok",
        "last_used": last_used,
        "correlation_id": _correlation(request),
    }
