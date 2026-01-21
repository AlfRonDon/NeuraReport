from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request

from backend.app.core.config import get_settings
from backend.app.features.analyze.services.document_analysis_service import _ANALYSIS_CACHE

router = APIRouter()


def _check_directory_access(path: Path) -> Dict[str, Any]:
    """Check if a directory is accessible for read/write operations."""
    try:
        if not path.exists():
            return {"status": "warning", "message": "Directory does not exist", "path": str(path)}
        if not path.is_dir():
            return {"status": "error", "message": "Path is not a directory", "path": str(path)}
        # Try to list directory contents
        list(path.iterdir())
        # Check write access
        test_file = path / f".health_check_{os.getpid()}"
        try:
            test_file.write_text("health check")
            test_file.unlink()
            return {"status": "healthy", "path": str(path), "writable": True}
        except (OSError, PermissionError):
            return {"status": "warning", "path": str(path), "writable": False, "message": "Read-only access"}
    except Exception as e:
        return {"status": "error", "message": str(e), "path": str(path)}


def _check_openai_connection() -> Dict[str, Any]:
    """Check if OpenAI API is configured and accessible."""
    settings = get_settings()
    if not settings.openai_api_key:
        return {"status": "not_configured", "message": "OPENAI_API_KEY not set"}

    try:
        from backend.app.services.templates.TemplateVerify import get_openai_client
        client = get_openai_client()
        # Just check if client was created - don't actually call the API in health check
        if client is not None:
            return {
                "status": "configured",
                "message": "OpenAI client initialized",
                "key_prefix": settings.openai_api_key[:8] + "..." if settings.openai_api_key else None,
            }
        return {"status": "error", "message": "Failed to initialize OpenAI client"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def _get_memory_usage() -> Dict[str, Any]:
    """Get current process memory usage."""
    try:
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF)
        return {
            "max_rss_mb": usage.ru_maxrss / 1024 if hasattr(usage, 'ru_maxrss') else None,
            "status": "healthy",
        }
    except ImportError:
        # resource module not available on Windows
        try:
            import psutil
            process = psutil.Process(os.getpid())
            mem_info = process.memory_info()
            return {
                "rss_mb": mem_info.rss / 1024 / 1024,
                "vms_mb": mem_info.vms / 1024 / 1024,
                "status": "healthy",
            }
        except ImportError:
            return {"status": "unknown", "message": "Memory stats not available"}


@router.get("/health")
async def health(request: Request) -> Dict[str, Any]:
    """Basic health check - fast, for load balancer probes."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "correlation_id": getattr(request.state, "correlation_id", None),
    }


@router.get("/healthz")
async def healthz() -> Dict[str, str]:
    """Kubernetes-style liveness probe."""
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> Dict[str, Any]:
    """Kubernetes-style readiness probe - checks if app can serve requests."""
    settings = get_settings()
    checks = {}
    overall_status = "ready"

    # Check uploads directory
    uploads_check = _check_directory_access(settings.uploads_dir)
    checks["uploads_dir"] = uploads_check
    if uploads_check["status"] == "error":
        overall_status = "not_ready"

    # Check state directory
    state_check = _check_directory_access(settings.state_dir)
    checks["state_dir"] = state_check
    if state_check["status"] == "error":
        overall_status = "not_ready"

    return {
        "status": overall_status,
        "checks": checks,
    }


@router.get("/readyz")
async def readyz() -> Dict[str, Any]:
    """Compatibility alias for readiness probe."""
    return await ready()


@router.get("/health/token-usage")
async def token_usage(request: Request) -> Dict[str, Any]:
    """Get LLM token usage statistics."""
    try:
        from backend.app.services.llm.client import get_global_usage_stats
        stats = get_global_usage_stats()
        return {
            "status": "ok",
            "usage": stats,
            "correlation_id": getattr(request.state, "correlation_id", None),
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "usage": {
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_tokens": 0,
                "estimated_cost_usd": 0.0,
                "request_count": 0,
            },
            "correlation_id": getattr(request.state, "correlation_id", None),
        }


@router.get("/health/detailed")
async def health_detailed(request: Request) -> Dict[str, Any]:
    """Comprehensive health check with all dependencies."""
    settings = get_settings()
    started = time.time()

    checks: Dict[str, Any] = {}
    issues: list[str] = []

    # Check critical directories
    checks["uploads_dir"] = _check_directory_access(settings.uploads_dir)
    if checks["uploads_dir"]["status"] == "error":
        issues.append("Uploads directory not accessible")

    checks["excel_uploads_dir"] = _check_directory_access(settings.excel_uploads_dir)

    checks["state_dir"] = _check_directory_access(settings.state_dir)
    if checks["state_dir"]["status"] == "error":
        issues.append("State directory not accessible")

    # Check OpenAI connection
    checks["openai"] = _check_openai_connection()
    if checks["openai"]["status"] == "error":
        issues.append("OpenAI API error")

    # Check cache status
    checks["analysis_cache"] = {
        "status": "healthy",
        "current_size": _ANALYSIS_CACHE.size(),
        "max_size": _ANALYSIS_CACHE.max_items,
        "ttl_seconds": _ANALYSIS_CACHE.ttl_seconds,
    }

    # Memory usage
    checks["memory"] = _get_memory_usage()

    # API configuration
    checks["configuration"] = {
        "api_key_configured": settings.api_key is not None,
        "rate_limiting_enabled": settings.rate_limit_enabled,
        "rate_limit": f"{settings.rate_limit_requests}/{settings.rate_limit_window_seconds}s",
        "request_timeout": settings.request_timeout_seconds,
        "max_upload_size_mb": settings.max_upload_bytes / 1024 / 1024,
        "max_zip_entries": settings.max_zip_entries,
        "max_zip_uncompressed_mb": settings.max_zip_uncompressed_bytes / 1024 / 1024,
        "template_import_max_concurrency": settings.template_import_max_concurrency,
        "analysis_max_concurrency": settings.analysis_max_concurrency,
        "debug_mode": settings.debug_mode,
    }

    elapsed_ms = int((time.time() - started) * 1000)

    overall_status = "healthy" if not issues else "degraded"

    return {
        "status": overall_status,
        "version": settings.api_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "response_time_ms": elapsed_ms,
        "checks": checks,
        "issues": issues if issues else None,
        "correlation_id": getattr(request.state, "correlation_id", None),
    }
