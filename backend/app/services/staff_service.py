"""(Admin-only) staff management service."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import Role
from app.core.security import hash_password
from app.models.staff import Staff
from app.models.user import User
from app.schemas.staff import (
    PasswordResetRequest,
    StaffCreate,
    StaffUpdate,
)
from app.services import audit_service
from app.services.id_generator import next_sequential_id


def get_staff_by_id(db: Session, staff_id: str) -> Staff:
    staff = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found."
        )
    return staff


def list_staff(db: Session, search: str | None = None) -> list[Staff]:
    q = db.query(Staff).join(User)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            Staff.staff_id.like(like)
            | Staff.name.like(like)
            | User.email.like(like)
        )
    return q.order_by(Staff.staff_id).all()


def _assert_unique_email(db: Session, email: str, exclude_user_id: int | None = None) -> None:
    q = db.query(User).filter(User.email == email.lower())
    if exclude_user_id is not None:
        q = q.filter(User.id != exclude_user_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A staff member with this email already exists.",
        )


def _assert_unique_username(db: Session, username: str, exclude_user_id: int | None = None) -> None:
    q = db.query(User).filter(User.username == username.strip())
    if exclude_user_id is not None:
        q = q.filter(User.id != exclude_user_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A staff member with this username already exists.",
        )


def create_staff(db: Session, actor: User, data: StaffCreate) -> Staff:
    if data.role == Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can create an admin account, and admins are not self-created.",
        )
    _assert_unique_email(db, data.email, None)
    _assert_unique_username(db, data.username, None)

    user = User(
        username=data.username.strip(),
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=data.role.value,
        is_active=True,
    )
    db.add(user)
    db.flush()

    staff = Staff(
        staff_id=next_sequential_id(db, Staff, "STAFF", 4),
        user_id=user.id,
        name=data.name,
        phone=data.phone,
    )
    db.add(staff)
    audit_service.record(
        db,
        action="create_staff",
        user=actor,
        entity="staff",
        entity_id=staff.staff_id,
        details={"name": data.name},
    )
    db.commit()
    db.refresh(staff)
    return staff


def update_staff(db: Session, actor: User, staff_id: str, data: StaffUpdate) -> Staff:
    staff = get_staff_by_id(db, staff_id)
    user = staff.user

    new_email = data.email.lower() if data.email else user.email
    if data.email:
        _assert_unique_email(db, new_email, exclude_user_id=user.id)
    if data.role:
        _assert_role_change(db, actor, staff, data.role)

    if data.role is not None:
        user.role = data.role.value
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.name is not None:
        staff.name = data.name
    if data.email is not None:
        user.email = new_email
    if data.phone is not None:
        staff.phone = data.phone

    audit_service.record(
        db,
        action="update_staff" if not (data.is_active is False) else "disable_staff",
        user=actor,
        entity="staff",
        entity_id=staff.staff_id,
        details=data.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(staff)
    return staff


def update_staff_status(
    db: Session, actor: User, staff_id: str, is_active: bool
) -> Staff:
    staff = get_staff_by_id(db, staff_id)
    if actor.id == staff.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own account this way.",
        )
    if staff.user.is_admin and not is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The main admin account cannot be disabled.",
        )
    staff.user.is_active = is_active
    audit_service.record(
        db,
        action="disable_staff" if not is_active else "enable_staff",
        user=actor,
        entity="staff",
        entity_id=staff.staff_id,
    )
    db.commit()
    db.refresh(staff)
    return staff


def reset_staff_password(
    db: Session, actor: User, staff_id: str, data: PasswordResetRequest
) -> None:
    from app.services import auth_service

    staff = get_staff_by_id(db, staff_id)
    auth_service.reset_password(db, actor, staff, data.new_password)


def delete_staff(db: Session, actor: User, staff_id: str) -> None:
    """Soft-delete: disable the account instead of destroying history."""
    update_staff_status(db, actor, staff_id, is_active=False)


def _assert_role_change(db: Session, actor: User, target: Staff, new_role: Role) -> None:
    if actor.role != Role.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change roles.",
        )
    # The main admin may not be demoted if it is the last admin remaining.
    if target.user.is_admin and new_role == Role.STAFF:
        admin_count = db.query(User).filter(User.role == Role.ADMIN.value).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one admin account must remain.",
            )