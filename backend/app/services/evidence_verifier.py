import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.models.incident import Incident
from app.models.evidence_asset import EvidenceAsset

logger = logging.getLogger(__name__)

def evaluate_evidence(incident: Incident) -> Dict[str, Any]:
    """Evaluate multidimensional evidence confidence and suggested verification status."""
    observations = incident.observations or []
    assets = incident.evidence_assets or []
    locations = incident.location_observations or []
    
    unique_hashes = set()
    distinct_sources = set()
    has_exif_gps = False
    has_device_gps = False
    has_inspector_verification = False
    has_repair_claim = False
    has_repair_asset = False
    is_stale = False
    
    now = datetime.now(timezone.utc)
    
    for loc in locations:
        if loc.source == "inspector_confirmed" or loc.verified:
            has_inspector_verification = True
        elif loc.source == "photo_exif":
            has_exif_gps = True
        elif loc.source in ["device_gps_at_capture", "device_gps_at_submission"]:
            has_device_gps = True

    for obs in observations:
        if obs.submitted_by:
            distinct_sources.add(obs.submitted_by)
        if obs.observed_at:
            obs_tz = obs.observed_at.replace(tzinfo=timezone.utc) if obs.observed_at.tzinfo is None else obs.observed_at
            if (now - obs_tz) > timedelta(days=90):
                is_stale = True

    for ast in assets:
        if ast.sha256:
            unique_hashes.add(ast.sha256)
        if ast.is_repair_evidence:
            has_repair_asset = True

    # Check work orders
    for wo in (incident.work_orders or []):
        if wo.status in ["repair_claimed", "verified_complete"]:
            has_repair_claim = True

    # 1. Calculate Evidence Confidence Score (0 to 100)
    confidence_score = 20.0  # Base for having a report
    explanation_parts = []
    
    # Visual check
    if assets:
        confidence_score += 15.0
        explanation_parts.append(f"{len(assets)} photographic asset(s) on record")

    # Location provenance check
    if has_inspector_verification:
        confidence_score += 35.0
        explanation_parts.append("Field inspector physically verified location")
    elif has_exif_gps:
        confidence_score += 25.0
        explanation_parts.append("Original photo EXIF GPS metadata present")
    elif has_device_gps:
        confidence_score += 20.0
        explanation_parts.append("Device GPS recorded at submission/capture")
    elif incident.latitude and incident.longitude:
        confidence_score += 10.0
        explanation_parts.append("User-selected map pin location")
    else:
        explanation_parts.append("Location unconfirmed / missing")

    # Independence and Corroboration check
    num_independent_obs = min(len(observations), len(unique_hashes), len(distinct_sources) if distinct_sources else 1)
    if num_independent_obs >= 3:
        confidence_score += 25.0
        explanation_parts.append(f"{num_independent_obs} independent citizen reports corroborate this defect")
    elif num_independent_obs == 2:
        confidence_score += 15.0
        explanation_parts.append("2 independent observations corroborate this defect")
    elif len(observations) > 1 and len(unique_hashes) == 1:
        explanation_parts.append("Warning: Repeated uploads of the exact same photograph detected (not independent corroboration)")

    confidence_score = min(100.0, max(0.0, confidence_score))
    
    if confidence_score >= 70.0:
        confidence_level = "high"
    elif confidence_score >= 40.0:
        confidence_level = "medium"
    else:
        confidence_level = "low"

    # 2. Determine Evidence State & Recommendation
    recommended_status = incident.current_status
    if incident.current_status in ["closed", "rejected"]:
        recommended_status = incident.current_status
    elif has_repair_claim or has_repair_asset:
        if has_inspector_verification and incident.current_status == "resolution_verified":
            recommended_status = "resolution_verified"
        else:
            recommended_status = "resolution_pending_review"
    elif has_inspector_verification:
        recommended_status = "field_verified"
    elif is_stale:
        recommended_status = "needs_review"
        explanation_parts.append("Defect observation is over 90 days old (stale evidence)")
    elif num_independent_obs >= 2 and incident.current_status in ["candidate", "needs_review"]:
        recommended_status = "corroborated"
    elif not incident.latitude or not incident.longitude:
        recommended_status = "needs_location"

    return {
        "confidence_level": confidence_level,
        "confidence_score": round(confidence_score, 1),
        "recommended_status": recommended_status,
        "independent_observations_count": num_independent_obs,
        "is_stale": is_stale,
        "explanation": "; ".join(explanation_parts)
    }

