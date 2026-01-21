"""
Template import pipeline.

Handles importing templates from ZIP files or directories.
"""

from __future__ import annotations

import json
import logging
import zipfile
from pathlib import Path
from typing import Any
from uuid import uuid4

from .base import Pipeline, Step, PipelineContext
from ..core import Result, Ok, Err, DomainError, ValidationError
from ..domain.templates import Template, TemplateArtifacts, TemplateStatus, TemplateKind

logger = logging.getLogger("neura.pipelines.import")


async def validate_import(ctx: PipelineContext) -> Result[bool, DomainError]:
    """Validate the import source."""
    source_path: Path | None = ctx.get("source_path")
    source_bytes: bytes | None = ctx.get("source_bytes")

    if not source_path and not source_bytes:
        return Err(ValidationError(
            code="missing_source",
            message="Import source (path or bytes) is required",
        ))

    if source_path and not source_path.exists():
        return Err(ValidationError(
            code="source_not_found",
            message=f"Source path {source_path} does not exist",
            field="source_path",
        ))

    ctx.set("validated", True)
    return Ok(True)


async def extract_archive(ctx: PipelineContext) -> Result[Path, DomainError]:
    """Extract ZIP archive to temporary directory."""
    source_path: Path | None = ctx.get("source_path")
    source_bytes: bytes | None = ctx.get("source_bytes")
    temp_dir: Path = ctx.get("temp_dir") or Path("temp")

    temp_dir.mkdir(parents=True, exist_ok=True)
    extract_dir = temp_dir / f"import_{uuid4().hex[:8]}"
    extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        if source_bytes:
            import io
            with zipfile.ZipFile(io.BytesIO(source_bytes), "r") as zf:
                zf.extractall(extract_dir)
        elif source_path and source_path.suffix.lower() == ".zip":
            with zipfile.ZipFile(source_path, "r") as zf:
                zf.extractall(extract_dir)
        elif source_path and source_path.is_dir():
            # Copy directory contents
            import shutil
            for item in source_path.iterdir():
                if item.is_file():
                    shutil.copy2(item, extract_dir / item.name)
                elif item.is_dir():
                    shutil.copytree(item, extract_dir / item.name)
        else:
            return Err(ValidationError(
                code="invalid_source",
                message="Source must be a ZIP file or directory",
            ))

        # Find the actual template directory (might be nested)
        template_dir = _find_template_dir(extract_dir)
        if not template_dir:
            return Err(ValidationError(
                code="invalid_template",
                message="No valid template found in archive",
            ))

        ctx.set("extract_dir", extract_dir)
        ctx.set("template_dir", template_dir)
        return Ok(template_dir)

    except zipfile.BadZipFile:
        return Err(ValidationError(
            code="invalid_zip",
            message="Invalid or corrupted ZIP file",
        ))
    except Exception as e:
        return Err(DomainError(
            code="extraction_failed",
            message=f"Failed to extract archive: {e}",
            cause=e,
        ))


def _find_template_dir(root: Path) -> Path | None:
    """Find the directory containing template files."""
    # Check if root itself is a template dir
    if (root / "template.html").exists() or (root / "contract.json").exists():
        return root

    # Check subdirectories
    for child in root.iterdir():
        if child.is_dir():
            if (child / "template.html").exists() or (child / "contract.json").exists():
                return child
            # Check one level deeper
            for grandchild in child.iterdir():
                if grandchild.is_dir():
                    if (grandchild / "template.html").exists() or (grandchild / "contract.json").exists():
                        return grandchild

    return None


