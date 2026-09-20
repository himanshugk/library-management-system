"""Authentication service: login, current user, password change, reset."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.staff import Staff
from app.models.user import User
from app.schemas.auth import LoginResponse, UserOut
from app.services import audit_service
from app.utils import clock as clock_service


def authenticate(db: Session, username: str, password: str) -> User:
    """Validate credentials. Raises generic 401 on any failure."""
    user = (
        db.query(User)
        .filter(User.username == username.strip())
        .first()
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )
    return user


def login(db: Session, username: str, password: str) -> LoginResponse:
    user = authenticate(db, username, password)
    user.last_login_at = clock_service.now()

    audit_service.record(
        db, action="login", user=user, entity="user", entity_id=user.username
    )
    db.commit()

    token = create_access_token(subject=str(user.id))
    return LoginResponse(access_token=token, user=user_to_out(user))


def user_to_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    if user.staff:
        out.staff_id = user.staff.staff_id
        out.name = user.staff.name
    return out


def change_password(
    db: Session, user: User, old_password: str, new_password: str
) -> None:
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    user.password_hash = hash_password(new_password)
    audit_service.record(
        db, action="change_password", user=user, entity="user", entity_id=user.username
    )
    db.commit()


def reset_password(db: Session, actor: User, staff: Staff, new_password: str) -> None:
    """Admin-only: set a new password for a staff member."""
    staff.user.password_hash = hash_password(new_password)
    audit_service.record(
        db,
        action="password_reset",
        user=actor,
        entity="staff",
        entity_id=staff.staff_id,
    )
    db.commit()


def logout(db: Session, user: User) -> None:
    audit_service.record(
        db, action="logout", user=user, entity="user", entity_id=user.username
    )
    db.commit()