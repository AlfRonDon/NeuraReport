from __future__ import annotations

import contextlib
import shutil
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException, Request, UploadFile

from backend.app.services.utils import TemplateLockError, acquire_template_lock
from backend.app.services.templates.catalog import build_unified_template_catalog
from backend.app.services.utils import get_correlation_id, set_correlation_id
from backend.app.services.state import state_store
from backend.app.services.prompts.llm_prompts_templates import recommend_templates_from_catalog
from src.services.file_service import (
    edit_template_ai as edit_template_ai_service,
    edit_template_manual as edit_template_manual_service,
    get_template_html as get_template_html_service,
    undo_last_template_edit as undo_last_template_edit_service,
    verify_excel as verify_excel_service,
    verify_template as verify_template_service,
    generator_assets as generator_assets_service,
)
from src.services.file_service.helpers import load_template_generator_summary as _load_template_generator_summary
from src.services.file_service.helpers import update_template_generator_summary_for_edit as _update_template_generator_summary_for_edit
from src.utils.template_utils import resolve_template_kind as _resolve_template_kind
from src.schemas.template_schema import (
    GeneratorAssetsPayload,
    TemplateAiEditPayload,
    TemplateManualEditPayload,
    TemplateRecommendPayload,
    TemplateRecommendResponse,
    TemplateRecommendation,
)
from src.utils.schedule_utils import utcnow_iso
from src.utils.template_utils import template_dir
from src.utils.mapping_utils import load_mapping_keys


def _http_error(status_code: int, code: str, message: str, details: str | None = None) -> HTTPException:
    payload = {"status": "error", "code": code, "message": message}
    if details:
        payload["details"] = details
    return HTTPException(status_code=status_code, detail=payload)


def export_template_zip(template_id: str, request: Request):
    from backend.api import export_template_zip as _export  # type: ignore

    return _export(template_id, request)


async def import_template_zip(file: UploadFile, request: Request, name: str | None = None):
    from backend.api import import_template_zip as _import  # type: ignore

    return await _import(file=file, name=name, request=request)


def verify_template(file: UploadFile, connection_id: str, request: Request, refine_iters: int = 0):
    return verify_template_service(file=file, connection_id=connection_id, request=request)


def verify_excel(file: UploadFile, request: Request):
    return verify_excel_service(file=file, request=request)


def get_template_html(template_id: str, request: Request):
    return get_template_html_service(template_id, request)


def edit_template_manual(template_id: str, payload: TemplateManualEditPayload, request: Request):
    return edit_template_manual_service(template_id, payload, request)


def edit_template_ai(template_id: str, payload: TemplateAiEditPayload, request: Request):
    return edit_template_ai_service(template_id, payload, request)


def undo_last_template_edit(template_id: str, request: Request):
    return undo_last_template_edit_service(template_id, request)


def generator_assets(template_id: str, payload: GeneratorAssetsPayload, request: Request, *, kind: str = "pdf"):
    return generator_assets_service(template_id, payload, request, kind=kind)


def bootstrap_state(request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    templates = state_store.list_templates()
    hydrated_templates = _ensure_template_mapping_keys(templates)
    return {
        "status": "ok",
        "connections": state_store.list_connections(),
        "templates": hydrated_templates,
        "last_used": state_store.get_last_used(),
        "correlation_id": correlation_id,
    }


def templates_catalog(request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    catalog = build_unified_template_catalog()
    return {"status": "ok", "templates": catalog, "correlation_id": correlation_id}


def list_templates(status: Optional[str], request: Request):
    templates = state_store.list_templates()
    if status:
        status_lower = status.lower()
        templates = [t for t in templates if (t.get("status") or "").lower() == status_lower]
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    hydrated = _ensure_template_mapping_keys(templates)
    return {"status": "ok", "templates": hydrated, "correlation_id": correlation_id}


def recommend_templates(payload: TemplateRecommendPayload, request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    catalog = build_unified_template_catalog()

    hints: dict[str, Any] = {}
    if payload.kind:
        hints["kind"] = payload.kind
    if payload.domain:
        hints["domain"] = payload.domain
    if payload.schema_snapshot:
        hints["schema_snapshot"] = payload.schema_snapshot
    if payload.tables:
        hints["tables"] = payload.tables

    raw_recs = recommend_templates_from_catalog(
        catalog,
        requirement=payload.requirement,
        hints=hints,
        max_results=6,
    )

    catalog_by_id: dict[str, dict[str, Any]] = {}
    for item in catalog:
        if isinstance(item, dict):
            tid = str(item.get("id") or "").strip()
            if tid and tid not in catalog_by_id:
                catalog_by_id[tid] = item

    recommendations: list[TemplateRecommendation] = []
    for rec in raw_recs:
        tid = str(rec.get("id") or "").strip()
        if not tid:
            continue
        template = catalog_by_id.get(tid)
        if not template:
            continue
        explanation = str(rec.get("explanation") or "").strip()
        try:
            score = float(rec.get("score") or 0.0)
        except Exception:
            score = 0.0
        recommendations.append(
            TemplateRecommendation(
                template=template,
                explanation=explanation,
                score=score,
            )
        )

    return TemplateRecommendResponse(recommendations=recommendations)


def delete_template(template_id: str, request: Request):
    correlation_id = getattr(request.state, "correlation_id", None) or get_correlation_id()
    existing_record = state_store.get_template_record(template_id)
    template_kind = _resolve_template_kind(template_id)
    tdir = template_dir(template_id, must_exist=False, create=False, kind=template_kind)

    lock_ctx: contextlib.AbstractContextManager[Any] = contextlib.nullcontext()
    if tdir.exists():
        try:
            lock_ctx = acquire_template_lock(tdir, "template_delete", correlation_id)
        except TemplateLockError:
            raise _http_error(
                409,
                "template_locked",
                "Template is currently processing another request.",
            )

    removed_dir = False
    with lock_ctx:
        if tdir.exists():
            try:
                shutil.rmtree(tdir)
                removed_dir = True
            except FileNotFoundError:
                removed_dir = False
            except Exception as exc:
                raise _http_error(
                    500,
                    "template_delete_failed",
                    f"Failed to remove template files: {exc}",
                )

        removed_state = state_store.delete_template(template_id)

    if not removed_state and not removed_dir and existing_record is None:
        raise _http_error(404, "template_not_found", "template_id not found")

    return {
        "status": "ok",
        "template_id": template_id,
        "correlation_id": correlation_id,
    }


def _ensure_template_mapping_keys(records: list[dict]) -> list[dict]:
    hydrated: list[dict] = []
    for record in records:
        mapping_keys = record.get("mappingKeys") or []
        if mapping_keys:
            hydrated.append(record)
            continue
        template_id = record.get("id")
        if not template_id:
            hydrated.append(record)
            continue

        kind = record.get("kind") or "pdf"
        try:
            tdir = template_dir(template_id, must_exist=False, create=False, kind=kind)
        except HTTPException:
            hydrated.append(record)
            continue

        keys = load_mapping_keys(tdir)
        if not keys:
            hydrated.append(record)
            continue

        new_record = dict(record)
        new_record["mappingKeys"] = keys
        hydrated.append(new_record)

        try:
            state_store.upsert_template(
                template_id,
                name=record.get("name") or f"Template {template_id[:8]}",
                status=record.get("status") or "unknown",
                artifacts=record.get("artifacts") or {},
                tags=record.get("tags") or [],
                connection_id=record.get("lastConnectionId"),
                mapping_keys=keys,
                template_type=kind,
            )
        except Exception:
            pass
    return hydrated
