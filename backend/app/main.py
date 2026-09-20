"""FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.jobs.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import models so all tables register on Base.metadata.
    import app.models  # noqa: F401

    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
    if settings.ENVIRONMENT.lower() not in {"testing", "test"}:
        start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description=(
        f"{settings.APP_NAME} REST API. Login with your staff credentials, then "
        "browse the resources below. All private endpoints require a Bearer token."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["Health"])
def health_check():
    return {
        "app": settings.APP_NAME,
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def api_health_check():
    return {"status": "ok"}


@app.get("/api/config", tags=["Health"])
def public_config():
    """Non-secret business configuration used by the UI."""
    return {
        "loan_period_days": settings.LOAN_PERIOD_DAYS,
        "fine_per_day": settings.FINE_PER_DAY,
        "max_books_per_student": settings.MAX_BOOKS_PER_STUDENT,
        "app_name": settings.APP_NAME,
    }