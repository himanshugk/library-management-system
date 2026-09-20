from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.dashboard import DashboardStats
from app.services.dashboard_service import dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats", response_model=DashboardStats, summary="Dashboard summary statistics"
)
def stats(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    return dashboard_stats(db)