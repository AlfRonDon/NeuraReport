"""
Dependency Injection container using python-dependency-injector.

Replaces global singletons with injectable providers.
Based on: ets-labs/python-dependency-injector FastAPI example.
"""
from __future__ import annotations
import logging
from dependency_injector import containers, providers

from backend.app.services.config import get_settings
from backend.app.services.secrets.vault_client import VaultSecretClient
from backend.app.db.engine import get_engine, get_session_factory, get_session
from backend.app.services.prompts.prompt_registry import get_prompt_registry
from backend.app.services.agents.agent_registry import get_agent_registry
from backend.app.rbac import get_enforcer

logger = logging.getLogger("neura.di")


class AppContainer(containers.DeclarativeContainer):
    """Root DI container for NeuraReport."""

    wiring_config = containers.WiringConfiguration(
        modules=[
            "backend.app.api.routes.health",
            "backend.app.api.routes.reports",
            "backend.app.api.routes.agents",
            "backend.app.api.routes.agents_v2",
            "backend.app.api.routes.connectors",
            "backend.app.api.routes.connections",
            "backend.app.api.routes.dashboards",
            "backend.app.api.routes.templates",
            "backend.app.api.routes.search",
            "backend.app.api.routes.analytics",
            "backend.app.api.routes.documents",
            "backend.app.api.routes.ingestion",
            "backend.app.api.routes.export",
            "backend.app.api.routes.spreadsheets",
            "backend.app.api.routes.schedules",
            "backend.app.api.routes.jobs",
            "backend.app.api.routes.visualization",
            "backend.app.api.routes.knowledge",
        ],
    )

    # Configuration
    config = providers.Configuration()

    # Settings singleton (proper factory, not lambda)
    settings = providers.Singleton(get_settings)

    # Vault client
    vault_client = providers.Singleton(VaultSecretClient)

    # Database engine + session factory
    db_engine = providers.Singleton(get_engine)
    db_session_factory = providers.Singleton(get_session_factory)
    db_session = providers.Resource(get_session)

    # Casbin RBAC enforcer
    rbac_enforcer = providers.Singleton(get_enforcer)

    # Prompt registry
    prompt_registry = providers.Singleton(get_prompt_registry)

    # Agent registry
    agent_registry = providers.Singleton(get_agent_registry)
