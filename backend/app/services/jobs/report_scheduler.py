from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

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


class ReportScheduler:
    def __init__(
        self,
        runner: Callable[[dict, str], dict],
        *,
        poll_seconds: int = 60,
    ) -> None:
        self._runner = runner
        self._poll_seconds = max(poll_seconds, 5)
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self._inflight: set[str] = set()

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop(), name="report-scheduler-loop")
        logger.info("scheduler_started", extra={"event": "scheduler_started"})

    async def stop(self) -> None:
        if not self._task:
            return
        self._stop_event.set()
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None
        logger.info("scheduler_stopped", extra={"event": "scheduler_stopped"})

    async def _run_loop(self) -> None:
        try:
            while not self._stop_event.is_set():
                try:
                    await self._dispatch_due_jobs()
                except Exception:
                    logger.exception("scheduler_tick_failed", extra={"event": "scheduler_tick_failed"})
                try:
                    await asyncio.wait_for(self._stop_event.wait(), timeout=self._poll_seconds)
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            raise

    async def _dispatch_due_jobs(self) -> None:
        schedules = state_store.list_schedules()
        now = _now_utc()
        for schedule in schedules:
            if not schedule.get("active", True):
                continue
            sid = schedule.get("id")
            if not sid or sid in self._inflight:
                continue
            next_run_at = _parse_iso(schedule.get("next_run_at"))
            if next_run_at is None or next_run_at <= now:
                self._inflight.add(sid)
                asyncio.create_task(self._run_schedule(schedule), name=f"schedule-{sid}")

    async def _run_schedule(self, schedule: dict) -> None:
        schedule_id = schedule.get("id")
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
                job_tracker = JobRunTracker(job_record.get("id"), correlation_id=correlation_id, step_progress=step_progress)
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
        finally:
            if schedule_id in self._inflight:
                self._inflight.remove(schedule_id)
