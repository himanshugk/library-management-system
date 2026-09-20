"""Student management service."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.fine import Fine
from app.models.student import Student
from app.models.transaction import BookTransaction, TransactionStatus
from app.models.user import User
from app.schemas.student import StudentCreate, StudentUpdate
from app.services import audit_service
from app.services.id_generator import next_sequential_id
from app.utils import clock as clock_service
from app.core.config import settings


def get_student(db: Session, student_id: str) -> Student:
    student = (
        db.query(Student).filter(Student.student_id == student_id).first()
    )
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found."
        )
    return student


def _assert_unique_email(db: Session, email: str | None, exclude_id: int | None = None) -> None:
    if not email:
        return
    q = db.query(Student).filter(Student.email == email.lower())
    if exclude_id is not None:
        q = q.filter(Student.id != exclude_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this email already exists.",
        )


def list_students(db: Session, search: str | None = None) -> list[Student]:
    q = db.query(Student)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            Student.student_id.like(like)
            | Student.name.like(like)
            | Student.phone.like(like)
            | Student.email.like(like)
        )
    return q.order_by(Student.student_id).all()


def create_student(db: Session, actor: User, data: StudentCreate) -> Student:
    _assert_unique_email(db, data.email)
    student = Student(
        student_id=next_sequential_id(db, Student, "STU", 6),
        name=data.name.strip(),
        phone=data.phone.strip(),
        email=data.email.lower() if data.email else None,
        department=data.department,
        address=data.address,
        is_active=True,
    )
    db.add(student)
    audit_service.record(
        db,
        action="create_student",
        user=actor,
        entity="student",
        entity_id=student.student_id,
        details={"name": data.name},
    )
    db.commit()
    db.refresh(student)
    return student


def bulk_create_student(
    db: Session, actor: User, name: str, phone: str, **extra
) -> Student:
    """Small helper used by the seed script."""
    data = StudentCreate(name=name, phone=phone, **extra)
    existing = db.query(Student).filter(Student.phone == phone).first()
    if existing:
        return existing
    return create_student(db, actor, data)


def update_student(
    db: Session, actor: User, student_id: str, data: StudentUpdate
) -> Student:
    student = get_student(db, student_id)
    _assert_unique_email(db, data.email, exclude_id=student.id)
    student.name = data.name.strip()
    student.phone = data.phone.strip()
    student.email = data.email.lower() if data.email else None
    student.department = data.department
    student.address = data.address
    audit_service.record(
        db,
        action="update_student",
        user=actor,
        entity="student",
        entity_id=student.student_id,
    )
    db.commit()
    db.refresh(student)
    return student


def update_student_status(
    db: Session, actor: User, student_id: str, is_active: bool
) -> Student:
    student = get_student(db, student_id)
    student.is_active = is_active
    audit_service.record(
        db,
        action="disable_student" if not is_active else "enable_student",
        user=actor,
        entity="student",
        entity_id=student.student_id,
    )
    db.commit()
    db.refresh(student)
    return student


def outstanding_fine(db: Session, student: Student) -> int:
    total = 0
    for fine in student.fines:
        total += fine.remaining_amount
    # Add dynamic fine for continuously overdue issued transactions.
    today = clock_service.today()
    for txn in db.query(BookTransaction).filter(
        BookTransaction.student_id == student.id,
        BookTransaction.status == TransactionStatus.ISSUED.value,
        BookTransaction.due_date < today,
    ):
        total += (today - txn.due_date).days * settings.FINE_PER_DAY
    return total


def issued_book_count(db: Session, student: Student) -> int:
    return (
        db.query(BookTransaction)
        .filter(
            BookTransaction.student_id == student.id,
            BookTransaction.status == TransactionStatus.ISSUED.value,
        )
        .count()
    )


def history(db: Session, student: Student, today=None) -> list[dict]:
    if today is None:
        today = clock_service.today()
    txns = (
        db.query(BookTransaction)
        .filter(BookTransaction.student_id == student.id)
        .order_by(BookTransaction.created_at.desc())
        .all()
    )
    result = []
    for txn in txns:
        overdue_days = 0
        fine = 0
        if txn.status == TransactionStatus.ISSUED.value and txn.due_date < today:
            overdue_days = (today - txn.due_date).days
            fine = overdue_days * settings.FINE_PER_DAY
        elif txn.return_date and txn.due_date < txn.return_date:
            overdue_days = (txn.return_date - txn.due_date).days
            fine = overdue_days * settings.FINE_PER_DAY
        result.append(
            {
                "transaction_id": txn.txn_id,
                "book_title": txn.book.title,
                "book_id": txn.book.book_id,
                "issue_date": txn.issue_date,
                "due_date": txn.due_date,
                "return_date": txn.return_date,
                "status": txn.status,
                "overdue_days": overdue_days,
                "current_fine": fine,
            }
        )
    return result