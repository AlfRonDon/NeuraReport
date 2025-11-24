from __future__ import annotations

import json
from typing import Any, Callable, Mapping, Optional

from fastapi import HTTPException

from ....services.state import state_store


def discover_reports(
    payload,
    *,
    kind: str,
    template_dir_fn: Callable[[str], Any],
    db_path_fn: Callable[[Optional[str]], Any],
    load_contract_fn: Callable[[Any], Any],
    clean_key_values_fn: Callable[[Optional[dict]], Optional[dict]],
    discover_fn: Callable[..., Mapping[str, Any]],
    build_field_catalog_fn: Callable[[list], tuple[list, Mapping[str, Any]]],
    build_batch_metrics_fn: Callable[[list, Mapping[str, Any]], list],
    load_manifest_fn: Callable[[Any], Mapping[str, Any]],
    manifest_endpoint_fn: Callable[[str], str],
    logger,
):
    template_dir = template_dir_fn(payload.template_id)
    db_path = db_path_fn(payload.connection_id)
    if not db_path.exists():
        raise HTTPException(status_code=400, detail={"code": "db_not_found", "message": f"DB not found: {db_path}"})

    try:
        load_contract_fn(template_dir)
    except Exception as exc:
        logger.exception(
            "contract_artifacts_load_failed",
            extra={
                "event": "contract_artifacts_load_failed",
                "template_id": payload.template_id,
            },
        )
        raise HTTPException(status_code=500, detail={"code": "contract_load_failed", "message": f"Failed to load contract artifacts: {exc}"})

    contract_path = template_dir / "contract.json"
    if not contract_path.exists():
        raise HTTPException(
            status_code=400,
            detail={"code": "contract_not_ready", "message": "Contract artifacts missing. Approve mapping first."},
        )
    try:
        contract_payload = json.loads(contract_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"code": "contract_invalid", "message": f"Invalid contract.json: {exc}"})

    key_values_payload = clean_key_values_fn(payload.key_values)
    try:
        summary = discover_fn(
            db_path=db_path,
            contract=contract_payload,
            start_date=payload.start_date,
            end_date=payload.end_date,
            key_values=key_values_payload,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"code": "discovery_failed", "message": f"Discovery failed: {exc}"})

    manifest_data = load_manifest_fn(template_dir) or {}
    manifest_url = manifest_endpoint_fn(payload.template_id)
    tpl_record = state_store.get_template_record(payload.template_id) or {}
    tpl_name = tpl_record.get("name") or f"Template {payload.template_id[:8]}"
    state_store.set_last_used(payload.connection_id, payload.template_id)

    batches_raw = summary.get("batches") or []
    if not isinstance(batches_raw, list):
        batches_raw = []

    batch_metadata: dict[str, dict[str, object]] = summary.get("batch_metadata") or {}

    field_catalog = summary.get("field_catalog")
    if not isinstance(field_catalog, list):
        field_catalog, _ = build_field_catalog_fn(batches_raw)

    batch_metrics = summary.get("batch_metrics")
    if not isinstance(batch_metrics, list):
        batch_metrics = build_batch_metrics_fn(batches_raw, batch_metadata)

    return {
        "template_id": payload.template_id,
        "name": tpl_name,
        "batches": [
            {
                "id": b["id"],
                "rows": b["rows"],
                "parent": b["parent"],
                "selected": True,
                "time": (batch_metadata.get(str(b["id"])) or {}).get("time"),
                "category": (batch_metadata.get(str(b["id"])) or {}).get("category"),
            }
            for b in batches_raw
        ],
        "batches_count": summary["batches_count"],
        "rows_total": summary["rows_total"],
        "manifest_url": manifest_url,
        "manifest_produced_at": manifest_data.get("produced_at"),
        "field_catalog": field_catalog,
        "batch_metrics": batch_metrics,
    }
