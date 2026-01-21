"""Core cross-cutting concerns: Result types, Errors, Events, Config."""

from .result import Result, Ok, Err
from .errors import DomainError, ValidationError, NotFoundError, ConflictError
from .events import Event, EventBus, event_bus

__all__ = [
    "Result",
    "Ok",
    "Err",
    "DomainError",
    "ValidationError",
    "NotFoundError",
    "ConflictError",
    "Event",
    "EventBus",
    "event_bus",
]
