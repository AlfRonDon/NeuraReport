"""
Dependency injection container.

Centralizes all service dependencies for easy testing and configuration.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from ..adapters.persistence import (
    JsonStateStore,
    TemplateRepository,
    ConnectionRepository,
    JobRepository,
    ScheduleRepository,
)
from ..adapters.databases import SQLiteDataSourceFactory, DataSourceFactory
from ..adapters.rendering import PlaywrightPDFRenderer, HTMLToDocxRenderer
from ..adapters.llm import OpenAIClient, LLMClient
from ..adapters.notifications import SMTPNotifier, Notifier
from ..core.events import EventBus, event_bus
from ..orchestration import JobExecutor, Scheduler, WorkerPool
from ..pipelines import ReportPipeline, ImportPipeline


@dataclass
class Dependencies:
    """All application dependencies."""

    # Repositories
    template_repository: TemplateRepository
    connection_repository: ConnectionRepository
    job_repository: JobRepository
    schedule_repository: ScheduleRepository

    # Adapters
    data_source_factory: DataSourceFactory
    pdf_renderer: PlaywrightPDFRenderer
    docx_renderer: HTMLToDocxRenderer
    llm_client: Optional[LLMClient]
    notifier: Optional[Notifier]

    # Event bus
    event_bus: EventBus

    # Orchestration
    job_executor: JobExecutor
    scheduler: Optional[Scheduler]
    worker_pool: Optional[WorkerPool]

    # Pipelines
    report_pipeline: ReportPipeline
    import_pipeline: ImportPipeline


_dependencies: Optional[Dependencies] = None


def create_dependencies(
    state_store=None,
    templates_root: Path = Path("templates"),
    enable_scheduler: bool = True,
    enable_llm: bool = True,
    enable_email: bool = False,
) -> Dependencies:
    """
    Create and wire all dependencies.

    Args:
        state_store: Existing StateStore instance (for migration)
        templates_root: Root directory for templates
        enable_scheduler: Whether to enable the scheduler
        enable_llm: Whether to enable LLM integration
        enable_email: Whether to enable email notifications

    Returns:
        Fully wired Dependencies instance
    """
    # Use existing state store for migration compatibility
    if state_store is None:
        from backend.app.services.state import state_store as legacy_store
        state_store = legacy_store

    # Create JSON store adapter
    json_store = JsonStateStore(state_store)

    # Repositories
    template_repo = json_store.templates
    connection_repo = json_store.connections
    job_repo = json_store.jobs
    schedule_repo = json_store.schedules

    # Data source factory
    data_source_factory = SQLiteDataSourceFactory(connection_repo)

    # Renderers
    pdf_renderer = PlaywrightPDFRenderer()
    docx_renderer = HTMLToDocxRenderer()

    # Optional LLM client
    llm_client = OpenAIClient() if enable_llm else None

    # Optional notifier
    notifier = SMTPNotifier() if enable_email else None

    # Event bus
    bus = event_bus

    # Job executor
    job_executor = JobExecutor(job_repo, bus)

    # Worker pool
    worker_pool = WorkerPool(max_workers=4)

    # Report pipeline
    report_pipeline = ReportPipeline(
        template_repository=template_repo,
        connection_repository=connection_repo,
        data_source_factory=data_source_factory,
        pdf_renderer=pdf_renderer,
        docx_renderer=docx_renderer,
        notifier=notifier,
        event_bus=bus,
    )

    # Import pipeline
    import_pipeline = ImportPipeline(
        templates_root=templates_root,
        template_repository=template_repo,
        event_bus=bus,
    )

    # Scheduler (optional)
    scheduler = None
    if enable_scheduler:
        def pipeline_factory(schedule):
            from ..pipelines import create_report_pipeline, PipelineContext
            from ..domain.reports import ReportConfig, OutputFormat

            formats = [OutputFormat.PDF]
            if schedule.generate_docx:
                formats.append(OutputFormat.DOCX)
            if schedule.generate_xlsx:
                formats.append(OutputFormat.XLSX)

            config = ReportConfig(
                template_id=schedule.template_id,
                connection_id=schedule.connection_id,
                start_date=schedule.start_date,
                end_date=schedule.end_date,
                batch_ids=schedule.batch_ids,
                key_values=schedule.key_values,
                output_formats=tuple(formats),
                email_recipients=schedule.email_recipients,
                email_subject=schedule.email_subject,
                email_message=schedule.email_message,
                schedule_id=schedule.schedule_id,
                schedule_name=schedule.name,
            )

            context = PipelineContext(data={
                "config": config,
                "template_repository": template_repo,
                "connection_repository": connection_repo,
                "data_source": data_source_factory,
                "pdf_renderer": pdf_renderer,
                "docx_renderer": docx_renderer,
                "notifier": notifier,
            })

            pipeline = create_report_pipeline(event_bus=bus)
            return pipeline, context

        scheduler = Scheduler(
            schedule_repository=schedule_repo,
            job_repository=job_repo,
            job_executor=job_executor,
            pipeline_factory=pipeline_factory,
            event_bus=bus,
        )

    return Dependencies(
        template_repository=template_repo,
        connection_repository=connection_repo,
        job_repository=job_repo,
        schedule_repository=schedule_repo,
        data_source_factory=data_source_factory,
        pdf_renderer=pdf_renderer,
        docx_renderer=docx_renderer,
        llm_client=llm_client,
        notifier=notifier,
        event_bus=bus,
        job_executor=job_executor,
        scheduler=scheduler,
        worker_pool=worker_pool,
        report_pipeline=report_pipeline,
        import_pipeline=import_pipeline,
    )


def get_dependencies() -> Dependencies:
    """Get the global dependencies instance."""
    global _dependencies
    if _dependencies is None:
        _dependencies = create_dependencies()
    return _dependencies


def set_dependencies(deps: Dependencies) -> None:
    """Set the global dependencies (for testing)."""
    global _dependencies
    _dependencies = deps
