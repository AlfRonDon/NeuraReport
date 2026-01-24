# mypy: ignore-errors
"""
LLM Provider Implementations.

Each provider implements a common interface for:
- Chat completions
- Vision/multimodal inputs
- Streaming responses
- Model listing
"""
from __future__ import annotations

import base64
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Union

from .config import LLMConfig, LLMProvider
from backend.app.services.config import get_settings

logger = logging.getLogger("neura.llm.providers")


def _force_gpt5(model_name: Optional[str]) -> str:
    """Use centralized config for model selection."""
    settings = get_settings()
    # Config already handles NEURA_FORCE_GPT5 logic
    return settings.openai_model


class BaseProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, config: LLMConfig):
        self.config = config
        self._client: Any = None

    @abstractmethod
    def get_client(self) -> Any:
        """Get or create the provider client."""
        pass

    @abstractmethod
    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Execute a chat completion request."""
        pass

    @abstractmethod
    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        """Execute a streaming chat completion request."""
        pass

    @abstractmethod
    def list_models(self) -> List[str]:
        """List available models."""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Check if the provider is available."""
        pass

    def supports_vision(self, model: Optional[str] = None) -> bool:
        """Check if the model supports vision inputs."""
        return self.config.supports_vision

    def prepare_vision_message(
        self,
        text: str,
        images: List[Union[str, bytes, Path]],
        detail: str = "auto",
    ) -> Dict[str, Any]:
        """Prepare a message with vision content."""
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
                # Assume it's already a URL or base64 string
                if image.startswith("data:") or image.startswith("http"):
                    image_url = image
                else:
                    image_url = f"data:image/png;base64,{image}"

            content.append({
                "type": "image_url",
                "image_url": {"url": image_url, "detail": detail}
            })

        return {"role": "user", "content": content}


class LiteLLMProvider(BaseProvider):
    """LiteLLM provider wrapper for multi-provider completions."""

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client
        try:
            import litellm
        except ImportError:
            raise RuntimeError("litellm package is required. Install with: pip install litellm")
        self._client = litellm
        return self._client

    def _resolve_model(self, model: Optional[str]) -> str:
        return model or self.config.model

    def _build_params(self, model: str) -> tuple[str, Dict[str, Any]]:
        params: Dict[str, Any] = {}
        if self.config.api_key:
            params["api_key"] = self.config.api_key
        if self.config.base_url:
            params["api_base"] = self.config.base_url

        provider_hint = (self.config.extra_options or {}).get("litellm_provider")
        if provider_hint == LLMProvider.AZURE.value:
            if self.config.azure_endpoint:
                params["api_base"] = self.config.azure_endpoint
            if self.config.azure_api_version:
                params["api_version"] = self.config.azure_api_version
            if self.config.azure_deployment:
                model = self.config.azure_deployment
        return model, params

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        client = self.get_client()
        resolved_model = self._resolve_model(model)
        resolved_model, params = self._build_params(resolved_model)

        if self.config.temperature is not None and "temperature" not in kwargs:
            kwargs["temperature"] = self.config.temperature
        if self.config.max_tokens is not None and "max_tokens" not in kwargs:
            kwargs["max_tokens"] = self.config.max_tokens

        response = client.completion(
            model=resolved_model,
            messages=messages,
            timeout=self.config.timeout_seconds,
            **params,
            **kwargs,
        )
        if hasattr(response, "model_dump"):
            return response.model_dump()
        return response

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        client = self.get_client()
        resolved_model = self._resolve_model(model)
        resolved_model, params = self._build_params(resolved_model)
        kwargs["stream"] = True
        response = client.completion(
            model=resolved_model,
            messages=messages,
            timeout=self.config.timeout_seconds,
            **params,
            **kwargs,
        )
        for chunk in response:
            if hasattr(chunk, "model_dump"):
                yield chunk.model_dump()
            elif isinstance(chunk, dict):
                yield chunk
            else:
                yield {"choices": [], "model": resolved_model}

    def list_models(self) -> List[str]:
        return [self.config.model]

    def health_check(self) -> bool:
        return True


