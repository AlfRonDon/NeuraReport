# mypy: ignore-errors
"""
LLM Configuration Module.

Supports multiple providers via environment variables:
- LLM_PROVIDER: Provider name (openai, ollama, deepseek, anthropic, azure, gemini)
- LLM_MODEL: Model name (provider-specific)
- LLM_BASE_URL: Custom base URL for OpenAI-compatible endpoints

Provider-specific environment variables:
- OPENAI_API_KEY, OPENAI_MODEL
- OLLAMA_BASE_URL, OLLAMA_MODEL
- DEEPSEEK_API_KEY, DEEPSEEK_MODEL
- ANTHROPIC_API_KEY, ANTHROPIC_MODEL
- AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT
- GOOGLE_API_KEY, GEMINI_MODEL
"""
from __future__ import annotations

import os
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger("neura.llm.config")


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    OLLAMA = "ollama"
    DEEPSEEK = "deepseek"
    ANTHROPIC = "anthropic"
    AZURE = "azure"
    GEMINI = "gemini"
    CUSTOM = "custom"  # Any OpenAI-compatible endpoint


# Default models for each provider
DEFAULT_MODELS: Dict[LLMProvider, str] = {
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.OLLAMA: "llama3.2",
    LLMProvider.DEEPSEEK: "deepseek-chat",
    LLMProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
    LLMProvider.AZURE: "gpt-4o",
    LLMProvider.GEMINI: "gemini-1.5-pro",
    LLMProvider.CUSTOM: "gpt-4o",
}

# Vision-capable models per provider
VISION_MODELS: Dict[LLMProvider, List[str]] = {
    LLMProvider.OPENAI: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4-vision-preview", "gpt-5"],
    LLMProvider.OLLAMA: ["llava", "llava:13b", "llava:34b", "bakllava", "moondream", "llama3.2-vision"],
    LLMProvider.DEEPSEEK: ["deepseek-vl", "deepseek-vl2"],
    LLMProvider.ANTHROPIC: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
    LLMProvider.AZURE: ["gpt-4o", "gpt-4-turbo", "gpt-4-vision-preview"],
    LLMProvider.GEMINI: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"],
    LLMProvider.CUSTOM: [],
}

# Recommended models for document analysis tasks
DOCUMENT_ANALYSIS_MODELS: Dict[LLMProvider, str] = {
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.OLLAMA: "qwen2.5:32b",  # Excellent for document understanding
    LLMProvider.DEEPSEEK: "deepseek-chat",
    LLMProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
    LLMProvider.AZURE: "gpt-4o",
    LLMProvider.GEMINI: "gemini-1.5-pro",
    LLMProvider.CUSTOM: "gpt-4o",
}

# Recommended models for code/SQL generation
CODE_GENERATION_MODELS: Dict[LLMProvider, str] = {
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.OLLAMA: "deepseek-coder-v2:16b",  # Excellent for SQL
    LLMProvider.DEEPSEEK: "deepseek-coder",
    LLMProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
    LLMProvider.AZURE: "gpt-4o",
    LLMProvider.GEMINI: "gemini-1.5-pro",
    LLMProvider.CUSTOM: "gpt-4o",
}


