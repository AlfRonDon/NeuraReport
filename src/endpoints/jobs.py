from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Query, Request

from src.services.scheduler_service import get_job, list_active_jobs, list_jobs, cancel_job

router = APIRouter()


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


@router.get("/jobs")
def list_jobs_route(
    request: Request,
    status: Optional[List[str]] = Query(None),
    job_type: Optional[List[str]] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=200),
    active_only: bool = Query(False),
):
    jobs = list_jobs(status, job_type, limit, active_only)
    return {"jobs": jobs, "correlation_id": _correlation(request)}


@router.get("/jobs/active")
def list_active_jobs_route(request: Request, limit: int = Query(20, ge=1, le=200)):
    jobs = list_active_jobs(limit)
    return {"jobs": jobs, "correlation_id": _correlation(request)}


@router.get("/jobs/{job_id}")
def get_job_route(job_id: str, request: Request):
    job = get_job(job_id)
    return {"job": job, "correlation_id": _correlation(request)}


@router.post("/jobs/{job_id}/cancel")
def cancel_job_route(job_id: str, request: Request, force: bool = Query(False)):
    job = cancel_job(job_id, force=force)
    return {"job": job, "correlation_id": _correlation(request)}
