from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any



@dataclass(frozen=True)
class Settings:
    openai_api_key: str
    openai_model: str
    uploads_root: Path
    artifact_warn_bytes: int
    artifact_warn_render_ms: int
    version: str
    commit: str


def _load_version_info() -> dict[str, Any]:
    version_path = Path(__file__).resolve().parent / "version.json"
    if not version_path.exists():
        return {"version": "dev", "commit": "unknown"}
    try:
        return json.loads(version_path.read_text(encoding="utf-8"))
    except Exception:
        return {"version": "dev", "commit": "unknown"}


def _coerce_int(env_name: str, default: int) -> int:
    raw = os.getenv(env_name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(f"{env_name} must be an integer (got {raw!r})") from None
    if value < 0:
        raise RuntimeError(f"{env_name} must be non-negative (got {value})")
    return value


def load_settings() -> Settings:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    allow_missing = os.getenv("NEURA_ALLOW_MISSING_OPENAI", "false").lower() == "true"
    if not openai_api_key and not allow_missing:
        raise RuntimeError(
            "OPENAI_API_KEY is required. Set NEURA_ALLOW_MISSING_OPENAI=true to bypass for tests (not for production)."
        )
    openai_model = os.getenv("OPENAI_MODEL", "gpt-5")

    uploads_default = Path(__file__).resolve().parents[2] / "uploads"
    uploads_root = Path(os.getenv("UPLOAD_ROOT", str(uploads_default))).resolve()
    uploads_root.mkdir(parents=True, exist_ok=True)

    artifact_warn_bytes = _coerce_int("ARTIFACT_WARN_BYTES", 5 * 1024 * 1024)
    artifact_warn_render_ms = _coerce_int("ARTIFACT_WARN_RENDER_MS", 2000)

    version_info = _load_version_info()
    version = os.getenv("NEURA_VERSION") or str(version_info.get("version", "dev"))
    commit = os.getenv("NEURA_COMMIT") or str(version_info.get("commit", "unknown"))

    return Settings(
        openai_api_key=openai_api_key or "",
        openai_model=openai_model,
        uploads_root=uploads_root,
        artifact_warn_bytes=artifact_warn_bytes,
        artifact_warn_render_ms=artifact_warn_render_ms,
        version=version,
        commit=commit,
    )


def log_settings(logger, settings: Settings) -> None:
    key_preview = f"...{settings.openai_api_key[-4:]}" if settings.openai_api_key else "(missing)"
    logger.info(
        "app_config",
        extra={
            "event": "app_config",
            "version": settings.version,
            "commit": settings.commit,
            "openai_model": settings.openai_model,
            "openai_key": key_preview,
            "uploads_root": str(settings.uploads_root),
            "artifact_warn_bytes": settings.artifact_warn_bytes,
            "artifact_warn_render_ms": settings.artifact_warn_render_ms,
        },
    )