class OpenAIProvider(BaseProvider):
    """OpenAI API provider (also works with OpenAI-compatible endpoints)."""

    def _use_responses(self, model: str) -> bool:
        force = os.getenv("OPENAI_USE_RESPONSES", "").lower() in {"1", "true", "yes"}
        return force or str(model or "").lower().startswith("gpt-5")

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            from openai import OpenAI
        except ImportError:
            raise RuntimeError("openai package is required. Install with: pip install openai>=1.0.0")

        client_kwargs: Dict[str, Any] = {}

        if self.config.api_key:
            client_kwargs["api_key"] = self.config.api_key

        if self.config.base_url:
            client_kwargs["base_url"] = self.config.base_url

        if self.config.timeout_seconds:
            client_kwargs["timeout"] = self.config.timeout_seconds

        self._client = OpenAI(**client_kwargs)
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        client = self.get_client()
        model = _force_gpt5(model or self.config.model)

        # Apply default settings
        if self.config.temperature is not None and "temperature" not in kwargs:
            kwargs["temperature"] = self.config.temperature
        if self.config.max_tokens is not None and "max_tokens" not in kwargs:
            kwargs["max_tokens"] = self.config.max_tokens

        if self._use_responses(model):
            payload_kwargs = _openai_prepare_responses_kwargs(kwargs)
            response = client.responses.create(
                model=model,
                input=_openai_messages_to_responses_input(messages),
                **payload_kwargs,
            )
            return _openai_responses_to_dict(response)

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )

        return _openai_response_to_dict(response)

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        client = self.get_client()
        model = _force_gpt5(model or self.config.model)

        if self._use_responses(model):
            payload_kwargs = _openai_prepare_responses_kwargs(kwargs)
            response = client.responses.create(
                model=model,
                input=_openai_messages_to_responses_input(messages),
                **payload_kwargs,
            )
            response_dict = _openai_responses_to_dict(response)
            content = (
                response_dict.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            if content:
                yield {
                    "id": response_dict.get("id", ""),
                    "model": response_dict.get("model", model),
                    "choices": [{
                        "index": 0,
                        "delta": {"content": content},
                        "finish_reason": "stop",
                    }],
                }
            return

        kwargs["stream"] = True

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )

        for chunk in response:
            yield _openai_chunk_to_dict(chunk)

    def list_models(self) -> List[str]:
        try:
            client = self.get_client()
            models = client.models.list()
            return [m.id for m in models.data]
        except Exception as e:
            logger.warning("list_models_failed", extra={"error": str(e)})
            return []

    def health_check(self) -> bool:
        try:
            client = self.get_client()
            client.models.list()
            return True
        except Exception:
            return False


