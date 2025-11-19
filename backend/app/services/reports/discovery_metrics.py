"""Shared helpers used by discovery flows to expose per-batch metrics."""

from __future__ import annotations

from typing import Any, Mapping, Sequence

__all__ = [
    "build_batch_field_catalog_and_stats",
    "build_batch_metrics",
]


def _coerce_number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except Exception:
        return 0.0


def build_batch_field_catalog_and_stats(
    batches: Sequence[Mapping[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    rows_values: list[float] = []
    parent_values: list[float] = []
    for raw in batches:
        if not isinstance(raw, Mapping):
            continue
        rows_val = raw.get("rows")
        parent_val = raw.get("parent")
        try:
            rows_num = float(rows_val)
        except Exception:
            rows_num = 0.0
        try:
            parent_num = float(parent_val)
        except Exception:
            parent_num = 0.0
        rows_values.append(rows_num)
        parent_values.append(parent_num)

    def _basic_stats(values: list[float]) -> dict[str, float]:
        if not values:
            return {"min": 0.0, "max": 0.0, "avg": 0.0}
        total = sum(values)
        return {
            "min": float(min(values)),
            "max": float(max(values)),
            "avg": float(total / len(values)),
        }

    stats: dict[str, Any] = {
        "batch_count": len(batches),
        "rows_total": int(sum(rows_values)),
        "rows_stats": _basic_stats(rows_values),
        "parent_stats": _basic_stats(parent_values),
    }

    field_catalog: list[dict[str, Any]] = [
        {
            "name": "batch_index",
            "type": "number",
            "description": "1-based index of the batch in discovery order.",
        },
        {
            "name": "batch_id",
            "type": "string",
            "description": "Batch identifier (composite key from join keys).",
        },
        {
            "name": "rows",
            "type": "number",
            "description": "Number of child rows in this batch.",
        },
        {
            "name": "parent",
            "type": "number",
            "description": "Number of parent rows associated with this batch.",
        },
        {
            "name": "rows_per_parent",
            "type": "number",
            "description": "Child rows divided by parent rows (if parent is zero, treat as rows).",
        },
        {
            "name": "time",
            "type": "datetime",
            "description": "Earliest timestamp associated with the batch (if available).",
        },
        {
            "name": "category",
            "type": "string",
            "description": "Categorical label derived from the first key column (if available).",
        },
    ]
    return field_catalog, stats


def build_batch_metrics(
    batches: Sequence[Mapping[str, Any]],
    batch_metadata: Mapping[str, Any] | None,
    *,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    metrics: list[dict[str, Any]] = []
    metadata_lookup: Mapping[str, Any] = batch_metadata if isinstance(batch_metadata, Mapping) else {}
    iterable: Sequence[Mapping[str, Any]] = batches
    if limit is not None:
        iterable = list(iterable)[:limit]
    for idx, raw in enumerate(iterable, start=1):
        if not isinstance(raw, Mapping):
            continue
        batch_id = raw.get("id")
        rows_val = _coerce_number(raw.get("rows"))
        parent_val = _coerce_number(raw.get("parent"))
        safe_parent = parent_val if parent_val not in (None, 0) else 1.0
        entry: dict[str, Any] = {
            "batch_index": idx,
            "batch_id": str(batch_id) if batch_id is not None else str(idx),
            "rows": rows_val,
            "parent": parent_val,
            "rows_per_parent": rows_val / safe_parent if safe_parent else rows_val,
        }
        meta = metadata_lookup.get(str(batch_id)) if batch_id is not None else None
        if isinstance(meta, Mapping):
            for key in ("time", "category"):
                if key in meta:
                    entry[key] = meta[key]
        metrics.append(entry)
    return metrics
