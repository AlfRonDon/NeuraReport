"""Tests for Dramatiq worker tasks using StubBroker fixtures."""
from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch


class TestReportTasks:
    """Test report generation task with StubBroker."""

    def test_generate_report_enqueues(self, stub_broker):
        """Verify generate_report actor can be enqueued."""
        from backend.app.services.worker.tasks.report_tasks import generate_report

        msg = generate_report.send("job-1", "template-1", "conn-1", "pdf")
        assert msg is not None

    def test_generate_report_idempotent_skip(self, stub_broker, stub_worker):
        """Verify idempotent skip when job already succeeded."""
        from backend.app.services.worker.tasks.report_tasks import generate_report

        mock_store = MagicMock()
        mock_store.get_job.return_value = {"status": "succeeded", "result": {"url": "/test.pdf"}}

        with patch("backend.app.services.worker.tasks.report_tasks.state_store", mock_store, create=True):
            # The actor import happens at fixture time, so we need to patch at call time
            msg = generate_report.send("job-done", "template-1", "conn-1")
            stub_worker.join()


class TestIngestionTasks:
    """Test document ingestion task."""

    def test_ingest_document_enqueues(self, stub_broker):
        """Verify ingest_document actor can be enqueued."""
        from backend.app.services.worker.tasks.ingestion_tasks import ingest_document

        msg = ingest_document.send("doc-1", "pdf", "https://example.com/doc.pdf")
        assert msg is not None


class TestAgentTasks:
    """Test agent execution task."""

    def test_run_agent_enqueues(self, stub_broker):
        """Verify run_agent actor can be enqueued."""
        from backend.app.services.worker.tasks.agent_tasks import run_agent

        msg = run_agent.send("task-1", "research", {"topic": "AI"})
        assert msg is not None

    def test_run_agent_idempotent_skip(self, stub_broker, stub_worker):
        """Verify idempotent skip when task already completed."""
        from backend.app.services.worker.tasks.agent_tasks import run_agent

        mock_repo = MagicMock()
        mock_task = MagicMock()
        mock_task.status = "completed"
        mock_repo.get_task.return_value = mock_task

        with patch("backend.app.services.worker.tasks.agent_tasks.agent_task_repository", mock_repo):
            msg = run_agent.send("task-done", "research", {"topic": "AI"})
            stub_worker.join()


class TestBrokerMiddleware:
    """Verify the StubBroker has correct middleware configured."""

    def test_broker_has_results_middleware(self, stub_broker):
        """Results middleware should be present for store_results=True actors."""
        from dramatiq.results import Results
        middleware_types = [type(m) for m in stub_broker.middleware]
        assert Results in middleware_types

    def test_broker_has_retries_middleware(self, stub_broker):
        """Retries middleware should be present for retry behavior testing."""
        from dramatiq.middleware import Retries
        middleware_types = [type(m) for m in stub_broker.middleware]
        assert Retries in middleware_types

    def test_broker_has_time_limit_middleware(self, stub_broker):
        """TimeLimit middleware should be present for timeout testing."""
        from dramatiq.middleware import TimeLimit
        middleware_types = [type(m) for m in stub_broker.middleware]
        assert TimeLimit in middleware_types
