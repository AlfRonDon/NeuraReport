from __future__ import annotations

from fastapi import APIRouter, Request

from backend.app.features.generate.schemas.reports import DiscoverPayload, RunPayload  # reuse existing schemas
from backend.app.features.generate.schemas.charts import ChartSuggestPayload, ChartSuggestResponse  # reuse existing
from src.services.report_service import queue_report_job, run_report as run_report_service

router = APIRouter()


@router.post("/reports/run")
def run_report(payload: RunPayload, request: Request):
    return run_report_service(payload, request, kind="pdf")


@router.post("/excel/reports/run")
def run_report_excel(payload: RunPayload, request: Request):
    return run_report_service(payload, request, kind="excel")


@router.post("/jobs/run-report")
async def enqueue_report_job(payload: RunPayload, request: Request):
    return await queue_report_job(payload, request, kind="pdf")


@router.post("/excel/jobs/run-report")
async def enqueue_report_job_excel(payload: RunPayload, request: Request):
    return await queue_report_job(payload, request, kind="excel")


@router.post("/reports/discover")
def discover_reports(payload: DiscoverPayload):
    from backend.api import discover_reports as _discover  # type: ignore

    return _discover(payload)


@router.post("/excel/reports/discover")
def discover_reports_excel(payload: DiscoverPayload):
    from backend.api import discover_reports_excel as _discover  # type: ignore

    return _discover(payload)


@router.post("/reports/charts/suggest", response_model=ChartSuggestResponse)
def suggest_charts(template_id: str, payload: ChartSuggestPayload, request: Request):
    from backend.api import _chart_suggest_route  # type: ignore

    return _chart_suggest_route(template_id, payload, request, kind="pdf")


@router.post("/excel/reports/charts/suggest", response_model=ChartSuggestResponse)
def suggest_charts_excel(template_id: str, payload: ChartSuggestPayload, request: Request):
    from backend.api import _chart_suggest_route  # type: ignore

    return _chart_suggest_route(template_id, payload, request, kind="excel")
