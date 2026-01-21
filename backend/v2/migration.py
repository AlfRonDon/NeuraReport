"""
Migration shim for gradual transition from v1 to v2.

This module provides compatibility layers that allow v1 code to
use v2 components and vice versa.

Usage:
    from backend.v2.migration import (
        v2_report_service,
        v2_template_service,
        migrate_state_store,
    )
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger("neura.migration")


class V2ReportService:
    """
    Drop-in replacement for src.services.report_service that uses v2 internals.

    This allows gradual migration of report generation to the new architecture.
    """

    def __init__(self, dependencies=None):
        self._deps = dependencies
        self._initialized = False

    def _ensure_initialized(self):
        if not self._initialized:
            if self._deps is None:
                from .api.dependencies import get_dependencies
                self._deps = get_dependencies()
            self._initialized = True

    async def run_report(
        self,
        template_id: str,
        connection_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        batch_ids: Optional[list] = None,
        key_values: Optional[dict] = None,
        pdf: bool = True,
        docx: bool = False,
        xlsx: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Run a report using v2 pipeline.

        Maintains v1 API signature for compatibility.
        """
        self._ensure_initialized()

        from .domain.reports import ReportConfig, OutputFormat
        from .pipelines import PipelineContext

        # Build output formats
        formats = []
        if pdf:
            formats.append(OutputFormat.PDF)
        if docx:
            formats.append(OutputFormat.DOCX)
        if xlsx:
            formats.append(OutputFormat.XLSX)
        if not formats:
            formats.append(OutputFormat.PDF)

        config = ReportConfig(
            template_id=template_id,
            connection_id=connection_id,
            start_date=start_date,
            end_date=end_date,
            batch_ids=tuple(batch_ids or []),
            key_values=key_values or {},
            output_formats=tuple(formats),
        )

        context = PipelineContext(data={
            "config": config,
            "template_repository": self._deps.template_repository,
            "connection_repository": self._deps.connection_repository,
            "pdf_renderer": self._deps.pdf_renderer,
            "docx_renderer": self._deps.docx_renderer,
            "notifier": self._deps.notifier,
            "output_dir": Path("output"),
        })

        from .pipelines import create_report_pipeline
        pipeline = create_report_pipeline(event_bus=self._deps.event_bus)

        result = await pipeline.execute(context)

        if result.success:
            return {
                "status": "ok",
                "html_path": str(context.get("html_path")),
                "pdf_path": str(context.get("pdf_path")) if context.get("pdf_path") else None,
                "docx_path": str(context.get("docx_path")) if context.get("docx_path") else None,
            }
        else:
            return {
                "status": "error",
                "error": str(result.error) if result.error else "Unknown error",
                "failed_step": result.failed_step,
            }


class V2TemplateService:
    """
    Drop-in replacement for src.services.template_service using v2 internals.
    """

    def __init__(self, dependencies=None):
        self._deps = dependencies
        self._initialized = False

    def _ensure_initialized(self):
        if not self._initialized:
            if self._deps is None:
                from .api.dependencies import get_dependencies
                self._deps = get_dependencies()
            self._initialized = True

    async def list_templates(self, status: Optional[str] = None) -> list:
        """List templates."""
        self._ensure_initialized()

        templates = await self._deps.template_repository.list()

        if status:
            templates = [t for t in templates if t.status.value == status.lower()]

        return [t.to_dict() for t in templates]

    async def get_template(self, template_id: str) -> Optional[dict]:
        """Get a template by ID."""
        self._ensure_initialized()

        template = await self._deps.template_repository.get(template_id)
        return template.to_dict() if template else None

    async def import_template(
        self,
        source: Path | bytes,
        name: Optional[str] = None,
    ) -> dict:
        """Import a template."""
        self._ensure_initialized()

        if isinstance(source, bytes):
            result = await self._deps.import_pipeline.import_from_bytes(source, name or "Imported")
        else:
            result = await self._deps.import_pipeline.import_from_path(source, name)

        from .core import Err
        if isinstance(result, Err):
            return {"status": "error", "error": result.error.message}

        return {"status": "ok", "template": result.value.to_dict()}

    async def delete_template(self, template_id: str) -> dict:
        """Delete a template."""
        self._ensure_initialized()

        from .core import Err
        result = await self._deps.template_repository.delete(template_id)

        if isinstance(result, Err):
            return {"status": "error", "error": result.error.message}

        return {"status": "ok", "template_id": template_id}


def migrate_state_store(legacy_store) -> None:
    """
    Migrate data from legacy StateStore to v2 format.

    This is a one-time operation that should be run during deployment.
    The v2 JsonStateStore wraps the legacy store, so no data migration
    is needed - just use the adapter.
    """
    logger.info("State store migration not required - v2 uses adapter pattern")


def create_v1_compatible_router():
    """
    Create a FastAPI router with v1-compatible endpoints.

    This allows the v2 backend to serve requests from the existing frontend
    without requiring frontend changes.
    """
    from fastapi import APIRouter, HTTPException, UploadFile, File, Query
    from typing import Optional

    router = APIRouter()

    v2_report = V2ReportService()
    v2_template = V2TemplateService()

    @router.post("/api/run")
    async def run_report_v1_compat(
        template_id: str,
        connection_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        docx: bool = False,
        xlsx: bool = False,
    ):
        """v1-compatible report run endpoint."""
        return await v2_report.run_report(
            template_id=template_id,
            connection_id=connection_id,
            start_date=start_date,
            end_date=end_date,
            docx=docx,
            xlsx=xlsx,
        )

    @router.get("/api/bootstrap")
    async def bootstrap_v1_compat():
        """v1-compatible bootstrap endpoint."""
        templates = await v2_template.list_templates()

        from .api.dependencies import get_dependencies
        deps = get_dependencies()
        connections = await deps.connection_repository.list()

        return {
            "status": "ok",
            "templates": templates,
            "connections": [c.to_dict() for c in connections],
        }

    return router


# Convenience exports
v2_report_service = V2ReportService()
v2_template_service = V2TemplateService()
