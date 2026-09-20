from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    author: str = Field(min_length=1, max_length=200)
    isbn: str = Field(min_length=5, max_length=20)
    category_id: int
    publisher: str | None = Field(default=None, max_length=200)
    publication_year: int | None = Field(default=None, ge=1000, le=9999)
    total_copies: int = Field(default=1, ge=0)
    shelf_location: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def normalize_isbn(self):
        self.isbn = self.isbn.replace("-", "").replace(" ", "").upper()
        return self


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    author: str | None = Field(default=None, min_length=1, max_length=200)
    isbn: str | None = Field(default=None, min_length=5, max_length=20)
    category_id: int | None = None
    publisher: str | None = Field(default=None, max_length=200)
    publication_year: int | None = Field(default=None, ge=1000, le=9999)
    total_copies: int | None = Field(default=None, ge=0)
    shelf_location: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class BookOut(BookBase):
    id: int
    book_id: str
    available_copies: int
    is_active: bool
    status: str
    category_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}