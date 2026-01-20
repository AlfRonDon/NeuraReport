# mypy: ignore-errors
"""
Unified LLM Client.

Provides a single interface for all LLM providers with:
- Automatic retry with exponential backoff
- Fallback to secondary provider
- Response caching
- Logging and monitoring
- Vision/multimodal support
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Iterator, List, Optional, Union

from .config import LLMConfig, LLMProvider, get_llm_config
from .providers import BaseProvider, get_provider

logger = logging.getLogger("neura.llm.client")

# Raw output logging
_LOG_PATH_ENV = os.getenv("LLM_RAW_OUTPUT_PATH")
if _LOG_PATH_ENV:
    _RAW_OUTPUT_PATH = Path(_LOG_PATH_ENV).expanduser()
else:
    _RAW_OUTPUT_PATH = Path(__file__).resolve().parents[3] / "llm_raw_outputs.md"
_RAW_OUTPUT_LOCK = threading.Lock()


class LLMClient:
    """
    Unified LLM client supporting multiple providers.

    Usage:
        client = LLMClient()
        response = client.complete(
            messages=[{"role": "user", "content": "Hello"}],
            description="greeting"
        )
    """

    def __init__(
        self,
        config: Optional[LLMConfig] = None,
        provider: Optional[BaseProvider] = None,
    ):
        self.config = config or get_llm_config()
        self._provider = provider or get_provider(self.config)
        self._fallback_provider: Optional[BaseProvider] = None

        if self.config.fallback_provider:
            fallback_config = LLMConfig(
                provider=self.config.fallback_provider,
                model=self.config.fallback_model or self.config.model,
                api_key=os.getenv(f"{self.config.fallback_provider.value.upper()}_API_KEY"),
                timeout_seconds=self.config.timeout_seconds,
                max_retries=self.config.max_retries,
            )
            self._fallback_provider = get_provider(fallback_config)

    @property
    def provider(self) -> BaseProvider:
        """Get the current provider."""
        return self._provider

    @property
    def model(self) -> str:
        """Get the current model name."""
        return self.config.model

    def complete(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        description: str = "llm_call",
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Execute a chat completion with retries and fallback.

        Args:
            messages: List of message dicts with role and content
            model: Optional model override
            description: Description for logging
            **kwargs: Additional provider-specific options

        Returns:
            OpenAI-compatible response dict
        """
        model = model or self.config.model
        delay = self.config.retry_delay
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.config.max_retries + 1):
            try:
                logger.info(
                    "llm_call_start",
                    extra={
                        "event": "llm_call_start",
                        "description": description,
                        "attempt": attempt,
                        "model": model,
                        "provider": self.config.provider.value,
                    }
                )

                response = self._provider.chat_completion(
                    messages=messages,
                    model=model,
                    **kwargs
                )

                _append_raw_output(description, response)

                logger.info(
                    "llm_call_success",
                    extra={
                        "event": "llm_call_success",
                        "description": description,
                        "attempt": attempt,
                        "model": model,
                        "provider": self.config.provider.value,
                    }
                )

                return response

            except Exception as exc:
                last_exc = exc

                # Check for quota/rate limit errors
                if _is_quota_exceeded_error(exc):
                    logger.warning(
                        "llm_quota_exceeded",
                        extra={
                            "event": "llm_quota_exceeded",
                            "description": description,
                            "provider": self.config.provider.value,
                        }
                    )
                    break

                # Check for temperature errors (some models don't support it)
                if "temperature" in kwargs and _is_temperature_unsupported_error(exc):
                    logger.info(
                        "llm_temperature_override_removed",
                        extra={
                            "event": "llm_temperature_override_removed",
                            "description": description,
                            "model": model,
                        }
                    )
                    kwargs.pop("temperature", None)
                    continue

                logger.warning(
                    "llm_call_retry",
                    extra={
                        "event": "llm_call_retry",
                        "description": description,
                        "attempt": attempt,
                        "max_attempts": self.config.max_retries,
                        "retry_in": delay if attempt < self.config.max_retries else None,
                        "error": str(exc),
                    }
                )

                if attempt >= self.config.max_retries:
                    break

                time.sleep(delay)
                delay *= self.config.retry_multiplier

        # Try fallback provider if available
        if self._fallback_provider and last_exc:
            logger.info(
                "llm_fallback_attempt",
                extra={
                    "event": "llm_fallback_attempt",
                    "description": description,
                    "fallback_provider": self.config.fallback_provider.value if self.config.fallback_provider else None,
                }
            )
            try:
                response = self._fallback_provider.chat_completion(
                    messages=messages,
                    model=self.config.fallback_model,
                    **kwargs
                )
                _append_raw_output(f"{description}_fallback", response)
                return response
            except Exception as fallback_exc:
                logger.error(
                    "llm_fallback_failed",
                    extra={
                        "event": "llm_fallback_failed",
                        "description": description,
                        "error": str(fallback_exc),
                    }
                )

        # All attempts failed
        assert last_exc is not None
        logger.error(
            "llm_call_failed",
            extra={
                "event": "llm_call_failed",
                "description": description,
                "attempts": self.config.max_retries,
                "model": model,
            },
            exc_info=last_exc,
        )

        if _is_quota_exceeded_error(last_exc):
            raise RuntimeError(
                f"{description} failed: API quota exceeded. "
                "Please check your API plan and billing details."
            ) from last_exc

        raise RuntimeError(
            f"{description} failed after {self.config.max_retries} attempts"
        ) from last_exc

    def complete_with_vision(
        self,
        text: str,
        images: List[Union[str, bytes, Path]],
        description: str = "vision_call",
        model: Optional[str] = None,
        detail: str = "auto",
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Execute a chat completion with vision/image inputs.

        Args:
            text: Text prompt
            images: List of images (paths, bytes, base64 strings, or URLs)
            description: Description for logging
            model: Optional model override (uses vision model by default)
            detail: Image detail level (auto, low, high)
            **kwargs: Additional options

        Returns:
            OpenAI-compatible response dict
        """
        model = model or self.config.get_vision_model()

        vision_message = self._provider.prepare_vision_message(
            text=text,
            images=images,
            detail=detail,
        )

        return self.complete(
            messages=[vision_message],
            model=model,
            description=description,
            **kwargs
        )

    def stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        description: str = "llm_stream",
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        """
        Execute a streaming chat completion.

        Yields:
            OpenAI-compatible chunk dicts
        """
        model = model or self.config.model

        logger.info(
            "llm_stream_start",
            extra={
                "event": "llm_stream_start",
                "description": description,
                "model": model,
                "provider": self.config.provider.value,
            }
        )

        try:
            for chunk in self._provider.chat_completion_stream(
                messages=messages,
                model=model,
                **kwargs
            ):
                yield chunk

            logger.info(
                "llm_stream_complete",
                extra={
                    "event": "llm_stream_complete",
                    "description": description,
                    "model": model,
                }
            )
        except Exception as exc:
            logger.error(
                "llm_stream_failed",
                extra={
                    "event": "llm_stream_failed",
                    "description": description,
                    "error": str(exc),
                }
            )
            raise

    def list_models(self) -> List[str]:
        """List available models from the current provider."""
        return self._provider.list_models()

    def health_check(self) -> bool:
        """Check if the provider is available."""
        return self._provider.health_check()


# Global client instance
_client: Optional[LLMClient] = None
_client_lock = threading.Lock()


def get_llm_client(force_new: bool = False) -> LLMClient:
    """Get the global LLM client instance."""
    global _client
    with _client_lock:
        if _client is None or force_new:
            _client = LLMClient()
    return _client


def call_completion(
    client: Any,  # Can be LLMClient or OpenAI client for backwards compatibility
    *,
    model: str,
    messages: List[Dict[str, Any]],
    description: str,
    timeout: Optional[float] = None,
    **kwargs: Any,
) -> Any:
    """
    Execute a chat completion - backwards compatible with existing code.

    This function provides compatibility with the existing call_chat_completion
    interface while supporting the new multi-provider system.

    Args:
        client: LLMClient or OpenAI client
        model: Model name
        messages: Message payload
        description: Description for logging
        timeout: Optional timeout (handled by provider config)
        **kwargs: Additional options

    Returns:
        Response object (dict or OpenAI response)
    """
    if isinstance(client, LLMClient):
        return client.complete(
            messages=messages,
            model=model,
            description=description,
            **kwargs
        )

    # Backwards compatibility: use existing OpenAI client
    # Import the old implementation
    from ..utils.llm import call_chat_completion as legacy_call
    return legacy_call(
        client,
        model=model,
        messages=messages,
        description=description,
        timeout=timeout,
        **kwargs
    )


def call_completion_with_vision(
    client: Any,
    *,
    text: str,
    images: List[Union[str, bytes, Path]],
    model: str,
    description: str,
    detail: str = "auto",
    **kwargs: Any,
) -> Any:
    """
    Execute a chat completion with vision inputs.

    Args:
        client: LLMClient or OpenAI client
        text: Text prompt
        images: List of images
        model: Model name
        description: Description for logging
        detail: Image detail level
        **kwargs: Additional options

    Returns:
        Response object
    """
    if isinstance(client, LLMClient):
        return client.complete_with_vision(
            text=text,
            images=images,
            model=model,
            description=description,
            detail=detail,
            **kwargs
        )

    # Backwards compatibility: build vision message manually
    import base64

    content: List[Dict[str, Any]] = [{"type": "text", "text": text}]

    for image in images:
        if isinstance(image, Path):
            image_data = base64.b64encode(image.read_bytes()).decode("utf-8")
            media_type = "image/png" if image.suffix.lower() == ".png" else "image/jpeg"
            image_url = f"data:{media_type};base64,{image_data}"
        elif isinstance(image, bytes):
            image_data = base64.b64encode(image).decode("utf-8")
            image_url = f"data:image/png;base64,{image_data}"
        else:
            image_url = image if image.startswith(("data:", "http")) else f"data:image/png;base64,{image}"

        content.append({
            "type": "image_url",
            "image_url": {"url": image_url, "detail": detail}
        })

    messages = [{"role": "user", "content": content}]

    from ..utils.llm import call_chat_completion as legacy_call
    return legacy_call(
        client,
        model=model,
        messages=messages,
        description=description,
        **kwargs
    )


def get_available_models() -> List[str]:
    """Get list of available models from the current provider."""
    client = get_llm_client()
    return client.list_models()


def health_check() -> Dict[str, Any]:
    """Check health of the LLM provider."""
    client = get_llm_client()
    config = client.config

    result = {
        "provider": config.provider.value,
        "model": config.model,
        "healthy": False,
        "fallback_available": config.fallback_provider is not None,
    }

    try:
        result["healthy"] = client.health_check()
        if result["healthy"]:
            result["available_models"] = client.list_models()[:5]  # First 5 models
    except Exception as e:
        result["error"] = str(e)

    return result


# Helper functions

def _append_raw_output(description: str, response: Any) -> None:
    """Append the raw LLM response to a Markdown log file."""
    timestamp = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    entry = _coerce_jsonable(response)

    try:
        with _RAW_OUTPUT_LOCK:
            _RAW_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            with _RAW_OUTPUT_PATH.open("a", encoding="utf-8") as handle:
                handle.write(f"## {timestamp} - {description}\n\n")
                handle.write("```json\n")
                handle.write(json.dumps(entry, indent=2))
                handle.write("\n```\n\n")
    except Exception as exc:
        logger.debug(
            "llm_raw_output_log_failed",
            extra={"event": "llm_raw_output_log_failed"},
            exc_info=(type(exc), exc, exc.__traceback__),
        )


def _coerce_jsonable(value: Any) -> Any:
    """Best-effort conversion to JSON-serializable data."""
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    if isinstance(value, dict):
        return {str(k): _coerce_jsonable(v) for k, v in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_coerce_jsonable(v) for v in value]

    for attr in ("model_dump", "to_dict", "dict"):
        method = getattr(value, attr, None)
        if callable(method):
            try:
                return _coerce_jsonable(method())
            except Exception:
                continue

    return repr(value)


def _is_quota_exceeded_error(exc: BaseException) -> bool:
    """Check if exception represents a quota/rate limit error."""
    detail = str(exc).lower()

    if "insufficient_quota" in detail:
        return True
    if "quota" in detail and ("exceeded" in detail or "insufficient" in detail):
        return True
    if "rate_limit" in detail or "ratelimit" in detail:
        return True

    # Check for OpenAI-specific error structure
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error = body.get("error", {})
        if isinstance(error, dict):
            code = str(error.get("code", "")).lower()
            if code in ("insufficient_quota", "rate_limit_exceeded"):
                return True

    return False


def _is_temperature_unsupported_error(exc: BaseException) -> bool:
    """Check if exception is about unsupported temperature."""
    detail = str(exc).lower()
    return "temperature" in detail and "unsupported" in detail
