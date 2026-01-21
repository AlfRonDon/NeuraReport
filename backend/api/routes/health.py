"""Health check routes."""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes/orchestrators."""
    return {"ready": True}
