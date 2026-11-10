from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, get_current_user
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.incident import Incident
from app.models.audit_event import AuditEvent
from app.services.risk_calculator import calculate_incident_risk

router = APIRouter(prefix="/settings", tags=["Settings & Configuration"])

class RiskWeightsPayload(BaseModel):
    severity: float
    exposure: float
    criticality: float
    hazard: float
    time_unresolved: float
    recalculate_open: bool = True

class CreateUserPayload(BaseModel):
    email: str
    full_name: str
    password: str
    role: str  # citizen, field_inspector, operator, admin
    organization: Optional[str] = "BBMP Operations"

@router.get("/status")
def get_system_settings_status(db: Session = Depends(get_db)):
    """System diagnostic and configuration status."""
    user_count = db.query(User).count()
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip()),
        "gemini_model": settings.GEMINI_MODEL,
        "database_backend": "SQLite (Development Fallback)" if settings.DATABASE_URL.startswith("sqlite") else "PostgreSQL / PostGIS",
        "nominatim_geocoder": settings.NOMINATIM_BASE_URL,
        "risk_weights": {
            "severity": settings.RISK_WEIGHT_SEVERITY,
            "exposure": settings.RISK_WEIGHT_EXPOSURE,
            "criticality": settings.RISK_WEIGHT_CRITICALITY,
            "hazard": settings.RISK_WEIGHT_HAZARD,
            "time_unresolved": settings.RISK_WEIGHT_TIME_UNRESOLVED,
            "formula_version": "1.0"
        },
        "registered_users": user_count,
        "storage_paths": {
            "originals": settings.ORIGINALS_PATH,
            "annotated": settings.ANNOTATED_PATH,
            "thumbnails": settings.THUMBNAILS_PATH
        }
    }

@router.get("/users")
def list_system_users(db: Session = Depends(get_db)):
    """List demo users for easy role switching in testing."""
    users = db.query(User).all()
    return [{
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "organization": u.organization
    } for u in users]

@router.post("/users", status_code=201)
def create_system_user(
    payload: CreateUserPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"]))
):
    """Register a new member to deploy the platform across 10+ team members."""
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    if payload.role not in ["citizen", "field_inspector", "operator", "admin", "contractor"]:
        raise HTTPException(status_code=400, detail=f"Invalid role '{payload.role}'.")

    user = User(
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        organization=payload.organization or "BBMP Operations"
    )
    db.add(user)

    audit = AuditEvent(
        actor=current_user.full_name,
        actor_role=current_user.role,
        action="USER_PROVISIONED",
        previous_state=None,
        new_state=payload.role,
        reason=f"Added new {payload.role} account ({payload.email}) for {payload.full_name}."
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "organization": user.organization
        }
    }

@router.delete("/users/{user_id}")
def delete_system_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Delete a user account."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(user)
    db.commit()
    return {"status": "success", "message": f"User {user.email} removed."}


@router.patch("/risk-weights")
def update_risk_weights(
    payload: RiskWeightsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"]))
):
    """Update the 5-factor risk prioritization formula weights and optionally recalculate open incidents."""
    total = round(payload.severity + payload.exposure + payload.criticality + payload.hazard + payload.time_unresolved, 4)
    if abs(total - 1.0) > 0.02:
        raise HTTPException(status_code=400, detail=f"Weights must sum to 1.00 (received {total}).")

    settings.RISK_WEIGHT_SEVERITY = payload.severity
    settings.RISK_WEIGHT_EXPOSURE = payload.exposure
    settings.RISK_WEIGHT_CRITICALITY = payload.criticality
    settings.RISK_WEIGHT_HAZARD = payload.hazard
    settings.RISK_WEIGHT_TIME_UNRESOLVED = payload.time_unresolved

    recalculated = 0
    if payload.recalculate_open:
        open_incidents = db.query(Incident).filter(Incident.current_status.notin_(["closed", "rejected"])).all()
        for inc in open_incidents:
            sev = "medium"
            if inc.assessments:
                sev = inc.assessments[0].structured_output.get("visible_severity", "medium")
            new_risk = calculate_incident_risk(
                category=inc.category,
                visible_severity=sev,
                address_or_location_name=inc.readable_address,
                created_at=inc.created_at,
                user_description=inc.description,
            )
            inc.risk_score = new_risk["risk_score"]
            inc.risk_breakdown = new_risk["breakdown"]
            inc.priority_recommendation = new_risk["recommendation"]
            recalculated += 1

    db.add(
        AuditEvent(
            actor=current_user.full_name,
            actor_role=current_user.role,
            action="RISK_WEIGHTS_UPDATED",
            previous_state=None,
            new_state="updated",
            reason=f"Weights set to S={payload.severity}, E={payload.exposure}, C={payload.criticality}, H={payload.hazard}, T={payload.time_unresolved}. Recalculated {recalculated} incidents.",
        )
    )
    db.commit()
    return {"status": "success", "recalculated": recalculated}


