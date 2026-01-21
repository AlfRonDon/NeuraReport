"""
Report generation pipeline.

Defines the complete workflow for generating a report from a template.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, TYPE_CHECKING

from .base import Pipeline, Step, PipelineContext
from ..core import Result, Ok, Err, DomainError, ValidationError
from ..domain.reports import ReportConfig, OutputFormat

if TYPE_CHECKING:
    from ..adapters.persistence.base import TemplateRepository, ConnectionRepository
    from ..adapters.databases.base import DataSource
    from ..adapters.rendering.base import Renderer

logger = logging.getLogger("neura.pipelines.report")


# Step functions
async def validate_payload(ctx: PipelineContext) -> Result[bool, DomainError]:
    """Validate the report configuration."""
    config: ReportConfig | None = ctx.get("config")
    if not config:
        return Err(ValidationError(
            code="missing_config",
            message="Report configuration is required",
        ))

    if not config.template_id:
        return Err(ValidationError(
            code="missing_template_id",
            message="Template ID is required",
            field="template_id",
        ))

    ctx.set("validated", True)
    return Ok(True)


async def load_template(ctx: PipelineContext) -> Result[dict, DomainError]:
    """Load the template and its contract."""
    config: ReportConfig = ctx.get("config")
    template_repo = ctx.get("template_repository")

    if not template_repo:
        return Err(DomainError(
            code="missing_dependency",
            message="Template repository not provided",
        ))

    template = await template_repo.get(config.template_id)
    if not template:
        return Err(DomainError(
            code="template_not_found",
            message=f"Template {config.template_id} not found",
        ))

    # Load HTML template
    if template.artifacts.html_path and template.artifacts.html_path.exists():
        html_content = template.artifacts.html_path.read_text(encoding="utf-8")
        ctx.set("html_template", html_content)

    # Load contract
    if template.artifacts.contract_path and template.artifacts.contract_path.exists():
        import json
        contract_data = json.loads(template.artifacts.contract_path.read_text(encoding="utf-8"))
        ctx.set("contract", contract_data)

    ctx.set("template", template)
    return Ok({"template_id": template.template_id, "name": template.name})


async def load_connection(ctx: PipelineContext) -> Result[dict, DomainError]:
    """Load the database connection."""
    config: ReportConfig = ctx.get("config")

    if not config.connection_id:
        # No connection required - might be using static data
        return Ok({"connection_id": None})

    connection_repo = ctx.get("connection_repository")
    if not connection_repo:
        return Err(DomainError(
            code="missing_dependency",
            message="Connection repository not provided",
        ))

    connection = await connection_repo.get(config.connection_id)
    if not connection:
        return Err(DomainError(
            code="connection_not_found",
            message=f"Connection {config.connection_id} not found",
        ))

    ctx.set("connection", connection)
    return Ok({"connection_id": connection.connection_id})


async def load_data(ctx: PipelineContext) -> Result[dict, DomainError]:
    """Execute queries and load data for the report."""
    contract = ctx.get("contract")
    connection = ctx.get("connection")
    config: ReportConfig = ctx.get("config")
    data_source = ctx.get("data_source")

    if not contract:
        return Err(DomainError(
            code="missing_contract",
            message="Contract not loaded",
        ))

    if not data_source and connection:
        return Err(DomainError(
            code="missing_dependency",
            message="Data source not provided",
        ))

    # Execute queries from contract mappings
    values: dict[str, Any] = {}
    tables: dict[str, list[dict]] = {}

    # Add user-provided key values
    values.update(config.key_values)

    # Add date range
    if config.start_date:
        values["start_date"] = config.start_date
    if config.end_date:
        values["end_date"] = config.end_date

    if data_source:
        mappings = contract.get("mappings", [])
        for mapping in mappings:
            token_name = mapping.get("token")
            query = mapping.get("query")
            if query and token_name:
                try:
                    result = await data_source.execute(query, values)
                    if result and len(result) > 0:
                        # Single value or first row
                        column = mapping.get("column")
                        if column and column in result[0]:
                            values[token_name] = result[0][column]
                        else:
                            values[token_name] = result[0].get(list(result[0].keys())[0]) if result[0] else None
                except Exception as e:
                    logger.warning(f"Query for {token_name} failed: {e}")

        # Load table data
        table_defs = contract.get("tables", [])
        for table_def in table_defs:
            token_name = table_def.get("token")
            query = table_def.get("query")
            if query and token_name:
                try:
                    rows = await data_source.execute(query, values)
                    tables[token_name] = rows or []
                except Exception as e:
                    logger.warning(f"Table query for {token_name} failed: {e}")
                    tables[token_name] = []

    ctx.set("values", values)
    ctx.set("tables", tables)
    return Ok({"values_count": len(values), "tables_count": len(tables)})


async def render_html(ctx: PipelineContext) -> Result[Path, DomainError]:
    """Render the HTML with token substitution."""
    html_template = ctx.get("html_template")
    values = ctx.get("values", {})
    tables = ctx.get("tables", {})
    config: ReportConfig = ctx.get("config")

    if not html_template:
        return Err(DomainError(
            code="missing_template",
            message="HTML template not loaded",
        ))

    from ..domain.reports import render_html_with_tokens

    rendered_html = render_html_with_tokens(
        html_template,
        values=values,
        tables=tables,
        escape_html=True,
    )

    # Save to output directory
    output_dir = config.output_dir or Path("output")
    output_dir.mkdir(parents=True, exist_ok=True)

    html_path = output_dir / f"{config.template_id}_report.html"
    html_path.write_text(rendered_html, encoding="utf-8")

    ctx.set("html_path", html_path)
    ctx.set("rendered_html", rendered_html)
    return Ok(html_path)


async def render_pdf(ctx: PipelineContext) -> Result[Path, DomainError]:
    """Convert HTML to PDF."""
    config: ReportConfig = ctx.get("config")

    if OutputFormat.PDF not in config.output_formats:
        return Ok(None)

    html_path: Path | None = ctx.get("html_path")
    pdf_renderer = ctx.get("pdf_renderer")

    if not html_path or not html_path.exists():
        return Err(DomainError(
            code="missing_html",
            message="HTML must be rendered before PDF",
        ))

    if not pdf_renderer:
        return Err(DomainError(
            code="missing_dependency",
            message="PDF renderer not provided",
        ))

    output_dir = config.output_dir or Path("output")
    pdf_path = output_dir / f"{config.template_id}_report.pdf"

    result = await pdf_renderer.render(html_path, pdf_path)
    if isinstance(result, Err):
        return result

    ctx.set("pdf_path", pdf_path)
    return Ok(pdf_path)


async def render_docx(ctx: PipelineContext) -> Result[Path, DomainError]:
    """Convert to DOCX if requested."""
    config: ReportConfig = ctx.get("config")

    if OutputFormat.DOCX not in config.output_formats:
        return Ok(None)

    html_path: Path | None = ctx.get("html_path")
    docx_renderer = ctx.get("docx_renderer")

    if not html_path or not html_path.exists():
        return Err(DomainError(
            code="missing_html",
            message="HTML must be rendered before DOCX",
        ))

    if not docx_renderer:
        return Err(DomainError(
            code="missing_dependency",
            message="DOCX renderer not provided",
        ))

    output_dir = config.output_dir or Path("output")
    docx_path = output_dir / f"{config.template_id}_report.docx"

    result = await docx_renderer.render(html_path, docx_path)
    if isinstance(result, Err):
        return result

    ctx.set("docx_path", docx_path)
    return Ok(docx_path)


async def send_notification(ctx: PipelineContext) -> Result[bool, DomainError]:
    """Send email notification if configured."""
    config: ReportConfig = ctx.get("config")

    if not config.email_recipients:
        return Ok(True)

    notifier = ctx.get("notifier")
    if not notifier:
        logger.warning("Email recipients configured but no notifier provided")
        return Ok(True)

    attachments = []
    pdf_path = ctx.get("pdf_path")
    if pdf_path and pdf_path.exists():
        attachments.append(pdf_path)

    docx_path = ctx.get("docx_path")
    if docx_path and docx_path.exists():
        attachments.append(docx_path)

    result = await notifier.send(
        recipients=list(config.email_recipients),
        subject=config.email_subject or "Report Generated",
        message=config.email_message or "Your report is attached.",
        attachments=attachments,
    )

    return result


def create_report_pipeline(
    event_bus=None,
    on_error=None,
    on_success=None,
) -> Pipeline:
    """Create the standard report generation pipeline."""
    return Pipeline(
        name="report_generation",
        steps=[
            Step(
                name="validate",
                label="Validating configuration",
                fn=validate_payload,
            ),
            Step(
                name="load_template",
                label="Loading template",
                fn=load_template,
            ),
            Step(
                name="load_connection",
                label="Loading connection",
                fn=load_connection,
                guard=lambda ctx: ctx.get("config") and ctx.get("config").connection_id,
            ),
            Step(
                name="load_data",
                label="Loading data",
                fn=load_data,
                guard=lambda ctx: ctx.get("connection") is not None,
            ),
            Step(
                name="render_html",
                label="Rendering HTML",
                fn=render_html,
            ),
            Step(
                name="render_pdf",
                label="Rendering PDF",
                fn=render_pdf,
                guard=lambda ctx: OutputFormat.PDF in ctx.get("config").output_formats,
                timeout_seconds=120,
            ),
            Step(
                name="render_docx",
                label="Rendering DOCX",
                fn=render_docx,
                guard=lambda ctx: OutputFormat.DOCX in ctx.get("config").output_formats,
            ),
            Step(
                name="notify",
                label="Sending notifications",
                fn=send_notification,
                guard=lambda ctx: bool(ctx.get("config").email_recipients),
            ),
        ],
        event_bus=event_bus,
        on_error=on_error,
        on_success=on_success,
    )


class ReportPipeline:
    """
    High-level interface for report generation.

    Wraps the pipeline with dependency injection and result handling.
    """

    def __init__(
        self,
        template_repository=None,
        connection_repository=None,
        data_source_factory=None,
        pdf_renderer=None,
        docx_renderer=None,
        notifier=None,
        event_bus=None,
    ):
        self.template_repository = template_repository
        self.connection_repository = connection_repository
        self.data_source_factory = data_source_factory
        self.pdf_renderer = pdf_renderer
        self.docx_renderer = docx_renderer
        self.notifier = notifier
        self.pipeline = create_report_pipeline(event_bus=event_bus)

    async def generate(self, config: ReportConfig) -> Result[dict, DomainError]:
        """Generate a report with the given configuration."""
        ctx = PipelineContext(
            config={"output_formats": config.output_formats},
            data={
                "config": config,
                "template_repository": self.template_repository,
                "connection_repository": self.connection_repository,
                "pdf_renderer": self.pdf_renderer,
                "docx_renderer": self.docx_renderer,
                "notifier": self.notifier,
            },
        )

        # Create data source if we have a connection
        if config.connection_id and self.data_source_factory:
            data_source = await self.data_source_factory.create(config.connection_id)
            ctx.set("data_source", data_source)

        result = await self.pipeline.execute(ctx)

        if result.success:
            return Ok({
                "html_path": str(ctx.get("html_path")),
                "pdf_path": str(ctx.get("pdf_path")) if ctx.get("pdf_path") else None,
                "docx_path": str(ctx.get("docx_path")) if ctx.get("docx_path") else None,
            })
        else:
            return Err(result.error or DomainError(
                code="pipeline_failed",
                message=f"Pipeline failed at step {result.failed_step}",
            ))
