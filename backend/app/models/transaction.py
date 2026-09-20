from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TransactionStatus(str, Enum):
    ISSUED = "ISSUED"
    RETURNED = "RETURNED"


class BookTransaction(Base):
    __tablename__ = "book_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    txn_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), index=True, nullable=False
    )
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id"), index=True, nullable=False
    )
    issued_by_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    issue_date: Mapped[date] = mapped_column(Date, index=True)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    returned_to_staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default=TransactionStatus.ISSUED.value)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    student: Mapped["Student"] = relationship(back_populates="transactions")
    book: Mapped["Book"] = relationship()
    issued_by: Mapped["Staff"] = relationship(foreign_keys=[issued_by_staff_id])
    returned_by: Mapped["Staff | None"] = relationship(
        foreign_keys=[returned_to_staff_id]
    )
    fine: Mapped["Fine | None"] = relationship(
        back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def is_issued(self) -> bool:
        return self.status == TransactionStatus.ISSUED.value