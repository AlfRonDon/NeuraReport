from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from ..state import state_store
from src.services.report_service import JobRunTracker, _build_job_steps, _step_progress_from_steps
from backend.app.features.generate.schemas.reports import RunPayload

logger = logging.getLogger("neura.scheduler")


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        value = datetime.fromisoformat(ts)
    except ValueError:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _next_run_datetime(schedule: dict, baseline: datetime) -> datetime:
    minutes = schedule.get("interval_minutes") or 0
    minutes = max(int(minutes), 1)
    return baseline + timedelta(minutes=minutes)


def _schedule_signature(schedule: dict) -> str:
    parts = [
        str(schedule.get("interval_minutes") or ""),
        str(schedule.get("start_date") or ""),
        str(schedule.get("end_date") or ""),
        "1" if schedule.get("active", True) else "0",
    ]
    return "|".join(parts)


def _scheduler_db_url() -> str:
    override = os.getenv("NEURA_SCHEDULER_DB_PATH")
    if override:
        path = Path(override).expanduser()
    else:
        state_db = os.getenv("NEURA_STATE_DB_PATH")
        if state_db:
            path = Path(state_db).expanduser()
        else:
            base_dir = getattr(state_store, "_base_dir", Path(__file__).resolve().parents[3] / "state")
            path = Path(base_dir) / "scheduler.sqlite3"
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path}"


