"""Convert ORM models to API response schemas with enriched fields."""
from app.models.book import Book
from app.models.fine import Fine, FinePayment
from app.models.notification import Notification
from app.models.staff import Staff
from app.models.student import Student
from app.models.transaction import BookTransaction
from app.schemas.book import BookOut
from app.schemas.fine import FineOut, FinePaymentOut
from app.schemas.notification import NotificationOut
from app.schemas.staff import StaffOut
from app.schemas.student import StudentOut
from app.schemas.transaction import TransactionOut
from app.services import transaction_service
from app.utils import clock as clock_service


def to_student(s: Student, db) -> StudentOut:
    out = StudentOut.model_validate(s)
    from app.services import student_service

    out.outstanding_fine = student_service.outstanding_fine(db, s)
    out.issued_book_count = student_service.issued_book_count(db, s)
    return out


def to_staff(staff: Staff) -> StaffOut:
    return StaffOut(
        id=staff.id,
        staff_id=staff.staff_id,
        user_id=staff.user_id,
        name=staff.name,
        email=staff.user.email,
        phone=staff.phone,
        role=staff.user.role,
        is_active=staff.user.is_active,
        last_login_at=staff.user.last_login_at,
        created_at=staff.created_at,
        updated_at=staff.updated_at,
    )


def to_book(book: Book) -> BookOut:
    out = BookOut.model_validate(book)
    out.category_name = book.category.name if book.category else None
    return out


def to_txn(txn: BookTransaction, today=None) -> TransactionOut:
    if today is None:
        today = clock_service.today()
    overdue_days = transaction_service.overdue_days_for(txn, today)
    current_fine = transaction_service.current_fine_for(txn, today)

    fine_amount = 0
    fine_status = None
    if txn.fine is not None:
        fine_amount = txn.fine.amount
        fine_status = txn.fine.status

    return TransactionOut(
        id=txn.id,
        txn_id=txn.txn_id,
        student_id=txn.student.student_id,
        student_name=txn.student.name,
        book_id=txn.book.book_id,
        book_title=txn.book.title,
        issued_by_staff_id=txn.issued_by.staff_id if txn.issued_by else "STAFF-0000",
        issue_date=txn.issue_date,
        due_date=txn.due_date,
        return_date=txn.return_date,
        returned_by_staff_id=txn.returned_by.staff_id if txn.returned_by else None,
        status=txn.status,
        overdue_days=overdue_days,
        current_fine=current_fine,
        fine_amount=fine_amount,
        fine_status=fine_status,
        created_at=txn.created_at,
    )


def to_fine(fine: Fine) -> FineOut:
    txn = fine.transaction
    return FineOut(
        id=fine.id,
        txn_id=txn.txn_id,
        student_id=txn.student.student_id,
        student_name=txn.student.name,
        book_title=txn.book.title,
        amount=fine.amount,
        paid_amount=fine.paid_amount,
        remaining_amount=fine.remaining_amount,
        status=fine.status,
        created_at=fine.created_at,
    )


def to_payment(payment: FinePayment) -> FinePaymentOut:
    txn = payment.fine.transaction
    return FinePaymentOut(
        id=payment.id,
        fine_id=payment.fine_id,
        txn_id=txn.txn_id,
        student_id=txn.student.student_id,
        student_name=txn.student.name,
        book_title=txn.book.title,
        amount=payment.amount,
        method=payment.method,
        paid_at=payment.paid_at,
        collected_by_staff_id=(
            payment.collected_by.staff_id if payment.collected_by else None
        ),
        notes=payment.notes,
        created_at=payment.created_at,
    )


def to_notification(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        student_id=n.student.student_id,
        student_name=n.student.name,
        txn_id=n.txn.txn_id if n.txn else None,
        phone=n.phone,
        ntype=n.ntype,
        message=n.message,
        provider=n.provider,
        status=n.status,
        sent_at=n.sent_at,
        error_message=n.error_message,
        created_at=n.created_at,
    )