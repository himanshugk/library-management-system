from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.transaction import TransactionStatus


class IssueRequest(BaseModel):
    student_id: str = Field(min_length=1)  # human-readable ID e.g. STU-000001
    book_id: str = Field(min_length=1)    # human-readable ID e.g. BOOK-000001


class TransactionOut(BaseModel):
    id: int
    txn_id: str
    student_id: str
    student_name: str
    book_id: str
    book_title: str
    issued_by_staff_id: str
    issue_date: date
    due_date: date
    return_date: date | None
    returned_by_staff_id: str | None
    status: str
    overdue_days: int = 0
    current_fine: int = 0
    fine_amount: int = 0
    fine_status: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReturnItem(BaseModel):
    transaction_id: str = Field(min_length=1)


class ReturnOut(BaseModel):
    transaction: TransactionOut
    overdue_days: int
    fine: int
    message: str