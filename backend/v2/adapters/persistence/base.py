"""
Repository interfaces - Abstract data access.

These interfaces define how domain entities are persisted.
Implementations can use JSON, SQLite, PostgreSQL, etc.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List

from ...core import Result, DomainError
from ...domain.templates import Template
from ...domain.connections import Connection
from ...domain.jobs import Job, Schedule

T = TypeVar("T")


class Repository(ABC, Generic[T]):
    """Base repository interface."""

    @abstractmethod
    async def get(self, id: str) -> Optional[T]:
        """Get entity by ID."""
        pass

    @abstractmethod
    async def list(self, **filters) -> List[T]:
        """List entities with optional filters."""
        pass

    @abstractmethod
    async def save(self, entity: T) -> Result[T, DomainError]:
        """Save or update an entity."""
        pass

    @abstractmethod
    async def delete(self, id: str) -> Result[bool, DomainError]:
        """Delete an entity by ID."""
        pass


class TemplateRepository(Repository[Template]):
    """Repository for templates."""

    @abstractmethod
    async def get_by_name(self, name: str) -> Optional[Template]:
        """Get template by name."""
        pass

    @abstractmethod
    async def list_by_status(self, status: str) -> List[Template]:
        """List templates with a specific status."""
        pass


class ConnectionRepository(Repository[Connection]):
    """Repository for database connections."""

    @abstractmethod
    async def get_secrets(self, id: str) -> Optional[dict]:
        """Get connection secrets (encrypted storage)."""
        pass

    @abstractmethod
    async def save_secrets(self, id: str, secrets: dict) -> Result[bool, DomainError]:
        """Save connection secrets."""
        pass

    @abstractmethod
    async def update_status(
        self,
        id: str,
        status: str,
        latency_ms: Optional[float] = None,
        error: Optional[str] = None,
    ) -> Result[Connection, DomainError]:
        """Update connection health status."""
        pass


class JobRepository(Repository[Job]):
    """Repository for jobs."""

    @abstractmethod
    async def list_active(self) -> List[Job]:
        """List non-terminal jobs."""
        pass

    @abstractmethod
    async def update_status(
        self,
        id: str,
        status: str,
        progress: Optional[float] = None,
        error: Optional[str] = None,
        result: Optional[dict] = None,
    ) -> Result[Job, DomainError]:
        """Update job status."""
        pass

    @abstractmethod
    async def update_step(
        self,
        job_id: str,
        step_name: str,
        status: str,
        progress: Optional[float] = None,
        error: Optional[str] = None,
    ) -> Result[Job, DomainError]:
        """Update a specific step within a job."""
        pass


class ScheduleRepository(Repository[Schedule]):
    """Repository for schedules."""

    @abstractmethod
    async def list_active(self) -> List[Schedule]:
        """List active schedules."""
        pass

    @abstractmethod
    async def list_due(self) -> List[Schedule]:
        """List schedules that are due to run."""
        pass

    @abstractmethod
    async def record_run(
        self,
        id: str,
        status: str,
        error: Optional[str] = None,
        artifacts: Optional[dict] = None,
    ) -> Result[Schedule, DomainError]:
        """Record a schedule run result."""
        pass
