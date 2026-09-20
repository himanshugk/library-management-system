"""Category management service."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services import audit_service
from app.services.id_generator import next_sequential_id


def get_category(db: Session, category_id: str) -> Category:
    category = (
        db.query(Category).filter(Category.category_id == category_id).first()
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
        )
    return category


def _assert_unique_name(db: Session, name: str, exclude_id: int | None = None) -> None:
    q = db.query(Category).filter(Category.name == name.strip())
    if exclude_id is not None:
        q = q.filter(Category.id != exclude_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists.",
        )


def list_categories(db: Session, search: str | None = None) -> list[Category]:
    q = db.query(Category)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            Category.category_id.like(like) | Category.name.like(like)
        )
    return q.order_by(Category.name).all()


def create_category(db: Session, actor: User, data: CategoryCreate) -> Category:
    _assert_unique_name(db, data.name)
    category = Category(
        category_id=next_sequential_id(db, Category, "CAT", 6),
        name=data.name.strip(),
        description=data.description,
        is_active=True,
    )
    db.add(category)
    audit_service.record(
        db,
        action="create_category",
        user=actor,
        entity="category",
        entity_id=category.category_id,
        details={"name": data.name},
    )
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, actor: User, category_id: str, data: CategoryUpdate
) -> Category:
    category = get_category(db, category_id)
    if data.name is not None:
        _assert_unique_name(db, data.name, exclude_id=category.id)
        category.name = data.name.strip()
    if data.description is not None:
        category.description = data.description
    if data.is_active is not None:
        category.is_active = data.is_active
    audit_service.record(
        db,
        action="update_category",
        user=actor,
        entity="category",
        entity_id=category.category_id,
        details=data.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, actor: User, category_id: str) -> None:
    """Business rule: a category with books cannot be hard-deleted."""
    category = get_category(db, category_id)
    book_count = (
        db.query(Book).filter(Book.category_id == category.id).count()
    )
    if book_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete category because books are assigned to this "
                "category. Reassign the books first."
            ),
        )
    audit_service.record(
        db,
        action="delete_category",
        user=actor,
        entity="category",
        entity_id=category.category_id,
    )
    db.delete(category)
    db.commit()