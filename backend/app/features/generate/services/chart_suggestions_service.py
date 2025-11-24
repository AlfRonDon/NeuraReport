from __future__ import annotations

import json
from typing import Any, Callable, Mapping, Optional

from fastapi import HTTPException

from ....services.state import state_store
from ..schemas.charts import ChartSpec, ChartSuggestPayload, ChartSuggestResponse


def suggest_charts(
    template_id: str,
    payload: ChartSuggestPayload,
    *,
    kind: str,
    correlation_id: Optional[str],
    template_dir_fn: Callable[[str], Any],
    db_path_fn: Callable[[Optional[str]], Any],
    load_contract_fn: Callable[[Any], Any],
    clean_key_values_fn: Callable[[Optional[dict]], Optional[dict]],
    discover_fn: Callable[..., Mapping[str, Any]],
    build_field_catalog_fn: Callable[[list], tuple[list, Mapping[str, Any]]],
    build_metrics_fn: Callable[[list, Mapping[str, Any], int], list],
    build_prompt_fn: Callable[..., str],
    call_chat_completion_fn: Callable[..., Any],
    model: str,
    strip_code_fences_fn: Callable[[str], str],
    logger,
) -> ChartSuggestResponse:
    template_dir = template_dir_fn(template_id)
    db_path = db_path_fn(payload.connection_id)
    if not db_path.exists():
        raise HTTPException(status_code=400, detail={"code": "db_not_found", "message": f"DB not found: {db_path}"})

    try:
        load_contract_fn(template_dir)
    except Exception as exc:
        logger.exception(
            "chart_suggest_contract_load_failed",
            extra={
                "event": "chart_suggest_contract_load_failed",
                "template_id": template_id,
                "template_kind": kind,
                "correlation_id": correlation_id,
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
        logger.exception(
            "chart_suggest_discovery_failed",
            extra={
                "event": "chart_suggest_discovery_failed",
                "template_id": template_id,
                "template_kind": kind,
                "correlation_id": correlation_id,
            },
        )
        raise HTTPException(status_code=500, detail={"code": "discovery_failed", "message": f"Discovery failed: {exc}"})

    batches = summary.get("batches") or []
    if not isinstance(batches, list):
        batches = []
    batch_metadata = summary.get("batch_metadata") or {}

    sample_data: list[dict[str, Any]] | None = None
    if payload.include_sample_data:
        try:
            sample_data = build_metrics_fn(batches, batch_metadata, limit=100)
        except Exception:
            sample_data = None
            logger.exception(
                "chart_suggest_sample_data_failed",
                extra={
                    "event": "chart_suggest_sample_data_failed",
                    "template_id": template_id,
                    "template_kind": kind,
                    "correlation_id": correlation_id,
                },
            )

    if not batches:
        logger.info(
            "chart_suggest_no_data",
            extra={
                "event": "chart_suggest_no_data",
                "template_id": template_id,
                "template_kind": kind,
                "correlation_id": correlation_id,
            },
        )
        sample_payload = sample_data if payload.include_sample_data else None
        if sample_payload is None and payload.include_sample_data:
            sample_payload = []
        return ChartSuggestResponse(charts=[], sample_data=sample_payload)

    field_catalog, stats = build_field_catalog_fn(batches)

    prompt = build_prompt_fn(
        template_id=template_id,
        kind=kind,
        start_date=payload.start_date,
        end_date=payload.end_date,
        key_values=key_values_payload,
        field_catalog=field_catalog,
        data_stats=stats,
        question=payload.question,
    )

    try:
        response = call_chat_completion_fn(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as exc:
        logger.exception(
            "chart_suggest_llm_failed",
            extra={
                "event": "chart_suggest_llm_failed",
                "template_id": template_id,
                "template_kind": kind,
                "correlation_id": correlation_id,
            },
        )
        raise HTTPException(status_code=500, detail={"code": "chart_suggest_llm_failed", "message": str(exc)})

    raw_text = (response.choices[0].message.content or "").strip()
    parsed_text = strip_code_fences_fn(raw_text)

    charts: list[ChartSpec] = []
    try:
        payload_json = json.loads(parsed_text)
    except Exception:
        logger.warning(
            "chart_suggest_json_parse_failed",
            extra={
                "event": "chart_suggest_json_parse_failed",
                "template_id": template_id,
                "template_kind": kind,
                "correlation_id": correlation_id,
            },
        )
        payload_json = {}

    raw_charts = payload_json.get("charts") if isinstance(payload_json, dict) else None
    if isinstance(raw_charts, list):
        for idx, item in enumerate(raw_charts):
            if not isinstance(item, Mapping):
                continue
            normalized: dict[str, Any] = dict(item)
            y_fields_raw = normalized.get("yFields")
            if isinstance(y_fields_raw, str):
                normalized["yFields"] = [y_fields_raw]
            elif isinstance(y_fields_raw, list):
                normalized["yFields"] = [str(v).strip() for v in y_fields_raw if str(v or "").strip()]
            else:
                single = normalized.get("yField")
                if isinstance(single, str) and single.strip():
                    normalized["yFields"] = [single.strip()]
                else:
                    continue

            type_raw = str(normalized.get("type") or "").strip().lower()
            x_field_raw = str(normalized.get("xField") or "").strip()
            y_fields_clean = [f for f in normalized.get("yFields", []) if isinstance(f, str) and f.strip()]
            if not type_raw or not x_field_raw or not y_fields_clean:
                continue
            normalized["type"] = type_raw
            normalized["xField"] = x_field_raw
            normalized["yFields"] = y_fields_clean

            if not normalized.get("id"):
                normalized["id"] = f"chart_{idx + 1}"

            try:
                charts.append(ChartSpec(**normalized))
            except Exception:
                continue

    state_store.set_last_used(payload.connection_id, template_id)

    logger.info(
        "chart_suggest_complete",
        extra={
            "event": "chart_suggest_complete",
            "template_id": template_id,
            "template_kind": kind,
            "charts_returned": len(charts),
            "correlation_id": correlation_id,
        },
    )
    return ChartSuggestResponse(
        charts=charts,
        sample_data=sample_data if payload.include_sample_data else None,
    )
