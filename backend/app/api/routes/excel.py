"""Excel Template API Routes.

This module contains endpoints for Excel template operations:
- Excel template verification
- Excel mapping operations
- Excel report generation
- Excel artifacts
"""
from __future__ import annotations

import contextlib
import tempfile
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile

from backend.app.core.security import require_api_key
from backend.app.services.background_tasks import (
    enqueue_background_job,
    iter_ndjson_events_async,
    run_event_stream_async,
)

from src.services.template_service import verify_excel, generator_assets
from src.services.mapping.approve import run_mapping_approve
from src.services.mapping.corrections import run_corrections_preview
from src.services.mapping.key_options import mapping_key_options as mapping_key_options_service
from src.services.mapping.preview import run_mapping_preview
from src.services.file_service import artifact_head_response, artifact_manifest_response
from src.services.report_service import queue_report_job, run_report as run_report_service
from src.schemas.template_schema import CorrectionsPreviewPayload, GeneratorAssetsPayload, MappingPayload
from backend.app.features.generate.schemas.reports import RunPayload, DiscoverPayload

router = APIRouter(dependencies=[Depends(require_api_key)])


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _request_with_correlation(correlation_id: str | None) -> SimpleNamespace:
    return SimpleNamespace(state=SimpleNamespace(correlation_id=correlation_id))


def _wrap(payload: dict, correlation_id: str | None) -> dict:
    payload = dict(payload)
    if correlation_id is not None:
        payload["correlation_id"] = correlation_id
    return payload


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
# Excel Template Verification
# =============================================================================

@router.post("/verify")
async def verify_excel_route(
    request: Request,
    file: UploadFile = File(...),
    connection_id: str | None = Form(None),
    background: bool = Query(False),
):
    """Verify and process an Excel template."""
    if not background:
        return verify_excel(file=file, request=request, connection_id=connection_id)

    upload_path, filename = await _persist_upload(file, suffix=".xlsx")
    correlation_id = _correlation(request)
    template_name = Path(filename).stem or filename

    async def runner(job_id: str) -> None:
        upload = UploadFile(filename=filename, file=upload_path.open("rb"))
        try:
            response = verify_excel(
                file=upload,
                request=_request_with_correlation(correlation_id),
                connection_id=connection_id,
            )
            await run_event_stream_async(job_id, iter_ndjson_events_async(response.body_iterator))
        finally:
            with contextlib.suppress(Exception):
                await upload.close()
            with contextlib.suppress(FileNotFoundError):
                upload_path.unlink(missing_ok=True)

    job = await enqueue_background_job(
        job_type="verify_excel",
        connection_id=connection_id,
        template_name=template_name,
        template_kind="excel",
        meta={"filename": filename, "background": True},
        runner=runner,
    )
    return {"status": "queued", "job_id": job["id"], "correlation_id": correlation_id}


# =============================================================================
# Excel Mapping Operations
# =============================================================================

@router.post("/{template_id}/mapping/preview")
async def mapping_preview_excel(template_id: str, connection_id: str, request: Request, force_refresh: bool = False):
    """Preview mapping for an Excel template."""
    return await run_mapping_preview(template_id, connection_id, request, force_refresh, kind="excel")


@router.post("/{template_id}/mapping/approve")
async def mapping_approve_excel(template_id: str, payload: MappingPayload, request: Request):
    """Approve mapping for an Excel template."""
    return await run_mapping_approve(template_id, payload, request, kind="excel")


@router.post("/{template_id}/mapping/corrections-preview")
def mapping_corrections_preview_excel(template_id: str, payload: CorrectionsPreviewPayload, request: Request):
    """Preview corrections for Excel template mapping."""
    return run_corrections_preview(template_id, payload, request, kind="excel")


# =============================================================================
# Excel Generator Assets
# =============================================================================

@router.post("/{template_id}/generator-assets/v1")
def generator_assets_excel_route(template_id: str, payload: GeneratorAssetsPayload, request: Request):
    """Generate assets for an Excel template."""
    return generator_assets(template_id, payload, request, kind="excel")


# =============================================================================
# Excel Key Options
# =============================================================================

@router.get("/{template_id}/keys/options")
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
    """Get available key options for Excel template filtering."""
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


# =============================================================================
# Excel Artifacts
# =============================================================================

@router.get("/{template_id}/artifacts/manifest")
def get_artifact_manifest_excel(template_id: str, request: Request):
    """Get the artifact manifest for an Excel template."""
    data = artifact_manifest_response(template_id, kind="excel")
    return _wrap(data, _correlation(request))


@router.get("/{template_id}/artifacts/head")
def get_artifact_head_excel(template_id: str, request: Request, name: str):
    """Get the head (preview) of a specific artifact."""
    data = artifact_head_response(template_id, name, kind="excel")
    return _wrap(data, _correlation(request))


# =============================================================================
# Excel Report Generation
# =============================================================================

@router.post("/reports/run")
def run_report_excel(payload: RunPayload, request: Request):
    """Run an Excel report synchronously."""
    return run_report_service(payload, request, kind="excel")


@router.post("/jobs/run-report")
async def enqueue_report_job_excel(payload: RunPayload | list[RunPayload], request: Request):
    """Queue an Excel report job for async generation."""
    return await queue_report_job(payload, request, kind="excel")


# =============================================================================
# Excel Report Discovery
# =============================================================================

@router.post("/reports/discover")
def discover_reports_excel(payload: DiscoverPayload, request: Request):
    """Discover available batches for Excel report generation."""
    from backend.app.features.generate.services.discovery_service import discover_reports as discover_reports_service
    from src.utils.template_utils import template_dir
    from src.utils.connection_utils import db_path_from_payload_or_default
    from backend.app.services.contract.ContractBuilderV2 import load_contract_v2
    from src.utils.schedule_utils import clean_key_values
    from backend.app.services.reports.discovery_excel import discover_batches_and_counts as discover_batches_and_counts_excel
    from backend.app.services.reports.discovery_metrics import build_batch_field_catalog_and_stats, build_batch_metrics
    from backend.app.services.utils.artifacts import load_manifest
    from src.utils.template_utils import manifest_endpoint
    import logging

    logger = logging.getLogger("neura.api")
    return discover_reports_service(
        payload,
        kind="excel",
        template_dir_fn=lambda tpl: template_dir(tpl, kind="excel"),
        db_path_fn=db_path_from_payload_or_default,
        load_contract_fn=load_contract_v2,
        clean_key_values_fn=clean_key_values,
        discover_fn=discover_batches_and_counts_excel,
        build_field_catalog_fn=build_batch_field_catalog_and_stats,
        build_batch_metrics_fn=build_batch_metrics,
        load_manifest_fn=load_manifest,
        manifest_endpoint_fn=lambda tpl: manifest_endpoint(tpl, kind="excel"),
        logger=logger,
    )
