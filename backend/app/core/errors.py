from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


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


def add_exception_handlers(app: FastAPI) -> None:
    from fastapi import HTTPException

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)

