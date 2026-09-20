from fastapi import APIRouter

from app.api.routes import (
    audit,
    auth,
    books,
    categories,
    dashboard,
    fines,
    notifications,
    staff,
    students,
    transactions,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(staff.router)
api_router.include_router(categories.router)
api_router.include_router(books.router)
api_router.include_router(transactions.router)
api_router.include_router(fines.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)