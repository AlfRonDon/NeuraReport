"""
Job executor - Runs jobs and tracks their progress.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, Optional
from uuid import uuid4

from ..core import Result, Ok, Err, DomainError
from ..core.events import EventBus, JobStartedEvent, JobCompletedEvent, JobFailedEvent
from ..domain.jobs import Job, JobStatus, JobStep, StepStatus
from ..adapters.persistence import JobRepository
from ..pipelines import Pipeline, PipelineContext

logger = logging.getLogger("neura.orchestration.executor")


class JobExecutor:
    """
    Executes jobs using pipelines.

    Responsible for:
    - Starting jobs and updating their status
    - Tracking progress through pipeline steps
    - Recording completion or failure
    """

    def __init__(
        self,
        job_repository: JobRepository,
        event_bus: Optional[EventBus] = None,
    ):
        self._job_repo = job_repository
        self._event_bus = event_bus
        self._running_jobs: Dict[str, asyncio.Task] = {}

    async def execute(
        self,
        job: Job,
        pipeline: Pipeline,
        context: PipelineContext,
    ) -> Result[Dict[str, Any], DomainError]:
        """
        Execute a job using the given pipeline.

        Args:
            job: The job to execute
            pipeline: The pipeline to run
            context: Initial context for the pipeline

        Returns:
            Ok(result_dict) on success, Err on failure
        """
        job_id = job.job_id

        # Mark job as running
        await self._job_repo.update_status(job_id, "running")

        # Emit start event
        if self._event_bus:
            await self._event_bus.emit(JobStartedEvent(
                job_id=job_id,
                job_type=job.job_type,
                correlation_id=job.correlation_id,
            ))

        # Set up context
        context.job_id = job_id
        context.correlation_id = job.correlation_id

        try:
            # Execute the pipeline
            result = await pipeline.execute(context)

            if result.success:
                # Calculate result data
                result_data = {
                    "completed_steps": result.completed_steps,
                    "duration_ms": result.duration_ms,
                }
                # Add any output data from context
                result_data.update(context.data.get("result", {}))

                # Mark job as succeeded
                await self._job_repo.update_status(
                    job_id,
                    "succeeded",
                    progress=100.0,
                    result=result_data,
                )

                # Emit completion event
                if self._event_bus:
                    await self._event_bus.emit(JobCompletedEvent(
                        job_id=job_id,
                        result=result_data,
                        correlation_id=job.correlation_id,
                    ))

                return Ok(result_data)
            else:
                # Mark job as failed
                error_msg = str(result.error) if result.error else "Unknown error"
                await self._job_repo.update_status(
                    job_id,
                    "failed",
                    error=error_msg,
                )

                # Emit failure event
                if self._event_bus:
                    await self._event_bus.emit(JobFailedEvent(
                        job_id=job_id,
                        error=error_msg,
                        correlation_id=job.correlation_id,
                    ))

                return Err(result.error or DomainError(
                    code="job_failed",
                    message=f"Job failed at step {result.failed_step}",
                ))

        except Exception as e:
            # Unexpected error
            error_msg = str(e)
            await self._job_repo.update_status(job_id, "failed", error=error_msg)

            if self._event_bus:
                await self._event_bus.emit(JobFailedEvent(
                    job_id=job_id,
                    error=error_msg,
                    correlation_id=job.correlation_id,
                ))

            return Err(DomainError(
                code="job_exception",
                message=error_msg,
                cause=e,
            ))

    async def execute_async(
        self,
        job: Job,
        pipeline: Pipeline,
        context: PipelineContext,
    ) -> str:
        """
        Start job execution in the background.

        Returns immediately with the job ID.
        """
        task = asyncio.create_task(
            self.execute(job, pipeline, context),
            name=f"job-{job.job_id}",
        )
        self._running_jobs[job.job_id] = task

        # Clean up when done
        def cleanup(t):
            self._running_jobs.pop(job.job_id, None)

        task.add_done_callback(cleanup)
        return job.job_id

    async def cancel(self, job_id: str) -> Result[bool, DomainError]:
        """Cancel a running job."""
        task = self._running_jobs.get(job_id)
        if not task:
            return Err(DomainError(
                code="job_not_running",
                message=f"Job {job_id} is not running",
            ))

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        await self._job_repo.update_status(job_id, "cancelled", error="Cancelled by user")
        return Ok(True)

    @property
    def running_job_ids(self) -> list[str]:
        """Get IDs of currently running jobs."""
        return list(self._running_jobs.keys())


class ProgressTracker:
    """
    Tracks job progress through pipeline steps.

    Updates the job repository as steps complete.
    """

    def __init__(
        self,
        job_id: str,
        job_repository: JobRepository,
        step_weights: Optional[Dict[str, float]] = None,
    ):
        self._job_id = job_id
        self._job_repo = job_repository
        self._step_weights = step_weights or {}
        self._completed_weight = 0.0
        self._total_weight = sum(self._step_weights.values()) or 1.0

    async def start_step(self, step_name: str) -> None:
        """Mark a step as started."""
        await self._job_repo.update_step(
            self._job_id,
            step_name,
            status="running",
        )

    async def complete_step(self, step_name: str) -> None:
        """Mark a step as completed and update progress."""
        weight = self._step_weights.get(step_name, 1.0)
        self._completed_weight += weight
        progress = (self._completed_weight / self._total_weight) * 100

        await self._job_repo.update_step(
            self._job_id,
            step_name,
            status="succeeded",
            progress=100.0,
        )
        await self._job_repo.update_status(
            self._job_id,
            "running",
            progress=progress,
        )

    async def fail_step(self, step_name: str, error: str) -> None:
        """Mark a step as failed."""
        await self._job_repo.update_step(
            self._job_id,
            step_name,
            status="failed",
            error=error,
        )

    async def skip_step(self, step_name: str) -> None:
        """Mark a step as skipped."""
        await self._job_repo.update_step(
            self._job_id,
            step_name,
            status="skipped",
        )
