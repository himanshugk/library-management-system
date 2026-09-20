"""Automated overdue detection job.

Runs periodically (via APScheduler started in the FastAPI lifespan). It:

1. Finds every ISSUED transaction whose due date has passed,
2. Sends the one-time first-overdue SMS if it hasn't been sent yet,
3. Records the notification history.

Fines are NOT stored here - they are always computed from dates on demand
((today - due_date) * FINE_PER_DAY), so duplicates are impossible.
"""
from sqlalchemy.orm import Session

from app.models.transaction import BookTransaction, TransactionStatus
from app.services import notification_service
from app.utils import clock as clock_service


def run_overdue_check(db: Session) -> tuple[int, int]:
    """Return (checked_count, notifications_sent_count)."""
    today = clock_service.today()
    overdue_txns = (
        db.query(BookTransaction)
        .filter(
            BookTransaction.status == TransactionStatus.ISSUED.value,
            BookTransaction.due_date < today,
        )
        .all()
    )
    sent = 0
    for txn in overdue_txns:
        notification = notification_service.send_overdue_notice(db, txn)
        if notification is not None:
            sent += 1
    return len(overdue_txns), sent