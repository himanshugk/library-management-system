from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class StudentBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=5, max_length=30)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=500)


class StudentCreate(StudentBase):
    pass


class StudentUpdate(StudentBase):
    pass


class StudentStatusUpdate(BaseModel):
    is_active: bool


class StudentOut(StudentBase):
    id: int
    student_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Aggregated stats (populated by the service)
    outstanding_fine: int = 0
    issued_book_count: int = 0

    model_config = {"from_attributes": True}


class StudentDetailedOut(StudentOut):
    pass


class StudentHistoryItem(BaseModel):
    transaction_id: str
    book_title: str
    book_id: str
    issue_date: datetime
    due_date: datetime
    return_date: datetime | None
    status: str
    overdue_days: int = 0
    current_fine: int = 0

    model_config = {"from_attributes": True}