class OllamaProvider(BaseProvider):
    """Ollama local LLM provider."""

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client

        # Ollama can be used via OpenAI-compatible API or native client
        base_url = self.config.base_url or "http://localhost:11434"

        try:
            from openai import OpenAI
            # Use OpenAI-compatible endpoint
            self._client = OpenAI(
                base_url=f"{base_url}/v1",
                api_key="ollama",  # Ollama doesn't require API key
                timeout=self.config.timeout_seconds,
            )
            self._use_openai_compat = True
        except ImportError:
            # Fall back to native ollama client or requests
            self._client = {"base_url": base_url}
            self._use_openai_compat = False

        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        client = self.get_client()
        model = model or self.config.model

        if getattr(self, "_use_openai_compat", False):
            # Use OpenAI-compatible API
            if self.config.temperature is not None and "temperature" not in kwargs:
                kwargs["temperature"] = self.config.temperature

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            return _openai_response_to_dict(response)
        else:
            # Use native Ollama API
            return self._native_chat_completion(messages, model, **kwargs)

    def _native_chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Use native Ollama HTTP API."""
        import urllib.request
        import json

        base_url = self._client["base_url"]
        url = f"{base_url}/api/chat"

        # Convert messages to Ollama format
        ollama_messages = []
        for msg in messages:
            ollama_msg = {"role": msg["role"]}
            content = msg.get("content", "")

            if isinstance(content, list):
                # Handle vision messages
                text_parts = []
                images = []
                for part in content:
                    if part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                    elif part.get("type") == "image_url":
                        img_url = part.get("image_url", {}).get("url", "")
                        if img_url.startswith("data:"):
                            # Extract base64 data
                            _, b64_data = img_url.split(",", 1)
                            images.append(b64_data)
                ollama_msg["content"] = "\n".join(text_parts)
                if images:
                    ollama_msg["images"] = images
            else:
                ollama_msg["content"] = content

            ollama_messages.append(ollama_msg)

        payload = {
            "model": model,
            "messages": ollama_messages,
            "stream": False,
        }

        if self.config.temperature is not None:
            payload["options"] = {"temperature": self.config.temperature}

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=self.config.timeout_seconds) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        return {
            "id": "ollama-" + str(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": result.get("message", {}).get("content", ""),
                },
                "finish_reason": "stop",
            }],
            "usage": {
                "prompt_tokens": result.get("prompt_eval_count", 0),
                "completion_tokens": result.get("eval_count", 0),
                "total_tokens": result.get("prompt_eval_count", 0) + result.get("eval_count", 0),
            }
        }

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        client = self.get_client()
        model = model or self.config.model

        if getattr(self, "_use_openai_compat", False):
            kwargs["stream"] = True
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            for chunk in response:
                yield _openai_chunk_to_dict(chunk)
        else:
            # Native streaming not implemented, yield full response
            response = self.chat_completion(messages, model, **kwargs)
            yield {
                "id": response["id"],
                "model": model,
                "choices": [{
                    "index": 0,
                    "delta": {"content": response["choices"][0]["message"]["content"]},
                    "finish_reason": "stop",
                }]
            }

    def list_models(self) -> List[str]:
        try:
            import urllib.request
            import json

            base_url = self.config.base_url or "http://localhost:11434"
            url = f"{base_url}/api/tags"

            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            return [m["name"] for m in result.get("models", [])]
        except Exception as e:
            logger.warning("ollama_list_models_failed", extra={"error": str(e)})
            return []

    def health_check(self) -> bool:
        try:
            models = self.list_models()
            return len(models) > 0 or self._check_api_endpoint()
        except Exception:
            return False

    def _check_api_endpoint(self) -> bool:
        try:
            import urllib.request
            base_url = self.config.base_url or "http://localhost:11434"
            req = urllib.request.Request(f"{base_url}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def pull_model(self, model: str) -> bool:
        """Pull a model from Ollama library."""
        try:
            import urllib.request
            import json

            base_url = self.config.base_url or "http://localhost:11434"
            url = f"{base_url}/api/pull"

            payload = json.dumps({"name": model}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=600) as resp:
                # Streaming response for progress
                for line in resp:
                    data = json.loads(line.decode("utf-8"))
                    if data.get("status") == "success":
                        return True
                    logger.info("ollama_pull_progress", extra={"status": data.get("status")})

            return True
        except Exception as e:
            logger.error("ollama_pull_failed", extra={"model": model, "error": str(e)})
            return False


class DeepSeekProvider(BaseProvider):
    """DeepSeek API provider."""

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            from openai import OpenAI
        except ImportError:
            raise RuntimeError("openai package is required for DeepSeek. Install with: pip install openai>=1.0.0")

        base_url = self.config.base_url or "https://api.deepseek.com"

        self._client = OpenAI(
            api_key=self.config.api_key,
            base_url=base_url,
            timeout=self.config.timeout_seconds,
        )
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        client = self.get_client()
        model = model or self.config.model

        if self.config.temperature is not None and "temperature" not in kwargs:
            kwargs["temperature"] = self.config.temperature
        if self.config.max_tokens is not None and "max_tokens" not in kwargs:
            kwargs["max_tokens"] = self.config.max_tokens

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )

        return _openai_response_to_dict(response)

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        client = self.get_client()
        model = model or self.config.model
        kwargs["stream"] = True

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )

        for chunk in response:
            yield _openai_chunk_to_dict(chunk)

    def list_models(self) -> List[str]:
        return ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]

    def health_check(self) -> bool:
        try:
            client = self.get_client()
            client.models.list()
            return True
        except Exception:
            return False


class AnthropicProvider(BaseProvider):
    """Anthropic Claude API provider."""

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            import anthropic
        except ImportError:
            raise RuntimeError("anthropic package is required. Install with: pip install anthropic")

        self._client = anthropic.Anthropic(
            api_key=self.config.api_key,
            timeout=self.config.timeout_seconds,
        )
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        client = self.get_client()
        model = model or self.config.model

        # Convert OpenAI message format to Anthropic format
        anthropic_messages = self._convert_messages(messages)

        # Extract system message
        system_message = None
        for msg in messages:
            if msg.get("role") == "system":
                system_message = msg.get("content", "")
                break

        create_kwargs: Dict[str, Any] = {
            "model": model,
            "messages": anthropic_messages,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens or 4096),
        }

        if system_message:
            create_kwargs["system"] = system_message

        if self.config.temperature is not None and "temperature" not in kwargs:
            create_kwargs["temperature"] = self.config.temperature
        elif "temperature" in kwargs:
            create_kwargs["temperature"] = kwargs["temperature"]

        response = client.messages.create(**create_kwargs)

        return self._convert_response(response)

    def _convert_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert OpenAI message format to Anthropic format."""
        anthropic_messages = []

        for msg in messages:
            if msg.get("role") == "system":
                continue  # System message handled separately

            anthropic_msg = {"role": msg["role"]}
            content = msg.get("content", "")

            if isinstance(content, list):
                # Handle vision messages
                anthropic_content = []
                for part in content:
                    if part.get("type") == "text":
                        anthropic_content.append({
                            "type": "text",
                            "text": part.get("text", "")
                        })
                    elif part.get("type") == "image_url":
                        img_url = part.get("image_url", {}).get("url", "")
                        if img_url.startswith("data:"):
                            # Extract media type and base64 data
                            meta, b64_data = img_url.split(",", 1)
                            media_type = meta.split(";")[0].replace("data:", "")
                            anthropic_content.append({
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": b64_data,
                                }
                            })
                anthropic_msg["content"] = anthropic_content
            else:
                anthropic_msg["content"] = content

            anthropic_messages.append(anthropic_msg)

        return anthropic_messages

    def _convert_response(self, response: Any) -> Dict[str, Any]:
        """Convert Anthropic response to OpenAI-compatible format."""
        content = ""
        for block in response.content:
            if hasattr(block, "text"):
                content += block.text

        return {
            "id": response.id,
            "model": response.model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": response.stop_reason or "stop",
            }],
            "usage": {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            }
        }

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        client = self.get_client()
        model = model or self.config.model

        anthropic_messages = self._convert_messages(messages)

        system_message = None
        for msg in messages:
            if msg.get("role") == "system":
                system_message = msg.get("content", "")
                break

        create_kwargs: Dict[str, Any] = {
            "model": model,
            "messages": anthropic_messages,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens or 4096),
            "stream": True,
        }

        if system_message:
            create_kwargs["system"] = system_message

        with client.messages.stream(**create_kwargs) as stream:
            for text in stream.text_stream:
                yield {
                    "id": "anthropic-stream",
                    "model": model,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": text},
                        "finish_reason": None,
                    }]
                }

    def list_models(self) -> List[str]:
        return [
            "claude-3-5-sonnet-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ]

    def health_check(self) -> bool:
        try:
            client = self.get_client()
            # Simple validation - Anthropic doesn't have a models endpoint
            return client is not None
        except Exception:
            return False


class AzureOpenAIProvider(BaseProvider):
    """Azure OpenAI provider."""

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            from openai import AzureOpenAI
        except ImportError:
            raise RuntimeError("openai package is required. Install with: pip install openai>=1.0.0")

        self._client = AzureOpenAI(
            api_key=self.config.api_key,
            api_version=self.config.azure_api_version,
            azure_endpoint=self.config.azure_endpoint,
            timeout=self.config.timeout_seconds,
        )
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        client = self.get_client()
        model = model or self.config.azure_deployment or self.config.model

        if self.config.temperature is not None and "temperature" not in kwargs:
            kwargs["temperature"] = self.config.temperature
        if self.config.max_tokens is not None and "max_tokens" not in kwargs:
            kwargs["max_tokens"] = self.config.max_tokens

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )

        return _openai_response_to_dict(response)

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        client = self.get_client()
        model = model or self.config.azure_deployment or self.config.model
        kwargs["stream"] = True

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )

        for chunk in response:
            yield _openai_chunk_to_dict(chunk)

    def list_models(self) -> List[str]:
        # Azure deployments are custom, return configured deployment
        return [self.config.azure_deployment] if self.config.azure_deployment else []

    def health_check(self) -> bool:
        try:
            client = self.get_client()
            return client is not None
        except Exception:
            return False


