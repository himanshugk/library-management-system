from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FineStatus(str, Enum):
    NONE = "NONE"
    UNPAID = "UNPAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    OTHER = "OTHER"


class Fine(Base):
    """Created when a transaction is RETURNED. One Fine per transaction."""

    __tablename__ = "fines"

    id: Mapped[int] = mapped_column(primary_key=True)
    txn_id: Mapped[int] = mapped_column(
        ForeignKey("book_transactions.id"), unique=True, index=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default=FineStatus.UNPAID.value)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    transaction: Mapped["BookTransaction"] = relationship(back_populates="fine")
    student: Mapped["Student"] = relationship(back_populates="fines")
    payments: Mapped[list["FinePayment"]] = relationship(
        back_populates="fine", cascade="all, delete-orphan"
    )

    @property
    def paid_amount(self) -> int:
        return sum(p.amount for p in self.payments)

    @property
    def remaining_amount(self) -> int:
        return max(self.amount - self.paid_amount, 0)

    def refresh_status(self) -> None:
        if self.amount <= 0:
            self.status = FineStatus.NONE.value
        elif self.paid_amount >= self.amount:
            self.status = FineStatus.PAID.value
        elif self.paid_amount > 0:
            self.status = FineStatus.PARTIALLY_PAID.value
        else:
            self.status = FineStatus.UNPAID.value


class FinePayment(Base):
    __tablename__ = "fine_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    fine_id: Mapped[int] = mapped_column(ForeignKey("fines.id"), index=True)
    txn_id: Mapped[int] = mapped_column(ForeignKey("book_transactions.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(
        String(20), default=PaymentMethod.CASH.value
    )
    paid_at: Mapped[date] = mapped_column(Date)
    collected_by_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    fine: Mapped[Fine] = relationship(back_populates="payments")
    collected_by: Mapped["Staff"] = relationship()