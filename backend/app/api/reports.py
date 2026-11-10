import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user_optional
from app.core.config import settings
from app.models.user import User
from app.models.incident import Incident
from app.models.observation import Observation
from app.models.location import LocationObservation
from app.models.evidence_asset import EvidenceAsset
from app.models.assessment import Assessment
from app.models.incident_link import IncidentLink
from app.models.audit_event import AuditEvent
from app.services.exif_parser import extract_exif_metadata
from app.services.geocoding import reverse_geocode
from app.services.geoproof import process_intake_image, compute_sha256
from app.services.image_analysis import analyze_defect_image
from app.services.duplicate_detector import find_duplicate_candidates
from app.services.evidence_verifier import evaluate_evidence
from app.services.risk_calculator import calculate_incident_risk
from app.schemas.report import ReportSubmissionResponse, GeoProofAnalysisResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports & Intake"])

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB

@router.get("/demo-sample/{sample_type}")
def get_demo_sample_image(sample_type: str, db: Session = Depends(get_db)):
    """Provide downloadable synthetic demonstration images for fast evaluator testing."""
    from app.services.geoproof import process_intake_image
    from PIL import Image, ImageDraw
    import io
    from fastapi.responses import Response

    w, h = 800, 600
    img = Image.new("RGB", (w, h), (55, 65, 75))
    draw = ImageDraw.Draw(img)

    # Road asphalt lines
    draw.line([(0, h // 2 - 80), (w, h // 2 - 80)], fill=(234, 179, 8, 160), width=8)

    if sample_type == "crack":
        draw.line([(250, 250), (320, 280), (450, 260), (520, 310)], fill=(15, 23, 42), width=4)
    else:
        # Pothole
        draw.ellipse([330, 240, 470, 340], fill=(15, 23, 42))
        draw.ellipse([350, 260, 450, 320], fill=(2, 6, 23))
        if sample_type == "pothole_gps":
            draw.ellipse([380, 275, 420, 295], fill=(30, 58, 138))

    buf = io.BytesIO()
    # If sample_type == 'pothole_gps', embed EXIF GPS tags!
    if sample_type == "pothole_gps":
        # Use Pillow Image.Exif
        exif = img.getexif()
        # GPS IFD
        gps_ifd = {
            1: 'N',  # GPSLatitudeRef
            2: ((12, 1), (58, 1), (234, 10)),  # 12.9731° N
            3: 'E',  # GPSLongitudeRef
            4: ((77, 1), (38, 1), (552, 10)),  # 77.6486° E (Indiranagar)
            29: "2026:11:03 10:42:00"
        }
        exif[34853] = gps_ifd
        exif[306] = "2026:11:03 10:42:00"  # DateTime
        img.save(buf, format="JPEG", quality=95, exif=exif)
    else:
        # Plain JPEG with no GPS
        img.save(buf, format="JPEG", quality=95)

    return Response(content=buf.getvalue(), media_type="image/jpeg")

@router.post("/analyze-metadata", response_model=GeoProofAnalysisResponse)
async def analyze_uploaded_photo_metadata(
    image: UploadFile = File(...)
):
    """Pre-intake preview endpoint: extracts EXIF GPS and timestamp claims before final submission."""
    file_bytes = await image.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image exceeds maximum 15MB file size.")
    
    sha256 = compute_sha256(file_bytes)
    
    import io
    exif = extract_exif_metadata(io.BytesIO(file_bytes))
    
    readable_addr = None
    if exif.latitude and exif.longitude:
        readable_addr = await reverse_geocode(exif.latitude, exif.longitude)
        
    evidence_quality = "high" if (exif.latitude and exif.claimed_capture_time) else ("medium" if exif.latitude else "low")
    warning = None
    if not exif.has_exif:
        warning = "No EXIF metadata detected in image (metadata may have been stripped by messaging apps)."
    elif not exif.latitude:
        warning = "EXIF data present, but GPS coordinates were not embedded by the camera."

    return GeoProofAnalysisResponse(
        has_exif=exif.has_exif,
        exif_gps_found=bool(exif.latitude and exif.longitude),
        latitude=exif.latitude,
        longitude=exif.longitude,
        source="photo_exif" if exif.latitude else "none",
        accuracy_m=None,
        readable_address=readable_addr,
        photo_capture_claimed_at=exif.claimed_capture_time,
        evidence_quality=evidence_quality,
        warning=warning,
        sha256_hash=sha256
    )

@router.post("", response_model=ReportSubmissionResponse)
async def submit_report(
    image: UploadFile = File(...),
    capture_mode: str = Form("gallery"),  # gallery, camera
    description: Optional[str] = Form(None),
    device_latitude: Optional[float] = Form(None),
    device_longitude: Optional[float] = Form(None),
    device_accuracy_m: Optional[float] = Form(None),
    user_selected_latitude: Optional[float] = Form(None),
    user_selected_longitude: Optional[float] = Form(None),
    submitted_by: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Full CivicPulse intake pipeline: EXIF, GeoProof, AI triage, duplicate detection, risk scoring."""
    file_bytes = await image.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (Max: 15MB).")

    # 1. Parse EXIF
    import io
    exif = extract_exif_metadata(io.BytesIO(file_bytes))
    
    # 2. Determine Location & Provenance
    latitude = None
    longitude = None
    accuracy_m = None
    location_source = "unknown"
    is_user_corrected = False

    if user_selected_latitude is not None and user_selected_longitude is not None:
        latitude = user_selected_latitude
        longitude = user_selected_longitude
        location_source = "manual_map_pin"
        is_user_corrected = True
        accuracy_m = 15.0
    elif capture_mode == "camera" and device_latitude is not None and device_longitude is not None:
        latitude = device_latitude
        longitude = device_longitude
        accuracy_m = device_accuracy_m or 10.0
        location_source = "device_gps_at_capture"
    elif exif.latitude is not None and exif.longitude is not None:
        latitude = exif.latitude
        longitude = exif.longitude
        location_source = "photo_exif"
        accuracy_m = None
    elif device_latitude is not None and device_longitude is not None:
        # Gallery photo with no EXIF: uploader provided device location at time of submission
        latitude = device_latitude
        longitude = device_longitude
        accuracy_m = device_accuracy_m or 25.0
        location_source = "device_gps_at_submission"
    
    location_status = "recorded" if (latitude and longitude) else "pending"

    # 3. Reverse Geocode Location
    readable_address = None
    if latitude and longitude:
        readable_address = await reverse_geocode(latitude, longitude)

    # 4. Generate Identifiers
    count_inc = db.query(Incident).count() + 1001
    incident_num = f"INF-{count_inc}"
    obs_num = f"REP-{count_inc}"

    # 5. Process Image & GeoProof Watermark
    time_claim = exif.claimed_capture_time or datetime.now(timezone.utc)
    time_label = "Captured" if exif.claimed_capture_time else "Submitted"
    
    intake_asset = process_intake_image(
        file_bytes=file_bytes,
        incident_number=incident_num,
        readable_address=readable_address,
        latitude=latitude,
        longitude=longitude,
        location_source=location_source,
        accuracy_m=accuracy_m,
        timestamp=time_claim,
        time_label=time_label,
        verification_status="Unverified"
    )

    # 6. AI Image Analysis
    ai_result = await analyze_defect_image(
        image_bytes=file_bytes,
        description=description,
        image_dims=(intake_asset["width"], intake_asset["height"])
    )
    defect_category = ai_result.get("category", "pothole")
    visible_severity = ai_result.get("visible_severity", "medium")

    # 7. Multi-Factor Duplicate Detection
    duplicate_matches = find_duplicate_candidates(
        db=db,
        latitude=latitude,
        longitude=longitude,
        accuracy_m=accuracy_m,
        sha256=intake_asset["sha256"],
        perceptual_hash=intake_asset["perceptual_hash"],
        category=defect_category,
        description=description,
        max_search_distance_m=100.0
    )

    # 8. Calculate Risk Priority
    risk_info = calculate_incident_risk(
        category=defect_category,
        visible_severity=visible_severity,
        address_or_location_name=readable_address,
        created_at=time_claim,
        user_description=description
    )

    # Determine initial operational status
    initial_status = "candidate"
    if location_status == "pending":
        initial_status = "needs_location"
    elif duplicate_matches and duplicate_matches[0].score >= 0.75:
        initial_status = "needs_review"  # Flag for review due to strong duplicate candidate
    elif risk_info["breakdown"]["emergency_escalation"]:
        initial_status = "needs_review"

    # Reporter identity
    author_name = current_user.full_name if current_user else (submitted_by or "Anonymous Contributor")

    # 9. Create DB Entities
    incident = Incident(
        incident_number=incident_num,
        title=f"{defect_category.replace('_', ' ').title()} at {readable_address or 'Bengaluru'}",
        description=description or ai_result.get("visual_evidence", "Infrastructure road defect reported."),
        category=defect_category,
        current_status=initial_status,
        latitude=latitude,
        longitude=longitude,
        readable_address=readable_address,
        location_source=location_source,
        location_accuracy_m=accuracy_m,
        location_verified=False,
        risk_score=risk_info["risk_score"],
        risk_breakdown=risk_info["breakdown"],
        evidence_confidence="low" if location_status == "pending" else "medium",
        evidence_confidence_score=35.0 if location_status == "pending" else 60.0,
        priority_recommendation=risk_info["recommendation"]
    )
    db.add(incident)
    db.flush()

    observation = Observation(
        incident_id=incident.id,
        observation_number=obs_num,
        source_type="field_inspector" if (current_user and current_user.role == "field_inspector") else ("citizen_mobile" if capture_mode == "camera" else "gallery_upload"),
        capture_mode=capture_mode,
        description=description,
        observed_at=exif.claimed_capture_time,
        submitted_by=author_name,
        processing_status="completed"
    )
    db.add(observation)
    db.flush()

    # Save Location record
    if latitude and longitude:
        loc_obs = LocationObservation(
            observation_id=observation.id,
            incident_id=incident.id,
            latitude=latitude,
            longitude=longitude,
            accuracy_m=accuracy_m,
            source=location_source,
            collected_at=datetime.now(timezone.utc),
            is_user_corrected=is_user_corrected,
            readable_address=readable_address,
            verified=False
        )
        db.add(loc_obs)

    # Save Evidence Asset
    asset = EvidenceAsset(
        observation_id=observation.id,
        incident_id=incident.id,
        original_path=intake_asset["original_path"],
        annotated_path=intake_asset["annotated_path"],
        thumbnail_path=intake_asset["thumbnail_path"],
        sha256=intake_asset["sha256"],
        perceptual_hash=intake_asset["perceptual_hash"],
        mime_type=image.content_type or "image/jpeg",
        width=intake_asset["width"],
        height=intake_asset["height"],
        file_size=intake_asset["file_size"],
        exif_data=exif.raw_exif,
        is_repair_evidence=False
    )
    db.add(asset)

    # Save AI Assessment
    assessment = Assessment(
        observation_id=observation.id,
        incident_id=incident.id,
        model_name=ai_result.get("model_name", "gemini-3.8-flash"),
        model_version=ai_result.get("model_version", "1.0.0"),
        structured_output=ai_result,
        is_fallback=ai_result.get("is_fallback", False)
    )
    db.add(assessment)

    # Save Duplicate Candidates as IncidentLinks
    dup_found = False
    dup_id = None
    dup_reason = None
    if duplicate_matches:
        top_match = duplicate_matches[0]
        dup_found = True
        dup_id = top_match.incident.incident_number
        dup_reason = "; ".join(top_match.reasons)
        
        for match in duplicate_matches[:3]:
            link = IncidentLink(
                from_incident_id=incident.id,
                to_incident_id=match.incident.id,
                relation_type="possible_duplicate_of",
                score=match.score,
                reason="; ".join(match.reasons),
                status="candidate",
                created_by="CivicPulse Duplicate Correlation Engine"
            )
            db.add(link)

    # Re-evaluate evidence confidence with relations
    db.flush()
    evidence_eval = evaluate_evidence(incident)
    incident.evidence_confidence = evidence_eval["confidence_level"]
    incident.evidence_confidence_score = evidence_eval["confidence_score"]

    # Audit event
    audit = AuditEvent(
        incident_id=incident.id,
        actor=author_name,
        actor_role=current_user.role if current_user else "citizen",
        action="REPORT_INTAKE_SUBMISSION",
        previous_state=None,
        new_state=initial_status,
        reason="Report submitted via public portal and processed through GeoProof intake pipeline.",
        details={
            "sha256": intake_asset["sha256"],
            "location_source": location_source,
            "has_exif": exif.has_exif,
            "risk_score": incident.risk_score
        }
    )
    db.add(audit)
    db.commit()

    return ReportSubmissionResponse(
        report_id=observation.id,
        report_number=obs_num,
        incident_id=incident.id,
        incident_number=incident_num,
        processing_status="completed",
        category=defect_category,
        status=incident.current_status,
        location_source=location_source,
        location_status=location_status,
        latitude=latitude,
        longitude=longitude,
        readable_address=readable_address,
        photo_capture_claimed_at=exif.claimed_capture_time,
        submitted_at=observation.submitted_at,
        sha256=intake_asset["sha256"],
        original_asset_url=f"/api/evidence/{asset.id}/original",
        annotated_asset_url=f"/api/evidence/{asset.id}/annotated",
        duplicate_candidate_found=dup_found,
        duplicate_candidate_id=dup_id,
        duplicate_reason=dup_reason,
        risk_score=incident.risk_score,
        evidence_confidence=incident.evidence_confidence,
        message=f"Report {obs_num} received and indexed as Incident {incident_num}."
    )

