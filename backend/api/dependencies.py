"""Dependency injection container for the API layer.

All adapters and services are instantiated here and injected into routes.
This allows for easy testing and swapping implementations.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

from backend.adapters.databases import SQLiteDataSource
from backend.adapters.llm import OpenAIClient
from backend.adapters.rendering import HTMLRenderer, PDFRenderer, DOCXRenderer, XLSXRenderer
from backend.orchestration import JobExecutor, ExecutorConfig, Scheduler, WorkerPool
from backend.pipelines import ReportPipeline, ImportPipeline


@dataclass
class AppConfig:
    """Application configuration."""

    upload_root: Path
    excel_upload_root: Path
    state_file: Path
    debug: bool = False
    max_workers: int = 4
    scheduler_poll_seconds: int = 60


@dataclass
class Dependencies:
    """Container for all application dependencies."""

    config: AppConfig

    # Renderers
    html_renderer: HTMLRenderer
    pdf_renderer: PDFRenderer
    docx_renderer: DOCXRenderer
    xlsx_renderer: XLSXRenderer

    # LLM
    llm_client: Optional[OpenAIClient]

    # Orchestration
    executor: JobExecutor
    worker_pool: Optional[WorkerPool]
    scheduler: Optional[Scheduler]

    # Pipelines
    report_pipeline: ReportPipeline
    import_pipeline: ImportPipeline


_deps: Optional[Dependencies] = None


def create_dependencies(config: AppConfig) -> Dependencies:
    """Create all dependencies based on configuration."""

    # Create renderers
    html_renderer = HTMLRenderer()
    pdf_renderer = PDFRenderer()
    docx_renderer = DOCXRenderer()
    xlsx_renderer = XLSXRenderer()

    # Create LLM client (optional)
    try:
        llm_client = OpenAIClient()
    except Exception:
        llm_client = None

    # Create executor
    executor = JobExecutor(
        ExecutorConfig(max_workers=config.max_workers)
    )

    # Create worker pool
    worker_pool = WorkerPool(executor)

    # Create pipelines
    report_pipeline = ReportPipeline()
    import_pipeline = ImportPipeline(config.upload_root)

    return Dependencies(
        config=config,
        html_renderer=html_renderer,
        pdf_renderer=pdf_renderer,
        docx_renderer=docx_renderer,
        xlsx_renderer=xlsx_renderer,
        llm_client=llm_client,
        executor=executor,
        worker_pool=worker_pool,
        scheduler=None,  # Created later with repository
        report_pipeline=report_pipeline,
        import_pipeline=import_pipeline,
    )


def init_dependencies(config: AppConfig) -> Dependencies:
    """Initialize global dependencies."""
    global _deps
    _deps = create_dependencies(config)
    return _deps


def get_dependencies() -> Dependencies:
    """Get the global dependencies instance."""
    if _deps is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return _deps


# FastAPI dependency functions


async def get_html_renderer() -> HTMLRenderer:
    """FastAPI dependency for HTML renderer."""
    return get_dependencies().html_renderer


async def get_pdf_renderer() -> PDFRenderer:
    """FastAPI dependency for PDF renderer."""
    return get_dependencies().pdf_renderer


async def get_executor() -> JobExecutor:
    """FastAPI dependency for job executor."""
    return get_dependencies().executor


async def get_report_pipeline() -> ReportPipeline:
    """FastAPI dependency for report pipeline."""
    return get_dependencies().report_pipeline


async def get_import_pipeline() -> ImportPipeline:
    """FastAPI dependency for import pipeline."""
    return get_dependencies().import_pipeline
