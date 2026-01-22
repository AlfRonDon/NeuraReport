from __future__ import annotations

import asyncio
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .idempotency import IdempotencyMiddleware, IdempotencyStore
from ..services.utils.context import set_correlation_id
from .config import Settings
from .ux_governance import UXGovernanceMiddleware, IntentHeaders

logger = logging.getLogger("neura.api")

def _get_client_key(request: Request) -> str:
    """Get unique client identifier for rate limiting."""
    api_key = request.headers.get("x-api-key")
    if api_key:
        return f"key:{api_key[:16]}"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"


def _format_rate_limit(requests: int, window_seconds: int) -> str:
    if window_seconds <= 1:
        return f"{requests}/second"
    if window_seconds == 60:
        return f"{requests}/minute"
    if window_seconds == 3600:
        return f"{requests}/hour"
    if window_seconds == 86400:
        return f"{requests}/day"
    return f"{requests}/{window_seconds} second"


def _build_default_limits(settings: Settings) -> list[str]:
    limits: list[str] = []
    if settings.rate_limit_requests > 0 and settings.rate_limit_window_seconds > 0:
        limits.append(_format_rate_limit(settings.rate_limit_requests, settings.rate_limit_window_seconds))
    if settings.rate_limit_burst > 0:
        limits.append(f"{settings.rate_limit_burst}/second")
    return limits


limiter = Limiter(key_func=_get_client_key, default_limits=[], headers_enabled=True)


def _configure_limiter(settings: Settings) -> None:
    limiter.default_limits = _build_default_limits(settings)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # XSS protection (for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy (adjust as needed for your frontend)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self'; "
            "connect-src 'self'"
        )

        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        return response


class RequestTimeoutMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce request timeout."""

    def __init__(self, app, timeout_seconds: int = 300):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next):
        # Allow longer timeout for streaming endpoints
        timeout = self.timeout_seconds
        if "/stream" in request.url.path or "/upload" in request.url.path:
            timeout = timeout * 2  # Double timeout for streaming/upload

        try:
            response = await asyncio.wait_for(
                call_next(request),
                timeout=timeout,
            )
            return response
        except asyncio.TimeoutError:
            correlation_id = getattr(getattr(request, "state", None), "correlation_id", None)
            logger.error(
                "request_timeout",
                extra={
                    "event": "request_timeout",
                    "path": request.url.path,
                    "method": request.method,
                    "timeout": timeout,
                },
            )
            return JSONResponse(
                status_code=504,
                content={
                    "status": "error",
                    "code": "request_timeout",
                    "message": "Request timed out. Please try again with a smaller payload or simpler request.",
                    "timeout_seconds": timeout,
                    "correlation_id": correlation_id,
                },
            )


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware to handle correlation IDs and request logging."""

    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("x-correlation-id") or uuid.uuid4().hex
        set_correlation_id(correlation_id)
        request.state.correlation_id = correlation_id
        started = time.time()

        logger.info(
            "request_start",
            extra={
                "event": "request_start",
                "path": request.url.path,
                "method": request.method,
                "correlation_id": correlation_id,
            },
        )

        try:
            response = await call_next(request)
        except Exception:
            elapsed = int((time.time() - started) * 1000)
            logger.exception(
                "request_error",
                extra={
                    "event": "request_error",
                    "path": request.url.path,
                    "method": request.method,
                    "elapsed_ms": elapsed,
                    "correlation_id": correlation_id,
                },
            )
            set_correlation_id(None)
            raise

        elapsed = int((time.time() - started) * 1000)
        logger.info(
            "request_complete",
            extra={
                "event": "request_complete",
                "path": request.url.path,
                "method": request.method,
                "status": response.status_code,
                "elapsed_ms": elapsed,
                "correlation_id": correlation_id,
            },
        )
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        content_type = response.headers.get("Content-Type", "")
        if content_type.startswith(("application/json", "text/html", "application/x-ndjson")):
            response.headers.setdefault("Cache-Control", "no-store")
        set_correlation_id(None)
        return response


def add_middlewares(app: FastAPI, settings: Settings) -> None:
    """Configure all application middlewares."""

    # CORS middleware - be more restrictive in production
    cors_origins = settings.cors_origins
    if settings.debug_mode:
        # In debug mode, allow more origins for development
        cors_origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-API-Key",
            "X-Correlation-ID",
            "Idempotency-Key",
            "Accept",
            # UX Governance headers
            IntentHeaders.INTENT_ID,
            IntentHeaders.INTENT_TYPE,
            IntentHeaders.INTENT_LABEL,
            IntentHeaders.IDEMPOTENCY_KEY,
            IntentHeaders.REVERSIBILITY,
            IntentHeaders.USER_SESSION,
            IntentHeaders.USER_ACTION,
            IntentHeaders.WORKFLOW_ID,
            IntentHeaders.WORKFLOW_STEP,
        ],
        allow_credentials=True,
        expose_headers=[
            "X-Correlation-ID",
            "X-RateLimit-Remaining",
            "X-RateLimit-Limit",
            "Idempotency-Replay",
            "X-Intent-Processed",
        ],
    )

    if settings.idempotency_enabled:
        app.add_middleware(
            IdempotencyMiddleware,
            store=IdempotencyStore(),
            ttl_seconds=settings.idempotency_ttl_seconds,
        )

    # Trusted host middleware - configure properly in production
    if settings.allowed_hosts_all:
        allowed_hosts = ["*"]
    else:
        allowed_hosts = settings.trusted_hosts
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

    # Security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)

    # Request timeout middleware
    app.add_middleware(
        RequestTimeoutMiddleware,
        timeout_seconds=settings.request_timeout_seconds,
    )

    # Rate limiting middleware
    if settings.rate_limit_enabled:
        _configure_limiter(settings)
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        app.add_middleware(SlowAPIMiddleware)

    # UX Governance middleware - enforces intent headers on mutating requests
    # Set strict_mode=False initially to log warnings without rejecting requests
    # Change to strict_mode=True when frontend is fully compliant
    app.add_middleware(
        UXGovernanceMiddleware,
        strict_mode=settings.ux_governance_strict if hasattr(settings, 'ux_governance_strict') else False,
    )

    # Correlation ID and logging middleware (should be last to wrap everything)
    app.add_middleware(CorrelationIdMiddleware)
