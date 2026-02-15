"""
OpenTelemetry + Prometheus observability module.

Configures distributed tracing (OTLP exporter) and metrics (Prometheus).
Call `init_observability()` during app startup to wire everything.

Based on: open-telemetry/opentelemetry-python + prometheus/client_python patterns.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import FastAPI

logger = logging.getLogger("neura.observability")


def init_tracing(app: FastAPI, otlp_endpoint: Optional[str] = None, service_name: str = "neurareport-backend") -> bool:
    """
    Initialize OpenTelemetry tracing with OTLP gRPC exporter.

    Returns True if tracing was successfully initialized.
    """
    endpoint = otlp_endpoint or os.getenv("NEURA_OTLP_ENDPOINT")
    if not endpoint:
        logger.info("otel_tracing_skipped", extra={"event": "otel_tracing_skipped", "reason": "no endpoint"})
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        resource = Resource.create({SERVICE_NAME: service_name})
        provider = TracerProvider(resource=resource)

        exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)

        trace.set_tracer_provider(provider)

        # Instrument FastAPI
        FastAPIInstrumentor.instrument_app(app)

        # Instrument logging to include trace/span IDs
        LoggingInstrumentor().instrument(set_logging_format=True)

        logger.info(
            "otel_tracing_initialized",
            extra={
                "event": "otel_tracing_initialized",
                "endpoint": endpoint,
                "service": service_name,
            },
        )
        return True

    except ImportError as exc:
        logger.warning("otel_import_failed", extra={"event": "otel_import_failed", "error": str(exc)})
        return False
    except Exception as exc:
        logger.warning("otel_init_failed", extra={"event": "otel_init_failed", "error": str(exc)})
        return False


def init_metrics(app: FastAPI, enabled: bool = True) -> bool:
    """
    Initialize Prometheus metrics endpoint at /metrics.

    Tracks:
    - HTTP request count, latency, and response size
    - Active requests gauge
    - LLM token usage (custom counters)
    - Agent task counts

    Returns True if metrics were successfully initialized.
    """
    if not enabled:
        logger.info("metrics_skipped", extra={"event": "metrics_skipped", "reason": "disabled"})
        return False

    try:
        from prometheus_client import (
            Counter,
            Histogram,
            Gauge,
            Info,
            generate_latest,
            CONTENT_TYPE_LATEST,
        )
        from starlette.requests import Request
        from starlette.responses import Response

        # --- Define metrics ---
        REQUEST_COUNT = Counter(
            "neurareport_http_requests_total",
            "Total HTTP requests",
            ["method", "endpoint", "status"],
        )
        REQUEST_LATENCY = Histogram(
            "neurareport_http_request_duration_seconds",
            "HTTP request latency in seconds",
            ["method", "endpoint"],
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
        )
        ACTIVE_REQUESTS = Gauge(
            "neurareport_active_requests",
            "Number of active HTTP requests",
        )
        LLM_TOKENS = Counter(
            "neurareport_llm_tokens_total",
            "Total LLM tokens consumed",
            ["model", "direction"],  # direction: input|output
        )
        LLM_COST = Counter(
            "neurareport_llm_cost_usd_total",
            "Total estimated LLM cost in USD",
            ["model"],
        )
        AGENT_TASKS = Counter(
            "neurareport_agent_tasks_total",
            "Total agent tasks by type and status",
            ["agent_type", "status"],
        )
        DB_QUERY_LATENCY = Histogram(
            "neurareport_db_query_duration_seconds",
            "Database query latency",
            ["operation"],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
        )
        APP_INFO = Info("neurareport_app", "Application metadata")

        # Set app info
        from backend.app.services.config import get_settings
        settings = get_settings()
        APP_INFO.info({
            "version": settings.version,
            "commit": settings.commit,
        })

        # Store metrics on app state for access from other modules
        app.state.metrics = {
            "request_count": REQUEST_COUNT,
            "request_latency": REQUEST_LATENCY,
            "active_requests": ACTIVE_REQUESTS,
            "llm_tokens": LLM_TOKENS,
            "llm_cost": LLM_COST,
            "agent_tasks": AGENT_TASKS,
            "db_query_latency": DB_QUERY_LATENCY,
        }

        # Add /metrics endpoint
        @app.get("/metrics", include_in_schema=False)
        async def metrics_endpoint():
            return Response(
                content=generate_latest(),
                media_type=CONTENT_TYPE_LATEST,
            )

        logger.info("prometheus_metrics_initialized", extra={"event": "prometheus_metrics_initialized"})
        return True

    except ImportError as exc:
        logger.warning("prometheus_import_failed", extra={"event": "prometheus_import_failed", "error": str(exc)})
        return False
    except Exception as exc:
        logger.warning("prometheus_init_failed", extra={"event": "prometheus_init_failed", "error": str(exc)})
        return False


def init_observability(app: FastAPI, otlp_endpoint: Optional[str] = None,
                       metrics_enabled: bool = True, service_name: str = "neurareport-backend") -> dict:
    """
    Initialize all observability components.

    Returns a dict of what was initialized.
    """
    result = {
        "tracing": init_tracing(app, otlp_endpoint, service_name),
        "metrics": init_metrics(app, metrics_enabled),
    }

    logger.info("observability_init_complete", extra={"event": "observability_init_complete", **result})
    return result
