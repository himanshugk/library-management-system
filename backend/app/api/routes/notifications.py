from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationOut
from app.services import notification_service, serializers

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut], summary="List all notifications")
def list_notifications(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return [
        serializers.to_notification(n)
        for n in notification_service.list_notifications(db)
    ]


@router.post(
    "/test",
    response_model=NotificationOut,
    status_code=201,
    summary="Send a test SMS to a student",
)
def send_test(
    payload: NotificationCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    n = notification_service.send_test_notification(
        db, current_user, payload.student_id, payload.message
    )
    return serializers.to_notification(n)