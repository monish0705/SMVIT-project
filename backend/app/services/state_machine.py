import logging
from typing import Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.audit_event import AuditEvent

logger = logging.getLogger(__name__)

# Valid state transitions graph
VALID_TRANSITIONS = {
    "candidate": ["needs_location", "needs_review", "corroborated", "field_verified", "assigned", "rejected"],
    "needs_location": ["candidate", "needs_review", "corroborated", "rejected"],
    "needs_review": ["candidate", "corroborated", "field_verified", "assigned", "rejected"],
    "corroborated": ["field_verified", "assigned", "needs_review", "rejected"],
    "field_verified": ["assigned", "in_progress", "repair_claimed", "resolution_pending_review", "rejected"],
    "assigned": ["in_progress", "repair_claimed", "resolution_pending_review", "field_verified", "rejected"],
    "in_progress": ["repair_claimed", "resolution_pending_review", "assigned", "closed"],
    "repair_claimed": ["resolution_pending_review", "in_progress", "resolution_verified"],
    "resolution_pending_review": ["resolution_verified", "in_progress", "closed"],
    "resolution_verified": ["closed", "in_progress"],
    "closed": ["in_progress", "candidate"],
    "rejected": ["candidate", "needs_review"]
}

# Role permissions for critical transitions
ROLE_TRANSITION_PERMISSIONS = {
    "field_verified": ["field_inspector", "operator", "admin"],
    "assigned": ["operator", "admin"],
    "resolution_verified": ["operator", "admin"],
    "closed": ["operator", "admin"],
    "rejected": ["operator", "admin"],
}

def transition_incident_status(
    db: Session,
    incident: Incident,
    new_status: str,
    actor: str,
    actor_role: str,
    reason: str,
    notes: Optional[str] = None
) -> Tuple[bool, str]:
    """Execute a validated state transition with role checks and append-only audit trail."""
    current_status = incident.current_status
    if current_status == new_status:
        return True, f"Incident already in {new_status} status."

    # Validate transition path
    allowed_targets = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed_targets:
        return False, f"Invalid transition: Cannot move from '{current_status}' to '{new_status}'."

    # Validate role permissions
    required_roles = ROLE_TRANSITION_PERMISSIONS.get(new_status)
    if required_roles and actor_role not in required_roles:
        return False, f"Permission denied: Role '{actor_role}' cannot transition incident to '{new_status}'."

    # Execute transition
    incident.current_status = new_status
    incident.updated_at = datetime.now(timezone.utc)
    if new_status == "closed":
        incident.closed_at = datetime.now(timezone.utc)

    # Append-only audit logging
    audit = AuditEvent(
        incident_id=incident.id,
        actor=actor,
        actor_role=actor_role,
        action=f"STATUS_TRANSITION_{new_status.upper()}",
        previous_state=current_status,
        new_state=new_status,
        reason=reason,
        details={"notes": notes, "timestamp": datetime.now(timezone.utc).isoformat()}
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    logger.info(f"Incident {incident.incident_number} status changed from {current_status} to {new_status} by {actor} ({actor_role}).")
    return True, f"Status updated to {new_status}."

