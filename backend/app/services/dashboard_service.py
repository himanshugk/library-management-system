"""Dashboard statistics aggregation."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.book import Book
from app.models.fine import Fine
from app.models.staff import Staff
from app.models.student import Student
from app.models.transaction import BookTransaction, TransactionStatus
from app.schemas.dashboard import DashboardStats
from app.utils import clock as clock_service


def dashboard_stats(db: Session, today=None) -> DashboardStats:
    if today is None:
        today = clock_service.today()

    total_books = db.query(func.count(Book.id)).scalar() or 0
    available_books = (
        db.query(func.coalesce(func.sum(Book.available_copies), 0)).scalar() or 0
    )
    issued_books = (
        db.query(BookTransaction)
        .filter(BookTransaction.status == TransactionStatus.ISSUED.value)
        .count()
    )
    total_students = db.query(func.count(Student.id)).scalar() or 0
    active_students = (
        db.query(func.count(Student.id)).filter(Student.is_active == True).scalar() or 0  # noqa: E712
    )
    total_staff = db.query(func.count(Staff.id)).scalar() or 0
    overdue_books = (
        db.query(BookTransaction)
        .filter(
            BookTransaction.status == TransactionStatus.ISSUED.value,
            BookTransaction.due_date < today,
        )
        .count()
    )

    outstanding = 0
    issued_txns = (
        db.query(BookTransaction)
        .filter(BookTransaction.status == TransactionStatus.ISSUED.value)
        .all()
    )
    for txn in issued_txns:
        if txn.due_date < today:
            outstanding += (today - txn.due_date).days * settings.FINE_PER_DAY
    for fine in db.query(Fine).all():
        outstanding += fine.remaining_amount

    returned_today = (
        db.query(BookTransaction)
        .filter(
            BookTransaction.status == TransactionStatus.RETURNED.value,
            BookTransaction.return_date == today,
        )
        .count()
    )
    issued_today = (
        db.query(BookTransaction)
        .filter(BookTransaction.issue_date == today)
        .count()
    )

    return DashboardStats(
        total_books=total_books,
        available_books=available_books,
        issued_books=issued_books,
        total_students=total_students,
        active_students=active_students,
        total_staff=total_staff,
        overdue_books=overdue_books,
        outstanding_fines=outstanding,
        books_returned_today=returned_today,
        books_issued_today=issued_today,
        loan_period_days=settings.LOAN_PERIOD_DAYS,
        fine_per_day=settings.FINE_PER_DAY,
    )