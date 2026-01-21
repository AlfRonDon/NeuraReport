"""Consolidated Templates API Routes.

This module contains all template-related endpoints including:
- Template CRUD operations
- Template verification (PDF/Excel)
- Mapping preview/approve/corrections
- Template editing (manual, AI, chat)
- Generator assets
- Import/export
- Key options
- Artifacts
"""
from __future__ import annotations

import contextlib
import tempfile
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

from backend.app.core.config import get_settings
from backend.app.core.security import require_api_key
from backend.app.core.validation import is_safe_name, validate_file_extension
from backend.app.domain.templates.schemas import TemplateImportResult
from backend.app.domain.templates.service import TemplateService
from backend.app.services.background_tasks import (
    enqueue_background_job,
    iter_ndjson_events_async,
    run_event_stream_async,
)

# Import service functions from the service layer
from src.services.template_service import (
    get_template_html,
    edit_template_ai,
    edit_template_manual,
    chat_template_edit,
    apply_chat_template_edit,
    undo_last_template_edit,
    verify_excel,
    verify_template,
    list_templates,
    templates_catalog,
    recommend_templates,
    delete_template,
    update_template_metadata,
    generator_assets,
)
from src.services.mapping.approve import run_mapping_approve
from src.services.mapping.corrections import run_corrections_preview
from src.services.mapping.key_options import mapping_key_options as mapping_key_options_service
from src.services.mapping.preview import run_mapping_preview
from src.services.file_service import artifact_head_response, artifact_manifest_response
from src.schemas.template_schema import (
    CorrectionsPreviewPayload,
    GeneratorAssetsPayload,
    MappingPayload,
    TemplateAiEditPayload,
    TemplateChatPayload,
    TemplateManualEditPayload,
    TemplateRecommendPayload,
    TemplateRecommendResponse,
    TemplateUpdatePayload,
)

router = APIRouter(dependencies=[Depends(require_api_key)])

ALLOWED_EXTENSIONS = [".zip"]
MAX_FILENAME_LENGTH = 255


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _request_with_correlation(correlation_id: str | None) -> SimpleNamespace:
    return SimpleNamespace(state=SimpleNamespace(correlation_id=correlation_id))


