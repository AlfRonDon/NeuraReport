from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from backend.app.core.config import get_settings
from backend.app.core.security import require_api_key
from backend.app.core.validation import is_safe_name, validate_file_extension
from backend.app.domain.templates.schemas import TemplateImportResult
from backend.app.domain.templates.service import TemplateService

router = APIRouter(dependencies=[Depends(require_api_key)])

# Allowed file extensions for template import
ALLOWED_EXTENSIONS = [".zip"]
MAX_FILENAME_LENGTH = 255


def get_service(settings=Depends(get_settings)) -> TemplateService:
    return TemplateService(
        uploads_root=settings.uploads_dir,
        excel_uploads_root=settings.excel_uploads_dir,
        max_bytes=settings.max_upload_bytes,
        max_zip_entries=settings.max_zip_entries,
        max_zip_uncompressed_bytes=settings.max_zip_uncompressed_bytes,
        max_concurrency=settings.template_import_max_concurrency,
    )


def validate_upload_file(file: UploadFile, max_bytes: int) -> None:
    """Validate uploaded file for security and size constraints."""
    # Validate filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    if len(file.filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(status_code=400, detail=f"Filename too long (max {MAX_FILENAME_LENGTH} characters)")

    # Validate extension
    is_valid, error = validate_file_extension(file.filename, ALLOWED_EXTENSIONS)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Check content type (allow application/zip and application/x-zip-compressed)
    if file.content_type and file.content_type not in (
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{file.content_type}'. Expected application/zip",
        )


@router.post("/import-zip", response_model=TemplateImportResult)
async def import_template_zip(
    request: Request,
    file: UploadFile = File(...),
    name: str | None = Form(None, max_length=100),
    service: TemplateService = Depends(get_service),
    settings=Depends(get_settings),
):
    # Validate file
    validate_upload_file(file, settings.max_upload_bytes)

    # Validate name if provided
    if name is not None:
        if not is_safe_name(name):
            raise HTTPException(status_code=400, detail="Template name contains invalid characters")

    correlation_id = getattr(request.state, "correlation_id", None)
    return await service.import_zip(file, name, correlation_id)


@router.get("/{template_id}/export")
async def export_template_zip(
    template_id: str,
    request: Request,
    service: TemplateService = Depends(get_service),
):
    """Export a template as a zip file for sharing or backup."""
    correlation_id = getattr(request.state, "correlation_id", None)
    result = await service.export_zip(template_id, correlation_id)

    return FileResponse(
        path=result["zip_path"],
        filename=result["filename"],
        media_type="application/zip",
        background=None,  # Don't delete immediately - temp cleanup will handle it
    )


@router.post("/{template_id}/duplicate")
async def duplicate_template(
    template_id: str,
    request: Request,
    name: str | None = Form(None, max_length=100),
    service: TemplateService = Depends(get_service),
):
    """Duplicate a template to create a new copy."""
    # Validate name if provided
    if name is not None:
        if not is_safe_name(name):
            raise HTTPException(status_code=400, detail="Template name contains invalid characters")

    correlation_id = getattr(request.state, "correlation_id", None)
    return await service.duplicate(template_id, name, correlation_id)
