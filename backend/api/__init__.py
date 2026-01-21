"""API layer - HTTP routes and request handling."""

from __future__ import annotations

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from .dependencies import Dependencies, get_dependencies
from .app import create_app


def _load_legacy_app():
    legacy_path = Path(__file__).resolve().parents[1] / "api.py"
    if not legacy_path.exists():
        return None
    spec = spec_from_file_location("backend._legacy_api", legacy_path)
    if not spec or not spec.loader:
        return None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_legacy = _load_legacy_app()
if _legacy and getattr(_legacy, "app", None):
    app = _legacy.app
    _db_path_from_payload_or_default = getattr(_legacy, "_db_path_from_payload_or_default", None)
    resolve_db_path = getattr(_legacy, "resolve_db_path", None)
else:
    app = create_app()


__all__ = [
    "app",
    "create_app",
    "get_dependencies",
    "Dependencies",
]
