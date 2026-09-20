from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.core.permissions import Role


class StaffBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)


class StaffCreate(StaffBase):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.STAFF


class StaffUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    role: Role | None = None
    is_active: bool | None = None


class StaffStatusUpdate(BaseModel):
    is_active: bool


class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class StaffOut(BaseModel):
    id: int
    staff_id: str
    user_id: int
    name: str
    email: EmailStr
    phone: str | None
    role: Role
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}