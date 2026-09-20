from datetime import datetime

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    username: str | None
    action: str
    entity: str | None
    entity_id: str | None
    details: str | None
    created_at: datetime

    model_config = {"from_attributes": True}