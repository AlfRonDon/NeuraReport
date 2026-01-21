"""
Job endpoints.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import get_dependencies
from ...core import Err

router = APIRouter()


@router.get("")
async def list_jobs(
    status: Optional[str] = Query(None),
    active_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
):
    """List jobs."""
    deps = get_dependencies()

    filters = {"limit": limit, "active_only": active_only}
    if status:
        filters["statuses"] = [status]

    jobs = await deps.job_repository.list(**filters)

    return {
        "status": "ok",
        "jobs": [j.to_dict() for j in jobs],
    }


@router.get("/{job_id}")
async def get_job(job_id: str):
    """Get a job by ID."""
    deps = get_dependencies()
    job = await deps.job_repository.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail={
            "code": "not_found",
            "message": f"Job {job_id} not found",
        })

    return {
        "status": "ok",
        "job": job.to_dict(),
    }


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel a running job."""
    deps = get_dependencies()
    job = await deps.job_repository.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail={
            "code": "not_found",
            "message": f"Job {job_id} not found",
        })

    if job.status.is_terminal:
        raise HTTPException(status_code=400, detail={
            "code": "job_not_cancellable",
            "message": f"Job {job_id} is already {job.status.value}",
        })

    result = await deps.job_executor.cancel(job_id)

    if isinstance(result, Err):
        raise HTTPException(status_code=400, detail={
            "code": result.error.code,
            "message": result.error.message,
        })

    return {
        "status": "ok",
        "job_id": job_id,
        "message": "Job cancelled",
    }


@router.get("/active")
async def list_active_jobs():
    """List currently running jobs."""
    deps = get_dependencies()
    jobs = await deps.job_repository.list_active()

    return {
        "status": "ok",
        "jobs": [j.to_dict() for j in jobs],
        "running_job_ids": deps.job_executor.running_job_ids,
    }
