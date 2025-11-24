from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from ..services.utils.context import set_correlation_id
from .config import Settings


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("x-correlation-id") or uuid.uuid4().hex
        set_correlation_id(correlation_id)
        request.state.correlation_id = correlation_id
        started = time.time()
        try:
            response = await call_next(request)
        except Exception:
            elapsed = int((time.time() - started) * 1000)
            logging.getLogger("neura.api").exception(
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
        logging.getLogger("neura.api").info(
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
        response.headers["x-correlation-id"] = correlation_id
        response.headers.setdefault("Cache-Control", "no-store")
        set_correlation_id(None)
        return response


def add_middlewares(app: FastAPI, settings: Settings) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(CorrelationIdMiddleware)

