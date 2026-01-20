from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

try:
    # Pydantic v2+
    from pydantic_settings import BaseSettings, SettingsConfigDict

    _V2_SETTINGS = True
except ImportError:  # pragma: no cover - fallback for Pydantic v1
    from pydantic import BaseSettings

    SettingsConfigDict = None
    _V2_SETTINGS = False
from pydantic import Field


class Settings(BaseSettings):
    api_title: str = "NeuraReport API"
    api_version: str = "4.0"
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    api_key: Optional[str] = Field(default=None, env="NEURA_API_KEY")

    uploads_dir: Path = Path("uploads")
    excel_uploads_dir: Path = Path("uploads_excel")
    state_dir: Path = Path("state")

    max_upload_bytes: int = 50 * 1024 * 1024
    max_verify_pdf_bytes: int = 50 * 1024 * 1024
    max_zip_entries: int = 2000
    max_zip_uncompressed_bytes: int = 200 * 1024 * 1024

    job_workers: int = 4
    job_queue_size: int = 32
    template_import_max_concurrency: int = 4

    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")

    # Rate limiting configuration
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100  # requests per window
    rate_limit_window_seconds: int = 60  # time window in seconds
    rate_limit_burst: int = 20  # burst allowance for temporary spikes

    # Security configuration
    trusted_hosts: List[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])
    allowed_hosts_all: bool = True  # Set to False in production with specific hosts

    # Request timeout
    request_timeout_seconds: int = 300  # 5 minutes max for long-running operations

    # Analysis cache configuration
    analysis_cache_max_items: int = 100
    analysis_cache_ttl_seconds: int = 3600  # 1 hour
    analysis_max_concurrency: int = 4

    # Debug/development mode
    debug_mode: bool = Field(default=False, env="NEURA_DEBUG")

    if _V2_SETTINGS:
        # Pydantic Settings v2
        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    else:  # pragma: no cover - Pydantic v1 fallback
        class Config:
            env_file = ".env"
            extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
