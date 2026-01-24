from __future__ import annotations

from functools import lru_cache
import json
import logging
import os
from pathlib import Path
from typing import Any, List, Optional

try:
    # Pydantic v2+
    from pydantic_settings import BaseSettings, SettingsConfigDict

    _V2_SETTINGS = True
except ImportError:  # pragma: no cover - fallback for Pydantic v1
    from pydantic import BaseSettings

    SettingsConfigDict = None
    _V2_SETTINGS = False
from pydantic import Field


logger = logging.getLogger("neura.config")


def _default_uploads_root() -> Path:
    return Path(__file__).resolve().parents[2] / "uploads"


def _default_excel_uploads_root() -> Path:
    return Path(__file__).resolve().parents[2] / "uploads_excel"


def _default_state_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "state"


def _load_version_info() -> dict[str, Any]:
    version_path = Path(__file__).resolve().parents[1] / "version.json"
    if not version_path.exists():
        return {"version": "dev", "commit": "unknown"}
    try:
        return json.loads(version_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("version_info_load_failed", extra={"event": "version_info_load_failed", "error": str(exc)})
        return {"version": "dev", "commit": "unknown"}


class Settings(BaseSettings):
    api_title: str = "NeuraReport API"
    api_version: str = "4.0"
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"], env="NEURA_CORS_ORIGINS")
    api_key: Optional[str] = Field(default=None, env="NEURA_API_KEY")
    allow_anonymous_api: bool = Field(default=False, env="NEURA_ALLOW_ANON_API")
    jwt_secret: str = Field(default="change-me", env="NEURA_JWT_SECRET")
    jwt_lifetime_seconds: int = Field(default=3600, env="NEURA_JWT_LIFETIME_SECONDS")

    uploads_dir: Path = Field(default_factory=_default_uploads_root, env="UPLOAD_ROOT")
    excel_uploads_dir: Path = Field(default_factory=_default_excel_uploads_root, env="EXCEL_UPLOAD_ROOT")
    state_dir: Path = Field(default_factory=_default_state_dir, env="NEURA_STATE_DIR")

    max_upload_bytes: int = Field(default=50 * 1024 * 1024, env="NEURA_MAX_UPLOAD_BYTES")
    max_verify_pdf_bytes: int = Field(default=50 * 1024 * 1024, env="NEURA_MAX_VERIFY_PDF_BYTES")
    max_zip_entries: int = Field(default=2000, env="NEURA_MAX_ZIP_ENTRIES")
    max_zip_uncompressed_bytes: int = Field(default=200 * 1024 * 1024, env="NEURA_MAX_ZIP_UNCOMPRESSED_BYTES")

    template_import_max_concurrency: int = Field(default=4, env="NEURA_TEMPLATE_IMPORT_MAX_CONCURRENCY")

    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o", env="OPENAI_MODEL")

    artifact_warn_bytes: int = Field(default=5 * 1024 * 1024, env="ARTIFACT_WARN_BYTES")
    artifact_warn_render_ms: int = Field(default=2000, env="ARTIFACT_WARN_RENDER_MS")
    version: str = Field(default="dev", env="NEURA_VERSION")
    commit: str = Field(default="unknown", env="NEURA_COMMIT")

    # Rate limiting configuration
    rate_limit_enabled: bool = Field(default=True, env="NEURA_RATE_LIMIT_ENABLED")
    rate_limit_requests: int = Field(default=100, env="NEURA_RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(default=60, env="NEURA_RATE_LIMIT_WINDOW_SECONDS")
    rate_limit_burst: int = Field(default=20, env="NEURA_RATE_LIMIT_BURST")

    # Security configuration
    trusted_hosts: List[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"], env="NEURA_TRUSTED_HOSTS")
    allowed_hosts_all: bool = Field(default=True, env="NEURA_ALLOWED_HOSTS_ALL")  # Set to False in production

    # Request timeout
    request_timeout_seconds: int = Field(default=300, env="NEURA_REQUEST_TIMEOUT_SECONDS")

    # Idempotency configuration
    idempotency_enabled: bool = Field(default=True, env="NEURA_IDEMPOTENCY_ENABLED")
    idempotency_ttl_seconds: int = Field(default=86400, env="NEURA_IDEMPOTENCY_TTL_SECONDS")

    # Analysis cache configuration
    analysis_cache_max_items: int = Field(default=100, env="NEURA_ANALYSIS_CACHE_MAX_ITEMS")
    analysis_cache_ttl_seconds: int = Field(default=3600, env="NEURA_ANALYSIS_CACHE_TTL_SECONDS")  # 1 hour
    analysis_max_concurrency: int = Field(default=4, env="NEURA_ANALYSIS_MAX_CONCURRENCY")

    # Debug/development mode
    debug_mode: bool = Field(default=False, env="NEURA_DEBUG")

    # File/path safety overrides (use only in trusted environments)
    allow_unsafe_pdf_paths: bool = Field(default=False, env="NEURA_ALLOW_UNSAFE_PDF_PATHS")

    # UX Governance configuration
    # Set to True when frontend is fully compliant with governance headers
    ux_governance_strict: bool = Field(default=True, env="NEURA_UX_GOVERNANCE_STRICT")

    @property
    def uploads_root(self) -> Path:
        return self.uploads_dir

    @property
    def excel_uploads_root(self) -> Path:
        return self.excel_uploads_dir

    if _V2_SETTINGS:
        # Pydantic Settings v2
        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    else:  # pragma: no cover - Pydantic v1 fallback
        class Config:
            env_file = ".env"
            extra = "ignore"


def _apply_runtime_defaults(settings: Settings) -> Settings:
    if isinstance(settings.openai_api_key, str) and not settings.openai_api_key.strip():
        settings.openai_api_key = None

    allow_missing = os.getenv("NEURA_ALLOW_MISSING_OPENAI", "false").lower() == "true"
    provider_env = os.getenv("LLM_PROVIDER", "").lower().strip()
    engine_env = os.getenv("NEURA_LLM_ENGINE", "litellm").lower().strip()
    requires_openai = provider_env in {"", "openai"} and engine_env != "litellm"
    if not settings.openai_api_key and not allow_missing and requires_openai:
        raise RuntimeError(
            "OPENAI_API_KEY is required. Set NEURA_ALLOW_MISSING_OPENAI=true to bypass for tests (not for production)."
        )

    force_gpt5 = os.getenv("NEURA_FORCE_GPT5", "true").lower() in {"1", "true", "yes"}
    if force_gpt5 and not str(settings.openai_model or "").lower().startswith("gpt-5"):
        logger.warning(
            "openai_model_overridden",
            extra={
                "event": "openai_model_overridden",
                "requested": settings.openai_model,
                "forced": "gpt-5",
            },
        )
        settings.openai_model = "gpt-5"

    if settings.jwt_secret.strip().lower() in {"", "change-me"}:
        logger.warning(
            "jwt_secret_default",
            extra={"event": "jwt_secret_default"},
        )

    if not os.getenv("NEURA_VERSION") or not os.getenv("NEURA_COMMIT"):
        version_info = _load_version_info()
        if not os.getenv("NEURA_VERSION"):
            settings.version = str(version_info.get("version", settings.version))
        if not os.getenv("NEURA_COMMIT"):
            settings.commit = str(version_info.get("commit", settings.commit))

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.excel_uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.state_dir.mkdir(parents=True, exist_ok=True)
    return settings


@lru_cache
def get_settings() -> Settings:
    return _apply_runtime_defaults(Settings())


def log_settings(target_logger: logging.Logger, settings: Settings) -> None:
    key_preview = f"...{settings.openai_api_key[-4:]}" if settings.openai_api_key else "(missing)"
    target_logger.info(
        "app_config",
        extra={
            "event": "app_config",
            "version": settings.version,
            "commit": settings.commit,
            "openai_model": settings.openai_model,
            "openai_key": key_preview,
            "uploads_root": str(settings.uploads_root),
            "excel_uploads_root": str(settings.excel_uploads_root),
            "artifact_warn_bytes": settings.artifact_warn_bytes,
            "artifact_warn_render_ms": settings.artifact_warn_render_ms,
        },
    )