class ReportScheduler:
    def __init__(
        self,
        runner: Callable[..., dict],
        *,
        poll_seconds: int = 60,
    ) -> None:
        """Initialize the report scheduler."""
        self._runner = runner
        self._poll_seconds = max(poll_seconds, 5)
        self._sync_job_id = "schedule-sync"
        self._scheduler = AsyncIOScheduler(
            jobstores={"default": SQLAlchemyJobStore(url=_scheduler_db_url())},
            executors={"default": AsyncIOExecutor()},
            timezone=timezone.utc,
        )

    async def start(self) -> None:
        if self._scheduler.running:
            return
        self._scheduler.start()
        self._scheduler.add_job(
            self._sync_from_store,
            "interval",
            seconds=self._poll_seconds,
            id=self._sync_job_id,
            replace_existing=True,
        )
        await self._sync_from_store()
        logger.info("scheduler_started", extra={"event": "scheduler_started"})

    async def stop(self) -> None:
        if not self._scheduler.running:
            return
        try:
            self._scheduler.remove_job(self._sync_job_id)
        except Exception:
            pass
        self._scheduler.shutdown(wait=False)
        logger.info("scheduler_stopped", extra={"event": "scheduler_stopped"})

    async def refresh(self) -> None:
        """Refresh scheduler jobs from persisted schedules."""
        await self._sync_from_store()

    async def _sync_from_store(self) -> None:
        schedules = state_store.list_schedules()
        schedule_ids: set[str] = set()

        for schedule in schedules:
            schedule_id = schedule.get("id")
            if not schedule_id:
                continue
            schedule_ids.add(schedule_id)
            if not schedule.get("active", True):
                self._remove_job(schedule_id)
                continue

            interval_minutes = max(int(schedule.get("interval_minutes") or 0), 1)
            start_date = _parse_iso(schedule.get("start_date"))
            end_date = _parse_iso(schedule.get("end_date"))
            signature = _schedule_signature(schedule)

            job = self._scheduler.get_job(schedule_id)
            if job and job.kwargs.get("schedule_sig") == signature:
                continue
            if job:
                self._remove_job(schedule_id)

            trigger = IntervalTrigger(
                minutes=interval_minutes,
                start_date=start_date,
                end_date=end_date,
                timezone=timezone.utc,
            )
            job = self._scheduler.add_job(
                self._run_schedule,
                trigger=trigger,
                id=schedule_id,
                kwargs={"schedule_id": schedule_id, "schedule_sig": signature},
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=60,
            )

            if job.next_run_time:
                state_store.update_schedule(
                    schedule_id,
                    next_run_at=job.next_run_time.astimezone(timezone.utc).isoformat(),
                )

        # Remove any orphaned jobs
        for job in self._scheduler.get_jobs():
            if job.id == self._sync_job_id:
                continue
            if job.id not in schedule_ids:
                self._remove_job(job.id)

    def _remove_job(self, job_id: str) -> None:
        try:
            self._scheduler.remove_job(job_id)
        except Exception:
            pass

    async def _run_schedule(self, schedule_id: str, schedule_sig: str | None = None) -> None:
        schedule = state_store.get_schedule(schedule_id)
        if not schedule or not schedule.get("active", True):
            return

        started = _now_utc()
        correlation_id = f"sched-{schedule_id or 'job'}-{started.timestamp():.0f}"
        job_tracker: JobRunTracker | None = None
        try:
            payload = {
                "template_id": schedule.get("template_id"),
                "connection_id": schedule.get("connection_id"),
                "start_date": schedule.get("start_date"),
                "end_date": schedule.get("end_date"),
                "batch_ids": schedule.get("batch_ids") or None,
                "key_values": schedule.get("key_values") or None,
                "docx": bool(schedule.get("docx")),
                "xlsx": bool(schedule.get("xlsx")),
                "email_recipients": schedule.get("email_recipients") or None,
                "email_subject": schedule.get("email_subject")
                or f"[Scheduled] {schedule.get('template_name') or schedule.get('template_id')}",
                "email_message": schedule.get("email_message")
                or (
                    f"Scheduled run '{schedule.get('name')}' completed.\n"
                    f"Window: {schedule.get('start_date')} - {schedule.get('end_date')}."
                ),
                "schedule_id": schedule_id,
                "schedule_name": schedule.get("name"),
            }
            kind = schedule.get("template_kind") or "pdf"
            try:
                run_payload = RunPayload(**payload)
            except Exception:
                run_payload = None
            if run_payload is not None:
                steps = _build_job_steps(run_payload, kind=kind)
                meta = {
                    "start_date": payload.get("start_date"),
                    "end_date": payload.get("end_date"),
                    "schedule_id": schedule_id,
                    "schedule_name": schedule.get("name"),
                    "docx": bool(payload.get("docx")),
                    "xlsx": bool(payload.get("xlsx")),
                }
                job_record = state_store.create_job(
                    job_type="run_report",
                    template_id=run_payload.template_id,
                    connection_id=run_payload.connection_id,
                    template_name=schedule.get("template_name") or run_payload.template_id,
                    template_kind=kind,
                    schedule_id=schedule_id,
                    correlation_id=correlation_id,
                    steps=steps,
                    meta=meta,
                )
                step_progress = _step_progress_from_steps(steps)
                job_tracker = JobRunTracker(
                    job_record.get("id"),
                    correlation_id=correlation_id,
                    step_progress=step_progress,
                )
                job_tracker.start()
            result = await asyncio.to_thread(self._runner, payload, kind, job_tracker=job_tracker)
        except Exception as exc:
            finished = _now_utc()
            next_run = _next_run_datetime(schedule, finished).isoformat()
            state_store.record_schedule_run(
                schedule_id,
                started_at=started.isoformat(),
                finished_at=finished.isoformat(),
                status="failed",
                next_run_at=next_run,
                error=str(exc),
                artifacts=None,
            )
            logger.exception(
                "schedule_run_failed",
                extra={
                    "event": "schedule_run_failed",
                    "schedule_id": schedule_id,
                    "error": str(exc),
                },
            )
            if job_tracker:
                job_tracker.fail(str(exc))
        else:
            finished = _now_utc()
            next_run = _next_run_datetime(schedule, finished).isoformat()
            artifacts = {
                "html_url": result.get("html_url"),
                "pdf_url": result.get("pdf_url"),
                "docx_url": result.get("docx_url"),
                "xlsx_url": result.get("xlsx_url"),
            }
            state_store.record_schedule_run(
                schedule_id,
                started_at=started.isoformat(),
                finished_at=finished.isoformat(),
                status="success",
                next_run_at=next_run,
                error=None,
                artifacts=artifacts,
            )
            logger.info(
                "schedule_run_complete",
                extra={
                    "event": "schedule_run_complete",
                    "schedule_id": schedule_id,
                    "html": artifacts.get("html_url"),
                    "pdf": artifacts.get("pdf_url"),
                },
            )
            if job_tracker:
                job_tracker.succeed(result)
