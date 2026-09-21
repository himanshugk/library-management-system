"""Central application configuration.

All business values (loan period, fine rate, borrowing limit) live here so the
whole system reads them from a single place.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    APP_NAME: str = "Library Management System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+psycopg://lms_user:lms_password@db:5432/lms_db"

    @property
    def database_url_normalized(self) -> str:
        """Render gives postgres://, SQLAlchemy needs postgresql+psycopg://."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    # Security
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Business rules
    LOAN_PERIOD_DAYS: int = 20
    FINE_PER_DAY: int = 10
    MAX_BOOKS_PER_STUDENT: int = 5

    # Notifications
    SMS_PROVIDER: str = "mock"
    SMS_API_KEY: str = ""
    SMS_SENDER_ID: str = "LMS"

    # Seed admin
    SEED_ADMIN_EMAIL: str = "admin@library.test"
    SEED_ADMIN_PASSWORD: str = "Admin@123"

    # Create tables automatically on startup (dev convenience).
    # Production should use Alembic migrations (`alembic upgrade head`).
    AUTO_CREATE_TABLES: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()