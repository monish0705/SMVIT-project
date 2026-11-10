import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

def calculate_incident_risk(
    category: str,
    visible_severity: str,
    address_or_location_name: Optional[str] = None,
    created_at: Optional[datetime] = None,
    user_description: Optional[str] = None
) -> Dict[str, Any]:
    """Calculate deterministic risk priority using the 5-factor project formula:
    Risk = 0.35*Severity + 0.25*Exposure + 0.20*Criticality + 0.10*Hazard + 0.10*TimeUnresolved
    All normalized 0-100.
    """
    desc = (user_description or "").lower()
    loc = (address_or_location_name or "").lower()
    
    # 1. Severity Score (0-100)
    sev_map = {"high": 90.0, "medium": 55.0, "low": 25.0}
    severity_score = sev_map.get(visible_severity.lower(), 50.0)
    if "pothole" in category.lower() and severity_score >= 80:
        severity_score = min(100.0, severity_score + 10.0)

    # 2. Road-user Exposure (0-100)
    # Arterial highways, Ring Roads, major flyovers vs residential lanes
    exposure_score = 45.0
    if any(k in loc or k in desc for k in ["outer ring road", "orr", "highway", "bellary road", "hosur road", "flyover", "mg road"]):
        exposure_score = 95.0
    elif any(k in loc or k in desc for k in ["main road", "100ft road", "80ft road", "avenue", "junction", "signal", "circle"]):
        exposure_score = 75.0
    elif any(k in loc or k in desc for k in ["cross", "layout", "residential", "lane", "colony", "apartment"]):
        exposure_score = 30.0

    # 3. Context Criticality (0-100)
    # Sensitivity: near schools, hospitals, bus stations, metro stations, vulnerable pedestrian crossings
    criticality_score = 35.0
    if any(k in loc or k in desc for k in ["hospital", "emergency", "school", "college", "kindergarten", "clinic"]):
        criticality_score = 95.0
    elif any(k in loc or k in desc for k in ["metro station", "bus stand", "railway", "temple", "market"]):
        criticality_score = 80.0
    elif any(k in loc or k in desc for k in ["junction", "intersection", "turning"]):
        criticality_score = 65.0

    # 4. Hazard Likelihood (0-100)
    # Position, depth, standing water, blind spot, obstruction
    hazard_score = 40.0
    if any(k in desc for k in ["water", "flooded", "rain", "rainwater", "hidden", "blind spot", "night", "dark"]):
        hazard_score = 90.0
    elif any(k in desc for k in ["deep", "sharp", "edge", "center lane", "motorcycle", "two wheeler", "swerve"]):
        hazard_score = 80.0
    elif any(k in desc for k in ["shallow", "side of road", "footpath", "curb"]):
        hazard_score = 25.0

    # 5. Time Unresolved (0-100)
    # Days elapsed since observation
    time_score = 15.0
    now = datetime.now(timezone.utc)
    if created_at:
        created_tz = created_at.replace(tzinfo=timezone.utc) if created_at.tzinfo is None else created_at
        hours_open = max(0.0, (now - created_tz).total_seconds() / 3600.0)
        # 0 hours = 10, 24 hours = 35, 7 days (168h) = 70, 14+ days = 100
        time_score = min(100.0, 10.0 + (hours_open / 168.0) * 60.0)

    # Calculate weighted contributions
    w_sev = settings.RISK_WEIGHT_SEVERITY
    w_exp = settings.RISK_WEIGHT_EXPOSURE
    w_crit = settings.RISK_WEIGHT_CRITICALITY
    w_haz = settings.RISK_WEIGHT_HAZARD
    w_time = settings.RISK_WEIGHT_TIME_UNRESOLVED

    c_sev = round(severity_score * w_sev, 2)
    c_exp = round(exposure_score * w_exp, 2)
    c_crit = round(criticality_score * w_crit, 2)
    c_haz = round(hazard_score * w_haz, 2)
    c_time = round(time_score * w_time, 2)

    total_risk = round(c_sev + c_exp + c_crit + c_haz + c_time, 1)

    # Emergency escalation check
    emergency_escalation = False
    if severity_score >= 85.0 and (exposure_score >= 75.0 or criticality_score >= 80.0):
        emergency_escalation = True
        total_risk = max(total_risk, 88.0)

    # Detailed explanation
    explanation_parts = []
    if emergency_escalation:
        explanation_parts.append("EMERGENCY ESCALATION: High physical severity situated on a high-exposure arterial route or critical zone.")
    if severity_score >= 80.0:
        explanation_parts.append(f"Significant physical hazard ({int(severity_score)}/100).")
    if exposure_score >= 70.0:
        explanation_parts.append(f"High commuter traffic exposure on corridor ({int(exposure_score)}/100).")
    if criticality_score >= 70.0:
        explanation_parts.append(f"Located near critical urban infrastructure or school/hospital zone ({int(criticality_score)}/100).")
    if hazard_score >= 70.0:
        explanation_parts.append("Environmental factors (e.g. water accumulation or blind swerving) heighten collision risk.")
    if time_score >= 60.0:
        explanation_parts.append(f"Incident has remained unresolved for an extended duration ({int(time_score)}/100).")
    if not explanation_parts:
        explanation_parts.append("Standard priority road surface maintenance candidate.")

    recommendation = "Dispatch inspection team for urgent on-site field validation." if total_risk >= 75.0 else (
        "Queue for regular scheduled municipal maintenance cycle." if total_risk >= 45.0 else "Monitor for further corroboration or degradation."
    )

    return {
        "risk_score": total_risk,
        "recommendation": recommendation,
        "breakdown": {
            "severity_score": severity_score,
            "severity_contribution": c_sev,
            "exposure_score": exposure_score,
            "exposure_contribution": c_exp,
            "criticality_score": criticality_score,
            "criticality_contribution": c_crit,
            "hazard_score": hazard_score,
            "hazard_contribution": c_haz,
            "time_unresolved_score": time_score,
            "time_unresolved_contribution": c_time,
            "emergency_escalation": emergency_escalation,
            "formula_version": "1.0",
            "explanation": " ".join(explanation_parts)
        }
    }

