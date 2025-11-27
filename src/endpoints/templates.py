from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request

from src.schemas.template_schema import CorrectionsPreviewPayload, MappingPayload, TemplateRecommendPayload, TemplateRecommendResponse
from src.services.mapping.approve import run_mapping_approve
from src.services.mapping.corrections import run_corrections_preview
from src.services.mapping.key_options import mapping_key_options as mapping_key_options_service
from src.services.mapping.preview import mapping_preview_internal, run_mapping_preview
from src.services.template_service import (
    edit_template_ai,
    edit_template_manual,
    export_template_zip,
    import_template_zip,
    undo_last_template_edit,
    verify_excel,
    verify_template,
    list_templates,
    templates_catalog,
    recommend_templates,
    bootstrap_state,
    delete_template,
    generator_assets,
)

router = APIRouter()


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


@router.post("/templates/{template_id}/mapping/preview")
async def mapping_preview(template_id: str, connection_id: str, request: Request, force_refresh: bool = False):
    return await run_mapping_preview(template_id, connection_id, request, force_refresh, kind="pdf")


@router.post("/excel/{template_id}/mapping/preview")
async def mapping_preview_excel(template_id: str, connection_id: str, request: Request, force_refresh: bool = False):
    return await run_mapping_preview(template_id, connection_id, request, force_refresh, kind="excel")


@router.post("/templates/{template_id}/mapping/approve")
async def mapping_approve(template_id: str, payload: MappingPayload, request: Request):
    return await run_mapping_approve(template_id, payload, request, kind="pdf")


@router.post("/excel/{template_id}/mapping/approve")
async def mapping_approve_excel(template_id: str, payload: MappingPayload, request: Request):
    return await run_mapping_approve(template_id, payload, request, kind="excel")


@router.post("/templates/{template_id}/mapping/corrections-preview")
def mapping_corrections_preview(template_id: str, payload: CorrectionsPreviewPayload, request: Request):
    return run_corrections_preview(template_id, payload, request, kind="pdf")


@router.post("/excel/{template_id}/mapping/corrections-preview")
def mapping_corrections_preview_excel(template_id: str, payload: CorrectionsPreviewPayload, request: Request):
    return run_corrections_preview(template_id, payload, request, kind="excel")


@router.get("/templates/{template_id}/export.zip")
def export_template_zip(template_id: str, request: Request):
    return export_template_zip(template_id, request)


@router.post("/templates/import-zip")
async def import_template_zip(file, request: Request, name: str | None = None):
    return await import_template_zip(file=file, name=name, request=request)


@router.post("/templates/verify")
async def verify_template_route(file, request: Request, connection_id: str, refine_iters: int = 0):
    return await verify_template(file=file, connection_id=connection_id, refine_iters=refine_iters, request=request)


@router.post("/excel/verify")
async def verify_excel_route(file, request: Request):
    return await verify_excel(file=file, request=request)


@router.post("/templates/{template_id}/edit-manual")
def edit_template_manual_route(template_id: str, payload, request: Request):
    return edit_template_manual(template_id, payload, request)


@router.post("/templates/{template_id}/edit-ai")
def edit_template_ai_route(template_id: str, payload, request: Request):
    return edit_template_ai(template_id, payload, request)


@router.post("/templates/{template_id}/undo-last-edit")
def undo_last_edit_route(template_id: str, request: Request):
    return undo_last_template_edit(template_id, request)


@router.get("/state/bootstrap")
def bootstrap_state_route(request: Request):
    return bootstrap_state(request)


@router.get("/templates/catalog")
def templates_catalog_route(request: Request):
    return templates_catalog(request)


@router.get("/templates")
def list_templates_route(request: Request, status: Optional[str] = None):
    return list_templates(status, request)


@router.post("/templates/recommend", response_model=TemplateRecommendResponse)
def recommend_templates_route(payload: TemplateRecommendPayload, request: Request):
    return recommend_templates(payload, request)


@router.delete("/templates/{template_id}")
def delete_template_route(template_id: str, request: Request):
    return delete_template(template_id, request)


@router.post("/templates/{template_id}/generator-assets/v1")
def generator_assets_route(template_id: str, payload, request: Request):
    return generator_assets(template_id, payload, request, kind="pdf")


@router.post("/excel/{template_id}/generator-assets/v1")
def generator_assets_excel_route(template_id: str, payload, request: Request):
    return generator_assets(template_id, payload, request, kind="excel")


@router.get("/templates/{template_id}/keys/options")
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


@router.get("/excel/{template_id}/keys/options")
def mapping_key_options_excel(
    template_id: str,
    request: Request,
    connection_id: str | None = None,
    tokens: str | None = None,
    limit: int = 500,
    start_date: str | None = None,
    end_date: str | None = None,
    debug: bool = False,
):
    return mapping_key_options_service(
        template_id=template_id,
        request=request,
        connection_id=connection_id,
        tokens=tokens,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        kind="excel",
        debug=debug,
    )
