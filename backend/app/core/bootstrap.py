import io
import logging
import random
import threading
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageDraw
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.incident import Incident
from app.models.observation import Observation
from app.models.location import LocationObservation
from app.models.evidence_asset import EvidenceAsset
from app.models.assessment import Assessment
from app.models.incident_link import IncidentLink
from app.models.work_order import WorkOrder
from app.models.audit_event import AuditEvent
from app.services.geoproof import process_intake_image
from app.services.image_analysis import compute_cv_image_analysis
from app.services.resolution_comparator import compare_before_after_repair
from app.services.risk_calculator import calculate_incident_risk

logger = logging.getLogger(__name__)
_init_lock = threading.Lock()
_initialized = False

SYNTHETIC_AUTHOR = "SYNTHETIC DEMO DATA — NOT LIVE MUNICIPAL REPORTS"


def create_synthetic_road_image(category: str, severity: str, seed: int = 42) -> bytes:
    """Generate a realistic synthetic pavement defect texture for testing."""
    rng = random.Random(seed)
    w, h = 800, 600
    base_color = (rng.randint(45, 60), rng.randint(55, 70), rng.randint(65, 80))
    img = Image.new("RGB", (w, h), base_color)
    draw = ImageDraw.Draw(img)

    for _ in range(3000):
        nx = rng.randint(0, w - 1)
        ny = rng.randint(0, h - 1)
        gray_tint = rng.randint(30, 95)
        draw.point((nx, ny), fill=(gray_tint, gray_tint, gray_tint))

    draw.line([(0, h // 2 - 80), (w, h // 2 - 80)], fill=(234, 179, 8, 160), width=8)

    cx, cy = w // 2 + rng.randint(-40, 40), h // 2 + rng.randint(-20, 20)

    if category == "pothole":
        r = 75 if severity == "high" else (45 if severity == "medium" else 25)
        draw.ellipse([cx - r, cy - int(r * 0.7), cx + r, cy + int(r * 0.7)], fill=(15, 23, 42))
        draw.ellipse([cx - r + 8, cy - int(r * 0.7) + 6, cx + r - 8, cy + int(r * 0.7) - 6], fill=(2, 6, 23))
        if severity == "high":
            draw.ellipse([cx - 20, cy - 10, cx + 25, cy + 12], fill=(30, 58, 138))
        for _ in range(12):
            ox = cx + rng.randint(-r - 10, r + 10)
            oy = cy + rng.randint(-int(r * 0.7) - 8, int(r * 0.7) + 8)
            draw.rectangle([ox, oy, ox + rng.randint(4, 10), oy + rng.randint(4, 8)], fill=(30, 41, 59))
    elif category == "road_crack":
        points = [(cx - 150, cy - 80)]
        cur_x, cur_y = points[0]
        for _ in range(10):
            cur_x += rng.randint(20, 40)
            cur_y += rng.randint(-15, 20)
            points.append((cur_x, cur_y))
        draw.line(points, fill=(15, 23, 42), width=4 if severity == "high" else 2)
        for pt in points[2:8:2]:
            draw.line([pt, (pt[0] + rng.randint(15, 35), pt[1] + rng.randint(15, 30))], fill=(15, 23, 42), width=2)
    elif category == "manhole_depression":
        draw.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], outline=(100, 116, 139), width=8, fill=(30, 41, 59))
        draw.line([cx - 50, cy, cx + 50, cy], fill=(100, 116, 139), width=3)
        draw.line([cx, cy - 50, cx, cy + 50], fill=(100, 116, 139), width=3)
    else:
        for _ in range(80):
            rx = cx + rng.randint(-120, 120)
            ry = cy + rng.randint(-70, 70)
            draw.rectangle([rx, ry, rx + rng.randint(6, 18), ry + rng.randint(6, 18)], fill=(30, 41, 59))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def create_synthetic_repaired_road_image(seed: int = 42) -> bytes:
    """Generate a synthetic patched/restored asphalt surface for before/after repair comparison."""
    rng = random.Random(seed + 999)
    w, h = 800, 600
    base_color = (rng.randint(52, 65), rng.randint(60, 72), rng.randint(68, 82))
    img = Image.new("RGB", (w, h), base_color)
    draw = ImageDraw.Draw(img)

    for _ in range(2500):
        nx = rng.randint(0, w - 1)
        ny = rng.randint(0, h - 1)
        gray_tint = rng.randint(45, 78)
        draw.point((nx, ny), fill=(gray_tint, gray_tint, gray_tint))

    draw.line([(0, h // 2 - 80), (w, h // 2 - 80)], fill=(234, 179, 8, 170), width=8)
    # Neat compacted hot-mix patch rectangle at former defect site
    cx, cy = w // 2, h // 2
    draw.rounded_rectangle([cx - 105, cy - 75, cx + 105, cy + 75], radius=12, fill=(58, 66, 76), outline=(82, 92, 104), width=3)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


DEMO_SCENARIOS = [
    {
        "num": "INF-1001",
        "title": "Severe Pothole on Outer Ring Road Near Bellandur Junction",
        "category": "pothole",
        "severity": "high",
        "status": "needs_review",
        "lat": 12.9298,
        "lon": 77.6835,
        "addr": "Outer Ring Road, Bellandur Junction, Bengaluru",
        "source": "photo_exif",
        "acc": 8.0,
        "desc": "Deep hazardous crater in center bus lane. Water accumulating after evening shower. Two-wheelers swerving violently.",
        "days_ago": 1,
        "team": "BBMP Mahadevapura Division",
        "seed": 101,
    },
    {
        "num": "INF-1002",
        "title": "Large Depression on Bellandur ORR Flyover Ramp",
        "category": "pothole",
        "severity": "high",
        "status": "needs_review",
        "lat": 12.9304,
        "lon": 77.6841,
        "addr": "Outer Ring Road, Flyover Approach, Bellandur, Bengaluru",
        "source": "device_gps_at_capture",
        "acc": 12.0,
        "desc": "Big crater 20 meters past the flyover entrance. Extremely risky for bikes during rush hour traffic.",
        "days_ago": 1,
        "team": "BBMP Mahadevapura Division",
        "seed": 102,
        "duplicate_of": "INF-1001",
    },
    {
        "num": "INF-1003",
        "title": "Third Citizen Notice: Bellandur Road Pit",
        "category": "pothole",
        "severity": "high",
        "status": "corroborated",
        "lat": 12.9299,
        "lon": 77.6838,
        "addr": "Outer Ring Road, Near Ecospace, Bellandur, Bengaluru",
        "source": "manual_map_pin",
        "acc": 15.0,
        "desc": "Pothole causing massive traffic backup towards Marathahalli.",
        "days_ago": 2,
        "team": "BBMP Mahadevapura Division",
        "seed": 101,
        "identical_to": "INF-1001",
    },
    {
        "num": "INF-1004",
        "title": "Deep Pavement Void Near Columbia Asia Hospital",
        "category": "pothole",
        "severity": "high",
        "status": "field_verified",
        "lat": 13.0182,
        "lon": 77.5891,
        "addr": "Bellary Road, Near Aster CMI / Columbia Asia, Hebbal, Bengaluru",
        "source": "inspector_confirmed",
        "acc": 4.0,
        "desc": "Major pothole directly on ambulance route outside hospital gate. High emergency priority.",
        "days_ago": 3,
        "team": "NHAI / BBMP North Corridor Team",
        "seed": 104,
    },
    {
        "num": "INF-1005",
        "title": "Alligator Cracking Along Indiranagar 100ft Road",
        "category": "road_crack",
        "severity": "medium",
        "status": "assigned",
        "lat": 12.9712,
        "lon": 77.6418,
        "addr": "100 Feet Road, 12th Main Junction, Indiranagar, Bengaluru",
        "source": "device_gps_at_capture",
        "acc": 9.0,
        "desc": "Surface structural fatigue crack spanning 8 meters along left gutter line.",
        "days_ago": 5,
        "team": "BBMP East Division - Indiranagar Ward",
        "seed": 105,
    },
    {
        "num": "INF-1006",
        "title": "Sunken Manhole Chamber on Koramangala 80ft Road",
        "category": "manhole_depression",
        "severity": "high",
        "status": "in_progress",
        "lat": 12.9354,
        "lon": 77.6241,
        "addr": "80 Feet Road, 4th Block, Koramangala, Bengaluru",
        "source": "photo_exif",
        "acc": 6.0,
        "desc": "BWSSB manhole chamber sunken 12cm below asphalt grade. Creates severe axle impact.",
        "days_ago": 6,
        "team": "BWSSB / BBMP Joint Taskforce",
        "seed": 106,
    },
    {
        "num": "INF-1007",
        "title": "Pothole Repaired at Whitefield Hope Farm Circle",
        "category": "pothole",
        "severity": "medium",
        "status": "repair_claimed",
        "lat": 12.9842,
        "lon": 77.7511,
        "addr": "Channasandra Main Road, Hope Farm, Whitefield, Bengaluru",
        "source": "device_gps_at_submission",
        "acc": 14.0,
        "desc": "Contractor claims cold-mix patching completed. After-evidence photo uploaded for audit.",
        "days_ago": 7,
        "team": "Shiva Infratech Ltd.",
        "seed": 107,
        "has_repair_claim": True,
    },
    {
        "num": "INF-1008",
        "title": "Restored Surface at MG Road Metro Station",
        "category": "pothole",
        "severity": "low",
        "status": "closed",
        "lat": 12.9754,
        "lon": 77.6067,
        "addr": "Mahatma Gandhi Road, Near Trinity Metro, Bengaluru",
        "source": "inspector_confirmed",
        "acc": 5.0,
        "desc": "Surface restored with hot asphalt mix. Field checked by Assistant Executive Engineer.",
        "days_ago": 12,
        "team": "BBMP Central Road Division",
        "seed": 108,
        "closed": True,
    },
    {
        "num": "INF-1009",
        "title": "Missing Location Pin: Reported Road Defect",
        "category": "surface_damage",
        "severity": "medium",
        "status": "needs_location",
        "lat": None,
        "lon": None,
        "addr": "Location Unspecified (Photo EXIF stripped)",
        "source": "unknown",
        "acc": None,
        "desc": "Asphalt ravelling along an unknown side street. Contributor denied location access.",
        "days_ago": 2,
        "team": "Unassigned",
        "seed": 109,
    },
    {
        "num": "INF-1010",
        "title": "Old Gallery Upload: Stale Observation From Rainy Season",
        "category": "pothole",
        "severity": "medium",
        "status": "needs_review",
        "lat": 13.1007,
        "lon": 77.5963,
        "addr": "Major Sandeep Unnikrishnan Road, Yelahanka New Town, Bengaluru",
        "source": "photo_exif",
        "acc": 18.0,
        "desc": "Photo taken 110 days ago uploaded from user gallery. Stale evidence flag triggered.",
        "days_ago": 110,
        "team": "BBMP Yelahanka Division",
        "seed": 110,
    },
    {
        "num": "INF-1011",
        "title": "Deep Pothole at Silk Board Junction Flyover Underpass",
        "category": "pothole",
        "severity": "high",
        "status": "assigned",
        "lat": 12.9175,
        "lon": 77.6234,
        "addr": "Central Silk Board Junction, Hosur Road, Bengaluru",
        "source": "photo_exif",
        "acc": 7.0,
        "desc": "Crucial bottleneck area. Substantial pothole in turning radius toward Electronic City.",
        "days_ago": 3,
        "team": "BMRCL / BBMP Road Cell",
        "seed": 111,
    },
    {
        "num": "INF-1012",
        "title": "Transverse Pavement Fissure in Malleshwaram",
        "category": "road_crack",
        "severity": "low",
        "status": "candidate",
        "lat": 13.0068,
        "lon": 77.5713,
        "addr": "15th Cross Road, Malleshwaram, Bengaluru",
        "source": "device_gps_at_capture",
        "acc": 11.0,
        "desc": "Minor crack across residential street. Low immediate traffic consequence.",
        "days_ago": 4,
        "team": "BBMP West Division",
        "seed": 112,
    },
    {
        "num": "INF-1013",
        "title": "Asphalt Ravelling on Electronic City Expressway Slip Road",
        "category": "surface_damage",
        "severity": "medium",
        "status": "in_progress",
        "lat": 12.8452,
        "lon": 77.6631,
        "addr": "Hosur Road, Electronic City Phase 1, Bengaluru",
        "source": "device_gps_at_submission",
        "acc": 16.0,
        "desc": "Loose gravel and eroded bitumen causing skidding risks for two-wheelers.",
        "days_ago": 5,
        "team": "BETL Road Maintenance",
        "seed": 113,
    },
    {
        "num": "INF-1014",
        "title": "Wide Longitudinal Crack Near National College Metro",
        "category": "road_crack",
        "severity": "medium",
        "status": "corroborated",
        "lat": 12.9512,
        "lon": 77.5732,
        "addr": "Vanivilas Road, Basavanagudi, Bengaluru",
        "source": "photo_exif",
        "acc": 9.0,
        "desc": "Expanding crack along bus route. Multiple residents reported.",
        "days_ago": 4,
        "team": "BBMP South Division",
        "seed": 114,
    },
    {
        "num": "INF-1015",
        "title": "Severe Edge Drop-Off Near Jayanagar 4th Block Complex",
        "category": "surface_damage",
        "severity": "high",
        "status": "needs_review",
        "lat": 12.9287,
        "lon": 77.5834,
        "addr": "11th Main Road, 4th Block, Jayanagar, Bengaluru",
        "source": "device_gps_at_capture",
        "acc": 8.0,
        "desc": "Sharp 10cm edge drop between asphalt and stormwater drain cover.",
        "days_ago": 2,
        "team": "BBMP South Division",
        "seed": 115,
    },
    {
        "num": "INF-1016",
        "title": "Multiple Surface Potholes on Hennur Main Road",
        "category": "pothole",
        "severity": "high",
        "status": "assigned",
        "lat": 13.0354,
        "lon": 77.6391,
        "addr": "Hennur Bagalur Main Road, Near Geddalahalli, Bengaluru",
        "source": "photo_exif",
        "acc": 10.0,
        "desc": "Cluster of 3 potholes right at pedestrian crossing.",
        "days_ago": 3,
        "team": "BBMP East Division",
        "seed": 116,
    },
    {
        "num": "INF-1017",
        "title": "Repaired Pothole Awaiting Audit at JP Nagar 24th Main",
        "category": "pothole",
        "severity": "medium",
        "status": "resolution_pending_review",
        "lat": 12.9082,
        "lon": 77.5874,
        "addr": "24th Main Road, JP Nagar 5th Phase, Bengaluru",
        "source": "inspector_confirmed",
        "acc": 6.0,
        "desc": "Patching performed on Friday. Requires supervisory engineering sign-off.",
        "days_ago": 6,
        "team": "BBMP South Division",
        "seed": 117,
        "has_repair_claim": True,
    },
    {
        "num": "INF-1018",
        "title": "Pavement Subsidence Near Banashankari Temple",
        "category": "surface_damage",
        "severity": "medium",
        "status": "candidate",
        "lat": 12.9254,
        "lon": 77.5752,
        "addr": "Kanakapura Road, Banashankari, Bengaluru",
        "source": "device_gps_at_capture",
        "acc": 12.0,
        "desc": "Depression forming around culvert structure.",
        "days_ago": 1,
        "team": "BBMP South Division",
        "seed": 118,
    },
    {
        "num": "INF-1019",
        "title": "Major Pothole on Marathahalli Bridge Descent",
        "category": "pothole",
        "severity": "high",
        "status": "needs_review",
        "lat": 12.9567,
        "lon": 77.7011,
        "addr": "Old Airport Road, Marathahalli Bridge, Bengaluru",
        "source": "photo_exif",
        "acc": 7.0,
        "desc": "Sharp pothole right at the bridge decline where vehicles accelerate.",
        "days_ago": 2,
        "team": "BBMP East Division",
        "seed": 119,
    },
    {
        "num": "INF-1020",
        "title": "Crack Pattern on Sarjapur Road Near Wipro Gate",
        "category": "road_crack",
        "severity": "low",
        "status": "closed",
        "lat": 12.9114,
        "lon": 77.6743,
        "addr": "Sarjapur Main Road, Doddakannelli, Bengaluru",
        "source": "inspector_confirmed",
        "acc": 5.0,
        "desc": "Crack seal slurry applied and cured. Resolution verified by zonal engineer.",
        "days_ago": 15,
        "team": "BBMP Mahadevapura Division",
        "seed": 120,
        "closed": True,
    },
]


def seed_database():
    """Populate database with demo users and 20 rich Bengaluru synthetic incidents."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Backfill CV metrics and repair evidence on existing synthetic records if needed
        existing_incs = db.query(Incident).all()
        if db.query(User).count() > 0 and len(existing_incs) >= 15:
            scenario_map = {s["num"]: s for s in DEMO_SCENARIOS}
            updated_existing = False
            for inc in existing_incs:
                sc = scenario_map.get(inc.incident_number)
                if not sc:
                    continue
                if inc.assessments and not inc.assessments[0].structured_output.get("vision_metrics"):
                    img_bytes = create_synthetic_road_image(sc["category"], sc["severity"], sc["seed"])
                    cv_res = compute_cv_image_analysis(img_bytes, sc["desc"])
                    out = dict(inc.assessments[0].structured_output or {})
                    out["detected_regions"] = cv_res.get("detected_regions", [])
                    out["vision_metrics"] = cv_res.get("vision_metrics", {})
                    out["analysis_source"] = cv_res.get("analysis_source")
                    inc.assessments[0].structured_output = out
                    updated_existing = True
                if (sc.get("has_repair_claim") or sc.get("closed")) and not any(a.is_repair_evidence for a in inc.evidence_assets):
                    before_bytes = create_synthetic_road_image(sc["category"], sc["severity"], sc["seed"])
                    after_bytes = create_synthetic_repaired_road_image(sc["seed"])
                    rep_intake = process_intake_image(
                        file_bytes=after_bytes,
                        incident_number=f"{sc['num']}-REPAIR",
                        readable_address=sc["addr"],
                        latitude=sc["lat"],
                        longitude=sc["lon"],
                        location_source="inspector_confirmed" if sc.get("closed") else "contractor_submission",
                        accuracy_m=6.0,
                        timestamp=inc.updated_at or now if 'now' in locals() else datetime.now(timezone.utc),
                        time_label="Repaired",
                        verification_status="Resolution Verified" if sc.get("closed") else "Pending Resolution Review",
                    )
                    rep_obs = Observation(
                        incident_id=inc.id,
                        observation_number=f"REP-REPAIR-{sc['num'][-4:]}",
                        source_type="contractor_repair_proof",
                        capture_mode="camera",
                        description="Post-repair compacted asphalt patching photograph.",
                        submitted_by=SYNTHETIC_AUTHOR,
                        processing_status="completed",
                    )
                    db.add(rep_obs)
                    db.flush()
                    db.add(EvidenceAsset(
                        observation_id=rep_obs.id,
                        incident_id=inc.id,
                        original_path=rep_intake["original_path"],
                        annotated_path=rep_intake["annotated_path"],
                        thumbnail_path=rep_intake["thumbnail_path"],
                        sha256=rep_intake["sha256"],
                        perceptual_hash=rep_intake["perceptual_hash"],
                        mime_type="image/jpeg",
                        width=rep_intake["width"],
                        height=rep_intake["height"],
                        file_size=rep_intake["file_size"],
                        is_repair_evidence=True,
                    ))
                    comp = compare_before_after_repair(before_bytes, after_bytes)
                    db.add(Assessment(
                        observation_id=rep_obs.id,
                        incident_id=inc.id,
                        model_name="CivicPulse-BeforeAfter-Comparator",
                        model_version="1.0.0",
                        structured_output={
                            "category": inc.category,
                            "visible_severity": "low",
                            "image_quality": "good",
                            "visual_evidence": comp["summary"],
                            "uncertainties": [comp["scene_consistency_note"]],
                            "needs_human_review": True,
                            "confidence_score": round(comp["visual_change_score"] / 100.0, 2),
                            "analysis_source": "before_after_cv_comparison",
                            "resolution_comparison": comp,
                        },
                        is_fallback=False,
                    ))
                    updated_existing = True
            if updated_existing:
                db.commit()
            return

        users = [
            User(
                email="admin@civicpulse.ai",
                hashed_password=get_password_hash("Admin@CivicPulse2026!"),
                full_name="Dr. Monish Kumar (Lead Director)",
                role="admin",
                organization="CivicPulse Operations HQ",
            ),
            User(
                email="operator@civicpulse.ai",
                hashed_password=get_password_hash("Operator@CivicPulse2026!"),
                full_name="Priya Sharma (Control Room Operator)",
                role="operator",
                organization="BBMP Central Triage Cell",
            ),
            User(
                email="inspector.kumar@bbmp.gov.in",
                hashed_password=get_password_hash("Inspector@CivicPulse2026!"),
                full_name="Ramesh Babu (Ward Inspector)",
                role="field_inspector",
                organization="BBMP Yelahanka Division",
            ),
            User(
                email="contractor@shiva-infratech.in",
                hashed_password=get_password_hash("Contractor@CivicPulse2026!"),
                full_name="Arjun Reddy (Site Supervisor)",
                role="contractor",
                organization="Shiva Infratech Ltd.",
            ),
            User(
                email="citizen@gmail.com",
                hashed_password=get_password_hash("Citizen@CivicPulse2026!"),
                full_name="Sunita Rao (Bengaluru Citizen)",
                role="citizen",
                organization="Citizen Contributor",
            ),
        ]
        for u in users:
            if not db.query(User).filter(User.email == u.email).first():
                db.add(u)
        db.commit()

        if db.query(Incident).count() >= 15:
            return

        created_incidents = {}
        now = datetime.now(timezone.utc)

        for idx, s in enumerate(DEMO_SCENARIOS):
            if db.query(Incident).filter(Incident.incident_number == s["num"]).first():
                continue

            created_time = now - timedelta(days=s["days_ago"], hours=(idx % 8) + 1)
            img_bytes = create_synthetic_road_image(s["category"], s["severity"], s["seed"])

            intake = process_intake_image(
                file_bytes=img_bytes,
                incident_number=s["num"],
                readable_address=s["addr"],
                latitude=s["lat"],
                longitude=s["lon"],
                location_source=s["source"],
                accuracy_m=s["acc"],
                timestamp=created_time,
                time_label="Captured" if s["source"] == "photo_exif" else "Reported",
                verification_status="Field Verified" if s["status"] in ["field_verified", "resolution_verified", "closed"] else "Unverified",
            )

            risk = calculate_incident_risk(
                category=s["category"],
                visible_severity=s["severity"],
                address_or_location_name=s["addr"],
                created_at=created_time,
                user_description=s["desc"],
            )

            inc = Incident(
                incident_number=s["num"],
                title=s["title"],
                description=s["desc"],
                category=s["category"],
                current_status=s["status"],
                latitude=s["lat"],
                longitude=s["lon"],
                readable_address=s["addr"],
                location_source=s["source"],
                location_accuracy_m=s["acc"],
                location_verified=s["status"] in ["field_verified", "resolution_verified", "closed"],
                risk_score=risk["risk_score"],
                risk_breakdown=risk["breakdown"],
                evidence_confidence="high" if s["status"] in ["field_verified", "corroborated", "closed"] else ("low" if s["source"] == "unknown" else "medium"),
                evidence_confidence_score=85.0 if s["status"] in ["field_verified", "corroborated"] else 55.0,
                priority_recommendation=risk["recommendation"],
                assigned_team=s["team"],
                created_at=created_time,
                updated_at=created_time + timedelta(hours=2),
                closed_at=created_time + timedelta(days=2) if s.get("closed") else None,
            )
            db.add(inc)
            db.flush()
            created_incidents[s["num"]] = inc

            obs = Observation(
                incident_id=inc.id,
                observation_number=f"REP-{s['num'][-4:]}",
                source_type="field_inspector" if s["source"] == "inspector_confirmed" else "citizen_mobile",
                capture_mode="gallery" if s["source"] in ["photo_exif", "unknown"] else "camera",
                description=s["desc"],
                observed_at=created_time,
                submitted_at=created_time + timedelta(minutes=15),
                submitted_by=SYNTHETIC_AUTHOR,
                processing_status="completed",
            )
            db.add(obs)
            db.flush()

            if s["lat"] and s["lon"]:
                db.add(
                    LocationObservation(
                        observation_id=obs.id,
                        incident_id=inc.id,
                        latitude=s["lat"],
                        longitude=s["lon"],
                        accuracy_m=s["acc"],
                        source=s["source"],
                        collected_at=created_time,
                        readable_address=s["addr"],
                        verified=s["status"] in ["field_verified", "closed"],
                    )
                )

            db.add(
                EvidenceAsset(
                    observation_id=obs.id,
                    incident_id=inc.id,
                    original_path=intake["original_path"],
                    annotated_path=intake["annotated_path"],
                    thumbnail_path=intake["thumbnail_path"],
                    sha256=intake["sha256"],
                    perceptual_hash=intake["perceptual_hash"],
                    mime_type="image/jpeg",
                    width=intake["width"],
                    height=intake["height"],
                    file_size=intake["file_size"],
                    is_repair_evidence=False,
                    created_at=created_time,
                )
            )

            cv_res = compute_cv_image_analysis(img_bytes, s["desc"])
            db.add(
                Assessment(
                    observation_id=obs.id,
                    incident_id=inc.id,
                    model_name="CivicPulse-Vision-CV-1.0",
                    model_version="1.0.0",
                    structured_output={
                        "category": s["category"],
                        "visible_severity": s["severity"],
                        "image_quality": cv_res.get("image_quality", "good"),
                        "visual_evidence": cv_res.get("visual_evidence", f"Pavement defect identified at {s['addr']}"),
                        "uncertainties": ["Synthetic demonstration record"] + cv_res.get("uncertainties", [])[:2],
                        "needs_human_review": True,
                        "confidence_score": cv_res.get("confidence_score", 0.82),
                        "detected_regions": cv_res.get("detected_regions", []),
                        "vision_metrics": cv_res.get("vision_metrics", {}),
                        "analysis_source": cv_res.get("analysis_source", "vision_cv_patch_analyzer"),
                    },
                    is_fallback=False,
                    created_at=created_time,
                )
            )

            if s.get("has_repair_claim") or s.get("closed"):
                after_bytes = create_synthetic_repaired_road_image(s["seed"])
                rep_intake = process_intake_image(
                    file_bytes=after_bytes,
                    incident_number=f"{s['num']}-REPAIR",
                    readable_address=s["addr"],
                    latitude=s["lat"],
                    longitude=s["lon"],
                    location_source="inspector_confirmed" if s.get("closed") else "contractor_submission",
                    accuracy_m=6.0,
                    timestamp=created_time + timedelta(days=1),
                    time_label="Repaired",
                    verification_status="Resolution Verified" if s.get("closed") else "Pending Resolution Review",
                )
                rep_obs = Observation(
                    incident_id=inc.id,
                    observation_number=f"REP-REPAIR-{s['num'][-4:]}",
                    source_type="contractor_repair_proof",
                    capture_mode="camera",
                    description="Post-repair compacted asphalt patching photograph.",
                    submitted_at=created_time + timedelta(days=1),
                    submitted_by=SYNTHETIC_AUTHOR,
                    processing_status="completed",
                )
                db.add(rep_obs)
                db.flush()
                db.add(
                    EvidenceAsset(
                        observation_id=rep_obs.id,
                        incident_id=inc.id,
                        original_path=rep_intake["original_path"],
                        annotated_path=rep_intake["annotated_path"],
                        thumbnail_path=rep_intake["thumbnail_path"],
                        sha256=rep_intake["sha256"],
                        perceptual_hash=rep_intake["perceptual_hash"],
                        mime_type="image/jpeg",
                        width=rep_intake["width"],
                        height=rep_intake["height"],
                        file_size=rep_intake["file_size"],
                        is_repair_evidence=True,
                        created_at=created_time + timedelta(days=1),
                    )
                )
                comp = compare_before_after_repair(img_bytes, after_bytes)
                db.add(
                    Assessment(
                        observation_id=rep_obs.id,
                        incident_id=inc.id,
                        model_name="CivicPulse-BeforeAfter-Comparator",
                        model_version="1.0.0",
                        structured_output={
                            "category": inc.category,
                            "visible_severity": "low",
                            "image_quality": "good",
                            "visual_evidence": comp["summary"],
                            "uncertainties": [comp["scene_consistency_note"]],
                            "needs_human_review": True,
                            "confidence_score": round(comp["visual_change_score"] / 100.0, 2),
                            "analysis_source": "before_after_cv_comparison",
                            "resolution_comparison": comp,
                        },
                        is_fallback=False,
                        created_at=created_time + timedelta(days=1),
                    )
                )

            if s["status"] in ["assigned", "in_progress", "repair_claimed", "resolution_pending_review", "closed"]:
                db.add(
                    WorkOrder(
                        work_order_number=f"WO-{s['num'][-4:]}",
                        incident_id=inc.id,
                        title=f"Road Repair: {s['title']}",
                        assigned_team=s["team"],
                        assigned_inspector="Ramesh Babu (Ward Inspector)",
                        status="repair_claimed" if s.get("has_repair_claim") else ("verified_complete" if s.get("closed") else "assigned"),
                        checklist=[
                            {"item": "Traffic safety cordon established", "completed": True},
                            {"item": "Surface debris cleared and perimeter squared", "completed": True},
                            {"item": "Bitumen binder applied", "completed": s.get("has_repair_claim") or s.get("closed")},
                            {"item": "Hot mix asphalt compacted", "completed": s.get("has_repair_claim") or s.get("closed")},
                            {"item": "After-repair photo captured with GeoProof", "completed": bool(s.get("has_repair_claim") or s.get("closed"))},
                        ],
                        inspection_notes=f"Inspection confirmed defect at {s['addr']}.",
                        repair_notes="Asphalt patching completed with 40mm bituminous concrete." if s.get("has_repair_claim") or s.get("closed") else None,
                        due_date=created_time + timedelta(days=2),
                        created_at=created_time,
                    )
                )

            db.add(
                AuditEvent(
                    incident_id=inc.id,
                    actor="System Seeder",
                    actor_role="admin",
                    action="SYNTHETIC_INCIDENT_INITIALIZED",
                    previous_state=None,
                    new_state=s["status"],
                    reason=SYNTHETIC_AUTHOR,
                    timestamp=created_time,
                )
            )

        if "INF-1001" in created_incidents and "INF-1002" in created_incidents:
            db.add(
                IncidentLink(
                    from_incident_id=created_incidents["INF-1002"].id,
                    to_incident_id=created_incidents["INF-1001"].id,
                    relation_type="possible_duplicate_of",
                    score=0.88,
                    reason="Immediate spatial proximity (22m apart on Bellandur corridor) + matching defect category (pothole).",
                    status="candidate",
                    created_by="CivicPulse Duplicate Correlation Engine",
                )
            )

        if "INF-1001" in created_incidents and "INF-1003" in created_incidents:
            db.add(
                IncidentLink(
                    from_incident_id=created_incidents["INF-1003"].id,
                    to_incident_id=created_incidents["INF-1001"].id,
                    relation_type="possible_duplicate_of",
                    score=0.98,
                    reason="Exact duplicate photo SHA-256 hash match detected + 15m proximity.",
                    status="candidate",
                    created_by="CivicPulse Duplicate Correlation Engine",
                )
            )

        db.commit()
        logger.info("Seeded CivicPulse demo users and %d Bengaluru scenarios.", len(DEMO_SCENARIOS))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def ensure_initialized():
    """Ensure tables exist and demo records are seeded once per runtime process."""
    global _initialized
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        seed_database()
        _initialized = True

