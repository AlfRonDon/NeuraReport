from __future__ import annotations

from fastapi import APIRouter, Request

from src.services.file_service import artifact_head_response, artifact_manifest_response

router = APIRouter()


def _correlation(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _wrap(payload: dict, correlation_id: str | None) -> dict:
    payload = dict(payload)
    if correlation_id is not None:
        payload["correlation_id"] = correlation_id
    return payload


@router.get("/templates/{template_id}/artifacts/manifest")
def get_artifact_manifest(template_id: str, request: Request):
    data = artifact_manifest_response(template_id, kind="pdf", template_dir_fn=_template_dir)
    return _wrap(data, _correlation(request))


@router.get("/excel/{template_id}/artifacts/manifest")
def get_artifact_manifest_excel(template_id: str, request: Request):
    data = artifact_manifest_response(template_id, kind="excel", template_dir_fn=_template_dir)
    return _wrap(data, _correlation(request))


@router.get("/templates/{template_id}/artifacts/head")
def get_artifact_head(template_id: str, request: Request, name: str):
    data = artifact_head_response(template_id, name, kind="pdf", template_dir_fn=_template_dir)
    return _wrap(data, _correlation(request))


@router.get("/excel/{template_id}/artifacts/head")
def get_artifact_head_excel(template_id: str, request: Request, name: str):
    data = artifact_head_response(template_id, name, kind="excel", template_dir_fn=_template_dir)
    return _wrap(data, _correlation(request))


# Import late to avoid circular dependency during module load
from backend.api import _template_dir  # noqa: E402  # type: ignore
