"""
Persistence adapters - Data storage interfaces and implementations.
"""

from .base import (
    Repository,
    TemplateRepository,
    ConnectionRepository,
    JobRepository,
    ScheduleRepository,
)
from .json_store import JsonStateStore

__all__ = [
    "Repository",
    "TemplateRepository",
    "ConnectionRepository",
    "JobRepository",
    "ScheduleRepository",
    "JsonStateStore",
]
