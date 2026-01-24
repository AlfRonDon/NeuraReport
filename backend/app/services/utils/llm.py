# mypy: ignore-errors
from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable, Dict, Iterable, Tuple

try:
    from openai import RateLimitError
except ImportError:  # pragma: no cover - optional dependency during tests
    RateLimitError = None  # type: ignore[assignment]

logger = logging.getLogger("neura.llm")

_TIMEOUT_RAW = os.getenv("LLM_TIMEOUT_SECONDS", os.getenv("OPENAI_REQUEST_TIMEOUT_SECONDS"))
if _TIMEOUT_RAW not in (None, "", "0"):
    try:
        _DEFAULT_TIMEOUT = float(_TIMEOUT_RAW)
    except ValueError:  # pragma: no cover - environment misconfiguration
        logger.warning(
            "invalid_openai_timeout",
            extra={
                "event": "invalid_openai_timeout",
                "value": _TIMEOUT_RAW,
            },
        )
        _DEFAULT_TIMEOUT = None
else:
    _DEFAULT_TIMEOUT = None

_MAX_ATTEMPTS = int(os.getenv("LLM_MAX_RETRIES", os.getenv("OPENAI_MAX_ATTEMPTS", "3")))
_BACKOFF_INITIAL = float(os.getenv("LLM_RETRY_DELAY", os.getenv("OPENAI_BACKOFF_SECONDS", "1.5")))
_BACKOFF_MULTIPLIER = float(os.getenv("LLM_RETRY_MULTIPLIER", os.getenv("OPENAI_BACKOFF_MULTIPLIER", "2.0")))
_FORCE_GPT5 = os.getenv("NEURA_FORCE_GPT5", "true").lower() in {"1", "true", "yes"}

_LOG_PATH_ENV = os.getenv("LLM_RAW_OUTPUT_PATH")
if _LOG_PATH_ENV:
    _RAW_OUTPUT_PATH = Path(_LOG_PATH_ENV).expanduser()
else:
    _RAW_OUTPUT_PATH = Path(__file__).resolve().parents[3] / "llm_raw_outputs.md"

_RAW_OUTPUT_LOCK = threading.Lock()


def _coerce_jsonable(value: Any) -> Any:
    """Best-effort conversion of OpenAI responses to JSON-serialisable data."""
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

    json_method = getattr(value, "model_dump_json", None)
    if callable(json_method):
        try:
            return _coerce_jsonable(json.loads(json_method()))
        except Exception:
            pass

    return repr(value)


def _append_raw_output(description: str, response: Any) -> None:
    """Append the raw LLM response to a Markdown log file."""
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds") + "Z"
    entry = _coerce_jsonable(response)

    try:
        with _RAW_OUTPUT_LOCK:
            _RAW_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            with _RAW_OUTPUT_PATH.open("a", encoding="utf-8") as handle:
                handle.write(f"## {timestamp} - {description}\n\n")
                handle.write("```json\n")
                handle.write(json.dumps(entry, indent=2))
                handle.write("\n```\n\n")
    except Exception as exc:  # pragma: no cover - logging must not break execution
        logger.debug(
            "llm_raw_output_log_failed",
            extra={"event": "llm_raw_output_log_failed"},
            exc_info=(type(exc), exc, exc.__traceback__),
        )


def _resolve_create(client: Any, timeout: float | None) -> Tuple[Callable[..., Any], Dict[str, Any]]:
    """
    Return (callable, extra_kwargs) that can be used to issue a chat completion request.
    Supports both the new v1 client (client.chat_completions) and the legacy
    client.chat.completions interface.
    """
    target = client
    extra_kwargs: Dict[str, Any] = {}

    if timeout is not None and hasattr(client, "with_options"):
        target = client.with_options(timeout=timeout)
    elif timeout is not None:
        extra_kwargs["timeout"] = timeout

    if hasattr(target, "chat_completions"):
        return target.chat_completions.create, extra_kwargs

    chat = getattr(target, "chat", None)
    if chat is not None and hasattr(chat, "completions"):
        return chat.completions.create, extra_kwargs

    raise AttributeError("OpenAI client does not expose chat completions API")


