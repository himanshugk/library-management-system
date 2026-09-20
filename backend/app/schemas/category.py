from datetime import datetime

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class CategoryOut(CategoryBase):
    id: int
    category_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    book_count: int = 0

    model_config = {"from_attributes": True}