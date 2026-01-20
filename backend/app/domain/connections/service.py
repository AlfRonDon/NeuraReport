from __future__ import annotations

import time
from pathlib import Path

from .repository import ConnectionRepository
from .schemas import ConnectionResponse, ConnectionTestRequest, ConnectionUpsertRequest
from backend.app.core.errors import AppError


class ConnectionService:
    def __init__(self, repo: ConnectionRepository):
        self.repo = repo

    def _resolve_and_verify(
        self,
        *,
        connection_id: str | None,
        db_url: str | None,
        db_path: str | None,
        verify: bool = True,
    ) -> Path:
        try:
            path = self.repo.resolve_path(connection_id=connection_id, db_url=db_url, db_path=db_path)
            if verify:
                self.repo.verify(path)
            return path
        except Exception as exc:
            raise AppError(
                code="invalid_database",
                message="Invalid or unreachable database",
                detail=str(exc),
                status_code=400,
            )

    def test(self, payload: ConnectionTestRequest, correlation_id: str | None = None) -> dict:
        started = time.time()
        db_path = self._resolve_and_verify(connection_id=None, db_url=payload.db_url, db_path=payload.database)
        latency_ms = int((time.time() - started) * 1000)
        resolved = Path(db_path).resolve()
        cfg = {
            "db_type": "sqlite",
            "database": str(resolved),
            "db_url": payload.db_url,
            "name": resolved.name,
            "status": "connected",
            "latency_ms": latency_ms,
        }
        connection_id = self.repo.save(cfg)
        self.repo.record_ping(connection_id, status="connected", detail="Connected", latency_ms=latency_ms)
        return {
            "ok": True,
            "details": f"Connected ({resolved.name})",
            "latency_ms": latency_ms,
            "connection_id": connection_id,
            "normalized": {"db_type": "sqlite", "database": str(resolved)},
            "correlation_id": correlation_id,
        }

    def upsert(self, payload: ConnectionUpsertRequest, correlation_id: str | None = None) -> ConnectionResponse:
        db_path = self._resolve_and_verify(
            connection_id=payload.id,
            db_url=payload.db_url,
            db_path=payload.database,
            verify=False,
        )
        record = self.repo.upsert(
            conn_id=payload.id,
            name=payload.name or Path(db_path).name,
            db_type="sqlite",
            database_path=str(db_path),
            secret_payload={"db_url": payload.db_url, "database": str(db_path)},
            status=payload.status,
            latency_ms=payload.latency_ms,
            tags=payload.tags,
        )
        if payload.status:
            self.repo.record_ping(record["id"], status=payload.status, detail=None, latency_ms=payload.latency_ms)
        return ConnectionResponse(
            id=record["id"],
            name=record["name"],
            db_type=record["db_type"],
            database_path=Path(record["database_path"]),
            status=record.get("status") or "unknown",
            latency_ms=record.get("latency_ms"),
        )

    def delete(self, connection_id: str) -> None:
        if not self.repo.delete(connection_id):
            raise AppError(code="connection_not_found", message="Connection not found", status_code=404)

    def healthcheck(self, connection_id: str, correlation_id: str | None = None) -> dict:
        """Verify a saved connection is still accessible and record the ping."""
        connections = self.repo.list()
        conn = next((c for c in connections if c.get("id") == connection_id), None)
        if not conn:
            raise AppError(code="connection_not_found", message="Connection not found", status_code=404)

        db_path = conn.get("database_path")
        if not db_path:
            raise AppError(
                code="invalid_connection",
                message="Connection has no database path",
                status_code=400,
            )

        started = time.time()
        try:
            self.repo.verify(Path(db_path))
        except Exception as exc:
            latency_ms = int((time.time() - started) * 1000)
            self.repo.record_ping(connection_id, status="error", detail=str(exc), latency_ms=latency_ms)
            raise AppError(
                code="connection_failed",
                message="Database connection failed",
                detail=str(exc),
                status_code=503,
            )

        latency_ms = int((time.time() - started) * 1000)
        self.repo.record_ping(connection_id, status="connected", detail="Health check passed", latency_ms=latency_ms)
        return {
            "status": "connected",
            "latency_ms": latency_ms,
            "connection_id": connection_id,
            "correlation_id": correlation_id,
        }
