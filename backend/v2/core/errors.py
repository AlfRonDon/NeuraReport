"""
Domain error types.

All errors are explicit, typed, and carry structured information.
No generic Exception catches - every error path is intentional.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(frozen=True)
class DomainError:
    """Base error type for all domain errors."""

    code: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    cause: Optional[Exception] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to API response format."""
        result = {
            "code": self.code,
            "message": self.message,
        }
        if self.details:
            result["details"] = self.details
        return result


@dataclass(frozen=True)
class ValidationError(DomainError):
    """Input validation failed."""

    field: Optional[str] = None

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "validation_error")


@dataclass(frozen=True)
class NotFoundError(DomainError):
    """Resource not found."""

    resource_type: str = ""
    resource_id: str = ""

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "not_found")


@dataclass(frozen=True)
class ConflictError(DomainError):
    """Resource conflict (e.g., already exists, locked)."""

    resource_type: str = ""
    resource_id: str = ""

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "conflict")


@dataclass(frozen=True)
class IOError(DomainError):
    """External IO operation failed (DB, file, network)."""

    operation: str = ""

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "io_error")


@dataclass(frozen=True)
class LLMError(DomainError):
    """LLM operation failed."""

    provider: str = ""
    model: str = ""

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "llm_error")


@dataclass(frozen=True)
class RenderError(DomainError):
    """Document rendering failed."""

    format: str = ""
    stage: str = ""

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "render_error")


@dataclass(frozen=True)
class PipelineError(DomainError):
    """Pipeline execution failed."""

    step: str = ""
    pipeline: str = ""

    def __post_init__(self):
        if not self.code:
            object.__setattr__(self, "code", "pipeline_error")
