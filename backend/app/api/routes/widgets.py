"""
Widget Intelligence API Routes — widget catalog, selection, grid packing.

Endpoints:
    GET  /widgets/catalog           Full widget catalog (25 scenarios)
    POST /widgets/select            AI-powered widget selection
    POST /widgets/pack-grid         Pack widgets into CSS grid layout
    GET  /widgets/{scenario}/demo   Demo data for a scenario
    POST /widgets/{scenario}/validate  Validate data shape
    POST /widgets/{scenario}/format    Format raw data
    POST /widgets/feedback          Thompson Sampling reward signal
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.services.security import require_api_key

logger = logging.getLogger("neura.api.widgets")

router = APIRouter(tags=["widgets"], dependencies=[Depends(require_api_key)])

# Lazy-init service singleton
_svc = None


def _get_svc():
    global _svc
    if _svc is None:
        from backend.app.services.widget_intelligence.service import WidgetIntelligenceService
        _svc = WidgetIntelligenceService()
    return _svc


# ── Schemas ──────────────────────────────────────────────────────────────


class WidgetSelectRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    query_type: str = Field(default="overview")
    data_profile: Optional[dict[str, Any]] = None
    max_widgets: int = Field(default=10, ge=1, le=20)


class GridPackRequest(BaseModel):
    widgets: list[dict[str, Any]] = Field(...)


class ValidateRequest(BaseModel):
    data: dict[str, Any] = Field(...)


class FormatRequest(BaseModel):
    data: dict[str, Any] = Field(...)


class FeedbackRequest(BaseModel):
    scenario: str = Field(..., min_length=1)
    reward: float = Field(..., ge=-1.0, le=1.0)


# ── Endpoints ────────────────────────────────────────────────────────────


@router.get("/catalog")
async def get_widget_catalog():
    """Return the full widget catalog with all registered scenarios."""
    svc = _get_svc()
    catalog = svc.get_catalog()
    return {"widgets": catalog, "count": len(catalog)}


@router.post("/select")
async def select_widgets(req: WidgetSelectRequest):
    """AI-powered widget selection for a dashboard query."""
    svc = _get_svc()
    widgets = svc.select_widgets(
        query=req.query,
        query_type=req.query_type,
        data_profile=req.data_profile,
        max_widgets=req.max_widgets,
    )
    return {"widgets": widgets, "count": len(widgets)}


@router.post("/pack-grid")
async def pack_grid(req: GridPackRequest):
    """Pack selected widgets into a CSS grid layout."""
    svc = _get_svc()
    if not req.widgets:
        raise HTTPException(status_code=400, detail="At least one widget required")
    layout = svc.pack_grid(req.widgets)
    return layout


@router.get("/{scenario}/demo")
async def get_demo_data(scenario: str):
    """Get demo/sample data for a widget scenario."""
    svc = _get_svc()
    data = svc.get_demo_data(scenario)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return {"scenario": scenario, "data": data}


@router.post("/{scenario}/validate")
async def validate_widget_data(scenario: str, req: ValidateRequest):
    """Validate data shape for a widget scenario."""
    svc = _get_svc()
    errors = svc.validate_data(scenario, req.data)
    return {"scenario": scenario, "valid": len(errors) == 0, "errors": errors}


@router.post("/{scenario}/format")
async def format_widget_data(scenario: str, req: FormatRequest):
    """Format raw data into frontend-ready shape."""
    svc = _get_svc()
    formatted = svc.format_data(scenario, req.data)
    return {"scenario": scenario, "data": formatted}


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Submit reward signal for Thompson Sampling learning."""
    svc = _get_svc()
    svc.update_feedback(req.scenario, req.reward)
    return {"status": "ok", "scenario": req.scenario}
