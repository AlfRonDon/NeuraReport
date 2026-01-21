"""OpenAI LLM adapter implementation."""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

from backend.core.errors import ExternalServiceError
from .base import BaseLLMClient, LLMMessage, LLMResponse

logger = logging.getLogger("neura.adapters.llm.openai")


class OpenAIClient(BaseLLMClient):
    """OpenAI API client implementation."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        default_model: str = "gpt-4o",
        max_retries: int = 3,
        timeout_seconds: float = 60.0,
        base_url: Optional[str] = None,
    ) -> None:
        super().__init__(
            default_model=default_model,
            max_retries=max_retries,
            timeout_seconds=timeout_seconds,
        )
        self._api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._base_url = base_url
        self._client = None

    def _get_client(self):
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            try:
                from openai import OpenAI
            except ImportError:
                raise ImportError(
                    "openai package is required. Install with: pip install openai"
                )

            kwargs: Dict[str, Any] = {
                "api_key": self._api_key,
                "timeout": self._timeout,
                "max_retries": self._max_retries,
            }
            if self._base_url:
                kwargs["base_url"] = self._base_url

            self._client = OpenAI(**kwargs)

        return self._client

    def complete(
        self,
        messages: List[LLMMessage],
        *,
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        """Send a completion request to OpenAI."""
        client = self._get_client()
        model_name = model or self._default_model

        kwargs: Dict[str, Any] = {
            "model": model_name,
            "messages": self._prepare_messages(messages),
            "temperature": temperature,
        }

        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        start = time.perf_counter()
        try:
            response = client.chat.completions.create(**kwargs)
            elapsed = (time.perf_counter() - start) * 1000

            logger.info(
                "llm_completion_success",
                extra={
                    "event": "llm_completion_success",
                    "model": model_name,
                    "elapsed_ms": elapsed,
                    "tokens": response.usage.total_tokens if response.usage else 0,
                },
            )

            return LLMResponse(
                content=response.choices[0].message.content or "",
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0,
                },
                finish_reason=response.choices[0].finish_reason,
                raw_response=response,
            )
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000
            logger.exception(
                "llm_completion_failed",
                extra={
                    "event": "llm_completion_failed",
                    "model": model_name,
                    "elapsed_ms": elapsed,
                    "error": str(e),
                },
            )
            raise ExternalServiceError(
                message=f"OpenAI API call failed: {e}",
                service="openai",
                cause=e,
            )

    async def complete_async(
        self,
        messages: List[LLMMessage],
        *,
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        """Send an async completion request to OpenAI."""
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError(
                "openai package is required. Install with: pip install openai"
            )

        kwargs: Dict[str, Any] = {
            "api_key": self._api_key,
            "timeout": self._timeout,
            "max_retries": self._max_retries,
        }
        if self._base_url:
            kwargs["base_url"] = self._base_url

        client = AsyncOpenAI(**kwargs)
        model_name = model or self._default_model

        request_kwargs: Dict[str, Any] = {
            "model": model_name,
            "messages": self._prepare_messages(messages),
            "temperature": temperature,
        }

        if max_tokens:
            request_kwargs["max_tokens"] = max_tokens

        if json_mode:
            request_kwargs["response_format"] = {"type": "json_object"}

        start = time.perf_counter()
        try:
            response = await client.chat.completions.create(**request_kwargs)
            elapsed = (time.perf_counter() - start) * 1000

            logger.info(
                "llm_completion_success_async",
                extra={
                    "event": "llm_completion_success_async",
                    "model": model_name,
                    "elapsed_ms": elapsed,
                    "tokens": response.usage.total_tokens if response.usage else 0,
                },
            )

            return LLMResponse(
                content=response.choices[0].message.content or "",
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0,
                },
                finish_reason=response.choices[0].finish_reason,
                raw_response=response,
            )
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000
            logger.exception(
                "llm_completion_failed_async",
                extra={
                    "event": "llm_completion_failed_async",
                    "model": model_name,
                    "elapsed_ms": elapsed,
                    "error": str(e),
                },
            )
            raise ExternalServiceError(
                message=f"OpenAI API call failed: {e}",
                service="openai",
                cause=e,
            )
