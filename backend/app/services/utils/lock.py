from __future__ import annotations

import logging
import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Optional

logger = logging.getLogger("neura.lock")


class TemplateLockError(RuntimeError):
    """Raised when a template lock cannot be acquired."""

    def __init__(self, message: str, lock_holder: Optional[str] = None):
        super().__init__(message)
        self.lock_holder = lock_holder


class FileLock:
    """
    Cross-platform file-based lock implementation.
    Uses atomic file creation for Windows compatibility.
    """

    def __init__(
        self,
        lock_path: Path,
        timeout: float = 30.0,
        poll_interval: float = 0.1,
        stale_timeout: float = 300.0,  # 5 minutes
    ):
        self.lock_path = Path(lock_path)
        self.timeout = timeout
        self.poll_interval = poll_interval
        self.stale_timeout = stale_timeout
        self._locked = False

    def _get_lock_info(self) -> Optional[dict]:
        """Read lock file info if it exists."""
        try:
            if self.lock_path.exists():
                content = self.lock_path.read_text(encoding="utf-8")
                lines = content.strip().split("\n")
                return {
                    "pid": int(lines[0]) if len(lines) > 0 else 0,
                    "timestamp": float(lines[1]) if len(lines) > 1 else 0,
                    "holder": lines[2] if len(lines) > 2 else "unknown",
                }
        except (ValueError, IOError, OSError):
            pass
        return None

    def _is_stale(self, lock_info: dict) -> bool:
        """Check if lock is stale (holder process gone or timeout)."""
        # Check timestamp staleness
        if time.time() - lock_info.get("timestamp", 0) > self.stale_timeout:
            return True

        # Check if PID is still running (best-effort)
        pid = lock_info.get("pid", 0)
        if pid > 0:
            try:
                # On Windows and Unix, this raises an error if process doesn't exist
                os.kill(pid, 0)
            except (OSError, ProcessLookupError):
                return True

        return False

    def _write_lock(self, holder: str) -> None:
        """Write lock file with current process info."""
        content = f"{os.getpid()}\n{time.time()}\n{holder}"
        self.lock_path.write_text(content, encoding="utf-8")

    def acquire(self, holder: str = "unknown") -> bool:
        """
        Attempt to acquire the lock.
        Returns True if lock was acquired, False if timeout.
        """
        deadline = time.time() + self.timeout

        while time.time() < deadline:
            # Check for existing lock
            lock_info = self._get_lock_info()

            if lock_info is not None:
                # Lock exists - check if it's stale
                if self._is_stale(lock_info):
                    logger.warning(
                        "stale_lock_found",
                        extra={
                            "event": "stale_lock_found",
                            "lock_path": str(self.lock_path),
                            "stale_holder": lock_info.get("holder"),
                            "stale_pid": lock_info.get("pid"),
                        },
                    )
                    # Remove stale lock
                    try:
                        self.lock_path.unlink()
                    except (OSError, FileNotFoundError):
                        pass
                else:
                    # Lock is held by another process
                    time.sleep(self.poll_interval)
                    continue

            # Try to create lock file atomically
            try:
                # Use exclusive create mode to ensure atomicity
                fd = os.open(
                    str(self.lock_path),
                    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                    0o644,
                )
                os.close(fd)
                self._write_lock(holder)
                self._locked = True
                logger.debug(
                    "lock_acquired",
                    extra={
                        "event": "lock_acquired",
                        "lock_path": str(self.lock_path),
                        "holder": holder,
                    },
                )
                return True
            except FileExistsError:
                # Another process got the lock first
                time.sleep(self.poll_interval)
                continue
            except (OSError, IOError) as e:
                logger.warning(f"Lock creation failed: {e}")
                time.sleep(self.poll_interval)
                continue

        return False

    def release(self) -> None:
        """Release the lock."""
        if self._locked:
            try:
                self.lock_path.unlink()
                logger.debug(
                    "lock_released",
                    extra={
                        "event": "lock_released",
                        "lock_path": str(self.lock_path),
                    },
                )
            except (OSError, FileNotFoundError):
                pass
            finally:
                self._locked = False


@contextmanager
def acquire_template_lock(
    template_dir: Path,
    name: str,
    correlation_id: str | None = None,
    timeout: float = 30.0,
) -> Generator[None, None, None]:
    """
    Context manager for template locking.
    Prevents concurrent modifications to the same template.

    Args:
        template_dir: Directory containing the template
        name: Lock name (usually template ID)
        correlation_id: Optional correlation ID for logging
        timeout: Maximum time to wait for lock acquisition

    Raises:
        TemplateLockError: If lock cannot be acquired within timeout
    """
    lock_path = Path(template_dir) / f".lock.{name}"
    holder = f"pid={os.getpid()}"
    if correlation_id:
        holder = f"{holder},corr={correlation_id}"

    lock = FileLock(lock_path, timeout=timeout)

    logger.info(
        "lock_acquiring",
        extra={
            "event": "lock_acquiring",
            "lock": str(lock_path),
            "holder": holder,
            "correlation_id": correlation_id,
        },
    )

    if not lock.acquire(holder):
        lock_info = lock._get_lock_info()
        current_holder = lock_info.get("holder") if lock_info else "unknown"
        raise TemplateLockError(
            f"Failed to acquire template lock '{name}' within {timeout}s. "
            f"Currently held by: {current_holder}",
            lock_holder=current_holder,
        )

    try:
        yield
    finally:
        lock.release()


@contextmanager
def try_acquire_template_lock(
    template_dir: Path,
    name: str,
    correlation_id: str | None = None,
    timeout: float = 5.0,
) -> Generator[bool, None, None]:
    """
    Non-blocking version that yields True if lock acquired, False otherwise.
    Does not raise an exception on failure.
    """
    lock_path = Path(template_dir) / f".lock.{name}"
    holder = f"pid={os.getpid()}"
    if correlation_id:
        holder = f"{holder},corr={correlation_id}"

    lock = FileLock(lock_path, timeout=timeout)
    acquired = lock.acquire(holder)

    try:
        yield acquired
    finally:
        if acquired:
            lock.release()
