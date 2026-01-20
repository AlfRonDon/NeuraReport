from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Tuple

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from ..services.utils.context import set_correlation_id
from .config import Settings

logger = logging.getLogger("neura.api")


@dataclass
class RateLimitBucket:
    """Token bucket for rate limiting with sliding window."""
    tokens: float = 0.0
    last_update: float = field(default_factory=time.time)


class RateLimiter:
    """In-memory sliding window rate limiter with token bucket algorithm."""

    def __init__(
        self,
        requests_per_window: int = 100,
        window_seconds: int = 60,
        burst: int = 20,
    ):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.burst = burst
        self.rate = requests_per_window / window_seconds
        self.buckets: Dict[str, RateLimitBucket] = defaultdict(
            lambda: RateLimitBucket(tokens=burst)
        )
        self._cleanup_counter = 0
        self._cleanup_threshold = 1000  # cleanup every N requests

    def _get_client_key(self, request: Request) -> str:
        """Get unique client identifier from request."""
        # Check for API key first
        api_key = request.headers.get("x-api-key")
        if api_key:
            return f"key:{api_key[:16]}"  # Use first 16 chars for privacy

        # Fall back to IP address
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"

    def _cleanup_stale_buckets(self) -> None:
        """Remove stale buckets to prevent memory leak."""
        now = time.time()
        stale_threshold = self.window_seconds * 2
        stale_keys = [
            key
            for key, bucket in self.buckets.items()
            if now - bucket.last_update > stale_threshold
        ]
        for key in stale_keys:
            del self.buckets[key]

    def is_allowed(self, request: Request) -> Tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit.
        Returns (allowed, remaining_tokens, retry_after_seconds).
        """
        self._cleanup_counter += 1
        if self._cleanup_counter >= self._cleanup_threshold:
            self._cleanup_stale_buckets()
            self._cleanup_counter = 0

        client_key = self._get_client_key(request)
        bucket = self.buckets[client_key]
        now = time.time()

        # Refill tokens based on elapsed time
        elapsed = now - bucket.last_update
        bucket.tokens = min(
            self.burst + self.requests_per_window,
            bucket.tokens + elapsed * self.rate,
        )
        bucket.last_update = now

        if bucket.tokens >= 1.0:
            bucket.tokens -= 1.0
            remaining = int(bucket.tokens)
            return True, remaining, 0
        else:
            # Calculate retry-after
            tokens_needed = 1.0 - bucket.tokens
            retry_after = int(tokens_needed / self.rate) + 1
            return False, 0, retry_after


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limits on API requests."""

    def __init__(self, app, rate_limiter: RateLimiter):
        super().__init__(app)
        self.rate_limiter = rate_limiter

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ("/health", "/healthz", "/ready"):
            return await call_next(request)

        allowed, remaining, retry_after = self.rate_limiter.is_allowed(request)

        if not allowed:
            logger.warning(
                "rate_limit_exceeded",
                extra={
                    "event": "rate_limit_exceeded",
                    "path": request.url.path,
                    "method": request.method,
                    "retry_after": retry_after,
                },
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


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
                    "detail": "Request timed out. Please try again with a smaller payload or simpler request.",
                    "timeout_seconds": timeout,
                },
            )


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware to handle correlation IDs and request logging."""

    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("x-correlation-id") or uuid.uuid4().hex
        set_correlation_id(correlation_id)
        request.state.correlation_id = correlation_id
        started = time.time()

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
        response.headers["X-Correlation-Id"] = correlation_id
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
            "X-Correlation-Id",
            "Accept",
        ],
        allow_credentials=True,
        expose_headers=["X-Correlation-Id", "X-RateLimit-Remaining"],
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
        rate_limiter = RateLimiter(
            requests_per_window=settings.rate_limit_requests,
            window_seconds=settings.rate_limit_window_seconds,
            burst=settings.rate_limit_burst,
        )
        app.add_middleware(RateLimitMiddleware, rate_limiter=rate_limiter)

    # Correlation ID and logging middleware (should be last to wrap everything)
    app.add_middleware(CorrelationIdMiddleware)
