from __future__ import annotations

import logging
import os
import time
from typing import Any, Callable, Dict, Iterable, Tuple

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

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        create_fn, extra_kwargs = _resolve_create(client, timeout)
        payload = {
            "model": model,
            "messages": list(messages),
            **kwargs,
            **extra_kwargs,
        }
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
            else:
                last_exc = exc
        except Exception as exc:
            last_exc = exc

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

    assert last_exc is not None
    logger.error(
        "llm_call_failed",
        extra={
            "event": "llm_call_failed",
            "description": description,
            "attempts": _MAX_ATTEMPTS,
            "model": model,
        },
        exc_info=last_exc,
    )
    raise RuntimeError(f"{description} failed after {_MAX_ATTEMPTS} attempts") from last_exc
