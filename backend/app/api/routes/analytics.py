from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from backend.app.core.config import get_settings
from backend.app.core.security import require_api_key
from backend.app.services.state import state_store

router = APIRouter(dependencies=[Depends(require_api_key)])


def _parse_iso(date_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO date string to datetime."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _get_date_bucket(date_str: Optional[str], bucket: str = "day") -> Optional[str]:
    """Convert date string to bucket key (day, week, month)."""
    dt = _parse_iso(date_str)
    if not dt:
        return None
    if bucket == "day":
        return dt.strftime("%Y-%m-%d")
    elif bucket == "week":
        # Get start of week (Monday)
        start = dt - timedelta(days=dt.weekday())
        return start.strftime("%Y-%m-%d")
    elif bucket == "month":
        return dt.strftime("%Y-%m")
    return dt.strftime("%Y-%m-%d")


def _normalize_job_status(status: Optional[str]) -> str:
    """Normalize job status to consistent UI-friendly values."""
    value = (status or "").strip().lower()
    if value in {"succeeded", "completed"}:
        return "completed"
    if value in {"queued", "pending"}:
        return "pending"
    if value in {"running", "in_progress"}:
        return "running"
    if value in {"failed", "error"}:
        return "failed"
    if value in {"cancelled", "canceled"}:
        return "cancelled"
    return value or "pending"


@router.get("/dashboard")
async def get_dashboard_analytics() -> Dict[str, Any]:
    """Get comprehensive dashboard analytics."""

    # Get all data from state store
    connections = state_store.list_connections()
    templates = state_store.list_templates()
    jobs = state_store.list_jobs()
    schedules = state_store.list_schedules()

    # Calculate time boundaries
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Job statistics
    total_jobs = len(jobs)
    completed_jobs = [j for j in jobs if _normalize_job_status(j.get("status")) == "completed"]
    failed_jobs = [j for j in jobs if _normalize_job_status(j.get("status")) == "failed"]
    running_jobs = [j for j in jobs if _normalize_job_status(j.get("status")) == "running"]
    pending_jobs = [j for j in jobs if _normalize_job_status(j.get("status")) == "pending"]

    # Jobs by time period
    def count_jobs_after(job_list: list, after: datetime) -> int:
        count = 0
        for j in job_list:
            created = _parse_iso(j.get("created_at"))
            if created and created >= after:
                count += 1
        return count

    jobs_today = count_jobs_after(jobs, today_start)
    jobs_this_week = count_jobs_after(jobs, week_start)
    jobs_this_month = count_jobs_after(jobs, month_start)

    # Success rate
    finished_jobs = len(completed_jobs) + len(failed_jobs)
    success_rate = (len(completed_jobs) / finished_jobs * 100) if finished_jobs > 0 else 0

    # Template statistics
    pdf_templates = [t for t in templates if t.get("kind") == "pdf"]
    excel_templates = [t for t in templates if t.get("kind") == "excel"]
    approved_templates = [t for t in templates if t.get("status") == "approved"]

    # Most used templates (by job count)
    template_usage = {}
    for job in jobs:
        tid = job.get("template_id")
        if tid:
            template_usage[tid] = template_usage.get(tid, 0) + 1

    top_templates = []
    for tid, count in sorted(template_usage.items(), key=lambda x: -x[1])[:5]:
        template = next((t for t in templates if t.get("id") == tid), None)
        if template:
            top_templates.append({
                "id": tid,
                "name": template.get("name", tid[:12]),
                "kind": template.get("kind", "pdf"),
                "runCount": count,
            })

    # Connection statistics
    active_connections = [c for c in connections if c.get("status") == "connected"]
    avg_latency = 0
    latencies = [c.get("lastLatencyMs") for c in connections if c.get("lastLatencyMs")]
    if latencies:
        avg_latency = sum(latencies) / len(latencies)

    # Schedule statistics
    active_schedules = [s for s in schedules if s.get("active")]

    # Jobs trend (last 7 days)
    jobs_trend = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_str = day.strftime("%Y-%m-%d")

        day_jobs = [
            j for j in jobs
            if (created := _parse_iso(j.get("created_at"))) and day <= created < day_end
        ]
        day_completed = len([j for j in day_jobs if _normalize_job_status(j.get("status")) == "completed"])
        day_failed = len([j for j in day_jobs if _normalize_job_status(j.get("status")) == "failed"])

        jobs_trend.append({
            "date": day_str,
            "label": day.strftime("%a"),
            "total": len(day_jobs),
            "completed": day_completed,
            "failed": day_failed,
        })

    # Recent activity (last 10 jobs)
    recent_jobs = sorted(jobs, key=lambda j: j.get("created_at") or "", reverse=True)[:10]
    recent_activity = []
    for job in recent_jobs:
        recent_activity.append({
            "id": job.get("id"),
            "type": "job",
            "action": f"Report {_normalize_job_status(job.get('status'))}",
            "template": job.get("template_name") or job.get("template_id", "")[:12],
            "timestamp": job.get("completed_at") or job.get("created_at"),
            "status": _normalize_job_status(job.get("status")),
        })

    return {
        "summary": {
            "totalConnections": len(connections),
            "activeConnections": len(active_connections),
            "totalTemplates": len(templates),
            "approvedTemplates": len(approved_templates),
            "pdfTemplates": len(pdf_templates),
            "excelTemplates": len(excel_templates),
            "totalJobs": total_jobs,
            "activeJobs": len(running_jobs) + len(pending_jobs),
            "completedJobs": len(completed_jobs),
            "failedJobs": len(failed_jobs),
            "totalSchedules": len(schedules),
            "activeSchedules": len(active_schedules),
        },
        "metrics": {
            "successRate": round(success_rate, 1),
            "avgConnectionLatency": round(avg_latency, 1),
            "jobsToday": jobs_today,
            "jobsThisWeek": jobs_this_week,
            "jobsThisMonth": jobs_this_month,
        },
        "topTemplates": top_templates,
        "jobsTrend": jobs_trend,
        "recentActivity": recent_activity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/usage")
async def get_usage_statistics(
    period: str = Query("week", regex="^(day|week|month)$"),
) -> Dict[str, Any]:
    """Get detailed usage statistics over time."""

    jobs = state_store.list_jobs()
    templates = state_store.list_templates()

    now = datetime.now(timezone.utc)

    # Determine date range based on period
    if period == "day":
        start_date = now - timedelta(days=1)
        bucket = "hour"
    elif period == "week":
        start_date = now - timedelta(days=7)
        bucket = "day"
    else:  # month
        start_date = now - timedelta(days=30)
        bucket = "day"

    # Filter jobs in date range
    filtered_jobs = []
    for job in jobs:
        created = _parse_iso(job.get("created_at"))
        if created and created >= start_date:
            filtered_jobs.append(job)

    # Group by status
    by_status = {}
    for job in filtered_jobs:
        status = _normalize_job_status(job.get("status"))
        by_status[status] = by_status.get(status, 0) + 1

    # Group by template kind
    by_kind = {"pdf": 0, "excel": 0}
    for job in filtered_jobs:
        kind = job.get("template_kind", "pdf")
        by_kind[kind] = by_kind.get(kind, 0) + 1

    # Group by template
    by_template = {}
    for job in filtered_jobs:
        tid = job.get("template_id", "unknown")
        tname = job.get("template_name") or tid[:12]
        if tid not in by_template:
            by_template[tid] = {"name": tname, "count": 0}
        by_template[tid]["count"] += 1

    template_breakdown = sorted(
        [{"id": k, **v} for k, v in by_template.items()],
        key=lambda x: -x["count"]
    )[:10]

    return {
        "period": period,
        "totalJobs": len(filtered_jobs),
        "byStatus": by_status,
        "byKind": by_kind,
        "templateBreakdown": template_breakdown,
        "startDate": start_date.isoformat(),
        "endDate": now.isoformat(),
    }


@router.get("/reports/history")
async def get_report_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    template_id: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get report generation history with filtering."""

    jobs = state_store.list_jobs()

    # Filter
    filtered = jobs
    if status:
        status_norm = _normalize_job_status(status)
        filtered = [j for j in filtered if _normalize_job_status(j.get("status")) == status_norm]
    if template_id:
        filtered = [j for j in filtered if j.get("template_id") == template_id]

    # Sort by created_at descending
    filtered.sort(key=lambda j: j.get("created_at") or "", reverse=True)

    total = len(filtered)

    # Paginate
    paginated = filtered[offset:offset + limit]

    # Enhance with template info
    templates = {t.get("id"): t for t in state_store.list_templates()}

    history = []
    for job in paginated:
        tid = job.get("template_id")
        template = templates.get(tid, {})

        history.append({
            "id": job.get("id"),
            "templateId": tid,
            "templateName": job.get("template_name") or template.get("name") or (tid[:12] if tid else "Unknown"),
            "templateKind": job.get("template_kind") or template.get("kind") or "pdf",
            "connectionId": job.get("connection_id"),
            "status": _normalize_job_status(job.get("status")),
            "createdAt": job.get("created_at"),
            "completedAt": job.get("completed_at"),
            "artifacts": job.get("artifacts"),
            "error": job.get("error"),
            "meta": job.get("meta"),
        })

    return {
        "history": history,
        "total": total,
        "limit": limit,
        "offset": offset,
        "hasMore": offset + limit < total,
    }


# ------------------------------------------------------------------
# Activity Log Endpoints
# ------------------------------------------------------------------

@router.get("/activity")
async def get_activity_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get the activity log with optional filtering."""
    log = state_store.get_activity_log(
        limit=limit,
        offset=offset,
        entity_type=entity_type,
        action=action,
    )
    return {
        "activities": log,
        "limit": limit,
        "offset": offset,
    }


@router.post("/activity")
async def log_activity(
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Log an activity event."""
    entry = state_store.log_activity(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details,
    )
    return {"activity": entry}


@router.delete("/activity")
async def clear_activity_log() -> Dict[str, Any]:
    """Clear all activity log entries."""
    count = state_store.clear_activity_log()
    return {"cleared": count}


# ------------------------------------------------------------------
# Favorites Endpoints
# ------------------------------------------------------------------

@router.get("/favorites")
async def get_favorites() -> Dict[str, Any]:
    """Get all favorites."""
    favorites = state_store.get_favorites()

    # Enrich with template/connection details
    templates = {t.get("id"): t for t in state_store.list_templates()}
    connections = {c.get("id"): c for c in state_store.list_connections()}

    enriched_templates = []
    for tid in favorites.get("templates", []):
        template = templates.get(tid)
        if template:
            enriched_templates.append({
                "id": tid,
                "name": template.get("name"),
                "kind": template.get("kind"),
                "status": template.get("status"),
            })

    enriched_connections = []
    for cid in favorites.get("connections", []):
        conn = connections.get(cid)
        if conn:
            enriched_connections.append({
                "id": cid,
                "name": conn.get("name"),
                "dbType": conn.get("db_type"),
                "status": conn.get("status"),
            })

    return {
        "templates": enriched_templates,
        "connections": enriched_connections,
    }


@router.post("/favorites/{entity_type}/{entity_id}")
async def add_favorite(entity_type: str, entity_id: str) -> Dict[str, Any]:
    """Add an item to favorites."""
    if entity_type not in ("templates", "connections"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid entity type")

    added = state_store.add_favorite(entity_type, entity_id)

    # Log activity
    state_store.log_activity(
        action="favorite_added",
        entity_type=entity_type.rstrip("s"),  # template or connection
        entity_id=entity_id,
    )

    return {"added": added, "entityType": entity_type, "entityId": entity_id}


@router.delete("/favorites/{entity_type}/{entity_id}")
async def remove_favorite(entity_type: str, entity_id: str) -> Dict[str, Any]:
    """Remove an item from favorites."""
    if entity_type not in ("templates", "connections"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid entity type")

    removed = state_store.remove_favorite(entity_type, entity_id)

    # Log activity
    state_store.log_activity(
        action="favorite_removed",
        entity_type=entity_type.rstrip("s"),
        entity_id=entity_id,
    )

    return {"removed": removed, "entityType": entity_type, "entityId": entity_id}


@router.get("/favorites/{entity_type}/{entity_id}")
async def check_favorite(entity_type: str, entity_id: str) -> Dict[str, Any]:
    """Check if an item is a favorite."""
    if entity_type not in ("templates", "connections"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid entity type")

    is_fav = state_store.is_favorite(entity_type, entity_id)
    return {"isFavorite": is_fav, "entityType": entity_type, "entityId": entity_id}


# ------------------------------------------------------------------
# User Preferences Endpoints
# ------------------------------------------------------------------

@router.get("/preferences")
async def get_preferences() -> Dict[str, Any]:
    """Get user preferences."""
    prefs = state_store.get_user_preferences()
    return {"preferences": prefs}


@router.put("/preferences")
async def update_preferences(updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update user preferences."""
    prefs = state_store.update_user_preferences(updates)
    return {"preferences": prefs}


@router.put("/preferences/{key}")
async def set_preference(key: str, value: Any) -> Dict[str, Any]:
    """Set a single user preference."""
    prefs = state_store.set_user_preference(key, value)
    return {"preferences": prefs}


# ------------------------------------------------------------------
# Export/Backup Endpoints
# ------------------------------------------------------------------

@router.get("/export/config")
async def export_configuration() -> Dict[str, Any]:
    """Export all configuration (templates, connections, schedules, preferences) as JSON."""
    connections = state_store.list_connections()
    templates = state_store.list_templates()
    schedules = state_store.list_schedules()
    favorites = state_store.get_favorites()
    preferences = state_store.get_user_preferences()

    # Remove sensitive data from connections
    safe_connections = []
    for conn in connections:
        safe_conn = {
            "id": conn.get("id"),
            "name": conn.get("name"),
            "db_type": conn.get("db_type"),
            "summary": conn.get("summary"),
            "tags": conn.get("tags"),
        }
        safe_connections.append(safe_conn)

    return {
        "version": "1.0",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "data": {
            "connections": safe_connections,
            "templates": templates,
            "schedules": schedules,
            "favorites": favorites,
            "preferences": preferences,
        },
    }


# ------------------------------------------------------------------
# Global Search Endpoint
# ------------------------------------------------------------------

@router.get("/search")
async def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    types: Optional[str] = Query(None),  # comma-separated: templates,connections,jobs
    limit: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    """Search across templates, connections, and jobs."""
    query = q.lower().strip()
    type_filter = set(types.split(",")) if types else {"templates", "connections", "jobs"}

    results = []

    # Search templates
    if "templates" in type_filter:
        templates = state_store.list_templates()
        for t in templates:
            name = (t.get("name") or "").lower()
            tid = (t.get("id") or "").lower()
            if query in name or query in tid:
                results.append({
                    "type": "template",
                    "id": t.get("id"),
                    "name": t.get("name"),
                    "description": f"{t.get('kind', 'pdf').upper()} Template",
                    "url": f"/templates",
                    "meta": {"kind": t.get("kind"), "status": t.get("status")},
                })

    # Search connections
    if "connections" in type_filter:
        connections = state_store.list_connections()
        for c in connections:
            name = (c.get("name") or "").lower()
            cid = (c.get("id") or "").lower()
            summary = (c.get("summary") or "").lower()
            if query in name or query in cid or query in summary:
                results.append({
                    "type": "connection",
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "description": c.get("summary") or c.get("db_type"),
                    "url": f"/connections",
                    "meta": {"dbType": c.get("db_type"), "status": c.get("status")},
                })

    # Search jobs
    if "jobs" in type_filter:
        jobs = state_store.list_jobs(limit=100)
        for j in jobs:
            tname = (j.get("templateName") or j.get("template_name") or "").lower()
            jid = (j.get("id") or "").lower()
            if query in tname or query in jid:
                results.append({
                    "type": "job",
                    "id": j.get("id"),
                    "name": j.get("templateName") or j.get("template_name") or j.get("id")[:12],
                    "description": f"Job - {_normalize_job_status(j.get('status'))}",
                    "url": f"/jobs",
                    "meta": {
                        "status": _normalize_job_status(j.get("status")),
                        "createdAt": j.get("createdAt") or j.get("created_at"),
                    },
                })

    # Limit results
    results = results[:limit]

    return {
        "query": q,
        "results": results,
        "total": len(results),
    }


# ------------------------------------------------------------------
# Notification Endpoints
# ------------------------------------------------------------------

@router.get("/notifications")
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
) -> Dict[str, Any]:
    """Get notifications list."""
    notifications = state_store.get_notifications(limit=limit, unread_only=unread_only)
    unread_count = state_store.get_unread_count()
    return {
        "notifications": notifications,
        "unreadCount": unread_count,
        "total": len(notifications),
    }


@router.get("/notifications/unread-count")
async def get_unread_count() -> Dict[str, int]:
    """Get count of unread notifications."""
    return {"unreadCount": state_store.get_unread_count()}


@router.post("/notifications")
async def create_notification(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new notification."""
    title = payload.get("title", "Notification")
    message = payload.get("message", "")
    notification_type = payload.get("type", "info")
    link = payload.get("link")
    entity_type = payload.get("entityType")
    entity_id = payload.get("entityId")

    notification = state_store.add_notification(
        title=title,
        message=message,
        notification_type=notification_type,
        link=link,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    return {"notification": notification}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str) -> Dict[str, Any]:
    """Mark a notification as read."""
    found = state_store.mark_notification_read(notification_id)
    if not found:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"marked": True, "notificationId": notification_id}


@router.put("/notifications/read-all")
async def mark_all_read() -> Dict[str, Any]:
    """Mark all notifications as read."""
    count = state_store.mark_all_notifications_read()
    return {"markedCount": count}


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str) -> Dict[str, Any]:
    """Delete a notification."""
    found = state_store.delete_notification(notification_id)
    if not found:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"deleted": True, "notificationId": notification_id}


@router.delete("/notifications")
async def clear_all_notifications() -> Dict[str, Any]:
    """Clear all notifications."""
    count = state_store.clear_notifications()
    return {"clearedCount": count}


# ------------------------------------------------------------------
# Bulk Operations Endpoints
# ------------------------------------------------------------------

@router.post("/bulk/templates/delete")
async def bulk_delete_templates(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Delete multiple templates in bulk."""
    template_ids = payload.get("templateIds", [])
    if not template_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No template IDs provided")

    deleted = []
    failed = []

    for tid in template_ids:
        try:
            state_store.delete_template(tid)
            deleted.append(tid)
            state_store.log_activity(
                action="template_deleted",
                entity_type="template",
                entity_id=tid,
            )
        except Exception as e:
            failed.append({"id": tid, "error": str(e)})

    return {
        "deleted": deleted,
        "deletedCount": len(deleted),
        "failed": failed,
        "failedCount": len(failed),
    }


@router.post("/bulk/templates/update-status")
async def bulk_update_template_status(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update status for multiple templates."""
    template_ids = payload.get("templateIds", [])
    status = payload.get("status")

    if not template_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No template IDs provided")
    if not status:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Status is required")

    updated = []
    failed = []

    for tid in template_ids:
        try:
            record = state_store.get_template_record(tid)
            if not record:
                failed.append({"id": tid, "error": "Template not found"})
                continue

            state_store.upsert_template(
                tid,
                name=record.get("name") or tid,
                status=status,
                artifacts=record.get("artifacts"),
                tags=record.get("tags"),
                connection_id=record.get("last_connection_id"),
                mapping_keys=record.get("mapping_keys"),
                template_type=record.get("kind"),
                description=record.get("description"),
            )
            updated.append(tid)
            state_store.log_activity(
                action="template_status_updated",
                entity_type="template",
                entity_id=tid,
                details={"status": status},
            )
        except Exception as e:
            failed.append({"id": tid, "error": str(e)})

    return {
        "updated": updated,
        "updatedCount": len(updated),
        "failed": failed,
        "failedCount": len(failed),
    }


@router.post("/bulk/templates/add-tags")
async def bulk_add_tags(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Add tags to multiple templates."""
    template_ids = payload.get("templateIds", [])
    tags_to_add = payload.get("tags", [])

    if not template_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No template IDs provided")
    if not tags_to_add:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No tags provided")

    updated = []
    failed = []

    for tid in template_ids:
        try:
            record = state_store.get_template_record(tid)
            if not record:
                failed.append({"id": tid, "error": "Template not found"})
                continue

            existing_tags = list(record.get("tags") or [])
            merged_tags = sorted(set(existing_tags + tags_to_add))

            state_store.upsert_template(
                tid,
                name=record.get("name") or tid,
                status=record.get("status") or "draft",
                artifacts=record.get("artifacts"),
                tags=merged_tags,
                connection_id=record.get("last_connection_id"),
                mapping_keys=record.get("mapping_keys"),
                template_type=record.get("kind"),
                description=record.get("description"),
            )
            updated.append(tid)
        except Exception as e:
            failed.append({"id": tid, "error": str(e)})

    return {
        "updated": updated,
        "updatedCount": len(updated),
        "failed": failed,
        "failedCount": len(failed),
    }


@router.post("/bulk/jobs/cancel")
async def bulk_cancel_jobs(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Cancel multiple jobs."""
    job_ids = payload.get("jobIds", [])
    if not job_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No job IDs provided")

    cancelled = []
    failed = []

    for jid in job_ids:
        try:
            job = state_store.get_job(jid)
            if not job:
                failed.append({"id": jid, "error": "Job not found"})
                continue

            status = _normalize_job_status(job.get("status"))
            if status in ("completed", "failed", "cancelled"):
                failed.append({"id": jid, "error": f"Cannot cancel job with status: {status}"})
                continue

            state_store.update_job(jid, status="cancelled")
            cancelled.append(jid)
            state_store.log_activity(
                action="job_cancelled",
                entity_type="job",
                entity_id=jid,
            )
        except Exception as e:
            failed.append({"id": jid, "error": str(e)})

    return {
        "cancelled": cancelled,
        "cancelledCount": len(cancelled),
        "failed": failed,
        "failedCount": len(failed),
    }


@router.post("/bulk/jobs/delete")
async def bulk_delete_jobs(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Delete multiple jobs from history."""
    job_ids = payload.get("jobIds", [])
    if not job_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No job IDs provided")

    deleted = []
    failed = []

    for jid in job_ids:
        try:
            state_store.delete_job(jid)
            deleted.append(jid)
        except Exception as e:
            failed.append({"id": jid, "error": str(e)})

    return {
        "deleted": deleted,
        "deletedCount": len(deleted),
        "failed": failed,
        "failedCount": len(failed),
    }