def _wrap(payload: dict, correlation_id: str | None) -> dict:
    payload = dict(payload)
    if correlation_id is not None:
        payload["correlation_id"] = correlation_id
    return payload


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
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    if len(file.filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(status_code=400, detail=f"Filename too long (max {MAX_FILENAME_LENGTH} characters)")
    is_valid, error = validate_file_extension(file.filename, ALLOWED_EXTENSIONS)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    if file.content_type and file.content_type not in (
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid ZIP file. The file you selected does not appear to be a ZIP archive.",
        )


async def _persist_upload(file: UploadFile, suffix: str) -> tuple[Path, str]:
    filename = Path(file.filename or f"upload{suffix}").name
    tmp = tempfile.NamedTemporaryFile(prefix="nr-upload-", suffix=suffix, delete=False)
    try:
        with tmp:
            file.file.seek(0)
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                tmp.write(chunk)
    finally:
        with contextlib.suppress(Exception):
            await file.close()
    return Path(tmp.name), filename


# =============================================================================
# Template List & Catalog
# =============================================================================

@router.get("")
def list_templates_route(request: Request, status: Optional[str] = None):
    """List all templates with optional status filter."""
    return list_templates(status, request)


@router.get("/catalog")
def templates_catalog_route(request: Request):
    """Get template catalog for browsing."""
    return templates_catalog(request)


# =============================================================================
# Template CRUD
# =============================================================================

@router.delete("/{template_id}")
def delete_template_route(template_id: str, request: Request):
    """Delete a template."""
    return delete_template(template_id, request)


@router.patch("/{template_id}")
def update_template_metadata_route(template_id: str, payload: TemplateUpdatePayload, request: Request):
    """Update template metadata (name, description, etc.)."""
    return update_template_metadata(template_id, payload, request)


# =============================================================================
# Template Verification
# =============================================================================

@router.post("/verify")
async def verify_template_route(
    request: Request,
    file: UploadFile = File(...),
    connection_id: str = Form(...),
    refine_iters: int = Form(0),
    background: bool = Query(False),
):
    """Verify and process a PDF template."""
    if not background:
        return verify_template(file=file, connection_id=connection_id, refine_iters=refine_iters, request=request)

    upload_path, filename = await _persist_upload(file, suffix=".pdf")
    correlation_id = _correlation(request)
    template_name = Path(filename).stem or filename

    async def runner(job_id: str) -> None:
        upload = UploadFile(filename=filename, file=upload_path.open("rb"))
        try:
            response = verify_template(
                file=upload,
                connection_id=connection_id,
                refine_iters=refine_iters,
                request=_request_with_correlation(correlation_id),
            )
            await run_event_stream_async(job_id, iter_ndjson_events_async(response.body_iterator))
        finally:
            with contextlib.suppress(Exception):
                await upload.close()
            with contextlib.suppress(FileNotFoundError):
                upload_path.unlink(missing_ok=True)

    job = await enqueue_background_job(
        job_type="verify_template",
        connection_id=connection_id,
        template_name=template_name,
        template_kind="pdf",
        meta={"filename": filename, "background": True, "refine_iters": refine_iters},
        runner=runner,
    )
    return {"status": "queued", "job_id": job["id"], "correlation_id": correlation_id}


# =============================================================================
# Template Import/Export
# =============================================================================

@router.post("/import-zip", response_model=TemplateImportResult)
async def import_template_zip(
    request: Request,
    file: UploadFile = File(...),
    name: str | None = Form(None, max_length=100),
    service: TemplateService = Depends(get_service),
    settings=Depends(get_settings),
):
    """Import a template from a zip file."""
    validate_upload_file(file, settings.max_upload_bytes)
    if name is not None and not is_safe_name(name):
        raise HTTPException(status_code=400, detail="Template name contains invalid characters")
    correlation_id = _correlation(request)
    return await service.import_zip(file, name, correlation_id)


@router.get("/{template_id}/export")
async def export_template_zip(
    template_id: str,
    request: Request,
    service: TemplateService = Depends(get_service),
):
    """Export a template as a zip file for sharing or backup."""
    correlation_id = _correlation(request)
    result = await service.export_zip(template_id, correlation_id)
    return FileResponse(
        path=result["zip_path"],
        filename=result["filename"],
        media_type="application/zip",
        background=None,
    )


@router.post("/{template_id}/duplicate")
async def duplicate_template(
    template_id: str,
    request: Request,
    name: str | None = Form(None, max_length=100),
    service: TemplateService = Depends(get_service),
):
    """Duplicate a template to create a new copy."""
    if name is not None and not is_safe_name(name):
        raise HTTPException(status_code=400, detail="Template name contains invalid characters")
    correlation_id = _correlation(request)
    return await service.duplicate(template_id, name, correlation_id)


# =============================================================================
# Template Tags
# =============================================================================

@router.put("/{template_id}/tags")
async def update_template_tags(
    template_id: str,
    payload: dict,
    service: TemplateService = Depends(get_service),
):
    """Update tags for a template."""
    tags = payload.get("tags", [])
    if not isinstance(tags, list):
        raise HTTPException(status_code=400, detail="Tags must be an array of strings")
    for tag in tags:
        if not isinstance(tag, str) or len(tag) > 50:
            raise HTTPException(status_code=400, detail="Each tag must be a string under 50 characters")
    return await service.update_tags(template_id, tags)


@router.get("/tags/all")
async def get_all_tags(service: TemplateService = Depends(get_service)):
    """Get all unique tags across all templates."""
    return await service.get_all_tags()


# =============================================================================
# Template Recommendations
# =============================================================================

@router.post("/recommend", response_model=TemplateRecommendResponse)
def recommend_templates_route(payload: TemplateRecommendPayload, request: Request):
    """Get AI-powered template recommendations based on user requirements."""
    return recommend_templates(payload, request)


# =============================================================================
# Template HTML & Editing
# =============================================================================

@router.get("/{template_id}/html")
def get_template_html_route(template_id: str, request: Request):
    """Get the current HTML content of a template."""
    return get_template_html(template_id, request)


@router.post("/{template_id}/edit-manual")
def edit_template_manual_route(template_id: str, payload: TemplateManualEditPayload, request: Request):
    """Save manual HTML edits to a template."""
    return edit_template_manual(template_id, payload, request)


@router.post("/{template_id}/edit-ai")
def edit_template_ai_route(template_id: str, payload: TemplateAiEditPayload, request: Request):
    """Apply AI-powered edits to a template based on instructions."""
    return edit_template_ai(template_id, payload, request)


@router.post("/{template_id}/undo-last-edit")
def undo_last_edit_route(template_id: str, request: Request):
    """Undo the last edit made to a template."""
    return undo_last_template_edit(template_id, request)


@router.post("/{template_id}/chat")
def chat_template_edit_route(template_id: str, payload: TemplateChatPayload, request: Request):
    """Conversational template editing endpoint."""
    return chat_template_edit(template_id, payload, request)


@router.post("/{template_id}/chat/apply")
def apply_chat_template_edit_route(template_id: str, payload: TemplateManualEditPayload, request: Request):
    """Apply the HTML changes from a chat conversation."""
    return apply_chat_template_edit(template_id, payload.html, request)


# =============================================================================
# Mapping Preview/Approve/Corrections
# =============================================================================

@router.post("/{template_id}/mapping/preview")
async def mapping_preview(template_id: str, connection_id: str, request: Request, force_refresh: bool = False):
    """Preview mapping for a PDF template."""
    return await run_mapping_preview(template_id, connection_id, request, force_refresh, kind="pdf")


@router.post("/{template_id}/mapping/approve")
async def mapping_approve(template_id: str, payload: MappingPayload, request: Request):
    """Approve mapping for a PDF template."""
    return await run_mapping_approve(template_id, payload, request, kind="pdf")


@router.post("/{template_id}/mapping/corrections-preview")
def mapping_corrections_preview(template_id: str, payload: CorrectionsPreviewPayload, request: Request):
    """Preview corrections for PDF template mapping."""
    return run_corrections_preview(template_id, payload, request, kind="pdf")


# =============================================================================
# Generator Assets
# =============================================================================

@router.post("/{template_id}/generator-assets/v1")
def generator_assets_route(template_id: str, payload: GeneratorAssetsPayload, request: Request):
    """Generate assets for a PDF template."""
    return generator_assets(template_id, payload, request, kind="pdf")


# =============================================================================
# Key Options
# =============================================================================

@router.get("/{template_id}/keys/options")
def mapping_key_options(
    template_id: str,
    request: Request,
    connection_id: str | None = None,
    tokens: str | None = None,
    limit: int = 500,
    start_date: str | None = None,
    end_date: str | None = None,
    debug: bool = False,
):
    """Get available key options for template filtering."""
    return mapping_key_options_service(
        template_id=template_id,
        request=request,
        connection_id=connection_id,
        tokens=tokens,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        kind="pdf",
        debug=debug,
    )


# =============================================================================
# Artifacts
# =============================================================================

@router.get("/{template_id}/artifacts/manifest")
def get_artifact_manifest(template_id: str, request: Request):
    """Get the artifact manifest for a template."""
    data = artifact_manifest_response(template_id, kind="pdf")
    return _wrap(data, _correlation(request))


@router.get("/{template_id}/artifacts/head")
def get_artifact_head(template_id: str, request: Request, name: str):
    """Get the head (preview) of a specific artifact."""
    data = artifact_head_response(template_id, name, kind="pdf")
    return _wrap(data, _correlation(request))


# =============================================================================
# Charts
# =============================================================================

@router.post("/{template_id}/charts/suggest")
def suggest_charts_route(template_id: str, request: Request):
    """Get chart suggestions for a template."""
    from src.endpoints.feature_routes import suggest_charts_service
    # This is a placeholder - actual implementation delegates to feature service
    raise HTTPException(status_code=501, detail="Use /templates/{id}/charts/suggest via feature router")


@router.get("/{template_id}/charts/saved")
def list_saved_charts_route(template_id: str, request: Request):
    """List saved charts for a template."""
    from backend.app.services.state import state_store
    charts = state_store.state_store.list_saved_charts(template_id)
    return {"status": "ok", "charts": charts, "correlation_id": _correlation(request)}
