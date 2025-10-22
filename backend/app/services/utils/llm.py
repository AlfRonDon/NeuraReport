from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Tuple

try:
    from openai import RateLimitError
except ImportError:  # pragma: no cover - optional dependency during tests
    RateLimitError = None  # type: ignore[assignment]

logger = logging.getLogger("neura.llm")

_TIMEOUT_RAW = os.getenv("OPENAI_REQUEST_TIMEOUT_SECONDS")
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

_MAX_ATTEMPTS = int(os.getenv("OPENAI_MAX_ATTEMPTS", "3"))
_BACKOFF_INITIAL = float(os.getenv("OPENAI_BACKOFF_SECONDS", "1.5"))
_BACKOFF_MULTIPLIER = float(os.getenv("OPENAI_BACKOFF_MULTIPLIER", "2.0"))

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
    delay = _BACKOFF_INITIAL
    last_exc: BaseException | None = None

    attempt = 1
    while attempt <= _MAX_ATTEMPTS:
        create_fn, extra_kwargs = _resolve_create(client, timeout)
        payload = {
            "model": model,
            "messages": list(messages),
            **kwargs,
            **extra_kwargs,
        }
        quota_exceeded = False
        try:
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
                    return response
                except Exception as inner_exc:
                    last_exc = inner_exc
                    quota_exceeded = _is_quota_exceeded_error(inner_exc)
            else:
                last_exc = exc
                quota_exceeded = _is_quota_exceeded_error(exc)
        except Exception as exc:
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
    raise RuntimeError(f"{description} failed after {_MAX_ATTEMPTS} attempts") from last_exc
