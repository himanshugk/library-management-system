from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.rate_limit import rate_limited
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, LoginResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with username/email and password",
)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    rate_limited(request.client.host)
    return auth_service.login(db, payload.username, payload.password)


@router.post("/logout", summary="Logout (records an audit log)")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    auth_service.logout(db, current_user)
    return {"detail": "Logged out."}


@router.get("/me", response_model=UserOut, summary="Get the current authenticated user")
def me(current_user: User = Depends(get_current_user)):
    return auth_service.user_to_out(current_user)


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change your own password",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.change_password(
        db, current_user, payload.old_password, payload.new_password
    )