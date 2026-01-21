"""Service layer for Cross-Database Federation feature."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.core.errors import AppError
from backend.app.services.state import store as state_store_module
from backend.app.services.llm.client import get_llm_client

from .schemas import (
    VirtualSchema,
    VirtualSchemaCreate,
    JoinSuggestion,
    TableReference,
    JoinCondition,
    FederatedQueryRequest,
)

logger = logging.getLogger("neura.domain.federation")


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _state_store():
    return state_store_module.state_store


class FederationService:
    """Service for cross-database federation operations."""

    def __init__(self):
        self._llm_client = None

    def _get_llm_client(self):
        if self._llm_client is None:
            self._llm_client = get_llm_client()
        return self._llm_client

    def _get_connection_schema(self, connection_id: str) -> Dict[str, Any]:
        """Get schema for a connection."""
        from src.services.connection_inspector import get_connection_schema
        return get_connection_schema(connection_id, include_row_counts=False, sample_rows=3)

    def create_virtual_schema(
        self,
        request: VirtualSchemaCreate,
        correlation_id: Optional[str] = None,
    ) -> VirtualSchema:
        """Create a new virtual schema."""
        logger.info(f"Creating virtual schema: {request.name}", extra={"correlation_id": correlation_id})

        schema_id = str(uuid.uuid4())[:8]
        now = _now_iso()

        # Gather tables from all connections
        tables: List[TableReference] = []
        for conn_id in request.connection_ids:
            try:
                schema = self._get_connection_schema(conn_id)
                for table in schema.get("tables", []):
                    tables.append(TableReference(
                        connection_id=conn_id,
                        table_name=table["name"],
                        alias=f"{conn_id[:4]}_{table['name']}"
                    ))
            except Exception as exc:
                logger.warning(f"Failed to get schema for {conn_id}: {exc}")

        virtual_schema = VirtualSchema(
            id=schema_id,
            name=request.name,
            description=request.description,
            connections=request.connection_ids,
            tables=tables,
            joins=[],
            created_at=now,
            updated_at=now,
        )

        # Persist
        store = _state_store()
        with store._lock:
            state = store._read_state()
            state.setdefault("virtual_schemas", {})[schema_id] = virtual_schema.dict()
            store._write_state(state)

        return virtual_schema

    def suggest_joins(
        self,
        connection_ids: List[str],
        correlation_id: Optional[str] = None,
    ) -> List[JoinSuggestion]:
        """Suggest joins between tables in different connections using AI."""
        logger.info(f"Suggesting joins for {len(connection_ids)} connections", extra={"correlation_id": correlation_id})

        # Gather schemas
        schemas = {}
        for conn_id in connection_ids:
            try:
                schemas[conn_id] = self._get_connection_schema(conn_id)
            except Exception as exc:
                logger.warning(f"Failed to get schema for {conn_id}: {exc}")

        if len(schemas) < 2:
            return []

        # Build prompt for LLM
        schema_desc = []
        for conn_id, schema in schemas.items():
            tables_desc = []
            for table in schema.get("tables", []):
                cols = [f"{c['name']} ({c.get('type', 'TEXT')})" for c in table.get("columns", [])]
                tables_desc.append(f"  - {table['name']}: {', '.join(cols)}")
            schema_desc.append(f"Connection {conn_id}:\n" + "\n".join(tables_desc))

        prompt = f"""Analyze these database schemas and suggest joins between tables from different connections.

{chr(10).join(schema_desc)}

For each potential join, consider:
1. Column names that might match (like 'customer_id', 'user_id', 'id')
2. Data types compatibility
3. Business logic relationships

Return a JSON array of join suggestions:
[
  {{
    "left_connection_id": "conn1",
    "left_table": "table1",
    "left_column": "column1",
    "right_connection_id": "conn2",
    "right_table": "table2",
    "right_column": "column2",
    "confidence": 0.9,
    "reason": "Both columns appear to be customer identifiers"
  }}
]

Return ONLY the JSON array."""

        try:
            client = self._get_llm_client()
            response = client.complete(
                messages=[{"role": "user", "content": prompt}],
                description="join_suggestion",
                temperature=0.0,
            )

            import json
            import re
            content = response["choices"][0]["message"]["content"]
            json_match = re.search(r"\[[\s\S]*\]", content)
            if json_match:
                suggestions_data = json.loads(json_match.group())
                return [JoinSuggestion(**s) for s in suggestions_data]

        except Exception as exc:
            logger.error(f"Join suggestion failed: {exc}")

        return []

    def list_virtual_schemas(self) -> List[VirtualSchema]:
        """List all virtual schemas."""
        store = _state_store()
        schemas = store._read_state().get("virtual_schemas", {})
        return [VirtualSchema(**s) for s in schemas.values()]

    def get_virtual_schema(self, schema_id: str) -> Optional[VirtualSchema]:
        """Get a virtual schema by ID."""
        store = _state_store()
        schema = store._read_state().get("virtual_schemas", {}).get(schema_id)
        return VirtualSchema(**schema) if schema else None

    def delete_virtual_schema(self, schema_id: str) -> bool:
        """Delete a virtual schema."""
        store = _state_store()
        with store._lock:
            state = store._read_state()
            schemas = state.get("virtual_schemas", {})
            if schema_id not in schemas:
                return False
            del schemas[schema_id]
            store._write_state(state)
        return True

    def execute_query(
        self,
        request: FederatedQueryRequest,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute a federated query across multiple databases."""
        logger.info(
            f"Executing federated query on schema {request.virtual_schema_id}",
            extra={"correlation_id": correlation_id}
        )

        # Get the virtual schema
        schema = self.get_virtual_schema(request.virtual_schema_id)
        if not schema:
            raise AppError(
                code="schema_not_found",
                message=f"Virtual schema {request.virtual_schema_id} not found",
                status=404,
            )

        # For now, execute on the first connection as a simplified implementation
        # A full implementation would parse the SQL and route to appropriate connections
        if not schema.connections:
            raise AppError(
                code="no_connections",
                message="Virtual schema has no connections",
                status=400,
            )

        # Import connection utilities
        from backend.app.services.connections.db_connection import execute_query

        try:
            # Execute on first connection (simplified - full impl would route based on table references)
            primary_connection = schema.connections[0]
            result = execute_query(
                connection_id=primary_connection,
                sql=request.sql,
                limit=request.limit,
            )

            return {
                "columns": result.get("columns", []),
                "rows": result.get("rows", []),
                "row_count": len(result.get("rows", [])),
                "schema_id": request.virtual_schema_id,
                "executed_on": primary_connection,
            }

        except Exception as exc:
            logger.error(f"Federated query failed: {exc}")
            raise AppError(
                code="query_failed",
                message=f"Query execution failed: {str(exc)}",
                status=500,
            )
