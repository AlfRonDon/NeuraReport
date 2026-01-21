"""
Event bus for decoupled communication.

Events are fire-and-forget notifications. Handlers can subscribe
to specific event types and react without coupling to the emitter.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, TypeVar
from uuid import uuid4

logger = logging.getLogger("neura.events")

E = TypeVar("E", bound="Event")


@dataclass
class Event:
    """Base event type."""

    event_type: str
    payload: dict[str, Any] = field(default_factory=dict)
    event_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    correlation_id: str | None = None

    def with_correlation(self, correlation_id: str) -> Event:
        """Return a copy with the correlation ID set."""
        return Event(
            event_type=self.event_type,
            payload=self.payload,
            event_id=self.event_id,
            timestamp=self.timestamp,
            correlation_id=correlation_id,
        )


# Specific event types
@dataclass
class JobStartedEvent(Event):
    """Emitted when a job starts execution."""

    def __init__(self, job_id: str, job_type: str, **kwargs):
        super().__init__(
            event_type="job.started",
            payload={"job_id": job_id, "job_type": job_type, **kwargs},
        )


@dataclass
class JobCompletedEvent(Event):
    """Emitted when a job completes successfully."""

    def __init__(self, job_id: str, result: dict[str, Any], **kwargs):
        super().__init__(
            event_type="job.completed",
            payload={"job_id": job_id, "result": result, **kwargs},
        )


@dataclass
class JobFailedEvent(Event):
    """Emitted when a job fails."""

    def __init__(self, job_id: str, error: str, **kwargs):
        super().__init__(
            event_type="job.failed",
            payload={"job_id": job_id, "error": error, **kwargs},
        )


@dataclass
class StepStartedEvent(Event):
    """Emitted when a pipeline step starts."""

    def __init__(self, job_id: str, step_name: str, **kwargs):
        super().__init__(
            event_type="step.started",
            payload={"job_id": job_id, "step_name": step_name, **kwargs},
        )


@dataclass
class StepCompletedEvent(Event):
    """Emitted when a pipeline step completes."""

    def __init__(self, job_id: str, step_name: str, **kwargs):
        super().__init__(
            event_type="step.completed",
            payload={"job_id": job_id, "step_name": step_name, **kwargs},
        )


@dataclass
class TemplateImportedEvent(Event):
    """Emitted when a template is imported."""

    def __init__(self, template_id: str, name: str, **kwargs):
        super().__init__(
            event_type="template.imported",
            payload={"template_id": template_id, "name": name, **kwargs},
        )


@dataclass
class ReportGeneratedEvent(Event):
    """Emitted when a report is generated."""

    def __init__(self, template_id: str, artifacts: dict[str, str], **kwargs):
        super().__init__(
            event_type="report.generated",
            payload={"template_id": template_id, "artifacts": artifacts, **kwargs},
        )


EventHandler = Callable[[Event], Coroutine[Any, Any, None]] | Callable[[Event], None]


class EventBus:
    """
    Simple in-process event bus.

    Supports both sync and async handlers. Handlers are called
    in the order they were registered.
    """

    def __init__(self):
        self._handlers: dict[str, list[EventHandler]] = {}
        self._global_handlers: list[EventHandler] = []

    def subscribe(self, event_type: str, handler: EventHandler) -> Callable[[], None]:
        """
        Subscribe to a specific event type.
        Returns an unsubscribe function.
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

        def unsubscribe():
            self._handlers[event_type].remove(handler)

        return unsubscribe

    def subscribe_all(self, handler: EventHandler) -> Callable[[], None]:
        """Subscribe to all events."""
        self._global_handlers.append(handler)

        def unsubscribe():
            self._global_handlers.remove(handler)

        return unsubscribe

    async def emit(self, event: Event) -> None:
        """Emit an event to all subscribers."""
        handlers = list(self._global_handlers)
        handlers.extend(self._handlers.get(event.event_type, []))

        for handler in handlers:
            try:
                result = handler(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.exception(
                    f"Event handler failed for {event.event_type}: {e}",
                    extra={"event_id": event.event_id, "event_type": event.event_type},
                )

    def emit_sync(self, event: Event) -> None:
        """Emit an event synchronously (for non-async contexts)."""
        handlers = list(self._global_handlers)
        handlers.extend(self._handlers.get(event.event_type, []))

        for handler in handlers:
            try:
                result = handler(event)
                if asyncio.iscoroutine(result):
                    # Schedule but don't await
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(result)
                    except RuntimeError:
                        # No running loop, create one just for this
                        asyncio.run(result)
            except Exception as e:
                logger.exception(
                    f"Event handler failed for {event.event_type}: {e}",
                    extra={"event_id": event.event_id, "event_type": event.event_type},
                )


# Global event bus instance
event_bus = EventBus()
