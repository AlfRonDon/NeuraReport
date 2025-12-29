from __future__ import annotations

from fastapi import APIRouter, Request

from backend.app.features.generate.schemas.reports import RunPayload  # reuse existing schemas
from src.services.report_service import queue_report_job, run_report as run_report_service

router = APIRouter()


@router.post("/reports/run")
def run_report(payload: RunPayload, request: Request):
    return run_report_service(payload, request, kind="pdf")


@router.post("/excel/reports/run")
def run_report_excel(payload: RunPayload, request: Request):
    return run_report_service(payload, request, kind="excel")


@router.post("/jobs/run-report")
async def enqueue_report_job(payload: RunPayload | list[RunPayload], request: Request):
    return await queue_report_job(payload, request, kind="pdf")


@router.post("/excel/jobs/run-report")
async def enqueue_report_job_excel(payload: RunPayload | list[RunPayload], request: Request):
    return await queue_report_job(payload, request, kind="excel")
