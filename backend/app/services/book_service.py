"""Book management service."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.category import Category
from app.models.user import User
from app.schemas.book import BookCreate, BookUpdate
from app.services import audit_service
from app.services.id_generator import next_sequential_id


def get_book(db: Session, book_id: str) -> Book:
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Book not found."
        )
    return book


def _assert_unique_isbn(db: Session, isbn: str, exclude_id: int | None = None) -> None:
    q = db.query(Book).filter(Book.isbn == isbn)
    if exclude_id is not None:
        q = q.filter(Book.id != exclude_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="ISBN already exists."
        )


def _validate_isbn(isbn: str) -> None:
    digits = isbn.replace("-", "").replace(" ", "").upper()
    # Accept ISBN-10 or ISBN-13 shapes. Full checksum validation is optional
    # here but the format must be plausible.
    if len(digits) not in (10, 13) or not digits.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISBN. Must be a 10 or 13 digit ISBN.",
        )


def _resolve_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
        )
    if not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign a book to an inactive category.",
        )
    return category


def _validate_copies(total_copies: int, available_copies: int | None = None) -> int:
    if total_copies < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total copies must be >= 0.",
        )
    if available_copies is None:
        return total_copies
    if available_copies < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Available copies must be >= 0.",
        )
    if available_copies > total_copies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Available copies cannot exceed total copies.",
        )
    return available_copies


def list_books(
    db: Session,
    search: str | None = None,
    category_id: int | None = None,
    availability: str | None = None,
) -> list[Book]:
    q = db.query(Book).join(Category)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            Book.book_id.like(like)
            | Book.title.like(like)
            | Book.author.like(like)
            | Book.isbn.like(like)
            | Category.name.like(like)
        )
    if category_id is not None:
        q = q.filter(Book.category_id == category_id)
    if availability == "available":
        q = q.filter(Book.available_copies > 0, Book.is_active == True)  # noqa: E712
    elif availability == "out":
        q = q.filter(
            (Book.available_copies == 0) | (Book.is_active == False)  # noqa: E712
        )
    return q.order_by(Book.book_id).all()


def create_book(db: Session, actor: User, data: BookCreate) -> Book:
    _validate_isbn(data.isbn)
    _assert_unique_isbn(db, data.isbn)
    category = _resolve_category(db, data.category_id)
    available = _validate_copies(data.total_copies)
    book = Book(
        book_id=next_sequential_id(db, Book, "BOOK", 6),
        title=data.title.strip(),
        author=data.author.strip(),
        isbn=data.isbn,
        category_id=category.id,
        publisher=data.publisher,
        publication_year=data.publication_year,
        total_copies=data.total_copies,
        available_copies=available,
        shelf_location=data.shelf_location,
        is_active=True,
    )
    db.add(book)
    audit_service.record(
        db,
        action="create_book",
        user=actor,
        entity="book",
        entity_id=book.book_id,
        details={"title": data.title, "isbn": data.isbn},
    )
    db.commit()
    db.refresh(book)
    return book


def update_book(db: Session, actor: User, book_id: str, data: BookUpdate) -> Book:
    book = get_book(db, book_id)

    new_isbn = data.isbn if data.isbn is not None else book.isbn
    _validate_isbn(new_isbn)
    _assert_unique_isbn(db, new_isbn, exclude_id=book.id)

    new_total = data.total_copies if data.total_copies is not None else book.total_copies
    _validate_copies(new_total, book.available_copies)

    if data.category_id is not None:
        category = _resolve_category(db, data.category_id)
        book.category_id = category.id

    for field in ("title", "author", "isbn", "publisher", "publication_year",
                  "total_copies", "shelf_location", "is_active"):
        value = getattr(data, field)
        if value is not None:
            setattr(book, field, value.strip() if isinstance(value, str) else value)

    # Keep available_copies within the new total on increases (copy add counts up).
    if book.available_copies < 0:
        book.available_copies = 0

    audit_service.record(
        db,
        action="update_book" if data.is_active is not False else "disable_book",
        user=actor,
        entity="book",
        entity_id=book.book_id,
        details=data.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(book)
    return book


def delete_book(db: Session, actor: User, book_id: str) -> None:
    """Soft-delete: books with history are disabled, not destroyed."""
    book = get_book(db, book_id)
    book.is_active = False
    audit_service.record(
        db,
        action="delete_book",
        user=actor,
        entity="book",
        entity_id=book.book_id,
    )
    db.commit()