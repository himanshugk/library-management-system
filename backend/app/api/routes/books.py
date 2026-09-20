from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.book import BookCreate, BookOut, BookUpdate
from app.services import book_service, serializers

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=list[BookOut], summary="List books (search+filter)")
def list_books(
    search: str | None = Query(default=None),
    category_id: int | None = Query(default=None),
    availability: str | None = Query(default=None),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    books = book_service.list_books(db, search, category_id, availability)
    return [serializers.to_book(b) for b in books]


@router.post(
    "",
    response_model=BookOut,
    status_code=201,
    summary="Create a book (auto-generates BOOK-xxxxxx)",
)
def create_book(
    payload: BookCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_book(book_service.create_book(db, current_user, payload))


@router.get("/{book_id}", response_model=BookOut, summary="View a book")
def get_book(
    book_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_book(book_service.get_book(db, book_id))


@router.put("/{book_id}", response_model=BookOut, summary="Edit a book")
def update_book(
    book_id: str,
    payload: BookUpdate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_book(book_service.update_book(db, current_user, book_id, payload))


@router.delete(
    "/{book_id}",
    status_code=204,
    summary="Delete/disable a book (soft delete)",
)
def delete_book(
    book_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    book_service.delete_book(db, current_user, book_id)