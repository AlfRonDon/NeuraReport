"""
RBAC (Role-Based Access Control) module using Casbin.

Defines roles, permissions, and policy enforcement for API endpoints.
Supports: admin, editor, viewer, agent (service account) roles.

Based on: casbin/pycasbin FastAPI integration patterns.
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import casbin

logger = logging.getLogger("neura.rbac")

# ---------------------------------------------------------------------------
# Casbin model definition (RBAC with resource + action)
# ---------------------------------------------------------------------------
_MODEL_TEXT = """
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
"""

# ---------------------------------------------------------------------------
# Default policies: role → resource pattern → allowed actions
# ---------------------------------------------------------------------------
_DEFAULT_POLICIES = [
    # Admin: full access
    ("admin", "/api/v1/*", "GET|POST|PUT|PATCH|DELETE"),
    ("admin", "/api/v1/auth/*", "GET|POST|PUT|PATCH|DELETE"),

    # Editor: read + write, no user management or system ops
    ("editor", "/api/v1/connections/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/templates/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/reports/*", "GET|POST"),
    ("editor", "/api/v1/jobs/*", "GET|POST"),
    ("editor", "/api/v1/schedules/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/agents/*", "GET|POST"),
    ("editor", "/api/v1/documents/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/spreadsheets/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/dashboards/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/search/*", "GET|POST"),
    ("editor", "/api/v1/enrichment/*", "GET|POST"),
    ("editor", "/api/v1/federation/*", "GET|POST"),
    ("editor", "/api/v1/synthesis/*", "GET|POST|DELETE"),
    ("editor", "/api/v1/docqa/*", "GET|POST|DELETE"),
    ("editor", "/api/v1/summary/*", "GET|POST"),
    ("editor", "/api/v1/visualization/*", "GET|POST|PUT|DELETE"),
    ("editor", "/api/v1/knowledge/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/design/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/ingestion/*", "GET|POST|DELETE"),
    ("editor", "/api/v1/export/*", "GET|POST"),
    ("editor", "/api/v1/workflows/*", "GET|POST|PUT|PATCH|DELETE"),
    ("editor", "/api/v1/connectors/*", "GET|POST|PUT|DELETE"),
    ("editor", "/api/v1/analytics/*", "GET|POST|DELETE"),
    ("editor", "/api/v1/charts/*", "GET|POST"),
    ("editor", "/api/v1/nl2sql/*", "GET|POST"),
    ("editor", "/api/v1/recommendations/*", "GET|POST"),
    ("editor", "/api/v1/ai/*", "GET|POST"),
    ("editor", "/api/v1/health/*", "GET"),

    # Viewer: read-only access
    ("viewer", "/api/v1/connections/*", "GET"),
    ("viewer", "/api/v1/templates/*", "GET"),
    ("viewer", "/api/v1/reports/*", "GET"),
    ("viewer", "/api/v1/jobs/*", "GET"),
    ("viewer", "/api/v1/schedules/*", "GET"),
    ("viewer", "/api/v1/documents/*", "GET"),
    ("viewer", "/api/v1/spreadsheets/*", "GET"),
    ("viewer", "/api/v1/dashboards/*", "GET"),
    ("viewer", "/api/v1/search/*", "GET"),
    ("viewer", "/api/v1/knowledge/*", "GET"),
    ("viewer", "/api/v1/analytics/*", "GET"),
    ("viewer", "/api/v1/health/*", "GET"),
    ("viewer", "/api/v1/export/*", "GET|POST"),  # Viewers can export

    # Agent (service account): specific API access for automated tasks
    ("agent", "/api/v1/agents/*", "GET|POST"),
    ("agent", "/api/v1/reports/*", "GET|POST"),
    ("agent", "/api/v1/jobs/*", "GET"),
    ("agent", "/api/v1/health/*", "GET"),
    ("agent", "/api/v1/connections/*", "GET"),
    ("agent", "/api/v1/templates/*", "GET"),
]

# Role hierarchy: admin inherits editor, editor inherits viewer
_DEFAULT_ROLE_HIERARCHY = [
    ("admin", "editor"),
    ("editor", "viewer"),
]


def _write_model_file() -> Path:
    """Write the RBAC model to a temp file for Casbin."""
    model_dir = Path(__file__).parent / "rbac_model"
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "model.conf"
    model_path.write_text(_MODEL_TEXT.strip(), encoding="utf-8")
    return model_path


def _build_enforcer() -> casbin.Enforcer:
    """Build a Casbin enforcer with the default model and policies."""
    model_path = _write_model_file()
    enforcer = casbin.Enforcer(str(model_path))

    # Load default policies
    for sub, obj, act in _DEFAULT_POLICIES:
        enforcer.add_policy(sub, obj, act)

    # Load role hierarchy
    for child, parent in _DEFAULT_ROLE_HIERARCHY:
        enforcer.add_grouping_policy(child, parent)

    logger.info(
        "rbac_enforcer_initialized",
        extra={
            "event": "rbac_enforcer_initialized",
            "policy_count": len(_DEFAULT_POLICIES),
            "role_hierarchy": len(_DEFAULT_ROLE_HIERARCHY),
        },
    )
    return enforcer


_enforcer: Optional[casbin.Enforcer] = None


def get_enforcer() -> casbin.Enforcer:
    """Get or create the singleton Casbin enforcer."""
    global _enforcer
    if _enforcer is None:
        _enforcer = _build_enforcer()
    return _enforcer


def check_permission(user_role: str, resource: str, action: str) -> bool:
    """Check if a role has permission for a resource and action."""
    enforcer = get_enforcer()
    allowed = enforcer.enforce(user_role, resource, action)
    if not allowed:
        logger.warning(
            "rbac_denied",
            extra={
                "event": "rbac_denied",
                "role": user_role,
                "resource": resource,
                "action": action,
            },
        )
    return allowed


def assign_role(user_id: str, role: str) -> bool:
    """Assign a role to a user."""
    enforcer = get_enforcer()
    result = enforcer.add_grouping_policy(user_id, role)
    if result:
        logger.info("rbac_role_assigned", extra={"event": "rbac_role_assigned", "user": user_id, "role": role})
    return result


def remove_role(user_id: str, role: str) -> bool:
    """Remove a role from a user."""
    enforcer = get_enforcer()
    result = enforcer.remove_grouping_policy(user_id, role)
    if result:
        logger.info("rbac_role_removed", extra={"event": "rbac_role_removed", "user": user_id, "role": role})
    return result


def get_user_roles(user_id: str) -> list[str]:
    """Get all roles for a user."""
    enforcer = get_enforcer()
    return enforcer.get_roles_for_user(user_id)


def list_all_roles() -> list[str]:
    """List all defined roles."""
    return ["admin", "editor", "viewer", "agent"]
