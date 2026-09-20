"""Book issue and return workflow.

Core rules:
- due_date = issue_date + LOAN_PERIOD_DAYS (20 by default)
- fine = overdue_days * FINE_PER_DAY
- Issue and return mutate stock atomically inside one DB transaction.
"""
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.book import Book
from app.models.fine import Fine
from app.models.staff import Staff
from app.models.student import Student
from app.models.transaction import BookTransaction, TransactionStatus
from app.models.user import User
from app.schemas.transaction import IssueRequest
from app.services import audit_service
from app.services.id_generator import next_sequential_id
from app.utils import clock as clock_service


def _active_issue_for(db: Session, student: Student, book: Book) -> BookTransaction | None:
    return (
        db.query(BookTransaction)
        .filter(
            BookTransaction.student_id == student.id,
            BookTransaction.book_id == book.id,
            BookTransaction.status == TransactionStatus.ISSUED.value,
        )
        .first()
    )


def issue_book(
    db: Session, actor: User, data: IssueRequest, today=None
) -> BookTransaction:
    """Issue a book to a student, setting due date = issue date + loan period."""
    if today is None:
        today = clock_service.today()

    student = db.query(Student).filter(Student.student_id == data.student_id).first()
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found."
        )
    if not student.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student account is inactive. Cannot issue books.",
        )

    book = db.query(Book).filter(Book.book_id == data.book_id).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Book not found."
        )
    if not book.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book is inactive. Cannot be issued.",
        )
    if book.available_copies < 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No available copies of this book.",
        )

    issued_count = (
        db.query(BookTransaction)
        .filter(
            BookTransaction.student_id == student.id,
            BookTransaction.status == TransactionStatus.ISSUED.value,
        )
        .count()
    )
    if issued_count >= settings.MAX_BOOKS_PER_STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Student has reached the borrowing limit of "
                f"{settings.MAX_BOOKS_PER_STUDENT} books."
            ),
        )

    duplicate = _active_issue_for(db, student, book)
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Student already holds an active issue of this book "
                f"(transaction {duplicate.txn_id})."
            ),
        )

    staff = actor.staff
    txn = BookTransaction(
        txn_id=next_sequential_id(db, BookTransaction, "TXN", 6),
        student_id=student.id,
        book_id=book.id,
        issued_by_staff_id=staff.id if staff else None,
        issue_date=today,
        due_date=today + timedelta(days=settings.LOAN_PERIOD_DAYS),
        status=TransactionStatus.ISSUED.value,
    )
    book.available_copies -= 1
    db.add(txn)
    audit_service.record(
        db,
        action="issue_book",
        user=actor,
        entity="transaction",
        entity_id=txn.txn_id,
        details={
            "student_id": student.student_id,
            "book_id": book.book_id,
            "due_date": txn.due_date.isoformat(),
        },
    )
    db.commit()
    db.refresh(txn)
    return txn


def return_book(
    db: Session, actor: User, txn_id: str, today=None
) -> tuple[BookTransaction, int]:
    """Mark a transaction RETURNED, restore book stock and record the fine."""
    if today is None:
        today = clock_service.today()

    txn = db.query(BookTransaction).filter(BookTransaction.txn_id == txn_id).first()
    if txn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
        )
    if txn.status != TransactionStatus.ISSUED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This transaction has already been returned.",
        )

    overdue_days = max((today - txn.due_date).days, 0)
    fine_amount = overdue_days * settings.FINE_PER_DAY

    txn.status = TransactionStatus.RETURNED.value
    txn.return_date = today
    txn.returned_to_staff_id = actor.staff.id if actor.staff else None

    book = db.get(Book, txn.book_id)
    if book:
        book.available_copies += 1

    fine = None
    if fine_amount > 0:
        fine = Fine(
            txn_id=txn.id,
            student_id=txn.student_id,
            amount=fine_amount,
            status="UNPAID",
        )
        db.add(fine)
        audit_service.record(
            db,
            action="fine_created",
            user=actor,
            entity="fine",
            entity_id=txn.txn_id,
            details={"amount": fine_amount, "overdue_days": overdue_days},
        )
    else:
        # No fine applies; record a zero fine for consistent history.
        fine = Fine(
            txn_id=txn.id,
            student_id=txn.student_id,
            amount=0,
            status="NONE",
        )
        db.add(fine)

    audit_service.record(
        db,
        action="return_book",
        user=actor,
        entity="transaction",
        entity_id=txn.txn_id,
        details={"overdue_days": overdue_days, "fine": fine_amount},
    )
    db.commit()
    db.refresh(txn)
    return txn, fine_amount


def list_transactions(
    db: Session,
    search: str | None = None,
    status_filter: str | None = None,
    today=None,
) -> list[BookTransaction]:
    if today is None:
        today = clock_service.today()
    q = db.query(BookTransaction).join(Student).join(Book)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            BookTransaction.txn_id.like(like)
            | Student.student_id.like(like)
            | Student.name.like(like)
            | Book.book_id.like(like)
            | Book.title.like(like)
        )
    if status_filter and status_filter.upper() in {TransactionStatus.ISSUED.value, TransactionStatus.RETURNED.value}:
        q = q.filter(BookTransaction.status == status_filter.upper())
    return q.order_by(BookTransaction.created_at.desc()).all()


def is_overdue(txn: BookTransaction, today) -> bool:
    return txn.status == TransactionStatus.ISSUED.value and txn.due_date < today


def overdue_days_for(txn: BookTransaction, today) -> int:
    if is_overdue(txn, today):
        return (today - txn.due_date).days
    if txn.return_date and txn.return_date > txn.due_date:
        return (txn.return_date - txn.due_date).days
    return 0


def current_fine_for(txn: BookTransaction, today=None) -> int:
    """Dynamic fine: (today - due).days * FINE_PER_DAY for unreturned books."""
    if today is None:
        today = clock_service.today()
    return overdue_days_for(txn, today) * settings.FINE_PER_DAY


def find_active_return(db: Session, book_id: str, student_id: str) -> BookTransaction:
    """Find the active issue for the given book+student (returns must use it)."""
    return (
        db.query(BookTransaction)
        .join(Book)
        .join(Student)
        .filter(
            Book.book_id == book_id,
            Student.student_id == student_id,
            BookTransaction.status == TransactionStatus.ISSUED.value,
        )
        .first()
    )


def get_transaction_by_id(db: Session, txn_id: str) -> BookTransaction:
    """Fetch a single transaction by its human-readable id."""
    txn = db.query(BookTransaction).filter(BookTransaction.txn_id == txn_id).first()
    if txn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
        )
    return txn