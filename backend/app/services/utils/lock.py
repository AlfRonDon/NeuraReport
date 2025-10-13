from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

logger = logging.getLogger("neura.lock")


class TemplateLockError(RuntimeError):
    """Raised when a template directory is already locked."""


@contextmanager
def acquire_template_lock(
    template_dir: Path,
    name: str,
    correlation_id: str | None = None,
) -> Generator[None, None, None]:
    """
    Non-blocking lock implemented via exclusive file creation.
    Raises TemplateLockError if the lock already exists.
    """
    template_dir = template_dir.resolve()
    template_dir.mkdir(parents=True, exist_ok=True)
    lock_path = template_dir / f".lock.{name}"

    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL
    try:
        fd = os.open(lock_path, flags)
    except FileExistsError as exc:
        logger.warning(
            "lock_unavailable",
            extra={
                "event": "lock_unavailable",
                "lock": str(lock_path),
                "correlation_id": correlation_id,
            },
        )
        raise TemplateLockError(f"Lock already held for {lock_path}") from exc

    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(f"{correlation_id or ''}")
            handle.flush()
        logger.info(
            "lock_acquired",
            extra={
                "event": "lock_acquired",
                "lock": str(lock_path),
                "correlation_id": correlation_id,
            },
        )
        yield
    finally:
        try:
            os.unlink(lock_path)
            logger.info(
                "lock_released",
                extra={
                    "event": "lock_released",
                    "lock": str(lock_path),
                    "correlation_id": correlation_id,
                },
            )
        except FileNotFoundError:
            pass
