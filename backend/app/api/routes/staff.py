from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.staff import (
    PasswordResetRequest,
    StaffCreate,
    StaffOut,
    StaffStatusUpdate,
    StaffUpdate,
)
from app.services import serializers, staff_service

router = APIRouter(prefix="/staff", tags=["Staff"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[StaffOut], summary="List staff (admin only)")
def list_staff(
    search: str | None = Query(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return [serializers.to_staff(s) for s in staff_service.list_staff(db, search)]


@router.post(
    "",
    response_model=StaffOut,
    status_code=201,
    summary="Create a staff account (auto-generates STAFF-xxxx)",
)
def create_staff(
    payload: StaffCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_staff(staff_service.create_staff(db, current_user, payload))


@router.get("/{staff_id}", response_model=StaffOut, summary="View a staff member")
def get_staff(
    staff_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_staff(staff_service.get_staff_by_id(db, staff_id))


@router.put("/{staff_id}", response_model=StaffOut, summary="Edit a staff member")
def update_staff(
    staff_id: str,
    payload: StaffUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_staff(
        staff_service.update_staff(db, current_user, staff_id, payload)
    )


@router.patch(
    "/{staff_id}/status",
    response_model=StaffOut,
    summary="Enable/disable a staff member",
)
def set_staff_status(
    staff_id: str,
    payload: StaffStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return serializers.to_staff(
        staff_service.update_staff_status(db, current_user, staff_id, payload.is_active)
    )


@router.post(
    "/{staff_id}/reset-password",
    status_code=204,
    summary="Reset a staff member's password (admin only)",
)
def reset_password(
    staff_id: str,
    payload: PasswordResetRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    staff_service.reset_staff_password(db, current_user, staff_id, payload)


@router.delete(
    "/{staff_id}",
    status_code=204,
    summary="Disable/remove a staff member (soft delete)",
)
def delete_staff(
    staff_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    staff_service.delete_staff(db, current_user, staff_id)