"""
Report generation endpoints.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from ..dependencies import get_dependencies
from ...core import Err
from ...domain.reports import ReportConfig, OutputFormat
from ...domain.jobs import Job, JobStep
from ...pipelines import PipelineContext

router = APIRouter()


class ReportRunRequest(BaseModel):
    """Request to generate a report."""

    template_id: str
    connection_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    batch_ids: Optional[list[str]] = None
    key_values: Optional[dict] = None
    pdf: bool = True
    docx: bool = False
    xlsx: bool = False
    email_recipients: Optional[list[str]] = None
    email_subject: Optional[str] = None
    email_message: Optional[str] = None
    async_mode: bool = True


@router.post("/run")
async def run_report(body: ReportRunRequest, background_tasks: BackgroundTasks):
    """Generate a report."""
    deps = get_dependencies()

    # Verify template exists
    template = await deps.template_repository.get(body.template_id)
    if not template:
        raise HTTPException(status_code=404, detail={
            "code": "template_not_found",
            "message": f"Template {body.template_id} not found",
        })

    # Build output formats
    formats = []
    if body.pdf:
        formats.append(OutputFormat.PDF)
    if body.docx:
        formats.append(OutputFormat.DOCX)
    if body.xlsx:
        formats.append(OutputFormat.XLSX)
    if not formats:
        formats.append(OutputFormat.PDF)

    # Create config
    config = ReportConfig(
        template_id=body.template_id,
        connection_id=body.connection_id,
        start_date=body.start_date,
        end_date=body.end_date,
        batch_ids=tuple(body.batch_ids or []),
        key_values=body.key_values or {},
        output_formats=tuple(formats),
        email_recipients=tuple(body.email_recipients or []),
        email_subject=body.email_subject,
        email_message=body.email_message,
    )

    if body.async_mode:
        # Create job and run in background
        from uuid import uuid4
        from datetime import datetime, timezone

        job_id = str(uuid4())
        steps = [
            JobStep(step_id="validate", name="validate", label="Validating"),
            JobStep(step_id="load_template", name="load_template", label="Loading template"),
            JobStep(step_id="load_data", name="load_data", label="Loading data"),
            JobStep(step_id="render_html", name="render_html", label="Rendering HTML"),
            JobStep(step_id="render_pdf", name="render_pdf", label="Rendering PDF"),
        ]
        if body.docx:
            steps.append(JobStep(step_id="render_docx", name="render_docx", label="Rendering DOCX"))
        if body.email_recipients:
            steps.append(JobStep(step_id="notify", name="notify", label="Sending notifications"))

        job = Job(
            job_id=job_id,
            job_type="run_report",
            template_id=body.template_id,
            template_name=template.name,
            template_kind=template.kind.value,
            connection_id=body.connection_id,
            steps=tuple(steps),
            created_at=datetime.now(timezone.utc),
            queued_at=datetime.now(timezone.utc),
        )

        await deps.job_repository.save(job)

        # Create context
        context = PipelineContext(data={
            "config": config,
            "template_repository": deps.template_repository,
            "connection_repository": deps.connection_repository,
            "pdf_renderer": deps.pdf_renderer,
            "docx_renderer": deps.docx_renderer,
            "notifier": deps.notifier,
            "output_dir": Path("output") / job_id,
        })

        # Execute in background
        from ...pipelines import create_report_pipeline
        pipeline = create_report_pipeline(event_bus=deps.event_bus)

        await deps.job_executor.execute_async(job, pipeline, context)

        return {
            "status": "ok",
            "job_id": job_id,
            "message": "Report generation started",
        }

    else:
        # Synchronous execution
        context = PipelineContext(data={
            "config": config,
            "template_repository": deps.template_repository,
            "connection_repository": deps.connection_repository,
            "pdf_renderer": deps.pdf_renderer,
            "docx_renderer": deps.docx_renderer,
            "notifier": deps.notifier,
            "output_dir": Path("output"),
        })

        from ...pipelines import create_report_pipeline
        pipeline = create_report_pipeline(event_bus=deps.event_bus)

        result = await pipeline.execute(context)

        if not result.success:
            raise HTTPException(status_code=500, detail={
                "code": "generation_failed",
                "message": str(result.error) if result.error else "Unknown error",
                "failed_step": result.failed_step,
            })

        return {
            "status": "ok",
            "html_path": str(context.get("html_path")),
            "pdf_path": str(context.get("pdf_path")) if context.get("pdf_path") else None,
            "docx_path": str(context.get("docx_path")) if context.get("docx_path") else None,
        }
