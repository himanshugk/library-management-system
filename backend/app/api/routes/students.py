from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.student import (
    StudentCreate,
    StudentDetailedOut,
    StudentHistoryItem,
    StudentOut,
    StudentStatusUpdate,
    StudentUpdate,
)
from app.schemas.fine import FineOut
from app.schemas.transaction import TransactionOut
from app.services import serializers, student_service

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=list[StudentOut], summary="List students (searchable)")
def list_students(
    search: str | None = Query(default=None),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    students = student_service.list_students(db, search)
    return [serializers.to_student(s, db) for s in students]


@router.post(
    "",
    response_model=StudentOut,
    status_code=201,
    summary="Create a student (auto-generates STU-xxxxxx)",
)
def create_student(
    payload: StudentCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_student(
        student_service.create_student(db, current_user, payload), db
    )


@router.get("/{student_id}", response_model=StudentDetailedOut, summary="View a student")
def get_student(
    student_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    student = student_service.get_student(db, student_id)
    return serializers.to_student(student, db)


@router.put("/{student_id}", response_model=StudentOut, summary="Edit a student")
def update_student(
    student_id: str,
    payload: StudentUpdate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    updated = student_service.update_student(db, current_user, student_id, payload)
    return serializers.to_student(updated, db)


@router.patch(
    "/{student_id}/status",
    response_model=StudentOut,
    summary="Enable/disable a student",
)
def set_student_status(
    student_id: str,
    payload: StudentStatusUpdate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    updated = student_service.update_student_status(
        db, current_user, student_id, payload.is_active
    )
    return serializers.to_student(updated, db)


@router.get(
    "/{student_id}/history",
    response_model=list[StudentHistoryItem],
    summary="Student borrowing history",
)
def student_history(
    student_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    student = student_service.get_student(db, student_id)
    return student_service.history(db, student)


@router.get(
    "/{student_id}/fines",
    response_model=list[FineOut],
    summary="Fines for a specific student",
)
def student_fines(
    student_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    from app.services import fine_service, serializers as ser

    student = student_service.get_student(db, student_id)
    return [ser.to_fine(f) for f in fine_service.list_student_fines(db, student)]


@router.get(
    "/{student_id}/transactions",
    response_model=list[TransactionOut],
    summary="Student current issued books with due dates",
)
def student_transactions(
    student_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    student = student_service.get_student(db, student_id)
    return [
        serializers.to_txn(txn)
        for txn in sorted(
            student.transactions,
            key=lambda t: (t.status != "ISSUED", t.created_at),
            reverse=True,
        )
    ][:50]