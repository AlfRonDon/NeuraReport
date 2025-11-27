from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException

from backend.app.services.state import state_store
from src.schemas.report_schema import ScheduleCreatePayload
from src.utils.email_utils import normalize_email_targets
from src.utils.schedule_utils import clean_key_values, resolve_schedule_interval, utcnow_iso


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"status": "error", "code": code, "message": message})


def list_jobs(status: Optional[list[str]], job_type: Optional[list[str]], limit: int, active_only: bool):
    return state_store.list_jobs(statuses=status, types=job_type, limit=limit, active_only=active_only)


def list_active_jobs(limit: int):
    return state_store.list_jobs(limit=limit, active_only=True)


def get_job(job_id: str) -> dict[str, Any]:
    job = state_store.get_job(job_id)
    if not job:
        raise _http_error(404, "job_not_found", "Job not found.")
    return job


def list_schedules():
    return state_store.list_schedules()


def create_schedule(payload: ScheduleCreatePayload) -> dict[str, Any]:
    template = state_store.get_template_record(payload.template_id) or {}
    if not template:
        raise _http_error(404, "template_not_found", "Template not found.")
    if str(template.get("status")).lower() != "approved":
        raise _http_error(400, "template_not_ready", "Template must be approved before scheduling runs.")
    connection = state_store.get_connection_record(payload.connection_id)
    if not connection:
        raise _http_error(404, "connection_not_found", "Connection not found.")
    if not payload.start_date or not payload.end_date:
        raise _http_error(400, "invalid_schedule_range", "Provide both start_date and end_date.")
    interval_minutes = resolve_schedule_interval(payload.frequency, payload.interval_minutes)
    now_iso = utcnow_iso()
    schedule = state_store.create_schedule(
        name=(payload.name or template.get("name") or f"Schedule {payload.template_id}")[:120],
        template_id=payload.template_id,
        template_name=template.get("name") or payload.template_id,
        template_kind=template.get("kind") or "pdf",
        connection_id=payload.connection_id,
        connection_name=connection.get("name") or connection.get("connection_name") or payload.connection_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        key_values=clean_key_values(payload.key_values),
        batch_ids=payload.batch_ids,
        docx=payload.docx,
        xlsx=payload.xlsx,
        email_recipients=normalize_email_targets(payload.email_recipients or []),
        email_subject=payload.email_subject,
        email_message=payload.email_message,
        frequency=payload.frequency,
        interval_minutes=interval_minutes,
        next_run_at=now_iso,
        first_run_at=now_iso,
        active=payload.active,
    )
    return schedule


def delete_schedule(schedule_id: str) -> bool:
    return state_store.delete_schedule(schedule_id)
