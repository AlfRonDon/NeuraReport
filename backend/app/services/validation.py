from __future__ import annotations

from backend.app.utils import validation as _validation


def is_safe_name(value: str) -> bool:
    """Service-layer validation boundary for safe display names."""
    return _validation.is_safe_name(value)


def validate_file_extension(filename: str, allowed_extensions: list[str]) -> tuple[bool, str | None]:
    """Service-layer validation boundary for upload file extensions."""
    return _validation.validate_file_extension(filename, allowed_extensions)


__all__ = ["is_safe_name", "validate_file_extension"]