class GoogleGeminiProvider(BaseProvider):
    """Google Gemini API provider."""

    def get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            import google.generativeai as genai
        except ImportError:
            raise RuntimeError("google-generativeai package is required. Install with: pip install google-generativeai")

        genai.configure(api_key=self.config.api_key)
        self._client = genai
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        genai = self.get_client()
        model_name = model or self.config.model

        # Convert messages to Gemini format
        gemini_messages = self._convert_messages(messages)

        generation_config = {}
        if self.config.temperature is not None:
            generation_config["temperature"] = self.config.temperature
        if self.config.max_tokens is not None:
            generation_config["max_output_tokens"] = self.config.max_tokens

        model_instance = genai.GenerativeModel(model_name)
        response = model_instance.generate_content(
            gemini_messages,
            generation_config=generation_config if generation_config else None,
        )

        return self._convert_response(response, model_name)

    def _convert_messages(self, messages: List[Dict[str, Any]]) -> List[Any]:
        """Convert OpenAI message format to Gemini format."""
        gemini_parts = []

        for msg in messages:
            content = msg.get("content", "")
            role = msg.get("role", "user")

            if isinstance(content, list):
                # Handle vision messages
                for part in content:
                    if part.get("type") == "text":
                        gemini_parts.append(part.get("text", ""))
                    elif part.get("type") == "image_url":
                        img_url = part.get("image_url", {}).get("url", "")
                        if img_url.startswith("data:"):
                            # Gemini can handle base64 images
                            try:
                                from PIL import Image
                                import io
                                import base64

                                _, b64_data = img_url.split(",", 1)
                                image_bytes = base64.b64decode(b64_data)
                                image = Image.open(io.BytesIO(image_bytes))
                                gemini_parts.append(image)
                            except Exception:
                                pass
            else:
                if role == "system":
                    gemini_parts.insert(0, f"System: {content}\n\n")
                else:
                    gemini_parts.append(content)

        return gemini_parts

    def _convert_response(self, response: Any, model: str) -> Dict[str, Any]:
        """Convert Gemini response to OpenAI-compatible format."""
        content = response.text if hasattr(response, "text") else ""

        return {
            "id": "gemini-" + str(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }],
            "usage": {
                "prompt_tokens": 0,  # Gemini doesn't provide token counts easily
                "completion_tokens": 0,
                "total_tokens": 0,
            }
        }

    def chat_completion_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Iterator[Dict[str, Any]]:
        genai = self.get_client()
        model_name = model or self.config.model

        gemini_messages = self._convert_messages(messages)
        model_instance = genai.GenerativeModel(model_name)

        response = model_instance.generate_content(
            gemini_messages,
            stream=True,
        )

        for chunk in response:
            if hasattr(chunk, "text"):
                yield {
                    "id": "gemini-stream",
                    "model": model_name,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": chunk.text},
                        "finish_reason": None,
                    }]
                }

    def list_models(self) -> List[str]:
        return [
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-2.0-flash-exp",
            "gemini-pro",
        ]

    def health_check(self) -> bool:
        try:
            genai = self.get_client()
            return genai is not None
        except Exception:
            return False


