"""Unified error hierarchy for the entire backend.

All domain-specific errors inherit from NeuraError.
Each error has a code, message, and optional details.
This replaces scattered HTTPException usage in business logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class NeuraError(Exception):
    """Base error type for all NeuraReport errors."""

    code: str = field(init=False, default="error")
    message: str
    details: Optional[Dict[str, Any]] = field(default=None)
    cause: Optional[Exception] = field(default=None, repr=False)

    def __str__(self) -> str:
        if self.details:
            return f"[{self.code}] {self.message} - {self.details}"
        return f"[{self.code}] {self.message}"

    def to_dict(self) -> Dict[str, Any]:
        result = {"code": self.code, "message": self.message}
        if self.details:
            result["details"] = self.details
        return result


@dataclass(frozen=True)
class ValidationError(NeuraError):
    """Raised when input validation fails."""

    code: str = field(init=False, default="validation_error")


@dataclass(frozen=True)
class NotFoundError(NeuraError):
    """Raised when a requested resource does not exist."""

    code: str = field(init=False, default="not_found")


@dataclass(frozen=True)
class ConflictError(NeuraError):
    """Raised when an operation conflicts with current state."""

    code: str = field(init=False, default="conflict")


@dataclass(frozen=True)
class ExternalServiceError(NeuraError):
    """Raised when an external service (LLM, email, etc.) fails."""

    code: str = field(init=False, default="external_service_error")
    service: str = field(default="unknown")


@dataclass(frozen=True)
class ConfigurationError(NeuraError):
    """Raised when system configuration is invalid."""

    code: str = field(init=False, default="configuration_error")


@dataclass(frozen=True)
class PipelineError(NeuraError):
    """Raised when a pipeline step fails."""

    code: str = field(init=False, default="pipeline_error")
    step: str = field(default="unknown")


@dataclass(frozen=True)
class DataSourceError(NeuraError):
    """Raised when data source operations fail."""

    code: str = field(init=False, default="data_source_error")


@dataclass(frozen=True)
class RenderError(NeuraError):
    """Raised when rendering fails."""

    code: str = field(init=False, default="render_error")
    format: str = field(default="unknown")
