"""Pytest fixtures: fresh SQLite database, seeded users, HTTP client, clock control."""
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Set environment BEFORE importing the app so the default engine stays out
# of the way and the scheduler is disabled during tests.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_lms.db")
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.permissions import Role  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.staff import Staff  # noqa: E402
from app.models.student import Student  # noqa: E402
from app.models.user import User  # noqa: E402
from app.utils import clock as clock_module  # noqa: E402


class FrozenClock:
    """A clock that always returns a fixed, mutable date."""

    def __init__(self, start: date):
        self._date = start

    def set(self, d: date) -> None:
        self._date = d

    def today(self) -> date:
        return self._date

    def now(self) -> datetime:
        return datetime.combine(self._date, datetime.min.time())


@pytest.fixture()
def clock():
    frozen = FrozenClock(date(2026, 9, 1))
    old = clock_module.clock
    clock_module.set_clock(frozen)
    yield frozen
    clock_module.set_clock(old)


@pytest.fixture()
def session_ctx():
    """Fresh in-memory SQLite engine + session factory per test."""
    import app.models  # noqa: F401

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(
        autocommit=False, autoflush=False, bind=engine
    )
    yield engine, TestingSession
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db(session_ctx):
    _engine, TestingSession = session_ctx
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture()
def client(db):
    """TestClient whose get_db dependency returns the very same session as `db`."""
    from app.api.rate_limit import reset

    reset()

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        reset()


@pytest.fixture()
def seed_basic(db):
    """Admin (STAFF-0001), staff (STAFF-0002), a category, a book, a student."""
    admin_user = User(
        username="admin",
        email="admin@library.com",
        password_hash=hash_password("Admin@123"),
        role=Role.ADMIN.value,
        is_active=True,
    )
    db.add(admin_user)
    db.flush()
    admin = Staff(staff_id="STAFF-0001", user_id=admin_user.id, name="System Admin")
    db.add(admin)

    staff_user = User(
        username="staff",
        email="staff@library.com",
        password_hash=hash_password("Staff@123"),
        role=Role.STAFF.value,
        is_active=True,
    )
    db.add(staff_user)
    db.flush()
    staff = Staff(staff_id="STAFF-0002", user_id=staff_user.id, name="Demo Staff")
    db.add(staff)

    inactive_user = User(
        username="deactivated",
        email="deactivated@library.com",
        password_hash=hash_password("Password@123"),
        role=Role.STAFF.value,
        is_active=False,
    )
    db.add(inactive_user)

    category = Category(category_id="CAT-000001", name="Programming", is_active=True)
    db.add(category)
    db.flush()

    book = Book(
        book_id="BOOK-000001",
        title="Python Basics",
        author="Guido van Dijk",
        isbn="9780134658341",
        category_id=category.id,
        total_copies=3,
        available_copies=3,
        is_active=True,
    )
    db.add(book)

    student = Student(
        student_id="STU-000001",
        name="Rahul Sharma",
        phone="9876543210",
        email="rahul@example.com",
        is_active=True,
    )
    db.add(student)
    db.commit()

    return {
        "admin_user": admin_user,
        "admin": admin,
        "staff_user": staff_user,
        "staff": staff,
        "inactive_user": inactive_user,
        "category": category,
        "book": book,
        "student": student,
    }


def login(client, username: str, password: str) -> str:
    r = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture()
def admin_token(client, seed_basic):
    return login(client, seed_basic["admin_user"].username, "Admin@123")


@pytest.fixture()
def staff_token(client, seed_basic):
    return login(client, seed_basic["staff_user"].username, "Staff@123")


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def days_from(base: date, delta: int) -> date:
    return base + timedelta(days=delta)