@dataclass
class LLMConfig:
    """Configuration for LLM provider."""

    provider: LLMProvider
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None

    # Azure-specific
    azure_endpoint: Optional[str] = None
    azure_deployment: Optional[str] = None
    azure_api_version: str = "2024-02-15-preview"

    # Request settings
    timeout_seconds: float = 120.0
    max_retries: int = 3
    retry_delay: float = 1.5
    retry_multiplier: float = 2.0

    # Model-specific settings
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

    # Feature flags
    supports_vision: bool = False
    supports_function_calling: bool = True
    supports_streaming: bool = True

    # Fallback configuration
    fallback_provider: Optional[LLMProvider] = None
    fallback_model: Optional[str] = None

    # Additional options
    extra_options: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate and finalize configuration."""
        # Check if model supports vision
        vision_models = VISION_MODELS.get(self.provider, [])
        self.supports_vision = any(
            vm in self.model or self.model in vm
            for vm in vision_models
        )

        logger.info(
            "llm_config_initialized",
            extra={
                "event": "llm_config_initialized",
                "provider": self.provider.value,
                "model": self.model,
                "base_url": self.base_url,
                "supports_vision": self.supports_vision,
            }
        )

    @classmethod
    def from_env(cls) -> "LLMConfig":
        """Create configuration from environment variables."""
        # Determine provider
        provider_str = os.getenv("LLM_PROVIDER", "").lower().strip()

        # Auto-detect provider based on available API keys
        if not provider_str:
            if os.getenv("OPENAI_API_KEY"):
                provider_str = "openai"
            elif os.getenv("OLLAMA_BASE_URL") or _check_ollama_running():
                provider_str = "ollama"
            elif os.getenv("DEEPSEEK_API_KEY"):
                provider_str = "deepseek"
            elif os.getenv("ANTHROPIC_API_KEY"):
                provider_str = "anthropic"
            elif os.getenv("AZURE_OPENAI_KEY"):
                provider_str = "azure"
            elif os.getenv("GOOGLE_API_KEY"):
                provider_str = "gemini"
            else:
                # Default to OpenAI for backwards compatibility
                provider_str = "openai"

        try:
            provider = LLMProvider(provider_str)
        except ValueError:
            logger.warning(
                "invalid_llm_provider",
                extra={"event": "invalid_llm_provider", "provider": provider_str}
            )
            provider = LLMProvider.OPENAI

        # Get model name
        model = (
            os.getenv("LLM_MODEL") or
            os.getenv(f"{provider.value.upper()}_MODEL") or
            os.getenv("OPENAI_MODEL") or  # Backwards compatibility
            DEFAULT_MODELS.get(provider, "gpt-4o")
        )

        # Get API key
        api_key = (
            os.getenv("LLM_API_KEY") or
            os.getenv(f"{provider.value.upper()}_API_KEY") or
            os.getenv("OPENAI_API_KEY")  # Backwards compatibility
        )

        # Get base URL
        base_url = os.getenv("LLM_BASE_URL")
        if not base_url:
            if provider == LLMProvider.OLLAMA:
                base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            elif provider == LLMProvider.DEEPSEEK:
                base_url = "https://api.deepseek.com"
            elif provider == LLMProvider.CUSTOM:
                base_url = os.getenv("CUSTOM_LLM_BASE_URL")

        # Azure-specific
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        azure_api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        if provider == LLMProvider.AZURE:
            api_key = os.getenv("AZURE_OPENAI_KEY") or api_key

        # Request settings
        timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", os.getenv("OPENAI_REQUEST_TIMEOUT_SECONDS", "120")))
        max_retries = int(os.getenv("LLM_MAX_RETRIES", os.getenv("OPENAI_MAX_ATTEMPTS", "3")))
        retry_delay = float(os.getenv("LLM_RETRY_DELAY", os.getenv("OPENAI_BACKOFF_SECONDS", "1.5")))
        retry_multiplier = float(os.getenv("LLM_RETRY_MULTIPLIER", os.getenv("OPENAI_BACKOFF_MULTIPLIER", "2.0")))

        # Optional settings
        temperature = os.getenv("LLM_TEMPERATURE")
        max_tokens = os.getenv("LLM_MAX_TOKENS")

        # Fallback configuration
        fallback_provider_str = os.getenv("LLM_FALLBACK_PROVIDER", "").lower().strip()
        fallback_provider = None
        fallback_model = None
        if fallback_provider_str:
            try:
                fallback_provider = LLMProvider(fallback_provider_str)
                fallback_model = os.getenv("LLM_FALLBACK_MODEL", DEFAULT_MODELS.get(fallback_provider))
            except ValueError:
                pass

        return cls(
            provider=provider,
            model=model,
            api_key=api_key,
            base_url=base_url,
            azure_endpoint=azure_endpoint,
            azure_deployment=azure_deployment,
            azure_api_version=azure_api_version,
            timeout_seconds=timeout,
            max_retries=max_retries,
            retry_delay=retry_delay,
            retry_multiplier=retry_multiplier,
            temperature=float(temperature) if temperature else None,
            max_tokens=int(max_tokens) if max_tokens else None,
            fallback_provider=fallback_provider,
            fallback_model=fallback_model,
        )

    def get_vision_model(self) -> str:
        """Get the recommended vision model for this provider."""
        vision_models = VISION_MODELS.get(self.provider, [])
        if self.model in vision_models or any(self.model in vm for vm in vision_models):
            return self.model
        return vision_models[0] if vision_models else self.model

    def get_document_analysis_model(self) -> str:
        """Get the recommended model for document analysis."""
        return DOCUMENT_ANALYSIS_MODELS.get(self.provider, self.model)

    def get_code_generation_model(self) -> str:
        """Get the recommended model for code/SQL generation."""
        return CODE_GENERATION_MODELS.get(self.provider, self.model)


def _check_ollama_running() -> bool:
    """Check if Ollama is running locally."""
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://localhost:11434/api/tags",
            method="GET"
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False


# Global cached config
_config: Optional[LLMConfig] = None


def get_llm_config(force_reload: bool = False) -> LLMConfig:
    """Get the global LLM configuration."""
    global _config
    if _config is None or force_reload:
        _config = LLMConfig.from_env()
    return _config
