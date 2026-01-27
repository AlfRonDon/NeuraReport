"""Connector Security Tests.

Tests for SQL injection protection on the query execution endpoint.
"""
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from backend.app.api.routes.connectors import router, _connections
from backend.app.services.security import require_api_key


@pytest.fixture
def app():
    _app = FastAPI()
    _app.dependency_overrides[require_api_key] = lambda: None
    _app.include_router(router, prefix="/connectors")
    return _app


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def sample_connection():
    """Inject a fake connection into the in-memory store."""
    conn_id = str(uuid.uuid4())
    conn = {
        "id": conn_id,
        "name": "test-conn",
        "connector_type": "postgres",
        "config": {"host": "localhost", "database": "testdb"},
        "status": "connected",
        "created_at": "2025-01-01T00:00:00",
        "last_used": None,
        "latency_ms": 5.0,
    }
    _connections[conn_id] = conn
    yield conn_id
    _connections.pop(conn_id, None)


class TestSQLInjectionProtection:
    """Verify that the query endpoint blocks dangerous SQL."""

    def test_select_query_allowed(self, client, sample_connection):
        """Valid SELECT queries should pass validation."""
        with patch("backend.app.api.routes.connectors.get_connector") as mock_get:
            mock_connector = AsyncMock()
            mock_result = MagicMock()
            mock_result.columns = ["id", "name"]
            mock_result.rows = [[1, "test"]]
            mock_result.row_count = 1
            mock_result.execution_time_ms = 10.0
            mock_result.truncated = False
            mock_result.error = None
            mock_connector.execute_query = AsyncMock(return_value=mock_result)
            mock_connector.connect = AsyncMock()
            mock_connector.disconnect = AsyncMock()
            mock_get.return_value = mock_connector

            resp = client.post(
                f"/connectors/{sample_connection}/query",
                json={"query": "SELECT * FROM users", "limit": 100},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["columns"] == ["id", "name"]

    def test_drop_table_blocked(self, client, sample_connection):
        resp = client.post(
            f"/connectors/{sample_connection}/query",
            json={"query": "DROP TABLE users", "limit": 100},
        )
        assert resp.status_code == 400
        assert "SELECT" in resp.json()["detail"] or "DROP" in resp.json()["detail"]

    def test_delete_blocked(self, client, sample_connection):
        resp = client.post(
            f"/connectors/{sample_connection}/query",
            json={"query": "DELETE FROM users WHERE 1=1", "limit": 100},
        )
        assert resp.status_code == 400

    def test_insert_blocked(self, client, sample_connection):
        resp = client.post(
            f"/connectors/{sample_connection}/query",
            json={"query": "INSERT INTO users (name) VALUES ('evil')", "limit": 100},
        )
        assert resp.status_code == 400

    def test_update_blocked(self, client, sample_connection):
        resp = client.post(
            f"/connectors/{sample_connection}/query",
            json={"query": "UPDATE users SET admin=true", "limit": 100},
        )
        assert resp.status_code == 400

    def test_semicolon_injection_blocked(self, client, sample_connection):
        resp = client.post(
            f"/connectors/{sample_connection}/query",
            json={"query": "SELECT 1; DROP TABLE users", "limit": 100},
        )
        assert resp.status_code == 400

    def test_connection_not_found(self, client):
        resp = client.post(
            "/connectors/nonexistent-id/query",
            json={"query": "SELECT 1", "limit": 100},
        )
        assert resp.status_code == 404
