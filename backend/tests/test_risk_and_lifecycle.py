from app.services.risk_calculator import calculate_incident_risk
from app.services.state_machine import VALID_TRANSITIONS, transition_incident_status
from app.models.incident import Incident
from app.core.database import SessionLocal

def test_risk_formula_calculation():
    risk = calculate_incident_risk(
        category="pothole",
        visible_severity="high",
        address_or_location_name="Outer Ring Road, Bellandur",
        user_description="Deep water filled hole causing accidents"
    )
    assert 75.0 <= risk["risk_score"] <= 100.0
    assert "breakdown" in risk
    assert risk["breakdown"]["severity_score"] >= 80.0
    assert risk["breakdown"]["emergency_escalation"] is True

def test_valid_and_invalid_state_transitions():
    db = SessionLocal()
    try:
        inc = db.query(Incident).first()
        assert inc is not None
        
        # Test invalid transition directly
        ok, msg = transition_incident_status(
            db=db,
            incident=inc,
            new_status="closed",
            actor="Citizen Contributor",
            actor_role="citizen",
            reason="Trying to self close"
        )
        assert ok is False  # Citizen cannot close and invalid transition from candidate/needs_review
    finally:
        db.close()