def _resolve_responses_create(client: Any, timeout: float | None) -> Tuple[Callable[..., Any], Dict[str, Any]]:
    target = client
    extra_kwargs: Dict[str, Any] = {}

    if timeout is not None and hasattr(client, "with_options"):
        target = client.with_options(timeout=timeout)
    elif timeout is not None:
        extra_kwargs["timeout"] = timeout

    responses = getattr(target, "responses", None)
    if responses is not None and hasattr(responses, "create"):
        return responses.create, extra_kwargs

    raise AttributeError("OpenAI client does not expose responses API")


def _messages_to_responses_input(messages: Iterable[Dict[str, Any]]) -> list[Dict[str, Any]]:
    converted: list[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        role = message.get("role") or "user"
        content = message.get("content", "")
        if isinstance(content, list):
            parts: list[Dict[str, Any]] = []
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


def _response_output_text(response: Any) -> str:
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
        texts: list[str] = []
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


def _response_usage_to_chat_usage(response: Any) -> SimpleNamespace | None:
    usage = response.get("usage") if isinstance(response, dict) else getattr(response, "usage", None)
    if usage is None:
        return None
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
    total_tokens = (input_tokens or 0) + (output_tokens or 0)
    return SimpleNamespace(
        prompt_tokens=int(input_tokens or 0),
        completion_tokens=int(output_tokens or 0),
        total_tokens=int(total_tokens or 0),
    )


def _responses_to_chat_completion(response: Any) -> Any:
    output_text = _response_output_text(response)
    message = SimpleNamespace(content=output_text, role="assistant")
    choice = SimpleNamespace(message=message)
    model = response.get("model") if isinstance(response, dict) else getattr(response, "model", None)
    response_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
    usage = _response_usage_to_chat_usage(response)
    return SimpleNamespace(
        id=response_id,
        model=model,
        choices=[choice],
        usage=usage,
    )


def _is_responses_required_error(exc: BaseException) -> bool:
    message, code, _, _ = _extract_openai_error_info(exc)
    detail = (message or str(exc)).lower()
    if (code or "").lower() == "unsupported_endpoint":
        return True
    return "responses api" in detail or "responses endpoint" in detail or "use the responses" in detail


def _is_temperature_unsupported_error(exc: BaseException) -> bool:
    """Return True when the error indicates temperature overrides are not allowed."""
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            if error.get("param") == "temperature" and error.get("code") == "unsupported_value":
                return True
            message = str(error.get("message") or "")
        else:
            message = ""
    else:
        message = ""

    detail = message or str(getattr(exc, "message", "")) or str(exc)
    detail_lower = detail.lower()
    return "temperature" in detail_lower and "unsupported" in detail_lower


def _is_quota_exceeded_error(exc: BaseException) -> bool:
    """Return True when the exception represents an OpenAI quota / rate limit exhaustion."""
    if RateLimitError is not None and isinstance(exc, RateLimitError):
        return True

    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            code = str(error.get("code") or "").lower()
            if code == "insufficient_quota":
                return True
            error_type = str(error.get("type") or "").lower()
            if error_type == "insufficient_quota":
                return True
            message = error.get("message")
            if isinstance(message, str):
                message_lower = message.lower()
                if "insufficient_quota" in message_lower:
                    return True
                if "quota" in message_lower and ("exceeded" in message_lower or "insufficient" in message_lower):
                    return True

    detail = str(exc)
    detail_lower = detail.lower()
    if "insufficient_quota" in detail_lower:
        return True
    return "exceeded your current quota" in detail_lower


def _extract_openai_error_info(exc: BaseException) -> tuple[str, Optional[str], Optional[str], Optional[str]]:
    """Return (message, code, type, param) from an OpenAI exception when available."""
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            code = error.get("code")
            err_type = error.get("type")
            param = error.get("param")
            return (
                str(message or "").strip(),
                str(code or "").strip() or None,
                str(err_type or "").strip() or None,
                str(param or "").strip() or None,
            )
    message = getattr(exc, "message", None)
    if isinstance(message, str) and message.strip():
        return message.strip(), None, None, None
    return str(exc), None, None, None


def _is_model_not_found_error(exc: BaseException) -> bool:
    """Return True when the error indicates an invalid or unavailable model."""
    message, code, _, _ = _extract_openai_error_info(exc)
    if (code or "").lower() == "model_not_found":
        return True
    detail = (message or str(exc)).lower()
    return "model" in detail and ("not found" in detail or "does not exist" in detail or "do not have access" in detail)


def _get_fallback_models(primary_model: str) -> list[str]:
    raw = os.getenv("OPENAI_FALLBACK_MODELS", "")
    if raw.strip():
        candidates = [m.strip() for m in raw.split(",") if m.strip()]
    else:
        candidates = []
    out: list[str] = []
    seen: set[str] = set()
    for model in candidates:
        if model == primary_model or model in seen:
            continue
        seen.add(model)
        out.append(model)
    return out


def _extract_openai_error_message(exc: BaseException) -> str:
    """Return the most meaningful error message we can extract from an OpenAI exception."""
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()

    message = getattr(exc, "message", None)
    if isinstance(message, str) and message.strip():
        return message.strip()
    return str(exc)


def call_chat_completion(
    client: Any,
    *,
    model: str,
    messages: Iterable[Dict[str, Any]],
    description: str,
    timeout: float | None = None,
    **kwargs: Any,
) -> Any:
    """
    Execute a chat completion with retries, exponential backoff, and timeout support.

    Args:
        client: OpenAI client instance.
        model: Model name.
        messages: Message payload (list/iterable of dicts).
        description: Short label used for logging (e.g., 'schema_inference').
        timeout: Optional timeout (seconds). Uses OPENAI_REQUEST_TIMEOUT_SECONDS when set and no explicit value is provided.
        **kwargs: Forwarded to the client's create() call (e.g., temperature).
    """
    timeout = timeout if timeout is not None else _DEFAULT_TIMEOUT
    if _FORCE_GPT5 and not str(model or "").lower().startswith("gpt-5"):
        logger.warning(
            "llm_model_overridden",
            extra={"event": "llm_model_overridden", "requested": model, "forced": "gpt-5"},
        )
        model = "gpt-5"
    delay = _BACKOFF_INITIAL
    last_exc: BaseException | None = None
    fallback_models = _get_fallback_models(model)
    force_responses = os.getenv("OPENAI_USE_RESPONSES", "").lower() in {"1", "true", "yes"}

    def _wants_responses(model_name: str) -> bool:
        return force_responses or str(model_name or "").lower().startswith("gpt-5")

    prefer_responses = _wants_responses(model)

    attempt = 1
    while attempt <= _MAX_ATTEMPTS:
        quota_exceeded = False
        using_responses = False
        try:
            if prefer_responses:
                try:
                    create_fn, extra_kwargs = _resolve_responses_create(client, timeout)
                except AttributeError as exc:
                    if _wants_responses(model):
                        raise RuntimeError(
                            "OpenAI Responses API is required for this model. "
                            "Upgrade the openai package to >=1.0.0 to use gpt-5."
                        ) from exc
                    prefer_responses = False
                else:
                    payload = {
                        "model": model,
                        "input": _messages_to_responses_input(messages),
                        **kwargs,
                        **extra_kwargs,
                    }
                    if "max_tokens" in payload and "max_output_tokens" not in payload:
                        payload["max_output_tokens"] = payload.pop("max_tokens")

                    logger.info(
                        "llm_call_start",
                        extra={
                            "event": "llm_call_start",
                            "description": description,
                            "attempt": attempt,
                            "model": model,
                            "endpoint": "responses",
                        },
                    )
                    using_responses = True
                    response = create_fn(**payload)
                    _append_raw_output(description, response)
                    logger.info(
                        "llm_call_success",
                        extra={
                            "event": "llm_call_success",
                            "description": description,
                            "attempt": attempt,
                            "model": model,
                            "endpoint": "responses",
                        },
                    )
                    return _responses_to_chat_completion(response)

            create_fn, extra_kwargs = _resolve_create(client, timeout)
            payload = {
                "model": model,
                "messages": list(messages),
                **kwargs,
                **extra_kwargs,
            }
            logger.info(
                "llm_call_start",
                extra={
                    "event": "llm_call_start",
                    "description": description,
                    "attempt": attempt,
                    "model": model,
                },
            )
            response = create_fn(**payload)
            _append_raw_output(description, response)
            logger.info(
                "llm_call_success",
                extra={
                    "event": "llm_call_success",
                    "description": description,
                    "attempt": attempt,
                    "model": model,
                },
            )
            return response
        except TypeError as exc:
            # Retry once without the timeout kwarg (legacy clients).
            if "timeout" in payload:
                payload.pop("timeout", None)
                try:
                    response = create_fn(**payload)
                    _append_raw_output(description, response)
                    logger.info(
                        "llm_call_success",
                        extra={
                            "event": "llm_call_success",
                            "description": description,
                            "attempt": attempt,
                            "model": model,
                            "timeout_dropped": True,
                        },
                    )
                    return _responses_to_chat_completion(response) if using_responses else response
                except Exception as inner_exc:
                    last_exc = inner_exc
                    quota_exceeded = _is_quota_exceeded_error(inner_exc)
            else:
                last_exc = exc
                quota_exceeded = _is_quota_exceeded_error(exc)
        except Exception as exc:
            if not prefer_responses and _is_responses_required_error(exc):
                prefer_responses = True
                last_exc = exc
                continue
            if _is_model_not_found_error(exc) and fallback_models:
                next_model = fallback_models.pop(0)
                logger.warning(
                    "llm_model_fallback",
                    extra={
                        "event": "llm_model_fallback",
                        "description": description,
                        "from_model": model,
                        "to_model": next_model,
                    },
                )
                model = next_model
                prefer_responses = _wants_responses(model)
                last_exc = exc
                continue
            if "temperature" in kwargs and _is_temperature_unsupported_error(exc):
                logger.info(
                    "llm_temperature_override_removed",
                    extra={
                        "event": "llm_temperature_override_removed",
                        "description": description,
                        "attempt": attempt,
                        "model": model,
                    },
                )
                kwargs.pop("temperature", None)
                continue
            last_exc = exc
            quota_exceeded = _is_quota_exceeded_error(exc)

        if quota_exceeded:
            break

        logger.warning(
            "llm_call_retry",
            extra={
                "event": "llm_call_retry",
                "description": description,
                "attempt": attempt,
                "max_attempts": _MAX_ATTEMPTS,
                "model": model,
                "retry_in": delay if attempt < _MAX_ATTEMPTS else None,
            },
        )

        if attempt >= _MAX_ATTEMPTS:
            break

        time.sleep(delay)
        delay *= _BACKOFF_MULTIPLIER
        attempt += 1

    assert last_exc is not None
    quota_exceeded = _is_quota_exceeded_error(last_exc)
    logger.error(
        "llm_call_failed",
        extra={
            "event": "llm_call_failed",
            "description": description,
            "attempts": _MAX_ATTEMPTS,
            "model": model,
            "quota_exceeded": quota_exceeded,
        },
        exc_info=last_exc,
    )
    if quota_exceeded:
        message = _extract_openai_error_message(last_exc)
        raise RuntimeError(
            f"{description} failed because the OpenAI API quota was exceeded. "
            f"{message or 'Please review your API plan and billing details.'}"
        ) from last_exc
    if _is_model_not_found_error(last_exc):
        message, code, _, _ = _extract_openai_error_info(last_exc)
        raise RuntimeError(
            f"{description} failed because the OpenAI model '{model}' is not available. "
            f"Set OPENAI_MODEL to a valid model you have access to. {message or code or ''}".strip()
        ) from last_exc
    message = _extract_openai_error_message(last_exc)
    raise RuntimeError(f"{description} failed after {_MAX_ATTEMPTS} attempts. {message}".strip()) from last_exc


async def call_chat_completion_async(
    client: Any,
    *,
    model: str,
    messages: Iterable[Dict[str, Any]],
    description: str,
    timeout: float | None = None,
    **kwargs: Any,
) -> Any:
    """
    Async wrapper for call_chat_completion to avoid blocking the event loop.
    """
    import asyncio

    return await asyncio.to_thread(
        call_chat_completion,
        client,
        model=model,
        messages=messages,
        description=description,
        timeout=timeout,
        **kwargs,
    )
