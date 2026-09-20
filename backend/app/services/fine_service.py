"""Fine and payment service."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.book import Book
from app.models.fine import Fine, FinePayment
from app.models.staff import Staff
from app.models.student import Student
from app.models.transaction import BookTransaction, TransactionStatus
from app.models.user import User
from app.schemas.fine import FinePaymentCreate
from app.services import audit_service
from app.utils import clock as clock_service


def get_fine(db: Session, fine_id: int) -> Fine:
    fine = db.get(Fine, fine_id)
    if fine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Fine not found."
        )
    return fine


def fine_for_transaction(db: Session, txn: BookTransaction) -> Fine | None:
    return db.query(Fine).filter(Fine.txn_id == txn.id).first()


def list_fines(db: Session, status_filter: str | None = None) -> list[Fine]:
    q = db.query(Fine).join(Fine.transaction).join(Fine.student)
    if status_filter:
        q = q.filter(Fine.status == status_filter.upper())
    else:
        q = q.filter(Fine.status != "NONE")
    return q.order_by(Fine.created_at.desc()).all()


def list_student_fines(db: Session, student: Student) -> list[Fine]:
    return (
        db.query(Fine)
        .filter(Fine.student_id == student.id, Fine.status != "NONE")
        .order_by(Fine.created_at.desc())
        .all()
    )


def record_payment(
    db: Session,
    actor: User,
    fine: Fine,
    data: FinePaymentCreate,
    today=None,
) -> FinePayment:
    if today is None:
        today = clock_service.today()

    outstanding = fine.remaining_amount
    if data.amount > outstanding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Paid amount cannot exceed outstanding fine (Rs {outstanding}).",
        )

    payment = FinePayment(
        fine_id=fine.id,
        txn_id=fine.txn_id,
        student_id=fine.student_id,
        amount=data.amount,
        method=data.method.value,
        paid_at=today,
        collected_by_staff_id=actor.staff.id if actor.staff else None,
        notes=data.notes,
    )
    db.add(payment)
    db.flush()
    db.expire(fine)
    fine.refresh_status()
    audit_service.record(
        db,
        action="fine_payment",
        user=actor,
        entity="fine",
        entity_id=fine.transaction.txn_id if fine.transaction else None,
        details={"amount": data.amount, "method": data.method.value},
    )
    db.commit()
    db.refresh(payment)
    return payment


def mark_fine_paid_in_full(
    db: Session, actor: User, fine: Fine, today=None
) -> None:
    """Record a payment for the whole outstanding remainder (UI convenience)."""
    if today is None:
        today = clock_service.today()
    if fine.remaining_amount <= 0:
        return
    data = FinePaymentCreate(
        amount=fine.remaining_amount, method="CASH", notes="Paid in full"
    )
    record_payment(db, actor, fine, data, today)