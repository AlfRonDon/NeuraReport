"""Input validation and sanitization utilities."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

# Patterns for validation
SAFE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$")
SAFE_NAME_PATTERN = re.compile(r"^[\w\s\-\.()]{1,100}$", re.UNICODE)
SAFE_FILENAME_PATTERN = re.compile(r"^[\w\-\.()]+$", re.UNICODE)

# Dangerous path patterns to block
DANGEROUS_PATH_PATTERNS = [
    r"\.\.",  # Parent directory traversal
    r"^/",  # Absolute paths (Unix)
    r"^[A-Za-z]:",  # Absolute paths (Windows)
    r"~",  # Home directory expansion
    r"\$",  # Environment variable expansion
    r"%",  # Windows environment variables
    r"\x00",  # Null byte injection
]


def is_safe_id(value: str) -> bool:
    """Check if a value is safe to use as an ID (alphanumeric with dashes/underscores)."""
    if not value or not isinstance(value, str):
        return False
    return bool(SAFE_ID_PATTERN.match(value))


def is_safe_name(value: str) -> bool:
    """Check if a value is safe to use as a display name."""
    if not value or not isinstance(value, str):
        return False
    return bool(SAFE_NAME_PATTERN.match(value)) and len(value) <= 100


def is_safe_filename(value: str) -> bool:
    """Check if a value is safe to use as a filename."""
    if not value or not isinstance(value, str):
        return False
    if not SAFE_FILENAME_PATTERN.match(value):
        return False
    # Block dangerous patterns
    for pattern in DANGEROUS_PATH_PATTERNS:
        if re.search(pattern, value):
            return False
    return True


def sanitize_id(value: str) -> str:
    """Sanitize a string to be safe for use as an ID."""
    if not value:
        return ""
    # Remove non-alphanumeric characters except dashes and underscores
    sanitized = re.sub(r"[^a-zA-Z0-9_-]", "", value)
    # Ensure it starts with alphanumeric
    sanitized = re.sub(r"^[^a-zA-Z0-9]+", "", sanitized)
    return sanitized[:63]  # Max 63 chars


def sanitize_filename(value: str) -> str:
    """Sanitize a string to be safe for use as a filename."""
    if not value:
        return ""
    # Remove path separators and dangerous characters
    sanitized = re.sub(r"[/\\:*?\"<>|]", "", value)
    # Remove parent directory traversal
    sanitized = sanitized.replace("..", "")
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip(". ")
    # Ensure non-empty
    if not sanitized:
        return "unnamed"
    return sanitized[:255]  # Max 255 chars for most filesystems


def validate_path_safety(path: str | Path) -> tuple[bool, Optional[str]]:
    """
    Validate that a path is safe (no traversal attacks, etc).
    Returns (is_safe, error_message).
    """
    path_str = str(path)

    # Check for dangerous patterns
    for pattern in DANGEROUS_PATH_PATTERNS:
        if re.search(pattern, path_str):
            return False, f"Path contains disallowed pattern: {pattern}"

    # Check for null bytes
    if "\x00" in path_str:
        return False, "Path contains null byte"

    return True, None


def validate_file_extension(filename: str, allowed_extensions: list[str]) -> tuple[bool, Optional[str]]:
    """
    Validate that a file has an allowed extension.
    Returns (is_valid, error_message).
    """
    if not filename:
        return False, "Filename is required"

    ext = Path(filename).suffix.lower()
    if not ext:
        return False, "File must have an extension"

    # Normalize extensions (add leading dot if missing)
    allowed = [e.lower() if e.startswith(".") else f".{e.lower()}" for e in allowed_extensions]

    if ext not in allowed:
        return False, f"Invalid file type '{ext}'. Allowed: {', '.join(allowed)}"

    return True, None


def sanitize_sql_identifier(value: str) -> str:
    """
    Sanitize a SQL identifier (table/column name).
    Note: This is for display/logging only, not for building SQL queries.
    Use parameterized queries for actual SQL.
    """
    if not value:
        return ""
    # Remove all non-alphanumeric characters except underscore
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "", value)
    return sanitized[:128]


def validate_json_string_length(value: str, max_length: int = 10000) -> tuple[bool, Optional[str]]:
    """Validate that a JSON string field is not too long."""
    if not value:
        return True, None
    if len(value) > max_length:
        return False, f"Value too long (max {max_length} characters)"
    return True, None
