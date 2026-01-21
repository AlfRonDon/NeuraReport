"""Template management routes."""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_dependencies, get_import_pipeline
from backend.pipelines import ImportPipeline

router = APIRouter()


class TemplateResponse(BaseModel):
    """Response for template operations."""

    template_id: str
    name: str
    kind: str
    status: str


class TemplateListResponse(BaseModel):
    """Response for listing templates."""

    templates: list[TemplateResponse]
    count: int


@router.get("")
async def list_templates() -> TemplateListResponse:
    """List all templates."""
    deps = get_dependencies()
    upload_root = deps.config.upload_root

    templates = []
    if upload_root.exists():
        for item in upload_root.iterdir():
            if item.is_dir():
                meta_file = item / "template_meta.json"
                if meta_file.exists():
                    import json
                    meta = json.loads(meta_file.read_text())
                    templates.append(
                        TemplateResponse(
                            template_id=meta.get("template_id", item.name),
                            name=meta.get("name", item.name),
                            kind=meta.get("kind", "pdf"),
                            status=meta.get("status", "draft"),
                        )
                    )

    return TemplateListResponse(templates=templates, count=len(templates))


@router.get("/{template_id}")
async def get_template(template_id: str) -> TemplateResponse:
    """Get a single template."""
    deps = get_dependencies()
    template_dir = deps.config.upload_root / template_id

    if not template_dir.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    meta_file = template_dir / "template_meta.json"
    if meta_file.exists():
        import json
        meta = json.loads(meta_file.read_text())
        return TemplateResponse(
            template_id=meta.get("template_id", template_id),
            name=meta.get("name", template_id),
            kind=meta.get("kind", "pdf"),
            status=meta.get("status", "draft"),
        )

    return TemplateResponse(
        template_id=template_id,
        name=template_id,
        kind="pdf",
        status="unknown",
    )


@router.post("/import")
async def import_template(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    pipeline: ImportPipeline = Depends(get_import_pipeline),
):
    """Import a template from uploaded file."""
    deps = get_dependencies()

    # Save uploaded file temporarily
    import tempfile
    import shutil

    with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        template = pipeline.execute(
            tmp_path,
            template_name=name or file.filename,
        )

        return {
            "ok": True,
            "template_id": template.template_id,
            "name": template.name,
            "kind": template.kind.value,
            "status": template.status.value,
        }
    finally:
        tmp_path.unlink(missing_ok=True)


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Delete a template."""
    deps = get_dependencies()
    template_dir = deps.config.upload_root / template_id

    if not template_dir.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    import shutil
    shutil.rmtree(template_dir)

    return {"ok": True, "deleted": template_id}
