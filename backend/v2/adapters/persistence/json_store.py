"""
JSON file-based state store implementation.

This is a migration-compatible adapter that wraps the existing
StateStore to provide the new repository interfaces.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional

from ...core import Result, Ok, Err, DomainError, NotFoundError
from ...domain.templates import Template, TemplateArtifacts, TemplateStatus, TemplateKind
from ...domain.connections import Connection, ConnectionConfig, ConnectionStatus, DatabaseType
from ...domain.jobs import Job, JobStep, JobStatus, StepStatus, Schedule, ScheduleFrequency
from .base import TemplateRepository, ConnectionRepository, JobRepository, ScheduleRepository

logger = logging.getLogger("neura.adapters.json_store")


class JsonTemplateRepository(TemplateRepository):
    """JSON-backed template repository using existing StateStore."""

    def __init__(self, state_store):
        self._store = state_store

    async def get(self, id: str) -> Optional[Template]:
        record = self._store.get_template_record(id)
        if not record:
            return None
        return self._to_entity(record)

    async def get_by_name(self, name: str) -> Optional[Template]:
        templates = self._store.list_templates()
        for record in templates:
            if record.get("name") == name:
                return self._to_entity(record)
        return None

    async def list(self, **filters) -> List[Template]:
        records = self._store.list_templates()
        templates = [self._to_entity(r) for r in records]

        # Apply filters
        if "status" in filters:
            templates = [t for t in templates if t.status.value == filters["status"]]
        if "kind" in filters:
            templates = [t for t in templates if t.kind.value == filters["kind"]]

        return templates

    async def list_by_status(self, status: str) -> List[Template]:
        return await self.list(status=status)

    async def save(self, entity: Template) -> Result[Template, DomainError]:
        try:
            self._store.upsert_template(
                entity.template_id,
                name=entity.name,
                status=entity.status.value,
                description=entity.description,
                tags=list(entity.tags),
                mapping_keys=list(entity.mapping_keys),
                template_type=entity.kind.value,
            )
            return Ok(entity)
        except Exception as e:
            return Err(DomainError(
                code="save_failed",
                message=f"Failed to save template: {e}",
                cause=e,
            ))

    async def delete(self, id: str) -> Result[bool, DomainError]:
        if self._store.delete_template(id):
            return Ok(True)
        return Err(NotFoundError(
            code="not_found",
            message=f"Template {id} not found",
            resource_type="template",
            resource_id=id,
        ))

    def _to_entity(self, record: dict) -> Template:
        """Convert state store record to domain entity."""
        artifacts_data = record.get("artifacts") or {}
        artifacts = TemplateArtifacts(
            html_path=Path(artifacts_data["html"]) if artifacts_data.get("html") else None,
            css_path=Path(artifacts_data["css"]) if artifacts_data.get("css") else None,
            contract_path=Path(artifacts_data["contract"]) if artifacts_data.get("contract") else None,
            preview_path=Path(artifacts_data["preview"]) if artifacts_data.get("preview") else None,
        )

        return Template(
            template_id=record.get("id", ""),
            name=record.get("name", ""),
            status=TemplateStatus(record.get("status", "draft")),
            kind=TemplateKind(record.get("kind", "pdf")),
            description=record.get("description", ""),
            tags=tuple(record.get("tags", [])),
            mapping_keys=tuple(record.get("mappingKeys", [])),
            artifacts=artifacts,
            last_connection_id=record.get("lastConnectionId"),
            created_at=datetime.fromisoformat(record["createdAt"]) if record.get("createdAt") else None,
            updated_at=datetime.fromisoformat(record["updatedAt"]) if record.get("updatedAt") else None,
            last_run_at=datetime.fromisoformat(record["lastRunAt"]) if record.get("lastRunAt") else None,
        )


class JsonConnectionRepository(ConnectionRepository):
    """JSON-backed connection repository."""

    def __init__(self, state_store):
        self._store = state_store

    async def get(self, id: str) -> Optional[Connection]:
        record = self._store.get_connection_record(id)
        if not record:
            return None
        return self._to_entity(record)

    async def list(self, **filters) -> List[Connection]:
        records = self._store.list_connections()
        connections = [self._to_entity(r) for r in records]

        if "status" in filters:
            connections = [c for c in connections if c.status.value == filters["status"]]
        if "db_type" in filters:
            connections = [c for c in connections if c.db_type.value == filters["db_type"]]

        return connections

    async def save(self, entity: Connection) -> Result[Connection, DomainError]:
        try:
            self._store.upsert_connection(
                conn_id=entity.connection_id,
                name=entity.name,
                db_type=entity.config.db_type.value,
                database_path=entity.config.database_path or "",
                secret_payload=None,  # Handled separately via save_secrets
                status=entity.status.value,
                tags=list(entity.tags),
            )
            return Ok(entity)
        except Exception as e:
            return Err(DomainError(
                code="save_failed",
                message=f"Failed to save connection: {e}",
                cause=e,
            ))

    async def delete(self, id: str) -> Result[bool, DomainError]:
        if self._store.delete_connection(id):
            return Ok(True)
        return Err(NotFoundError(
            code="not_found",
            message=f"Connection {id} not found",
            resource_type="connection",
            resource_id=id,
        ))

    async def get_secrets(self, id: str) -> Optional[dict]:
        return self._store.get_connection_secrets(id)

    async def save_secrets(self, id: str, secrets: dict) -> Result[bool, DomainError]:
        record = self._store.get_connection_record(id)
        if not record:
            return Err(NotFoundError(
                code="not_found",
                message=f"Connection {id} not found",
                resource_type="connection",
                resource_id=id,
            ))

        try:
            self._store.upsert_connection(
                conn_id=id,
                name=record.get("name", ""),
                db_type=record.get("db_type", "sqlite"),
                database_path=record.get("database_path", ""),
                secret_payload=secrets,
            )
            return Ok(True)
        except Exception as e:
            return Err(DomainError(
                code="save_failed",
                message=f"Failed to save secrets: {e}",
                cause=e,
            ))

    async def update_status(
        self,
        id: str,
        status: str,
        latency_ms: Optional[float] = None,
        error: Optional[str] = None,
    ) -> Result[Connection, DomainError]:
        self._store.record_connection_ping(
            id,
            status=status,
            detail=error,
            latency_ms=latency_ms,
        )
        conn = await self.get(id)
        if conn:
            return Ok(conn)
        return Err(NotFoundError(
            code="not_found",
            message=f"Connection {id} not found",
            resource_type="connection",
            resource_id=id,
        ))

    def _to_entity(self, record: dict) -> Connection:
        config = ConnectionConfig(
            db_type=DatabaseType(record.get("db_type", "sqlite")),
            database_path=record.get("database_path"),
        )

        return Connection(
            connection_id=record.get("id", ""),
            name=record.get("name", ""),
            config=config,
            status=ConnectionStatus(record.get("status", "unknown")),
            tags=tuple(record.get("tags", [])),
            last_connected_at=datetime.fromisoformat(record["lastConnected"]) if record.get("lastConnected") else None,
            last_latency_ms=record.get("lastLatencyMs"),
            last_error=record.get("details"),
            created_at=datetime.fromisoformat(record["createdAt"]) if record.get("createdAt") else None,
            updated_at=datetime.fromisoformat(record["updatedAt"]) if record.get("updatedAt") else None,
        )


class JsonJobRepository(JobRepository):
    """JSON-backed job repository."""

    def __init__(self, state_store):
        self._store = state_store

    async def get(self, id: str) -> Optional[Job]:
        record = self._store.get_job(id)
        if not record:
            return None
        return self._to_entity(record)

    async def list(self, **filters) -> List[Job]:
        statuses = filters.get("statuses")
        types = filters.get("types")
        limit = filters.get("limit", 50)
        active_only = filters.get("active_only", False)

        records = self._store.list_jobs(
            statuses=statuses,
            types=types,
            limit=limit,
            active_only=active_only,
        )
        return [self._to_entity(r) for r in records]

    async def list_active(self) -> List[Job]:
        return await self.list(active_only=True)

    async def save(self, entity: Job) -> Result[Job, DomainError]:
        # Jobs are created via create_job, not save
        try:
            self._store.create_job(
                job_type=entity.job_type,
                template_id=entity.template_id,
                connection_id=entity.connection_id,
                template_name=entity.template_name,
                template_kind=entity.template_kind,
                schedule_id=entity.schedule_id,
                correlation_id=entity.correlation_id,
                steps=[{"name": s.name, "label": s.label} for s in entity.steps],
                meta=entity.meta,
            )
            return Ok(entity)
        except Exception as e:
            return Err(DomainError(
                code="save_failed",
                message=f"Failed to save job: {e}",
                cause=e,
            ))

    async def delete(self, id: str) -> Result[bool, DomainError]:
        # Jobs are typically not deleted, they are completed
        return Err(DomainError(
            code="not_supported",
            message="Jobs cannot be deleted",
        ))

    async def update_status(
        self,
        id: str,
        status: str,
        progress: Optional[float] = None,
        error: Optional[str] = None,
        result: Optional[dict] = None,
    ) -> Result[Job, DomainError]:
        if status == "running":
            self._store.record_job_start(id)
            if progress is not None:
                self._store.record_job_progress(id, progress)
        elif status in ("succeeded", "failed", "cancelled"):
            self._store.record_job_completion(
                id,
                status=status,
                error=error,
                result=result,
            )
        elif progress is not None:
            self._store.record_job_progress(id, progress)

        job = await self.get(id)
        if job:
            return Ok(job)
        return Err(NotFoundError(
            code="not_found",
            message=f"Job {id} not found",
            resource_type="job",
            resource_id=id,
        ))

    async def update_step(
        self,
        job_id: str,
        step_name: str,
        status: str,
        progress: Optional[float] = None,
        error: Optional[str] = None,
    ) -> Result[Job, DomainError]:
        self._store.record_job_step(
            job_id,
            step_name,
            status=status,
            progress=progress,
            error=error,
        )
        job = await self.get(job_id)
        if job:
            return Ok(job)
        return Err(NotFoundError(
            code="not_found",
            message=f"Job {job_id} not found",
            resource_type="job",
            resource_id=job_id,
        ))

    def _to_entity(self, record: dict) -> Job:
        steps = []
        for step_data in record.get("steps", []):
            steps.append(JobStep(
                step_id=step_data.get("id", ""),
                name=step_data.get("name", ""),
                label=step_data.get("label", ""),
                status=StepStatus(step_data.get("status", "queued")),
                progress=step_data.get("progress", 0),
                error=step_data.get("error"),
                started_at=datetime.fromisoformat(step_data["startedAt"]) if step_data.get("startedAt") else None,
                finished_at=datetime.fromisoformat(step_data["finishedAt"]) if step_data.get("finishedAt") else None,
            ))

        return Job(
            job_id=record.get("id", ""),
            job_type=record.get("type", "run_report"),
            status=JobStatus(record.get("status", "queued")),
            progress=record.get("progress", 0),
            steps=tuple(steps),
            template_id=record.get("templateId"),
            template_name=record.get("templateName"),
            template_kind=record.get("templateKind", "pdf"),
            connection_id=record.get("connectionId"),
            schedule_id=record.get("scheduleId"),
            correlation_id=record.get("correlationId"),
            error=record.get("error"),
            result=record.get("result", {}),
            created_at=datetime.fromisoformat(record["createdAt"]) if record.get("createdAt") else None,
            queued_at=datetime.fromisoformat(record["queuedAt"]) if record.get("queuedAt") else None,
            started_at=datetime.fromisoformat(record["startedAt"]) if record.get("startedAt") else None,
            finished_at=datetime.fromisoformat(record["finishedAt"]) if record.get("finishedAt") else None,
        )


class JsonScheduleRepository(ScheduleRepository):
    """JSON-backed schedule repository."""

    def __init__(self, state_store):
        self._store = state_store

    async def get(self, id: str) -> Optional[Schedule]:
        record = self._store.get_schedule(id)
        if not record:
            return None
        return self._to_entity(record)

    async def list(self, **filters) -> List[Schedule]:
        records = self._store.list_schedules()
        schedules = [self._to_entity(r) for r in records]

        if filters.get("active_only"):
            schedules = [s for s in schedules if s.active]

        return schedules

    async def list_active(self) -> List[Schedule]:
        return await self.list(active_only=True)

    async def list_due(self) -> List[Schedule]:
        schedules = await self.list_active()
        now = datetime.now()
        return [s for s in schedules if s.next_run_at and s.next_run_at <= now]

    async def save(self, entity: Schedule) -> Result[Schedule, DomainError]:
        try:
            self._store.create_schedule(
                name=entity.name,
                template_id=entity.template_id,
                template_name=entity.template_name,
                template_kind=entity.template_kind,
                connection_id=entity.connection_id,
                connection_name=entity.connection_name,
                start_date=entity.start_date or "",
                end_date=entity.end_date or "",
                key_values=dict(entity.key_values),
                batch_ids=list(entity.batch_ids),
                docx=entity.generate_docx,
                xlsx=entity.generate_xlsx,
                email_recipients=list(entity.email_recipients),
                email_subject=entity.email_subject,
                email_message=entity.email_message,
                frequency=entity.frequency.value,
                interval_minutes=entity.interval_minutes,
                next_run_at=entity.next_run_at.isoformat() if entity.next_run_at else "",
                first_run_at=entity.first_run_at.isoformat() if entity.first_run_at else "",
                active=entity.active,
            )
            return Ok(entity)
        except Exception as e:
            return Err(DomainError(
                code="save_failed",
                message=f"Failed to save schedule: {e}",
                cause=e,
            ))

    async def delete(self, id: str) -> Result[bool, DomainError]:
        if self._store.delete_schedule(id):
            return Ok(True)
        return Err(NotFoundError(
            code="not_found",
            message=f"Schedule {id} not found",
            resource_type="schedule",
            resource_id=id,
        ))

    async def record_run(
        self,
        id: str,
        status: str,
        error: Optional[str] = None,
        artifacts: Optional[dict] = None,
    ) -> Result[Schedule, DomainError]:
        now = datetime.now()
        schedule = await self.get(id)
        if not schedule:
            return Err(NotFoundError(
                code="not_found",
                message=f"Schedule {id} not found",
                resource_type="schedule",
                resource_id=id,
            ))

        next_run = schedule.compute_next_run(now)
        self._store.record_schedule_run(
            id,
            started_at=now.isoformat(),
            finished_at=now.isoformat(),
            status=status,
            next_run_at=next_run.isoformat(),
            error=error,
            artifacts=artifacts,
        )

        updated = await self.get(id)
        return Ok(updated) if updated else Err(NotFoundError(
            code="not_found",
            message=f"Schedule {id} not found after update",
            resource_type="schedule",
            resource_id=id,
        ))

    def _to_entity(self, record: dict) -> Schedule:
        return Schedule(
            schedule_id=record.get("id", ""),
            name=record.get("name", ""),
            template_id=record.get("template_id", ""),
            template_name=record.get("template_name", ""),
            template_kind=record.get("template_kind", "pdf"),
            connection_id=record.get("connection_id"),
            connection_name=record.get("connection_name"),
            frequency=ScheduleFrequency(record.get("frequency", "daily")),
            interval_minutes=record.get("interval_minutes", 1440),
            active=record.get("active", True),
            start_date=record.get("start_date"),
            end_date=record.get("end_date"),
            key_values=record.get("key_values", {}),
            batch_ids=tuple(record.get("batch_ids", [])),
            generate_docx=record.get("docx", False),
            generate_xlsx=record.get("xlsx", False),
            email_recipients=tuple(record.get("email_recipients", [])),
            email_subject=record.get("email_subject"),
            email_message=record.get("email_message"),
            first_run_at=datetime.fromisoformat(record["first_run_at"]) if record.get("first_run_at") else None,
            next_run_at=datetime.fromisoformat(record["next_run_at"]) if record.get("next_run_at") else None,
            last_run_at=datetime.fromisoformat(record["last_run_at"]) if record.get("last_run_at") else None,
            last_run_status=record.get("last_run_status"),
            last_run_error=record.get("last_run_error"),
            last_run_artifacts=record.get("last_run_artifacts", {}),
            created_at=datetime.fromisoformat(record["created_at"]) if record.get("created_at") else None,
            updated_at=datetime.fromisoformat(record["updated_at"]) if record.get("updated_at") else None,
        )


class JsonStateStore:
    """
    Unified JSON state store providing all repositories.

    This is the migration bridge - it wraps the existing StateStore
    and provides the new repository interfaces.
    """

    def __init__(self, state_store):
        """
        Initialize with the existing StateStore instance.

        Usage:
            from backend.app.services.state import state_store
            json_store = JsonStateStore(state_store)
        """
        self._store = state_store
        self.templates = JsonTemplateRepository(state_store)
        self.connections = JsonConnectionRepository(state_store)
        self.jobs = JsonJobRepository(state_store)
        self.schedules = JsonScheduleRepository(state_store)
