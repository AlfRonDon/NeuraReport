"""Test fixtures for Dramatiq actors using StubBroker."""
from __future__ import annotations

import dramatiq
import pytest
from dramatiq import Worker
from dramatiq.brokers.stub import StubBroker
from dramatiq.results import Results
from dramatiq.results.backends import StubBackend


@pytest.fixture(autouse=True)
def stub_broker():
    """Replace the real Redis broker with an in-memory stub."""
    result_backend = StubBackend()
    broker = StubBroker()
    broker.add_middleware(Results(backend=result_backend))
    dramatiq.set_broker(broker)

    # Re-import actors so they register with the stub broker
    from backend.app.worker.tasks import report_tasks  # noqa: F401
    from backend.app.worker.tasks import agent_tasks  # noqa: F401
    from backend.app.worker.tasks import ingestion_tasks  # noqa: F401

    broker.flush_all()
    yield broker
    broker.close()


@pytest.fixture
def stub_worker(stub_broker):
    """Start a worker that processes messages synchronously in tests."""
    worker = Worker(stub_broker, worker_timeout=100)
    worker.start()
    yield worker
    worker.stop()
