"""
Adapters - IO layer for external systems.

All side effects live here. The domain layer remains pure.
"""

from .persistence import (
    TemplateRepository,
    ConnectionRepository,
    JobRepository,
    ScheduleRepository,
)
from .databases import DataSource, DataSourceFactory
from .rendering import Renderer, PDFRenderer, DOCXRenderer
from .llm import LLMClient, LLMResponse
from .notifications import Notifier, EmailNotifier

__all__ = [
    # Persistence
    "TemplateRepository",
    "ConnectionRepository",
    "JobRepository",
    "ScheduleRepository",
    # Databases
    "DataSource",
    "DataSourceFactory",
    # Rendering
    "Renderer",
    "PDFRenderer",
    "DOCXRenderer",
    # LLM
    "LLMClient",
    "LLMResponse",
    # Notifications
    "Notifier",
    "EmailNotifier",
]