# Helper functions

def _openai_prepare_responses_kwargs(kwargs: Dict[str, Any]) -> Dict[str, Any]:
    payload = dict(kwargs)
    payload.pop("stream", None)
    if "max_tokens" in payload and "max_output_tokens" not in payload:
        payload["max_output_tokens"] = payload.pop("max_tokens")
    return payload


def _openai_messages_to_responses_input(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    converted: List[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        role = message.get("role") or "user"
        content = message.get("content", "")
        if isinstance(content, list):
            parts: List[Dict[str, Any]] = []
            for part in content:
                if isinstance(part, dict):
                    part_type = part.get("type")
                    if part_type == "text":
                        parts.append({"type": "input_text", "text": part.get("text", "")})
                        continue
                    if part_type == "image_url":
                        image_url = part.get("image_url")
                        if isinstance(image_url, dict):
                            image_url = image_url.get("url") or image_url.get("image_url")
                        parts.append({"type": "input_image", "image_url": image_url})
                        continue
                    parts.append(part)
                else:
                    parts.append({"type": "input_text", "text": str(part)})
            content = parts
        converted.append({"role": role, "content": content})
    return converted


def _openai_responses_output_text(response: Any) -> str:
    if isinstance(response, dict):
        output_text = response.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            return output_text
        output = response.get("output")
    else:
        output_text = getattr(response, "output_text", None)
        if isinstance(output_text, str) and output_text.strip():
            return output_text
        output = getattr(response, "output", None)

    if isinstance(output, list):
        texts: List[str] = []
        for item in output:
            if isinstance(item, dict):
                item_type = item.get("type")
                content = item.get("content") or []
            else:
                item_type = getattr(item, "type", None)
                content = getattr(item, "content", None) or []
            if item_type != "message":
                continue
            for segment in content:
                if isinstance(segment, dict):
                    seg_type = segment.get("type")
                    text = segment.get("text")
                else:
                    seg_type = getattr(segment, "type", None)
                    text = getattr(segment, "text", None)
                if seg_type in {"output_text", "text"} and isinstance(text, str):
                    texts.append(text)
        if texts:
            return "\n".join(texts)
    return ""


def _openai_responses_usage(response: Any) -> Dict[str, int]:
    usage = response.get("usage") if isinstance(response, dict) else getattr(response, "usage", None)
    if usage is None:
        return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    if isinstance(usage, dict):
        input_tokens = usage.get("input_tokens") or usage.get("prompt_tokens") or 0
        output_tokens = usage.get("output_tokens") or usage.get("completion_tokens") or 0
    else:
        input_tokens = getattr(usage, "input_tokens", None)
        if input_tokens is None:
            input_tokens = getattr(usage, "prompt_tokens", 0)
        output_tokens = getattr(usage, "output_tokens", None)
        if output_tokens is None:
            output_tokens = getattr(usage, "completion_tokens", 0)
    total_tokens = int(input_tokens or 0) + int(output_tokens or 0)
    return {
        "prompt_tokens": int(input_tokens or 0),
        "completion_tokens": int(output_tokens or 0),
        "total_tokens": int(total_tokens),
    }


def _openai_responses_to_dict(response: Any) -> Dict[str, Any]:
    output_text = _openai_responses_output_text(response)
    response_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", "")
    model = response.get("model") if isinstance(response, dict) else getattr(response, "model", "")
    return {
        "id": response_id,
        "model": model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": output_text},
            "finish_reason": "stop",
        }],
        "usage": _openai_responses_usage(response),
    }

