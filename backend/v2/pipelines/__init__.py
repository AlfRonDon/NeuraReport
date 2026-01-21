"""
Pipelines - Workflow orchestration framework.

Inspired by Dagster and Prefect. Pipelines are declarative workflows
composed of steps that execute in order with proper error handling.
"""

from .base import Pipeline, Step, PipelineContext, StepResult
from .report_pipeline import ReportPipeline, create_report_pipeline
from .import_pipeline import ImportPipeline, create_import_pipeline

__all__ = [
    "Pipeline",
    "Step",
    "PipelineContext",
    "StepResult",
    "ReportPipeline",
    "create_report_pipeline",
    "ImportPipeline",
    "create_import_pipeline",
]
