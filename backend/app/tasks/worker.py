"""
Dramatiq task worker configuration and task definitions.

Dramatiq + Redis provides persistent, distributed task processing with:
- At-least-once delivery
- Automatic retries with exponential backoff
- Priority queues
- Result storage

Based on: Bogdanp/dramatiq FastAPI integration patterns.
"""
from __future__ import annotations

import logging
import os
import time

import dramatiq
from dramatiq.brokers.redis import RedisBroker
from dramatiq.middleware import CurrentMessage, Retries, TimeLimit, Shutdown
from dramatiq.results import Results
from dramatiq.results.backends import RedisBackend

logger = logging.getLogger("neura.tasks")

# ---------------------------------------------------------------------------
# Broker configuration
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv("NEURA_REDIS_URL", "redis://localhost:6379/0")
RESULT_TTL_MS = int(os.getenv("NEURA_TASK_RESULT_TTL_MS", "1800000"))  # 30 min

_broker_initialized = False


def init_broker() -> None:
    """Initialize the Dramatiq broker with Redis backend."""
    global _broker_initialized
    if _broker_initialized:
        return

    result_backend = RedisBackend(url=REDIS_URL)
    broker = RedisBroker(url=REDIS_URL)
    broker.add_middleware(Results(backend=result_backend))
    broker.add_middleware(CurrentMessage())
    broker.add_middleware(Retries(max_retries=3, min_backoff=1000, max_backoff=60000))
    broker.add_middleware(TimeLimit(time_limit=600_000))  # 10 min default
    broker.add_middleware(Shutdown())

    dramatiq.set_broker(broker)
    _broker_initialized = True

    logger.info(
        "dramatiq_broker_initialized",
        extra={"event": "dramatiq_broker_initialized", "redis_url": REDIS_URL},
    )


# Initialize broker on import (workers need it immediately)
try:
    init_broker()
except Exception as exc:
    logger.warning(f"Dramatiq broker init failed (Redis may not be running): {exc}")


# ---------------------------------------------------------------------------
# Task definitions
# ---------------------------------------------------------------------------

@dramatiq.actor(queue_name="reports", priority=5, time_limit=600_000)
def generate_report_task(template_id: str, connection_id: str, params: dict) -> dict:
    """
    Generate a report in the background.

    Priority 5 (medium) - report generation is important but not urgent.
    Time limit: 10 minutes.
    """
    start = time.monotonic()
    logger.info("task_report_start", extra={
        "event": "task_report_start",
        "template_id": template_id,
        "connection_id": connection_id,
    })

    try:
        # Import here to avoid circular imports
        from backend.legacy.services.report_service import _run_report_job_sync
        result = _run_report_job_sync(template_id, connection_id, params)

        elapsed = time.monotonic() - start
        logger.info("task_report_complete", extra={
            "event": "task_report_complete",
            "template_id": template_id,
            "elapsed_seconds": round(elapsed, 2),
        })
        return {"status": "completed", "template_id": template_id, "result": result}

    except Exception as exc:
        elapsed = time.monotonic() - start
        logger.error("task_report_failed", extra={
            "event": "task_report_failed",
            "template_id": template_id,
            "error": str(exc),
            "elapsed_seconds": round(elapsed, 2),
        })
        raise


@dramatiq.actor(queue_name="agents", priority=3, time_limit=300_000)
def run_agent_task(task_id: str, agent_type: str, params: dict) -> dict:
    """
    Execute an AI agent task in the background.

    Priority 3 (high) - agent tasks are user-initiated and time-sensitive.
    Time limit: 5 minutes.
    """
    start = time.monotonic()
    logger.info("task_agent_start", extra={
        "event": "task_agent_start",
        "task_id": task_id,
        "agent_type": agent_type,
    })

    try:
        from backend.app.services.agents import agent_service_v2
        import asyncio

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                agent_service_v2._execute_task(task_id)
            )
        finally:
            loop.close()

        elapsed = time.monotonic() - start
        logger.info("task_agent_complete", extra={
            "event": "task_agent_complete",
            "task_id": task_id,
            "elapsed_seconds": round(elapsed, 2),
        })
        return {"status": "completed", "task_id": task_id}

    except Exception as exc:
        elapsed = time.monotonic() - start
        logger.error("task_agent_failed", extra={
            "event": "task_agent_failed",
            "task_id": task_id,
            "error": str(exc),
            "elapsed_seconds": round(elapsed, 2),
        })
        raise


@dramatiq.actor(queue_name="exports", priority=7, time_limit=300_000)
def export_document_task(document_id: str, format: str, options: dict) -> dict:
    """
    Export a document to the specified format in the background.

    Priority 7 (lower) - exports are not urgent.
    Time limit: 5 minutes.
    """
    start = time.monotonic()
    logger.info("task_export_start", extra={
        "event": "task_export_start",
        "document_id": document_id,
        "format": format,
    })

    try:
        from backend.app.services.export.service import ExportService
        service = ExportService()
        import asyncio

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                service.export(document_id, format, options)
            )
        finally:
            loop.close()

        elapsed = time.monotonic() - start
        logger.info("task_export_complete", extra={
            "event": "task_export_complete",
            "document_id": document_id,
            "format": format,
            "elapsed_seconds": round(elapsed, 2),
        })
        return {"status": "completed", "document_id": document_id, "format": format, "result": result}

    except Exception as exc:
        elapsed = time.monotonic() - start
        logger.error("task_export_failed", extra={
            "event": "task_export_failed",
            "document_id": document_id,
            "error": str(exc),
            "elapsed_seconds": round(elapsed, 2),
        })
        raise


@dramatiq.actor(queue_name="ingestion", priority=5, time_limit=600_000)
def ingest_document_task(file_path: str, options: dict) -> dict:
    """
    Ingest and process a document in the background.

    Priority 5 (medium).
    Time limit: 10 minutes.
    """
    start = time.monotonic()
    logger.info("task_ingest_start", extra={
        "event": "task_ingest_start",
        "file_path": file_path,
    })

    try:
        from backend.app.services.ingestion.service import IngestionService
        service = IngestionService()
        import asyncio

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                service.process_file(file_path, options)
            )
        finally:
            loop.close()

        elapsed = time.monotonic() - start
        logger.info("task_ingest_complete", extra={
            "event": "task_ingest_complete",
            "file_path": file_path,
            "elapsed_seconds": round(elapsed, 2),
        })
        return {"status": "completed", "file_path": file_path, "result": result}

    except Exception as exc:
        elapsed = time.monotonic() - start
        logger.error("task_ingest_failed", extra={
            "event": "task_ingest_failed",
            "file_path": file_path,
            "error": str(exc),
            "elapsed_seconds": round(elapsed, 2),
        })
        raise


@dramatiq.actor(queue_name="webhooks", priority=1, time_limit=30_000, max_retries=5)
def send_webhook_task(url: str, payload: dict, headers: dict | None = None) -> dict:
    """
    Deliver a webhook notification.

    Priority 1 (highest) - webhooks should be delivered promptly.
    Time limit: 30 seconds.
    Max retries: 5 with exponential backoff.
    """
    import httpx
    from backend.app.utils.ssrf_guard import validate_url

    validate_url(url)

    response = httpx.post(
        url,
        json=payload,
        headers=headers or {},
        timeout=25.0,
    )
    response.raise_for_status()

    logger.info("task_webhook_delivered", extra={
        "event": "task_webhook_delivered",
        "url": url,
        "status": response.status_code,
    })
    return {"status": "delivered", "status_code": response.status_code}
