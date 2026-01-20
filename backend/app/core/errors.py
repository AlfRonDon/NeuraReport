from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("neura.api.errors")


class AppError(Exception):
    def __init__(self, *, code: str, message: str, status_code: int = 400, detail: str | None = None) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


async def app_error_handler(request: Request, exc: AppError):
    correlation_id = getattr(getattr(request, "state", None), "correlation_id", None)
    body = {"status": "error", "code": exc.code, "message": exc.message}
    if exc.detail:
        body["detail"] = exc.detail
    if correlation_id:
        body["correlation_id"] = correlation_id
    return JSONResponse(status_code=exc.status_code, content=body)


async def http_error_handler(request: Request, exc):
    correlation_id = getattr(getattr(request, "state", None), "correlation_id", None)
    detail = exc.detail if hasattr(exc, "detail") else str(exc)
    status_code = exc.status_code if hasattr(exc, "status_code") else 500
    body = {"status": "error", "code": f"http_{status_code}", "message": detail}
    if correlation_id:
        body["correlation_id"] = correlation_id
    return JSONResponse(status_code=status_code, content=body)


async def generic_error_handler(request: Request, exc: Exception):
    """Handle any unhandled exceptions with proper logging."""
    correlation_id = getattr(getattr(request, "state", None), "correlation_id", None)

    # Log the full exception with traceback
    logger.exception(
        "unhandled_exception",
        extra={
            "event": "unhandled_exception",
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "correlation_id": correlation_id,
        },
    )

    # Return generic error to client (don't expose internal details)
    body = {
        "status": "error",
        "code": "internal_error",
        "message": "An unexpected error occurred. Please try again later.",
    }
    if correlation_id:
        body["correlation_id"] = correlation_id

    return JSONResponse(status_code=500, content=body)


def add_exception_handlers(app: FastAPI) -> None:
    from fastapi import HTTPException

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)

