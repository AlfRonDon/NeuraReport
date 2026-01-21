"""
Template endpoints.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel

from ..dependencies import get_dependencies
from ...core import Err

router = APIRouter()


class TemplateUpdateRequest(BaseModel):
    """Request to update template metadata."""

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None


@router.get("")
async def list_templates(status: Optional[str] = Query(None)):
    """List all templates."""
    deps = get_dependencies()
    templates = await deps.template_repository.list()

    if status:
        templates = [t for t in templates if t.status.value == status.lower()]

    return {
        "status": "ok",
        "templates": [t.to_dict() for t in templates],
    }


@router.get("/{template_id}")
async def get_template(template_id: str):
    """Get a template by ID."""
    deps = get_dependencies()
    template = await deps.template_repository.get(template_id)

    if not template:
        raise HTTPException(status_code=404, detail={
            "code": "not_found",
            "message": f"Template {template_id} not found",
        })

    return {
        "status": "ok",
        "template": template.to_dict(),
    }


@router.post("/import")
async def import_template(
    file: UploadFile = File(...),
    name: Optional[str] = Query(None),
):
    """Import a template from a ZIP file."""
    deps = get_dependencies()

    # Read file bytes
    content = await file.read()

    result = await deps.import_pipeline.import_from_bytes(
        data=content,
        name=name or file.filename or "Imported Template",
    )

    if isinstance(result, Err):
        raise HTTPException(status_code=400, detail={
            "code": result.error.code,
            "message": result.error.message,
        })

    template = result.value
    return {
        "status": "ok",
        "template": template.to_dict(),
    }


@router.patch("/{template_id}")
async def update_template(template_id: str, body: TemplateUpdateRequest):
    """Update template metadata."""
    deps = get_dependencies()
    template = await deps.template_repository.get(template_id)

    if not template:
        raise HTTPException(status_code=404, detail={
            "code": "not_found",
            "message": f"Template {template_id} not found",
        })

    # Apply updates
    from ...domain.templates import TemplateStatus

    if body.name is not None:
        template = template.__class__(
            template_id=template.template_id,
            name=body.name,
            status=template.status,
            kind=template.kind,
            description=template.description,
            tags=template.tags,
            mapping_keys=template.mapping_keys,
            artifacts=template.artifacts,
            last_connection_id=template.last_connection_id,
            created_at=template.created_at,
            updated_at=template.updated_at,
            last_run_at=template.last_run_at,
        )

    if body.description is not None:
        template = template.__class__(
            template_id=template.template_id,
            name=template.name,
            status=template.status,
            kind=template.kind,
            description=body.description,
            tags=template.tags,
            mapping_keys=template.mapping_keys,
            artifacts=template.artifacts,
            last_connection_id=template.last_connection_id,
            created_at=template.created_at,
            updated_at=template.updated_at,
            last_run_at=template.last_run_at,
        )

    if body.status is not None:
        template = template.with_status(TemplateStatus(body.status.lower()))

    if body.tags is not None:
        template = template.__class__(
            template_id=template.template_id,
            name=template.name,
            status=template.status,
            kind=template.kind,
            description=template.description,
            tags=tuple(body.tags),
            mapping_keys=template.mapping_keys,
            artifacts=template.artifacts,
            last_connection_id=template.last_connection_id,
            created_at=template.created_at,
            updated_at=template.updated_at,
            last_run_at=template.last_run_at,
        )

    result = await deps.template_repository.save(template)
    if isinstance(result, Err):
        raise HTTPException(status_code=500, detail={
            "code": result.error.code,
            "message": result.error.message,
        })

    return {
        "status": "ok",
        "template": template.to_dict(),
    }


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Delete a template."""
    deps = get_dependencies()
    result = await deps.template_repository.delete(template_id)

    if isinstance(result, Err):
        raise HTTPException(status_code=404, detail={
            "code": result.error.code,
            "message": result.error.message,
        })

    return {
        "status": "ok",
        "template_id": template_id,
    }
