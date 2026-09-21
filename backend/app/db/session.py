"""Database engine and session management.

Works with PostgreSQL (production/Docker) and SQLite (local development/tests)
depending on the value of DATABASE_URL.
"""
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_db_url = settings.database_url_normalized

connect_args = {}
if _db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    _db_url,
    echo=False,
    pool_pre_ping=not _db_url.startswith("sqlite"),
    connect_args=connect_args,
)

if _db_url.startswith("sqlite"):
    # Enforce foreign key constraints even though SQLite disables them by default.
    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _connection_record):  # pragma: no cover
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()