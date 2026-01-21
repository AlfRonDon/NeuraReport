"""API routes for Auto-Chart Generation."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, Request

from backend.app.core.security import require_api_key
from backend.app.domain.charts.service import AutoChartService
from backend.app.services.background_tasks import enqueue_background_job
from backend.app.services.state import state_store

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
    background: bool = Query(False),
):
    """Analyze data and suggest appropriate chart visualizations."""
    correlation_id = getattr(request.state, "correlation_id", None)
    if not background:
        suggestions = svc.analyze_data_for_charts(
            data=payload.data,
            column_descriptions=payload.column_descriptions,
            max_suggestions=payload.max_suggestions,
            correlation_id=correlation_id,
        )
        return {"status": "ok", "suggestions": suggestions, "correlation_id": correlation_id}

    async def runner(job_id: str) -> None:
        state_store.record_job_start(job_id)
        state_store.record_job_step(job_id, "analyze", status="running", label="Analyze chart data")
        try:
            suggestions = svc.analyze_data_for_charts(
                data=payload.data,
                column_descriptions=payload.column_descriptions,
                max_suggestions=payload.max_suggestions,
                correlation_id=correlation_id,
            )
            state_store.record_job_step(job_id, "analyze", status="succeeded", progress=100.0)
            state_store.record_job_completion(
                job_id,
                status="succeeded",
                result={"suggestions": suggestions},
            )
        except Exception as exc:
            state_store.record_job_step(job_id, "analyze", status="failed", error=str(exc))
            state_store.record_job_completion(job_id, status="failed", error=str(exc))

    job = await enqueue_background_job(
        job_type="chart_analyze",
        steps=[{"name": "analyze", "label": "Analyze chart data"}],
        meta={"background": True, "row_count": len(payload.data)},
        runner=runner,
    )
    return {"status": "queued", "job_id": job["id"], "correlation_id": correlation_id}


@router.post("/generate")
async def generate_chart_config(
    payload: ChartGenerateRequest,
    request: Request,
    svc: AutoChartService = Depends(get_service),
    background: bool = Query(False),
):
    """Generate a chart configuration."""
    correlation_id = getattr(request.state, "correlation_id", None)
    if not background:
        config = svc.generate_chart_config(
            data=payload.data,
            chart_type=payload.chart_type,
            x_field=payload.x_field,
            y_fields=payload.y_fields,
            title=payload.title,
        )
        return {"status": "ok", "chart": config, "correlation_id": correlation_id}

    async def runner(job_id: str) -> None:
        state_store.record_job_start(job_id)
        state_store.record_job_step(job_id, "generate", status="running", label="Generate chart config")
        try:
            config = svc.generate_chart_config(
                data=payload.data,
                chart_type=payload.chart_type,
                x_field=payload.x_field,
                y_fields=payload.y_fields,
                title=payload.title,
            )
            state_store.record_job_step(job_id, "generate", status="succeeded", progress=100.0)
            state_store.record_job_completion(
                job_id,
                status="succeeded",
                result={"chart": config},
            )
        except Exception as exc:
            state_store.record_job_step(job_id, "generate", status="failed", error=str(exc))
            state_store.record_job_completion(job_id, status="failed", error=str(exc))

    job = await enqueue_background_job(
        job_type="chart_generate",
        steps=[{"name": "generate", "label": "Generate chart config"}],
        meta={"background": True, "row_count": len(payload.data)},
        runner=runner,
    )
    return {"status": "queued", "job_id": job["id"], "correlation_id": correlation_id}