def _openai_response_to_dict(response: Any) -> Dict[str, Any]:
    """Convert OpenAI response object to dictionary."""
    if hasattr(response, "model_dump"):
        return response.model_dump()
    elif hasattr(response, "to_dict"):
        return response.to_dict()
    else:
        return {
            "id": getattr(response, "id", ""),
            "model": getattr(response, "model", ""),
            "choices": [
                {
                    "index": c.index,
                    "message": {
                        "role": c.message.role,
                        "content": c.message.content,
                    },
                    "finish_reason": c.finish_reason,
                }
                for c in response.choices
            ],
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            }
        }


def _openai_chunk_to_dict(chunk: Any) -> Dict[str, Any]:
    """Convert OpenAI streaming chunk to dictionary."""
    if hasattr(chunk, "model_dump"):
        return chunk.model_dump()

    return {
        "id": getattr(chunk, "id", ""),
        "model": getattr(chunk, "model", ""),
        "choices": [
            {
                "index": c.index,
                "delta": {
                    "role": getattr(c.delta, "role", None),
                    "content": getattr(c.delta, "content", None),
                },
                "finish_reason": c.finish_reason,
            }
            for c in chunk.choices
        ] if chunk.choices else []
    }


# Provider registry

PROVIDERS: Dict[LLMProvider, type] = {
    LLMProvider.OPENAI: OpenAIProvider,
    LLMProvider.LITELLM: LiteLLMProvider,
    LLMProvider.OLLAMA: OllamaProvider,
    LLMProvider.DEEPSEEK: DeepSeekProvider,
    LLMProvider.ANTHROPIC: AnthropicProvider,
    LLMProvider.AZURE: AzureOpenAIProvider,
    LLMProvider.GEMINI: GoogleGeminiProvider,
    LLMProvider.CUSTOM: OpenAIProvider,  # Custom endpoints use OpenAI-compatible API
}


def get_provider(config: LLMConfig) -> BaseProvider:
    """Get the appropriate provider for the configuration."""
    engine = os.getenv("NEURA_LLM_ENGINE", "litellm").lower().strip()
    if engine == "litellm":
        return LiteLLMProvider(config)
    provider_class = PROVIDERS.get(config.provider)
    if provider_class is None:
        raise ValueError(f"Unknown provider: {config.provider}")
    return provider_class(config)
