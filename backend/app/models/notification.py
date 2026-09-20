from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NotificationType(str, Enum):
    OVERDUE_FIRST_NOTICE = "OVERDUE_FIRST_NOTICE"
    FINE_REMINDER = "FINE_REMINDER"
    TEST = "TEST"


class NotificationStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    txn_id: Mapped[int | None] = mapped_column(
        ForeignKey("book_transactions.id"), nullable=True, index=True
    )
    phone: Mapped[str] = mapped_column(String(30))
    ntype: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(String(1000))
    provider: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(
        String(20), default=NotificationStatus.PENDING.value
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    student: Mapped["Student"] = relationship()
    txn: Mapped["BookTransaction | None"] = relationship()