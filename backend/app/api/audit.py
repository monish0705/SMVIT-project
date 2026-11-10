from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models.user import User
from app.models.audit_event import AuditEvent
from app.schemas.incident import AuditEventDetail

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])

@router.get("", response_model=List[AuditEventDetail])
def list_audit_logs(
    incident_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin"]))
):
    """Retrieve immutable, append-only operational audit trail."""
    query = db.query(AuditEvent)
    if incident_id:
        query = query.filter(AuditEvent.incident_id == incident_id)
    
    events = query.order_by(AuditEvent.timestamp.desc()).offset(offset).limit(limit).all()
    return [{
        "id": e.id,
        "actor": e.actor,
        "actor_role": e.actor_role,
        "action": e.action,
        "previous_state": e.previous_state,
        "new_state": e.new_state,
        "reason": e.reason,
        "timestamp": e.timestamp
    } for e in events]

