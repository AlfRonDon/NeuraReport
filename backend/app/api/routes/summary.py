"""API routes for Executive Summary Generation."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Request

from backend.app.core.security import require_api_key
from backend.app.domain.summary.service import SummaryService

router = APIRouter(dependencies=[Depends(require_api_key)])


class SummaryRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=50000)
    tone: str = Field(default="formal", pattern="^(formal|conversational|technical)$")
    max_sentences: int = Field(default=5, ge=2, le=15)
    focus_areas: Optional[List[str]] = Field(None, max_items=5)


def get_service() -> SummaryService:
    return SummaryService()


@router.post("/generate")
async def generate_summary(
    payload: SummaryRequest,
    request: Request,
    svc: SummaryService = Depends(get_service),
):
    """Generate an executive summary from content."""
    correlation_id = getattr(request.state, "correlation_id", None)
    summary = svc.generate_summary(
        content=payload.content,
        tone=payload.tone,
        max_sentences=payload.max_sentences,
        focus_areas=payload.focus_areas,
        correlation_id=correlation_id,
    )
    return {"status": "ok", "summary": summary, "correlation_id": correlation_id}


@router.get("/reports/{report_id}")
async def get_report_summary(
    report_id: str,
    request: Request,
    svc: SummaryService = Depends(get_service),
):
    """Generate summary for a specific report."""
    correlation_id = getattr(request.state, "correlation_id", None)
    summary = svc.generate_report_summary(report_id, correlation_id)
    return {"status": "ok", "summary": summary, "correlation_id": correlation_id}
