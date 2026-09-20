"""Notification service with a provider interface.

The application is decoupled from any specific SMS provider. Currently we ship
a MockProvider (fake "send" that appends a log row + prints to console) which
can be swapped for a real SMS gateway later without touching business logic.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import (
    Notification,
    NotificationStatus,
    NotificationType,
)
from app.models.student import Student
from app.models.transaction import BookTransaction
from app.models.user import User
from app.services import audit_service
from app.utils import clock as clock_service


class NotificationProvider(ABC):
    provider_name: str = "base"

    @abstractmethod
    def send(self, phone: str, message: str) -> None:
        """Send an SMS. Raise an exception when sending fails."""


class MockProvider(NotificationProvider):
    """Development provider: records the message and prints it.

    Replace with a real SMS gateway (Twilio, MSG91, ...) implementing
    NotificationProvider when going to production.
    """

    provider_name = "mock"

    def send(self, phone: str, message: str) -> None:
        from app.utils import clock as clock_service

        print(f"[MOCK SMS] to {phone}: {message}")


class LogOnlyProvider(MockProvider):
    provider_name = "log"


_PROVIDERS: dict[str, NotificationProvider] = {
    "mock": MockProvider(),
    "log": LogOnlyProvider(),
}


def get_provider(name: str | None = None) -> NotificationProvider:
    key = (name or settings.SMS_PROVIDER or "mock").lower()
    return _PROVIDERS.get(key, MockProvider())


def _create(
    db: Session,
    *,
    student: Student,
    txn: BookTransaction | None,
    ntype: NotificationType,
    message: str,
) -> Notification:
    provider = get_provider()
    notification = Notification(
        student_id=student.id,
        txn_id=txn.id if txn else None,
        phone=student.phone,
        ntype=ntype.value,
        message=message,
        provider=provider.provider_name,
        status=NotificationStatus.PENDING.value,
    )
    db.add(notification)
    db.flush()
    try:
        provider.send(student.phone, message)
        notification.status = NotificationStatus.SENT.value
        notification.sent_at = clock_service.now()
    except Exception as exc:  # pragma: no cover - provider failures
        notification.status = NotificationStatus.FAILED.value
        notification.error_message = str(exc)[:500]
    db.commit()
    db.refresh(notification)
    return notification


def already_sent(db: Session, student_id: int, txn_id: int, ntype: NotificationType) -> bool:
    return (
        db.query(Notification)
        .filter(
            Notification.student_id == student_id,
            Notification.txn_id == txn_id,
            Notification.ntype == ntype.value,
            Notification.status == NotificationStatus.SENT.value,
        )
        .first()
        is not None
    )


def overdue_message(txn: BookTransaction, due_label: str, fine_per_day: int) -> str:
    return (
        f'Library Notice: Your book "{txn.book.title}" was due on {due_label} '
        f"and has not been returned. Please return the book as soon as possible. "
        f"Overdue fine is now applicable at Rs {fine_per_day} per day."
    )


def send_overdue_notice(db: Session, txn: BookTransaction) -> Notification | None:
    """Send the one-time FIRST overdue notice for a transaction."""
    if already_sent(
        db, txn.student_id, txn.id, NotificationType.OVERDUE_FIRST_NOTICE
    ):
        return None
    student = db.get(Student, txn.student_id)
    message = overdue_message(
        txn,
        due_label=txn.due_date.strftime("%d-%b-%Y"),
        fine_per_day=settings.FINE_PER_DAY,
    )
    return _create(
        db,
        student=student,
        txn=txn,
        ntype=NotificationType.OVERDUE_FIRST_NOTICE,
        message=message,
    )


def send_test_notification(
    db: Session, actor: User, student_id: str, message: str | None
) -> Notification:
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found."
        )
    text = message or "This is a test message from your library management system."
    notification = _create(
        db,
        student=student,
        txn=None,
        ntype=NotificationType.TEST,
        message=text,
    )
    audit_service.record(
        db,
        action="send_test_notification",
        user=actor,
        entity="student",
        entity_id=student.student_id,
    )
    return notification


def list_notifications(db: Session) -> list[Notification]:
    return (
        db.query(Notification).order_by(Notification.created_at.desc()).all()
    )