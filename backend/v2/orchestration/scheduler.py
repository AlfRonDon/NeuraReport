"""
Scheduler - Runs scheduled jobs at their appointed times.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional

from ..adapters.persistence import ScheduleRepository, JobRepository
from ..domain.jobs import Schedule, Job, JobStep
from ..domain.reports import ReportConfig, OutputFormat
from ..core.events import EventBus
from .executor import JobExecutor
from .worker import WorkerPool

logger = logging.getLogger("neura.orchestration.scheduler")


class Scheduler:
    """
    Polls for due schedules and triggers job execution.

    Features:
    - Configurable poll interval
    - Prevents duplicate runs for the same schedule
    - Graceful shutdown
    """

    def __init__(
        self,
        schedule_repository: ScheduleRepository,
        job_repository: JobRepository,
        job_executor: JobExecutor,
        pipeline_factory: Callable[[Schedule], tuple],  # Returns (pipeline, context)
        poll_interval_seconds: int = 60,
        event_bus: Optional[EventBus] = None,
    ):
        self._schedule_repo = schedule_repository
        self._job_repo = job_repository
        self._executor = job_executor
        self._pipeline_factory = pipeline_factory
        self._poll_interval = max(poll_interval_seconds, 5)
        self._event_bus = event_bus

        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._inflight: set[str] = set()

    async def start(self) -> None:
        """Start the scheduler."""
        if self._task and not self._task.done():
            return

        self._running = True
        self._task = asyncio.create_task(
            self._run_loop(),
            name="scheduler-loop",
        )
        logger.info("Scheduler started")

    async def stop(self) -> None:
        """Stop the scheduler."""
        if not self._task:
            return

        self._running = False
        self._task.cancel()

        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None

        logger.info("Scheduler stopped")

    async def _run_loop(self) -> None:
        """Main scheduler loop."""
        while self._running:
            try:
                await self._dispatch_due_schedules()
            except Exception as e:
                logger.exception(f"Scheduler tick failed: {e}")

            # Wait for next tick
            try:
                await asyncio.sleep(self._poll_interval)
            except asyncio.CancelledError:
                break

    async def _dispatch_due_schedules(self) -> None:
        """Check for due schedules and dispatch them."""
        due_schedules = await self._schedule_repo.list_due()

        for schedule in due_schedules:
            if schedule.schedule_id in self._inflight:
                continue

            if not schedule.active:
                continue

            self._inflight.add(schedule.schedule_id)
            asyncio.create_task(
                self._run_schedule(schedule),
                name=f"schedule-{schedule.schedule_id}",
            )

    async def _run_schedule(self, schedule: Schedule) -> None:
        """Execute a single scheduled run."""
        schedule_id = schedule.schedule_id
        logger.info(f"Running schedule {schedule_id}: {schedule.name}")

        try:
            # Create job record
            steps = [
                {"name": "validate", "label": "Validating"},
                {"name": "load_template", "label": "Loading template"},
                {"name": "load_data", "label": "Loading data"},
                {"name": "render_html", "label": "Rendering HTML"},
                {"name": "render_pdf", "label": "Rendering PDF"},
            ]
            if schedule.generate_docx:
                steps.append({"name": "render_docx", "label": "Rendering DOCX"})
            if schedule.email_recipients:
                steps.append({"name": "notify", "label": "Sending notifications"})

            # Create job via repository
            job_data = await self._job_repo.save(Job(
                job_id=f"sched-{schedule_id}-{datetime.now(timezone.utc).timestamp():.0f}",
                job_type="run_report",
                template_id=schedule.template_id,
                template_name=schedule.template_name,
                template_kind=schedule.template_kind,
                connection_id=schedule.connection_id,
                schedule_id=schedule_id,
                steps=tuple(
                    JobStep(step_id=s["name"], name=s["name"], label=s["label"])
                    for s in steps
                ),
                created_at=datetime.now(timezone.utc),
                queued_at=datetime.now(timezone.utc),
            ))

            if isinstance(job_data, Exception) or not job_data:
                raise Exception("Failed to create job record")

            job = job_data.value if hasattr(job_data, 'value') else job_data

            # Get pipeline and context from factory
            pipeline, context = self._pipeline_factory(schedule)

            # Execute
            result = await self._executor.execute(job, pipeline, context)

            if hasattr(result, 'is_ok') and result.is_ok():
                artifacts = result.value if hasattr(result, 'value') else {}
                await self._schedule_repo.record_run(
                    schedule_id,
                    status="success",
                    artifacts=artifacts,
                )
                logger.info(f"Schedule {schedule_id} completed successfully")
            else:
                error = str(result.error) if hasattr(result, 'error') else str(result)
                await self._schedule_repo.record_run(
                    schedule_id,
                    status="failed",
                    error=error,
                )
                logger.error(f"Schedule {schedule_id} failed: {error}")

        except Exception as e:
            await self._schedule_repo.record_run(
                schedule_id,
                status="failed",
                error=str(e),
            )
            logger.exception(f"Schedule {schedule_id} failed with exception: {e}")

        finally:
            self._inflight.discard(schedule_id)

    async def trigger(self, schedule_id: str) -> bool:
        """Manually trigger a schedule run."""
        schedule = await self._schedule_repo.get(schedule_id)
        if not schedule:
            return False

        if schedule_id in self._inflight:
            return False

        self._inflight.add(schedule_id)
        asyncio.create_task(
            self._run_schedule(schedule),
            name=f"schedule-{schedule_id}-manual",
        )
        return True

    @property
    def inflight_schedules(self) -> set[str]:
        """Get IDs of currently running schedules."""
        return set(self._inflight)
