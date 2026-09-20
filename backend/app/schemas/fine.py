from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.fine import PaymentMethod


class FineOut(BaseModel):
    id: int
    txn_id: str
    student_id: str
    student_name: str
    book_title: str
    amount: int
    paid_amount: int
    remaining_amount: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FinePaymentCreate(BaseModel):
    amount: int = Field(ge=0)
    method: PaymentMethod = PaymentMethod.CASH
    notes: str | None = Field(default=None, max_length=500)


class FinePaymentOut(BaseModel):
    id: int
    fine_id: int
    txn_id: str
    student_id: str
    student_name: str
    book_title: str
    amount: int
    method: str
    paid_at: date
    collected_by_staff_id: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}