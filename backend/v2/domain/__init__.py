"""
Domain layer - Pure business logic with no IO dependencies.

All entities here are immutable dataclasses. All operations are pure functions.
Side effects are handled by adapters, not domain code.
"""

from .contracts import Contract, Token, Mapping as ContractMapping
from .reports import Report, Batch, RenderOutput, ReportConfig
from .templates import Template, TemplateArtifacts
from .connections import Connection, ConnectionConfig
from .jobs import Job, JobStep, JobStatus, Schedule

__all__ = [
    "Contract",
    "Token",
    "ContractMapping",
    "Report",
    "Batch",
    "RenderOutput",
    "ReportConfig",
    "Template",
    "TemplateArtifacts",
    "Connection",
    "ConnectionConfig",
    "Job",
    "JobStep",
    "JobStatus",
    "Schedule",
]
