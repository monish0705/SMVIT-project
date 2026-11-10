from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, get_current_user
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.audit_event import AuditEvent

router = APIRouter(prefix="/settings", tags=["Settings & Configuration"])

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


