"""Casbin RBAC authorization layer."""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import casbin

logger = logging.getLogger("neura.rbac")

RBAC_DIR = Path(__file__).parent
MODEL_PATH = RBAC_DIR / "model.conf"
POLICY_PATH = RBAC_DIR / "policy.csv"


@lru_cache
def get_enforcer() -> casbin.Enforcer:
    """Create and cache the Casbin enforcer."""
    enforcer = casbin.Enforcer(str(MODEL_PATH), str(POLICY_PATH))
    logger.info("rbac_enforcer_initialized", extra={
        "event": "rbac_enforcer_initialized",
        "model": str(MODEL_PATH),
        "policy": str(POLICY_PATH),
    })
    return enforcer


def check_permission(role: str, resource: str, action: str) -> bool:
    """Check if a role has permission to perform an action on a resource."""
    enforcer = get_enforcer()
    return enforcer.enforce(role, resource, action)
