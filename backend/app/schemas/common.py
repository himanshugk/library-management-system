from pydantic import BaseModel, Field


class Page(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int