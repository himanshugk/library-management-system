from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.fine import (
    FineOut,
    FinePaymentCreate,
    FinePaymentOut,
)
from app.services import fine_service, serializers
from app.services.student_service import get_student

router = APIRouter(prefix="/fines", tags=["Fines"])


@router.get("", response_model=list[FineOut], summary="List fines")
def list_fines(
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return [
        serializers.to_fine(f) for f in fine_service.list_fines(db, status_filter)
    ]


@router.get(
    "/{fine_id}",
    response_model=FineOut,
    summary="View a single fine",
)
def get_fine(
    fine_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_fine(fine_service.get_fine(db, fine_id))


@router.post(
    "/{fine_id}/payment",
    response_model=FinePaymentOut,
    status_code=201,
    summary="Record a payment against a fine",
)
def record_payment(
    fine_id: int,
    payload: FinePaymentCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    fine = fine_service.get_fine(db, fine_id)
    payment = fine_service.record_payment(db, current_user, fine, payload)
    return serializers.to_payment(payment)


@router.post(
    "/{fine_id}/pay-in-full",
    response_model=FineOut,
    summary="Pay the whole outstanding fine in one click",
)
def pay_in_full(
    fine_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    fine = fine_service.get_fine(db, fine_id)
    fine_service.mark_fine_paid_in_full(db, current_user, fine)
    db.refresh(fine)
    return serializers.to_fine(fine)


@router.get(
    "/students/{student_id}",
    response_model=list[FineOut],
    summary="Fines for a specific student",
)
def student_fines(
    student_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    student = get_student(db, student_id)
    return [
        serializers.to_fine(f) for f in fine_service.list_student_fines(db, student)
    ]