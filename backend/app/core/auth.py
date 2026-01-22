from __future__ import annotations

import os
import uuid
from typing import AsyncGenerator, Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin, schemas
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy import Column, String
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from .config import get_settings

SETTINGS = get_settings()


def _auth_db_url() -> str:
    override = os.getenv("NEURA_AUTH_DB_URL")
    if override:
        return override
    state_dir = SETTINGS.state_dir
    return f"sqlite+aiosqlite:///{state_dir / 'auth.sqlite3'}"


Base = declarative_base()
engine = create_async_engine(_auth_db_url(), connect_args={"check_same_thread": False})
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "auth_users"
    full_name = Column(String, nullable=True)


class UserRead(schemas.BaseUser[uuid.UUID]):
    pass


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass


async def get_user_db() -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    async with async_session_maker() as session:
        yield SQLAlchemyUserDatabase(session, User)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SETTINGS.jwt_secret
    verification_token_secret = SETTINGS.jwt_secret

    async def on_after_register(self, user: User, request: Optional[Request] = None) -> None:
        return None


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    yield UserManager(user_db)


bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=SETTINGS.jwt_secret,
        lifetime_seconds=SETTINGS.jwt_lifetime_seconds,
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])
current_active_user = fastapi_users.current_user(active=True)
current_optional_user = fastapi_users.current_user(optional=True)


async def init_auth_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
