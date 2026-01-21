from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request

from src.services.scheduler_service import get_job, list_active_jobs, list_jobs, cancel_job

router = APIRouter()


def _normalize_job_status(status: Optional[str]) -> str:
    """Normalize job status to consistent UI-friendly values.

    Maps backend status values (succeeded, queued, in_progress, etc.)
    to canonical frontend values (completed, pending, running, etc.).
    """
    value = (status or "").strip().lower()
    if value in {"succeeded", "success", "done"}:
        return "completed"
    if value in {"queued"}:
        return "pending"
    if value in {"in_progress", "started"}:
        return "running"
    if value in {"error"}:
        return "failed"
    if value in {"canceled"}:
        return "cancelled"
    # Return as-is for known statuses
    if value in {"pending", "running", "completed", "failed", "cancelled", "cancelling"}:
        return value
    return value or "pending"


def _normalize_job(job: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Normalize a job record for consistent API responses."""
    if not job:
        return job
    normalized = dict(job)
    if "status" in normalized:
        normalized["status"] = _normalize_job_status(normalized["status"])
    if "state" in normalized and "status" not in normalized:
        normalized["status"] = _normalize_job_status(normalized["state"])
    return normalized


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
    normalized_jobs = [_normalize_job(job) for job in jobs] if jobs else []
    return {"jobs": normalized_jobs, "correlation_id": _correlation(request)}


@router.get("/jobs/active")
def list_active_jobs_route(request: Request, limit: int = Query(20, ge=1, le=200)):
    jobs = list_active_jobs(limit)
    normalized_jobs = [_normalize_job(job) for job in jobs] if jobs else []
    return {"jobs": normalized_jobs, "correlation_id": _correlation(request)}


@router.get("/jobs/{job_id}")
def get_job_route(job_id: str, request: Request):
    job = get_job(job_id)
    return {"job": _normalize_job(job), "correlation_id": _correlation(request)}


@router.post("/jobs/{job_id}/cancel")
def cancel_job_route(job_id: str, request: Request, force: bool = Query(False)):
    job = cancel_job(job_id, force=force)
    return {"job": _normalize_job(job), "correlation_id": _correlation(request)}
