import os
import threading
import time
from pathlib import Path

import pytest

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from backend.app.services.utils.lock import TemplateLockError, acquire_template_lock  # noqa: E402


def test_acquire_template_lock_non_blocking(tmp_path: Path):
    tdir = tmp_path / "template"
    tdir.mkdir(parents=True, exist_ok=True)

    with acquire_template_lock(tdir, "mapping"):
        with pytest.raises(TemplateLockError):
            with acquire_template_lock(tdir, "mapping"):
                pass
    assert not list(tdir.glob(".lock.*")), "lock files should be cleaned up after release"


def test_acquire_template_lock_allows_release(tmp_path: Path):
    tdir = tmp_path / "template"
    tdir.mkdir(parents=True, exist_ok=True)

    first_ready = threading.Event()
    second_started = threading.Event()
    results = []

    def first():
        with acquire_template_lock(tdir, "run"):
            first_ready.set()
            second_started.wait(timeout=1)
            time.sleep(0.1)
            results.append("first")

    def second():
        first_ready.wait(timeout=1)
        try:
            with acquire_template_lock(tdir, "run"):
                results.append("second")
        except TemplateLockError:
            results.append("blocked")
        finally:
            second_started.set()

    t1 = threading.Thread(target=first)
    t2 = threading.Thread(target=second)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert "first" in results
    assert "blocked" in results
    assert not list(tdir.glob(".lock.*")), "lock files should not linger after concurrent attempts"
