"""
Job entities - Job tracking and scheduling data structures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional


class JobStatus(str, Enum):
    """Job lifecycle status."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"

    @property
    def is_terminal(self) -> bool:
        return self in (JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED)


class StepStatus(str, Enum):
    """Step lifecycle status."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"


class ScheduleFrequency(str, Enum):
    """How often a schedule runs."""

    ONCE = "once"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


@dataclass(frozen=True)
class JobStep:
    """
    A single step within a job.

    Steps are executed in order. If a step fails, the job fails.
    """

    step_id: str
    name: str
    label: str = ""
    status: StepStatus = StepStatus.QUEUED
    progress: float = 0.0
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None

    def with_status(
        self,
        status: StepStatus,
        progress: float | None = None,
        error: str | None = None,
    ) -> JobStep:
        """Return step with updated status."""
        now = datetime.now()
        return JobStep(
            step_id=self.step_id,
            name=self.name,
            label=self.label or self.name,
            status=status,
            progress=progress if progress is not None else (100.0 if status == StepStatus.SUCCEEDED else self.progress),
            error=error,
            started_at=now if status == StepStatus.RUNNING and not self.started_at else self.started_at,
            finished_at=now if status.value in ("succeeded", "failed", "skipped") else self.finished_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.step_id,
            "name": self.name,
            "label": self.label or self.name,
            "status": self.status.value,
            "progress": self.progress,
            "error": self.error,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "finishedAt": self.finished_at.isoformat() if self.finished_at else None,
        }


@dataclass(frozen=True)
class Job:
    """
    A background job with steps and progress tracking.

    Jobs represent async operations like report generation,
    template imports, or scheduled runs.
    """

    job_id: str
    job_type: str
    status: JobStatus = JobStatus.QUEUED
    progress: float = 0.0
    steps: tuple[JobStep, ...] = ()
    template_id: str | None = None
    template_name: str | None = None
    template_kind: str = "pdf"
    connection_id: str | None = None
    schedule_id: str | None = None
    correlation_id: str | None = None
    error: str | None = None
    result: dict[str, Any] = field(default_factory=dict)
    meta: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    queued_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None

    @property
    def is_active(self) -> bool:
        return not self.status.is_terminal

    @property
    def duration_seconds(self) -> float | None:
        if not self.started_at:
            return None
        end = self.finished_at or datetime.now()
        return (end - self.started_at).total_seconds()

    def with_status(
        self,
        status: JobStatus,
        progress: float | None = None,
        error: str | None = None,
        result: dict[str, Any] | None = None,
    ) -> Job:
        """Return job with updated status."""
        now = datetime.now()
        return Job(
            job_id=self.job_id,
            job_type=self.job_type,
            status=status,
            progress=progress if progress is not None else (100.0 if status == JobStatus.SUCCEEDED else self.progress),
            steps=self.steps,
            template_id=self.template_id,
            template_name=self.template_name,
            template_kind=self.template_kind,
            connection_id=self.connection_id,
            schedule_id=self.schedule_id,
            correlation_id=self.correlation_id,
            error=error,
            result=result if result is not None else self.result,
            meta=self.meta,
            created_at=self.created_at,
            queued_at=self.queued_at,
            started_at=now if status == JobStatus.RUNNING and not self.started_at else self.started_at,
            finished_at=now if status.is_terminal else self.finished_at,
        )

    def with_step_update(self, step_name: str, **updates) -> Job:
        """Return job with a step updated."""
        new_steps: list[JobStep] = []
        for step in self.steps:
            if step.name == step_name:
                new_steps.append(step.with_status(**updates))
            else:
                new_steps.append(step)
        return Job(
            job_id=self.job_id,
            job_type=self.job_type,
            status=self.status,
            progress=self.progress,
            steps=tuple(new_steps),
            template_id=self.template_id,
            template_name=self.template_name,
            template_kind=self.template_kind,
            connection_id=self.connection_id,
            schedule_id=self.schedule_id,
            correlation_id=self.correlation_id,
            error=self.error,
            result=self.result,
            meta=self.meta,
            created_at=self.created_at,
            queued_at=self.queued_at,
            started_at=self.started_at,
            finished_at=self.finished_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.job_id,
            "type": self.job_type,
            "status": self.status.value,
            "progress": self.progress,
            "steps": [s.to_dict() for s in self.steps],
            "templateId": self.template_id,
            "templateName": self.template_name,
            "templateKind": self.template_kind,
            "connectionId": self.connection_id,
            "scheduleId": self.schedule_id,
            "correlationId": self.correlation_id,
            "error": self.error,
            "result": self.result,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "queuedAt": self.queued_at.isoformat() if self.queued_at else None,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "finishedAt": self.finished_at.isoformat() if self.finished_at else None,
        }


@dataclass(frozen=True)
class Schedule:
    """
    A scheduled report run.

    Schedules define when and how often to generate reports.
    """

    schedule_id: str
    name: str
    template_id: str
    template_name: str
    template_kind: str = "pdf"
    connection_id: str | None = None
    connection_name: str | None = None
    frequency: ScheduleFrequency = ScheduleFrequency.DAILY
    interval_minutes: int = 1440  # Default 24 hours
    active: bool = True

    # Report parameters
    start_date: str | None = None
    end_date: str | None = None
    key_values: dict[str, Any] = field(default_factory=dict)
    batch_ids: tuple[str, ...] = ()

    # Output settings
    generate_docx: bool = False
    generate_xlsx: bool = False
    email_recipients: tuple[str, ...] = ()
    email_subject: str | None = None
    email_message: str | None = None

    # Timing
    first_run_at: datetime | None = None
    next_run_at: datetime | None = None
    last_run_at: datetime | None = None
    last_run_status: str | None = None
    last_run_error: str | None = None
    last_run_artifacts: dict[str, str] = field(default_factory=dict)

    created_at: datetime | None = None
    updated_at: datetime | None = None

    def compute_next_run(self, from_time: datetime | None = None) -> datetime:
        """Compute the next run time based on frequency."""
        base = from_time or datetime.now()

        if self.frequency == ScheduleFrequency.ONCE:
            return self.first_run_at or base

        if self.frequency == ScheduleFrequency.CUSTOM:
            return base + timedelta(minutes=self.interval_minutes)

        intervals = {
            ScheduleFrequency.HOURLY: timedelta(hours=1),
            ScheduleFrequency.DAILY: timedelta(days=1),
            ScheduleFrequency.WEEKLY: timedelta(weeks=1),
            ScheduleFrequency.MONTHLY: timedelta(days=30),
        }
        return base + intervals.get(self.frequency, timedelta(days=1))

    def with_run_result(
        self,
        status: str,
        error: str | None = None,
        artifacts: dict[str, str] | None = None,
    ) -> Schedule:
        """Return schedule with updated run result."""
        now = datetime.now()
        return Schedule(
            schedule_id=self.schedule_id,
            name=self.name,
            template_id=self.template_id,
            template_name=self.template_name,
            template_kind=self.template_kind,
            connection_id=self.connection_id,
            connection_name=self.connection_name,
            frequency=self.frequency,
            interval_minutes=self.interval_minutes,
            active=self.active,
            start_date=self.start_date,
            end_date=self.end_date,
            key_values=self.key_values,
            batch_ids=self.batch_ids,
            generate_docx=self.generate_docx,
            generate_xlsx=self.generate_xlsx,
            email_recipients=self.email_recipients,
            email_subject=self.email_subject,
            email_message=self.email_message,
            first_run_at=self.first_run_at,
            next_run_at=self.compute_next_run(now),
            last_run_at=now,
            last_run_status=status,
            last_run_error=error,
            last_run_artifacts=artifacts or {},
            created_at=self.created_at,
            updated_at=now,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.schedule_id,
            "name": self.name,
            "templateId": self.template_id,
            "templateName": self.template_name,
            "templateKind": self.template_kind,
            "connectionId": self.connection_id,
            "connectionName": self.connection_name,
            "frequency": self.frequency.value,
            "intervalMinutes": self.interval_minutes,
            "active": self.active,
            "startDate": self.start_date,
            "endDate": self.end_date,
            "keyValues": dict(self.key_values),
            "batchIds": list(self.batch_ids),
            "generateDocx": self.generate_docx,
            "generateXlsx": self.generate_xlsx,
            "emailRecipients": list(self.email_recipients),
            "emailSubject": self.email_subject,
            "emailMessage": self.email_message,
            "firstRunAt": self.first_run_at.isoformat() if self.first_run_at else None,
            "nextRunAt": self.next_run_at.isoformat() if self.next_run_at else None,
            "lastRunAt": self.last_run_at.isoformat() if self.last_run_at else None,
            "lastRunStatus": self.last_run_status,
            "lastRunError": self.last_run_error,
            "lastRunArtifacts": self.last_run_artifacts,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
