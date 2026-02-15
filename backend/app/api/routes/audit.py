"""Intent Audit API Routes.

REST API endpoints for recording and updating user intent audit trails.
Used by the frontend UX governance system to track explicit user intents
and their outcomes for compliance and debugging.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field

from backend.app.services.security import require_api_key
from backend.app.services.state_access import state_store

logger = logging.getLogger("neura.api.audit")

router = APIRouter(tags=["audit"], dependencies=[Depends(require_api_key)])


# ============================================
# Schemas
# ============================================

class RecordIntentRequest(BaseModel):
    """Record a user intent."""

    id: str = Field(..., description="Unique intent identifier")
    type: str = Field(..., description="Intent type (e.g., 'create', 'delete', 'export')")
    label: Optional[str] = Field(None, description="Human-readable label")
    correlationId: Optional[str] = Field(None, description="Correlation ID for request tracing")
    sessionId: Optional[str] = Field(None, description="User session ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional intent metadata")


class UpdateIntentRequest(BaseModel):
    """Update an intent with outcome."""

    status: str = Field(..., description="Intent outcome status (e.g., 'completed', 'failed', 'cancelled')")
    result: Optional[Dict[str, Any]] = Field(None, description="Result data")


# ============================================
# State helpers
# ============================================

def _get_intents() -> Dict[str, Dict[str, Any]]:
    """Get all intents from state."""
    with state_store.transaction() as st:
        return dict(st.get("audit_intents", {}))


def _get_intent(intent_id: str) -> Optional[Dict[str, Any]]:
    """Get a single intent by ID."""
    with state_store.transaction() as st:
        return st.get("audit_intents", {}).get(intent_id)


def _put_intent(intent: Dict[str, Any]) -> None:
    """Persist an intent record."""
    with state_store.transaction() as st:
        st.setdefault("audit_intents", {})[intent["id"]] = intent


# ============================================
# Endpoints
# ============================================

@router.post("/intent")
async def record_intent(
    request: RecordIntentRequest,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """Record a user intent for audit trail.

    Accepts idempotency keys via headers to prevent duplicate recordings.
    """
    # Idempotency: if intent with this ID already exists, return it
    existing = _get_intent(request.id)
    if existing is not None:
        return {"status": "ok", "intent_id": request.id, "deduplicated": True}

    now = datetime.now(timezone.utc).isoformat()
    intent_record = {
        "id": request.id,
        "type": request.type,
        "label": request.label,
        "correlation_id": request.correlationId,
        "session_id": request.sessionId,
        "metadata": request.metadata,
        "status": "recorded",
        "idempotency_key": x_idempotency_key,
        "recorded_at": now,
        "updated_at": now,
    }

    _put_intent(intent_record)
    logger.info("Intent recorded", extra={"intent_id": request.id, "type": request.type})

    return {"status": "ok", "intent_id": request.id, "recorded_at": now}


@router.patch("/intent/{id}")
async def update_intent(
    id: str,
    request: UpdateIntentRequest,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """Update an intent with its outcome (completed, failed, cancelled)."""
    intent = _get_intent(id)
    if intent is None:
        raise HTTPException(status_code=404, detail="Intent not found")

    now = datetime.now(timezone.utc).isoformat()
    intent["status"] = request.status
    intent["result"] = request.result
    intent["updated_at"] = now

    _put_intent(intent)
    logger.info(
        "Intent updated",
        extra={"intent_id": id, "status": request.status},
    )

    return {"status": "ok", "intent_id": id, "updated_at": now}
