"""
Report entities - Immutable data structures for report generation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class OutputFormat(str, Enum):
    """Supported output formats."""

    HTML = "html"
    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"


@dataclass(frozen=True)
class Batch:
    """
    A batch represents a set of data for one report instance.

    When generating reports with batch keys, each batch produces
    one output file (e.g., one PDF per customer).
    """

    batch_id: str
    batch_key: str  # The column used for batching
    batch_value: Any  # The value for this batch
    row_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    def __hash__(self):
        return hash((self.batch_id, self.batch_key, str(self.batch_value)))


@dataclass(frozen=True)
class RenderOutput:
    """Result of rendering a report to a specific format."""

    format: OutputFormat
    path: Path
    size_bytes: int
    page_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None and self.path.exists()

    def to_dict(self) -> dict[str, Any]:
        return {
            "format": self.format.value,
            "path": str(self.path),
            "size_bytes": self.size_bytes,
            "page_count": self.page_count,
            "success": self.success,
            "error": self.error,
        }


@dataclass(frozen=True)
class ReportConfig:
    """Configuration for a report generation run."""

    template_id: str
    connection_id: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    batch_ids: tuple[str, ...] = ()
    key_values: dict[str, Any] = field(default_factory=dict)
    output_formats: tuple[OutputFormat, ...] = (OutputFormat.PDF,)
    output_dir: Path | None = None

    # Email settings
    email_recipients: tuple[str, ...] = ()
    email_subject: str | None = None
    email_message: str | None = None

    # Schedule info
    schedule_id: str | None = None
    schedule_name: str | None = None

    def with_formats(self, *formats: OutputFormat) -> ReportConfig:
        """Return config with specified output formats."""
        return ReportConfig(
            template_id=self.template_id,
            connection_id=self.connection_id,
            start_date=self.start_date,
            end_date=self.end_date,
            batch_ids=self.batch_ids,
            key_values=self.key_values,
            output_formats=formats,
            output_dir=self.output_dir,
            email_recipients=self.email_recipients,
            email_subject=self.email_subject,
            email_message=self.email_message,
            schedule_id=self.schedule_id,
            schedule_name=self.schedule_name,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "template_id": self.template_id,
            "connection_id": self.connection_id,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "batch_ids": list(self.batch_ids),
            "key_values": dict(self.key_values),
            "output_formats": [f.value for f in self.output_formats],
            "email_recipients": list(self.email_recipients),
            "schedule_id": self.schedule_id,
        }


@dataclass(frozen=True)
class Report:
    """
    A completed report with all its outputs.

    This represents the final result of a report generation run,
    including all rendered formats and metadata.
    """

    report_id: str
    config: ReportConfig
    batches: tuple[Batch, ...] = ()
    outputs: tuple[RenderOutput, ...] = ()
    created_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None and all(o.success for o in self.outputs)

    @property
    def html_output(self) -> RenderOutput | None:
        for o in self.outputs:
            if o.format == OutputFormat.HTML:
                return o
        return None

    @property
    def pdf_output(self) -> RenderOutput | None:
        for o in self.outputs:
            if o.format == OutputFormat.PDF:
                return o
        return None

    def get_output(self, format: OutputFormat) -> RenderOutput | None:
        for o in self.outputs:
            if o.format == format:
                return o
        return None

    def with_outputs(self, *outputs: RenderOutput) -> Report:
        """Return report with additional outputs."""
        return Report(
            report_id=self.report_id,
            config=self.config,
            batches=self.batches,
            outputs=self.outputs + outputs,
            created_at=self.created_at,
            completed_at=self.completed_at,
            error=self.error,
        )

    def with_error(self, error: str) -> Report:
        """Return report marked as failed."""
        return Report(
            report_id=self.report_id,
            config=self.config,
            batches=self.batches,
            outputs=self.outputs,
            created_at=self.created_at,
            completed_at=self.completed_at,
            error=error,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "report_id": self.report_id,
            "config": self.config.to_dict(),
            "batches": [
                {
                    "batch_id": b.batch_id,
                    "batch_key": b.batch_key,
                    "batch_value": b.batch_value,
                    "row_count": b.row_count,
                }
                for b in self.batches
            ],
            "outputs": [o.to_dict() for o in self.outputs],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "success": self.success,
            "error": self.error,
        }
