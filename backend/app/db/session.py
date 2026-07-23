"""SQLAlchemy engine and session factory."""

from sqlalchemy import create_engine
from collections.abc import Generator

from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Base class for future SQLAlchemy models."""


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped database session for future route dependencies."""
    database_session = SessionLocal()
    try:
        yield database_session
    finally:
        database_session.close()
