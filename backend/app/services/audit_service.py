"""Audit logging helper. Every important action is recorded here."""
import json

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def record(
    db: Session,
    *,
    action: str,
    user: User | None,
    entity: str | None = None,
    entity_id: str | None = None,
    details: dict | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else None,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=json.dumps(details) if details else None,
    )
    db.add(log)
    return log