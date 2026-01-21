"""
Health check endpoints.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "ok", "version": "2.0.0"}


@router.get("/health/ready")
async def readiness_check():
    """Readiness check - verifies dependencies are available."""
    from ..dependencies import get_dependencies

    deps = get_dependencies()
    checks = {
        "repositories": True,
        "event_bus": deps.event_bus is not None,
        "worker_pool": deps.worker_pool.is_running if deps.worker_pool else False,
    }

    all_ready = all(checks.values())
    return {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
    }
