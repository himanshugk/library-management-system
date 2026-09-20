from datetime import datetime

from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    student_id: str = Field(min_length=1)
    message: str | None = Field(default=None, max_length=1000)


class NotificationOut(BaseModel):
    id: int
    student_id: str
    student_name: str
    txn_id: str | None
    phone: str
    ntype: str
    message: str
    provider: str
    status: str
    sent_at: datetime | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}