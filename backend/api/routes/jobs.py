"""Job management routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_executor
from backend.orchestration import JobExecutor

router = APIRouter()


class JobResponse(BaseModel):
    """Response for job operations."""

    job_id: str
    status: str
    progress: float
    error: Optional[str] = None


class JobListResponse(BaseModel):
    """Response for listing jobs."""

    jobs: list[JobResponse]
    count: int


@router.get("")
async def list_jobs(
    executor: JobExecutor = Depends(get_executor),
) -> JobListResponse:
    """List all active jobs."""
    active_ids = executor.get_active_jobs()
    jobs = []

    for job_id in active_ids:
        status = executor.get_status(job_id)
        if status:
            jobs.append(
                JobResponse(
                    job_id=job_id,
                    status=status.value,
                    progress=0.0,
                )
            )

    return JobListResponse(jobs=jobs, count=len(jobs))


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    executor: JobExecutor = Depends(get_executor),
) -> JobResponse:
    """Get job status."""
    status = executor.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(
        job_id=job_id,
        status=status.value,
        progress=0.0,
    )


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    force: bool = False,
    executor: JobExecutor = Depends(get_executor),
):
    """Cancel a running job."""
    cancelled = executor.cancel(job_id, force=force)

    if not cancelled:
        raise HTTPException(
            status_code=400,
            detail="Job could not be cancelled (may have already completed)",
        )

    return {"ok": True, "job_id": job_id, "cancelled": True}
