from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

logger = logging.getLogger("neura.lock")


class TemplateLockError(RuntimeError):
    """Retained for backwards compatibility; locks are disabled."""


@contextmanager
def acquire_template_lock(
    template_dir: Path,
    name: str,
    correlation_id: str | None = None,
) -> Generator[None, None, None]:
    """No-op template lock; logs intent and continues without locking."""
    lock_path = Path(template_dir) / f".lock.{name}"
    logger.info(
        "lock_disabled",
        extra={
            "event": "lock_disabled",
            "lock": str(lock_path),
            "correlation_id": correlation_id,
        },
    )
    yield
