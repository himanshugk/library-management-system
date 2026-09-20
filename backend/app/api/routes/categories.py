from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryOut], summary="List categories")
def list_categories(
    search: str | None = Query(default=None),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    categories = category_service.list_categories(db, search)
    return [
        CategoryOut.model_validate(c).model_copy(
            update={"book_count": len(c.books)}
        )
        for c in categories
    ]


@router.post(
    "",
    response_model=CategoryOut,
    status_code=201,
    summary="Create a category (auto-generates CAT-xxxxxx)",
)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return CategoryOut.model_validate(
        category_service.create_category(db, current_user, payload)
    )


@router.get("/{category_id}", response_model=CategoryOut, summary="View a category")
def get_category(
    category_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    c = category_service.get_category(db, category_id)
    return CategoryOut.model_validate(c).model_copy(update={"book_count": len(c.books)})


@router.put("/{category_id}", response_model=CategoryOut, summary="Edit a category")
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return CategoryOut.model_validate(
        category_service.update_category(db, current_user, category_id, payload)
    )


@router.delete(
    "/{category_id}",
    status_code=204,
    summary="Delete a category (rejected if books are assigned)",
)
def delete_category(
    category_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    category_service.delete_category(db, current_user, category_id)