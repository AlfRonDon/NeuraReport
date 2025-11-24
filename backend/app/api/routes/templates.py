from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from backend.app.core.config import get_settings
from backend.app.core.security import require_api_key
from backend.app.domain.templates.schemas import TemplateImportResult
from backend.app.domain.templates.service import TemplateService

router = APIRouter(dependencies=[Depends(require_api_key)])


def get_service(settings=Depends(get_settings)) -> TemplateService:
    return TemplateService(
        uploads_root=settings.uploads_dir,
        excel_uploads_root=settings.excel_uploads_dir,
        max_bytes=settings.max_upload_bytes,
    )


@router.post("/import-zip", response_model=TemplateImportResult)
async def import_template_zip(
    request: Request,
    file: UploadFile = File(...),
    name: str | None = Form(None),
    service: TemplateService = Depends(get_service),
):
    correlation_id = getattr(request.state, "correlation_id", None)
    return await service.import_zip(file, name, correlation_id)

