from __future__ import annotations

import json
from pathlib import Path
from typing import Any

SCHEMA_DIR = Path(__file__).resolve().parents[2] / "schemas"


class SchemaValidationError(ValueError):
    pass


def _load_schema(name: str) -> dict:
    path = SCHEMA_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


MAPPING_SCHEMA = _load_schema("mapping_pdf_labels.schema.json")
CONTRACT_SCHEMA = _load_schema("contract.schema.json")


def validate_mapping_schema(data: Any) -> None:
    if not isinstance(data, list):
        raise SchemaValidationError("mapping must be a list")
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            raise SchemaValidationError(f"mapping[{idx}] must be an object")
        for key in ("header", "placeholder", "mapping"):
            if key not in item or not isinstance(item[key], str) or not item[key].strip():
                raise SchemaValidationError(f"mapping[{idx}].{key} must be a non-empty string")


def validate_contract_schema(data: Any) -> None:
    if not isinstance(data, dict):
        raise SchemaValidationError("contract must be an object")
    required = CONTRACT_SCHEMA["required"]
    for key in required:
        if key not in data:
            raise SchemaValidationError(f"contract missing key '{key}'")
    if not isinstance(data["mapping"], dict):
        raise SchemaValidationError("contract.mapping must be an object")
    if not isinstance(data["join"], dict):
        raise SchemaValidationError("contract.join must be an object")
    for key in ("parent_table", "parent_key", "child_table", "child_key"):
        value = data["join"].get(key)
        if not isinstance(value, str) or not value.strip():
            raise SchemaValidationError(f"contract.join.{key} must be a non-empty string")
    for key in ("date_columns", "totals", "literals"):
        if not isinstance(data[key], dict):
            raise SchemaValidationError(f"contract.{key} must be an object")
    for key in ("header_tokens", "row_tokens", "row_order"):
        arr = data.get(key)
        if not isinstance(arr, list) or not all(isinstance(item, str) for item in arr):
            raise SchemaValidationError(f"contract.{key} must be an array of strings")
