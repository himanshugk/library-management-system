"""Human-readable ID generation (STAFF-0001, STU-000001, BOOK-000001, ...).

IDs are derived from the largest existing numeric suffix + 1, so they are
unique even after deletions.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session


def next_sequential_id(db: Session, model, prefix: str, pad: int) -> str:
    id_column = model.__table__.c.id  # type: ignore[attr-defined]
    # Use the human-readable column (e.g. books.book_id) to find max suffix.
    human_column = getattr(model, _human_column_name(model))
    stmt = select(human_column).where(human_column.like(f"{prefix}-%"))
    max_num = 0
    for value in db.execute(stmt).scalars():
        suffix = value[len(prefix) + 1 :] if value else ""
        if suffix.isdigit():
            max_num = max(max_num, int(suffix))
    return f"{prefix}-{max_num + 1:0{pad}d}"


def _human_column_name(model) -> str:
    mapping = {
        "staff": "staff_id",
        "students": "student_id",
        "books": "book_id",
        "categories": "category_id",
        "book_transactions": "txn_id",
    }
    return mapping.get(model.__tablename__, "id")