async def validate_template_files(ctx: PipelineContext) -> Result[dict, DomainError]:
    """Validate the extracted template files."""
    template_dir: Path = ctx.get("template_dir")

    if not template_dir:
        return Err(DomainError(
            code="missing_template_dir",
            message="Template directory not extracted",
        ))

    # Check for required files
    html_path = template_dir / "template.html"
    contract_path = template_dir / "contract.json"

    if not html_path.exists() and not contract_path.exists():
        return Err(ValidationError(
            code="missing_template_files",
            message="Template must contain template.html or contract.json",
        ))

    # Validate contract if present
    contract_data = None
    if contract_path.exists():
        try:
            contract_data = json.loads(contract_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            return Err(ValidationError(
                code="invalid_contract",
                message=f"Invalid contract.json: {e}",
                field="contract.json",
            ))

    ctx.set("contract_data", contract_data)
    ctx.set("has_html", html_path.exists())
    ctx.set("has_contract", contract_path.exists())

    return Ok({
        "has_html": html_path.exists(),
        "has_contract": contract_path.exists(),
    })


async def determine_template_kind(ctx: PipelineContext) -> Result[TemplateKind, DomainError]:
    """Determine the type of template (PDF or Excel)."""
    template_dir: Path = ctx.get("template_dir")
    contract_data = ctx.get("contract_data")

    # Check contract for explicit kind
    if contract_data and contract_data.get("kind"):
        kind_str = contract_data.get("kind", "").lower()
        kind = TemplateKind.EXCEL if kind_str == "excel" else TemplateKind.PDF
        ctx.set("template_kind", kind)
        return Ok(kind)

    # Check for Excel-specific files
    excel_files = list(template_dir.glob("*.xlsx")) + list(template_dir.glob("*.xls"))
    if excel_files:
        ctx.set("template_kind", TemplateKind.EXCEL)
        return Ok(TemplateKind.EXCEL)

    # Default to PDF
    ctx.set("template_kind", TemplateKind.PDF)
    return Ok(TemplateKind.PDF)


async def copy_to_templates_dir(ctx: PipelineContext) -> Result[Path, DomainError]:
    """Copy validated template to the templates directory."""
    import shutil

    template_dir: Path = ctx.get("template_dir")
    templates_root: Path = ctx.get("templates_root") or Path("templates")
    template_name: str = ctx.get("template_name") or template_dir.name
    template_id: str = ctx.get("template_id") or str(uuid4())

    # Sanitize template name
    safe_name = "".join(c for c in template_name if c.isalnum() or c in "-_")[:64]
    if not safe_name:
        safe_name = f"template_{template_id[:8]}"

    dest_dir = templates_root / template_id
    if dest_dir.exists():
        return Err(DomainError(
            code="template_exists",
            message=f"Template directory {dest_dir} already exists",
        ))

    try:
        shutil.copytree(template_dir, dest_dir)
        ctx.set("final_dir", dest_dir)
        ctx.set("template_id", template_id)
        ctx.set("safe_name", safe_name)
        return Ok(dest_dir)
    except Exception as e:
        return Err(DomainError(
            code="copy_failed",
            message=f"Failed to copy template: {e}",
            cause=e,
        ))


async def create_template_record(ctx: PipelineContext) -> Result[Template, DomainError]:
    """Create the template metadata record."""
    from datetime import datetime

    template_id: str = ctx.get("template_id")
    safe_name: str = ctx.get("safe_name")
    final_dir: Path = ctx.get("final_dir")
    template_kind: TemplateKind = ctx.get("template_kind") or TemplateKind.PDF
    contract_data = ctx.get("contract_data") or {}

    # Discover artifacts
    artifacts = TemplateArtifacts.from_template_dir(final_dir)

    # Extract mapping keys from contract
    mapping_keys = []
    if contract_data:
        for token in contract_data.get("tokens", []):
            if token.get("name"):
                mapping_keys.append(token["name"])

    template = Template(
        template_id=template_id,
        name=safe_name,
        status=TemplateStatus.DRAFT,
        kind=template_kind,
        description=contract_data.get("description", ""),
        mapping_keys=tuple(mapping_keys),
        artifacts=artifacts,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    ctx.set("template", template)
    return Ok(template)


async def persist_template(ctx: PipelineContext) -> Result[Template, DomainError]:
    """Save the template to the repository."""
    template: Template = ctx.get("template")
    template_repo = ctx.get("template_repository")

    if not template_repo:
        # No repository - just return the template
        return Ok(template)

    result = await template_repo.save(template)
    return result


async def cleanup_temp(ctx: PipelineContext) -> Result[bool, DomainError]:
    """Clean up temporary extraction directory."""
    import shutil

    extract_dir: Path | None = ctx.get("extract_dir")
    if extract_dir and extract_dir.exists():
        try:
            shutil.rmtree(extract_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp dir: {e}")

    return Ok(True)


def create_import_pipeline(event_bus=None) -> Pipeline:
    """Create the template import pipeline."""
    return Pipeline(
        name="template_import",
        steps=[
            Step(
                name="validate",
                label="Validating import",
                fn=validate_import,
            ),
            Step(
                name="extract",
                label="Extracting archive",
                fn=extract_archive,
            ),
            Step(
                name="validate_files",
                label="Validating template files",
                fn=validate_template_files,
            ),
            Step(
                name="determine_kind",
                label="Determining template type",
                fn=determine_template_kind,
            ),
            Step(
                name="copy",
                label="Copying to templates",
                fn=copy_to_templates_dir,
            ),
            Step(
                name="create_record",
                label="Creating template record",
                fn=create_template_record,
            ),
            Step(
                name="persist",
                label="Saving template",
                fn=persist_template,
            ),
            Step(
                name="cleanup",
                label="Cleaning up",
                fn=cleanup_temp,
            ),
        ],
        event_bus=event_bus,
    )


class ImportPipeline:
    """High-level interface for template imports."""

    def __init__(
        self,
        templates_root: Path,
        template_repository=None,
        event_bus=None,
    ):
        self.templates_root = templates_root
        self.template_repository = template_repository
        self.pipeline = create_import_pipeline(event_bus=event_bus)

    async def import_from_path(
        self,
        source_path: Path,
        name: str | None = None,
    ) -> Result[Template, DomainError]:
        """Import a template from a file path."""
        ctx = PipelineContext(
            data={
                "source_path": source_path,
                "template_name": name or source_path.stem,
                "templates_root": self.templates_root,
                "template_repository": self.template_repository,
            },
        )

        result = await self.pipeline.execute(ctx)

        if result.success:
            return Ok(ctx.get("template"))
        else:
            return Err(result.error or DomainError(
                code="import_failed",
                message=f"Import failed at step {result.failed_step}",
            ))

    async def import_from_bytes(
        self,
        data: bytes,
        name: str,
    ) -> Result[Template, DomainError]:
        """Import a template from bytes (uploaded file)."""
        ctx = PipelineContext(
            data={
                "source_bytes": data,
                "template_name": name,
                "templates_root": self.templates_root,
                "template_repository": self.template_repository,
            },
        )

        result = await self.pipeline.execute(ctx)

        if result.success:
            return Ok(ctx.get("template"))
        else:
            return Err(result.error or DomainError(
                code="import_failed",
                message=f"Import failed at step {result.failed_step}",
            ))
