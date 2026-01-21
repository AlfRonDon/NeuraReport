"""API routes for Auto-Chart Generation."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Request

from backend.app.core.security import require_api_key
from backend.app.domain.charts.service import AutoChartService

router = APIRouter(dependencies=[Depends(require_api_key)])


class ChartAnalyzeRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., min_items=1, max_items=100)
    column_descriptions: Optional[Dict[str, str]] = None
    max_suggestions: int = Field(default=3, ge=1, le=10)


class ChartGenerateRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., min_items=1, max_items=1000)
    chart_type: str
    x_field: str
    y_fields: List[str]
    title: Optional[str] = None


def get_service() -> AutoChartService:
    return AutoChartService()


@router.post("/analyze")
async def analyze_for_charts(
    payload: ChartAnalyzeRequest,
    request: Request,
    svc: AutoChartService = Depends(get_service),
):
    """Analyze data and suggest appropriate chart visualizations."""
    correlation_id = getattr(request.state, "correlation_id", None)
    suggestions = svc.analyze_data_for_charts(
        data=payload.data,
        column_descriptions=payload.column_descriptions,
        max_suggestions=payload.max_suggestions,
        correlation_id=correlation_id,
    )
    return {"status": "ok", "suggestions": suggestions, "correlation_id": correlation_id}


@router.post("/generate")
async def generate_chart_config(
    payload: ChartGenerateRequest,
    request: Request,
    svc: AutoChartService = Depends(get_service),
):
    """Generate a chart configuration."""
    correlation_id = getattr(request.state, "correlation_id", None)
    config = svc.generate_chart_config(
        data=payload.data,
        chart_type=payload.chart_type,
        x_field=payload.x_field,
        y_fields=payload.y_fields,
        title=payload.title,
    )
    return {"status": "ok", "chart": config, "correlation_id": correlation_id}
