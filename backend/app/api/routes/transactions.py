from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff_or_admin
from app.models.user import User
from app.schemas.transaction import IssueRequest, ReturnOut, TransactionOut
from app.services import serializers, transaction_service
from app.utils import clock as clock_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=list[TransactionOut], summary="List transactions")
def list_transactions(
    search: str | None = Query(default=None),
    txn_status: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    txns = transaction_service.list_transactions(db, search, txn_status)
    return [serializers.to_txn(t) for t in txns]


@router.get(
    "/overdue",
    response_model=list[TransactionOut],
    summary="List currently overdue transactions",
)
def list_overdue(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    today = clock_service.today()
    txns = [
        t
        for t in transaction_service.list_transactions(db, None, "ISSUED")
        if transaction_service.is_overdue(t, today)
    ]
    return [serializers.to_txn(t) for t in txns]


@router.get(
    "/{transaction_id}",
    response_model=TransactionOut,
    summary="View a single transaction",
)
def get_transaction(
    transaction_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    txn = transaction_service.get_transaction_by_id(db, transaction_id)
    return serializers.to_txn(txn)


@router.post(
    "/issue",
    response_model=TransactionOut,
    status_code=201,
    summary="Issue a book to a student (due = issue + 20 days)",
)
def issue(
    payload: IssueRequest,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    txn = transaction_service.issue_book(db, current_user, payload)
    return serializers.to_txn(txn)


@router.post(
    "/{transaction_id}/return",
    response_model=ReturnOut,
    summary="Return a book and finalize its fine",
)
def return_book(
    transaction_id: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    txn, fine = transaction_service.return_book(db, current_user, transaction_id)
    txn_out = serializers.to_txn(txn)
    return ReturnOut(
        transaction=txn_out,
        overdue_days=txn_out.overdue_days,
        fine=fine,
        message="No fine due." if fine == 0 else f"Fine of Rs {fine} recorded.",
    )