"""Schedules API Routes.

This module contains endpoints for report scheduling:
- CRUD operations for scheduled reports
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.app.core.security import require_api_key
from src.schemas.report_schema import ScheduleCreatePayload, ScheduleUpdatePayload
from src.services.scheduler_service import create_schedule, delete_schedule, list_schedules, update_schedule

router = APIRouter(dependencies=[Depends(require_api_key)])


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


@router.get("")
def list_report_schedules(request: Request):
    """List all report schedules."""
    return {"schedules": list_schedules(), "correlation_id": _correlation(request)}


@router.post("")
def create_report_schedule(payload: ScheduleCreatePayload, request: Request):
    """Create a new report schedule."""
    schedule = create_schedule(payload)
    return {"schedule": schedule, "correlation_id": _correlation(request)}


@router.put("/{schedule_id}")
def update_report_schedule(schedule_id: str, payload: ScheduleUpdatePayload, request: Request):
    """Update an existing report schedule."""
    schedule = update_schedule(schedule_id, payload)
    return {"schedule": schedule, "correlation_id": _correlation(request)}


@router.delete("/{schedule_id}")
def delete_report_schedule(schedule_id: str, request: Request):
    """Delete a report schedule."""
    removed = delete_schedule(schedule_id)
    if not removed:
        raise HTTPException(
            status_code=404,
            detail={"status": "error", "code": "schedule_not_found", "message": "Schedule not found."}
        )
    return {"status": "ok", "schedule_id": schedule_id, "correlation_id": _correlation(request)}
