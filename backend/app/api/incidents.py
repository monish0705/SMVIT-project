import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db, get_current_user, get_current_user_optional, require_roles
from app.models.user import User
from app.models.incident import Incident
from app.models.observation import Observation
from app.models.location import LocationObservation
from app.models.evidence_asset import EvidenceAsset
from app.models.assessment import Assessment
from app.models.incident_link import IncidentLink
from app.models.work_order import WorkOrder
from app.models.review import Review
from app.models.audit_event import AuditEvent
from app.services.state_machine import transition_incident_status
from app.services.geoproof import process_intake_image
from app.services.evidence_graph import build_incident_evidence_graph
from app.services.evidence_verifier import evaluate_evidence
from app.services.duplicate_detector import haversine_distance_m
from app.services.geocoding import reverse_geocode
from app.services.resolution_comparator import compare_before_after_repair
from app.schemas.incident import (
    IncidentDetailResponse,
    IncidentSummary,
    IncidentStatsResponse,
    ReviewActionRequest,
    AssignRequest,
    WorkOrderCreateRequest,
    LocationUpdateRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents & Operations"])

@router.get("/stats", response_model=IncidentStatsResponse)
def get_incident_statistics(db: Session = Depends(get_db)):
    """Aggregate statistics for the executive operations dashboard."""
    total = db.query(Incident).count()
    open_count = db.query(Incident).filter(Incident.current_status.notin_(["closed", "rejected"])).count()
    critical_count = db.query(Incident).filter(
        Incident.risk_score >= 75.0,
        Incident.current_status.notin_(["closed", "rejected"])
    ).count()
    awaiting_verification = db.query(Incident).filter(
        Incident.current_status.in_(["candidate", "needs_review", "corroborated"])
    ).count()
    assigned_count = db.query(Incident).filter(Incident.current_status.in_(["assigned", "in_progress"])).count()
    repair_claimed_count = db.query(Incident).filter(Incident.current_status == "repair_claimed").count()
    resolution_pending_count = db.query(Incident).filter(Incident.current_status == "resolution_pending_review").count()
    resolved_count = db.query(Incident).filter(Incident.current_status.in_(["resolution_verified", "closed"])).count()

    # By category
    cat_rows = db.query(Incident.category, func.count(Incident.id)).group_by(Incident.category).all()
    by_category = {cat: count for cat, count in cat_rows}

    # By status
    status_rows = db.query(Incident.current_status, func.count(Incident.id)).group_by(Incident.current_status).all()
    by_status = {st: count for st, count in status_rows}

    # Priority distribution (Low < 40, Medium 40-74, High >= 75)
    by_priority = {
        "Low": db.query(Incident).filter(Incident.risk_score < 40.0).count(),
        "Medium": db.query(Incident).filter(Incident.risk_score >= 40.0, Incident.risk_score < 75.0).count(),
        "High": db.query(Incident).filter(Incident.risk_score >= 75.0).count()
    }

    # Daily trend for the past 7 days
    daily_trend = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        cnt = db.query(Incident).filter(Incident.created_at >= day_start, Incident.created_at < day_end).count()
        daily_trend.append({
            "date": day_start.strftime("%b %d"),
            "reports": cnt
        })

    return IncidentStatsResponse(
        total_incidents=total,
        open_incidents=open_count,
        critical_incidents=critical_count,
        awaiting_verification=awaiting_verification,
        assigned_incidents=assigned_count,
        repair_claimed=repair_claimed_count,
        resolution_pending_review=resolution_pending_count,
        resolved_incidents=resolved_count,
        by_category=by_category,
        by_status=by_status,
        by_priority=by_priority,
        daily_trend=daily_trend
    )

@router.get("/analytics")
def get_operations_analytics(db: Session = Depends(get_db)):
    """Geospatial hotspot clustering, recurring road corridors, division workload, and SLA resolution metrics."""
    incidents = db.query(Incident).all()
    now = datetime.now(timezone.utc)

    # 1. Spatial Hotspot Clustering (greedy 450m corridor clusters on geolocated incidents)
    geo_incidents = [i for i in incidents if i.latitude is not None and i.longitude is not None]
    assigned_ids = set()
    hotspots = []

    for seed in sorted(geo_incidents, key=lambda x: x.risk_score, reverse=True):
        if seed.id in assigned_ids:
            continue
        cluster = [seed]
        assigned_ids.add(seed.id)
        for other in geo_incidents:
            if other.id in assigned_ids:
                continue
            dist = haversine_distance_m(seed.latitude, seed.longitude, other.latitude, other.longitude)
            if dist <= 450.0:
                cluster.append(other)
                assigned_ids.add(other.id)

        avg_lat = round(sum(c.latitude for c in cluster) / len(cluster), 5)
        avg_lon = round(sum(c.longitude for c in cluster) / len(cluster), 5)
        avg_risk = round(sum(c.risk_score for c in cluster) / len(cluster), 1)
        unresolved = sum(1 for c in cluster if c.current_status not in ["closed", "rejected"])
        hotspots.append({
            "cluster_id": f"HS-{len(hotspots) + 1:02d}",
            "corridor_label": seed.readable_address or f"{avg_lat}, {avg_lon}",
            "latitude": avg_lat,
            "longitude": avg_lon,
            "incident_count": len(cluster),
            "unresolved_count": unresolved,
            "avg_risk_score": avg_risk,
            "max_risk_score": round(max(c.risk_score for c in cluster), 1),
            "categories": list({c.category for c in cluster}),
            "incident_numbers": [c.incident_number for c in cluster],
        })

    hotspots.sort(key=lambda h: (h["incident_count"], h["avg_risk_score"]), reverse=True)

    # 2. Division / Team Workload & Resolution Performance
    division_stats = {}
    sla_breaches = 0
    resolution_hours = []
    for inc in incidents:
        team = inc.assigned_team or "Unassigned"
        if team not in division_stats:
            division_stats[team] = {"team": team, "total": 0, "open": 0, "resolved": 0, "avg_risk": 0.0, "_risk_sum": 0.0}
        division_stats[team]["total"] += 1
        division_stats[team]["_risk_sum"] += inc.risk_score
        if inc.current_status in ["closed", "resolution_verified"]:
            division_stats[team]["resolved"] += 1
            if inc.closed_at and inc.created_at:
                c_at = inc.created_at.replace(tzinfo=timezone.utc) if inc.created_at.tzinfo is None else inc.created_at
                cl_at = inc.closed_at.replace(tzinfo=timezone.utc) if inc.closed_at.tzinfo is None else inc.closed_at
                resolution_hours.append(max(1.0, (cl_at - c_at).total_seconds() / 3600.0))
        elif inc.current_status != "rejected":
            division_stats[team]["open"] += 1
            c_at = inc.created_at.replace(tzinfo=timezone.utc) if inc.created_at.tzinfo is None else inc.created_at
            age_h = (now - c_at).total_seconds() / 3600.0
            if inc.risk_score >= 75.0 and age_h > 48.0:
                sla_breaches += 1

    divisions = []
    for d in division_stats.values():
        d["avg_risk"] = round(d["_risk_sum"] / max(1, d["total"]), 1)
        del d["_risk_sum"]
        divisions.append(d)
    divisions.sort(key=lambda d: d["open"], reverse=True)

    # 3. Evidence Provenance Breakdown
    provenance_counts = {}
    for inc in incidents:
        src = inc.location_source or "unknown"
        provenance_counts[src] = provenance_counts.get(src, 0) + 1

    return {
        "total_incidents": len(incidents),
        "geolocated_incidents": len(geo_incidents),
        "recurring_clusters": [h for h in hotspots if h["incident_count"] >= 2],
        "all_corridors": hotspots[:12],
        "divisions": divisions,
        "provenance_breakdown": provenance_counts,
        "sla_breaches_48h_critical": sla_breaches,
        "avg_resolution_hours": round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None,
    }

@router.get("/map")
def get_map_incidents(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    min_priority: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Retrieve spatial records with provenance for interactive Leaflet operations map."""
    query = db.query(Incident).filter(Incident.latitude.isnot(None), Incident.longitude.isnot(None))
    if category:
        query = query.filter(Incident.category == category)
    if status_filter:
        query = query.filter(Incident.current_status == status_filter)
    if min_priority is not None:
        query = query.filter(Incident.risk_score >= min_priority)

    incidents = query.all()
    results = []
    for inc in incidents:
        first_asset = next((a for a in inc.evidence_assets if not a.is_repair_evidence), inc.evidence_assets[0] if inc.evidence_assets else None)
        results.append({
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "category": inc.category,
            "status": inc.current_status,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "accuracy_m": inc.location_accuracy_m,
            "location_source": inc.location_source,
            "readable_address": inc.readable_address,
            "risk_score": inc.risk_score,
            "evidence_confidence": inc.evidence_confidence,
            "thumbnail_url": f"/api/evidence/{first_asset.id}/thumbnail" if first_asset else None,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })
    return results

@router.get("", response_model=List[IncidentSummary])
def list_incidents(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    min_priority: Optional[float] = None,
    assigned_team: Optional[str] = None,
    submitted_by: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Search and filter the incident queue with pagination and sorting."""
    query = db.query(Incident)
    
    if search:
        s = f"%{search}%"
        query = query.filter((Incident.incident_number.ilike(s)) | (Incident.title.ilike(s)) | (Incident.readable_address.ilike(s)))
    if category:
        query = query.filter(Incident.category == category)
    if status_filter:
        statuses = [st.strip() for st in status_filter.split(",") if st.strip()]
        if len(statuses) == 1:
            query = query.filter(Incident.current_status == statuses[0])
        elif len(statuses) > 1:
            query = query.filter(Incident.current_status.in_(statuses))
    if min_priority is not None:
        query = query.filter(Incident.risk_score >= min_priority)
    if assigned_team:
        query = query.filter(Incident.assigned_team == assigned_team)
    if submitted_by:
        query = query.filter(Incident.observations.any(Observation.submitted_by.ilike(f"%{submitted_by}%")))

    # Default sort by risk_score desc, updated_at desc
    query = query.order_by(Incident.risk_score.desc(), Incident.updated_at.desc())
    items = query.offset(offset).limit(limit).all()

    summaries = []
    for inc in items:
        first_asset = next((a for a in inc.evidence_assets if not a.is_repair_evidence), inc.evidence_assets[0] if inc.evidence_assets else None)
        summaries.append(IncidentSummary(
            id=inc.id,
            incident_number=inc.incident_number,
            title=inc.title,
            category=inc.category,
            current_status=inc.current_status,
            latitude=inc.latitude,
            longitude=inc.longitude,
            readable_address=inc.readable_address,
            location_source=inc.location_source,
            location_accuracy_m=inc.location_accuracy_m,
            risk_score=inc.risk_score,
            evidence_confidence=inc.evidence_confidence,
            observation_count=len(inc.observations),
            has_annotated_image=bool(first_asset and first_asset.annotated_path),
            original_image_url=f"/api/evidence/{first_asset.id}/original" if first_asset else None,
            annotated_image_url=f"/api/evidence/{first_asset.id}/annotated" if first_asset else None,
            assigned_team=inc.assigned_team,
            created_at=inc.created_at,
            updated_at=inc.updated_at
        ))
    return summaries

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve full incident evidence package, AI assessments, duplicate candidate links, and audit trail."""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    first_asset = next((a for a in inc.evidence_assets if not a.is_repair_evidence), inc.evidence_assets[0] if inc.evidence_assets else None)
    repair_asset = next((a for a in reversed(inc.evidence_assets) if a.is_repair_evidence), None)

    # Fetch incident links
    links = db.query(IncidentLink).filter(
        (IncidentLink.from_incident_id == inc.id) | (IncidentLink.to_incident_id == inc.id)
    ).all()

    link_details = []
    for l in links:
        other_inc = l.to_incident if l.from_incident_id == inc.id else l.from_incident
        if other_inc:
            link_details.append({
                "id": l.id,
                "linked_incident_id": other_inc.id,
                "linked_incident_number": other_inc.incident_number,
                "relation_type": l.relation_type,
                "score": l.score,
                "reason": l.reason,
                "status": l.status,
                "created_at": l.created_at
            })

    # Prepare observations
    obs_details = []
    for obs in inc.observations:
        ast = obs.evidence_assets[0] if obs.evidence_assets else None
        locs = [{
            "latitude": l.latitude,
            "longitude": l.longitude,
            "accuracy_m": l.accuracy_m,
            "source": l.source,
            "readable_address": l.readable_address,
            "verified": l.verified,
            "collected_at": l.collected_at
        } for l in obs.locations]

        obs_details.append({
            "id": obs.id,
            "observation_number": obs.observation_number,
            "source_type": obs.source_type,
            "capture_mode": obs.capture_mode,
            "description": obs.description,
            "observed_at": obs.observed_at,
            "submitted_at": obs.submitted_at,
            "submitted_by": obs.submitted_by,
            "is_repair_evidence": bool(ast and ast.is_repair_evidence),
            "original_asset_url": f"/api/evidence/{ast.id}/original" if ast else None,
            "annotated_asset_url": f"/api/evidence/{ast.id}/annotated" if ast else None,
            "sha256": ast.sha256 if ast else None,
            "locations": locs
        })

    # Prepare assessments
    asm_details = []
    latest_comparison = None
    for asm in inc.assessments:
        out = asm.structured_output or {}
        if out.get("resolution_comparison"):
            latest_comparison = out.get("resolution_comparison")
        asm_details.append({
            "id": asm.id,
            "model_name": asm.model_name,
            "model_version": asm.model_version,
            "category": out.get("category", inc.category),
            "visible_severity": out.get("visible_severity", "medium"),
            "image_quality": out.get("image_quality", "adequate"),
            "visual_evidence": out.get("visual_evidence", ""),
            "uncertainties": out.get("uncertainties", []),
            "needs_human_review": out.get("needs_human_review", True),
            "confidence_score": out.get("confidence_score", 0.0),
            "is_fallback": asm.is_fallback,
            "analysis_source": out.get("analysis_source"),
            "detected_regions": out.get("detected_regions", []),
            "vision_metrics": out.get("vision_metrics", {}),
            "resolution_comparison": out.get("resolution_comparison"),
            "created_at": asm.created_at
        })

    # Prepare work orders
    wo_details = [{
        "id": wo.id,
        "work_order_number": wo.work_order_number,
        "title": wo.title,
        "assigned_team": wo.assigned_team,
        "assigned_inspector": wo.assigned_inspector,
        "status": wo.status,
        "checklist": wo.checklist or [],
        "inspection_notes": wo.inspection_notes,
        "repair_notes": wo.repair_notes,
        "due_date": wo.due_date,
        "created_at": wo.created_at,
        "updated_at": wo.updated_at
    } for wo in inc.work_orders]

    # Prepare audit events
    audit_details = [{
        "id": ae.id,
        "actor": ae.actor,
        "actor_role": ae.actor_role,
        "action": ae.action,
        "previous_state": ae.previous_state,
        "new_state": ae.new_state,
        "reason": ae.reason,
        "timestamp": ae.timestamp
    } for ae in inc.audit_events]

    return IncidentDetailResponse(
        id=inc.id,
        incident_number=inc.incident_number,
        title=inc.title,
        description=inc.description,
        category=inc.category,
        current_status=inc.current_status,
        location={
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "accuracy_m": inc.location_accuracy_m,
            "source": inc.location_source,
            "readable_address": inc.readable_address,
            "verified": inc.location_verified,
            "collected_at": inc.created_at
        },
        risk_score=inc.risk_score,
        risk_breakdown=inc.risk_breakdown or {},
        evidence_confidence=inc.evidence_confidence,
        evidence_confidence_score=inc.evidence_confidence_score,
        priority_recommendation=inc.priority_recommendation,
        assigned_to=inc.assigned_to,
        assigned_team=inc.assigned_team,
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        closed_at=inc.closed_at,
        original_image_url=f"/api/evidence/{first_asset.id}/original" if first_asset else None,
        annotated_image_url=f"/api/evidence/{first_asset.id}/annotated" if first_asset else None,
        after_repair_image_url=f"/api/evidence/{repair_asset.id}/annotated" if repair_asset else None,
        sha256=first_asset.sha256 if first_asset else None,
        resolution_comparison=latest_comparison,
        observations=obs_details,
        assessments=asm_details,
        links=link_details,
        work_orders=wo_details,
        audit_events=audit_details
    )

@router.get("/{incident_id}/evidence-graph")
def get_incident_evidence_graph_data(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve full relational evidence graph for visual node-edge rendering."""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    links = db.query(IncidentLink).filter(
        (IncidentLink.from_incident_id == inc.id) | (IncidentLink.to_incident_id == inc.id)
    ).all()

    graph = build_incident_evidence_graph(inc, links)
    return graph

@router.post("/{incident_id}/review")
def record_human_review(
    incident_id: str,
    action_data: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "field_inspector", "admin"]))
):
    """Record an operator/inspector review decision and transition status."""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    decision_map = {
        "approve": "corroborated",
        "reject": "rejected",
        "request_evidence": "needs_review",
        "corroborate": "corroborated",
        "verify_field": "field_verified",
        "verify_resolution": "resolution_verified"
    }
    target_status = action_data.new_status or decision_map.get(action_data.decision, "needs_review")

    # Record review entity
    review = Review(
        incident_id=inc.id,
        reviewer_id=current_user.id,
        reviewer_name=current_user.full_name,
        reviewer_role=current_user.role,
        decision=action_data.decision,
        reason=action_data.reason,
        notes=action_data.notes
    )
    db.add(review)

    # Perform validated state machine transition
    success, message = transition_incident_status(
        db=db,
        incident=inc,
        new_status=target_status,
        actor=current_user.full_name,
        actor_role=current_user.role,
        reason=f"Human Review ({action_data.decision}): {action_data.reason}",
        notes=action_data.notes
    )
    if not success:
        db.rollback()
        raise HTTPException(status_code=400, detail=message)

    if action_data.decision == "verify_field":
        inc.location_verified = True
        for loc in inc.location_observations:
            loc.verified = True

    db.commit()
    return {"status": "success", "message": message, "new_status": inc.current_status}

@router.post("/{incident_id}/assign")
def assign_incident(
    incident_id: str,
    assign_data: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin"]))
):
    """Assign incident to an inspection engineer or maintenance division."""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    inc.assigned_team = assign_data.assigned_team
    if assign_data.assigned_to:
        inc.assigned_to = assign_data.assigned_to

    success, message = transition_incident_status(
        db=db,
        incident=inc,
        new_status="assigned",
        actor=current_user.full_name,
        actor_role=current_user.role,
        reason=f"Assigned to {assign_data.assigned_team}" + (f" ({assign_data.assigned_to})" if assign_data.assigned_to else ""),
        notes=assign_data.notes
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    db.commit()
    return {"status": "success", "assigned_team": inc.assigned_team, "incident_status": inc.current_status}

@router.post("/{incident_id}/work-orders")
def create_draft_work_order(
    incident_id: str,
    wo_data: WorkOrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin"]))
):
    """Create a draft maintenance work order for field execution."""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    count = db.query(WorkOrder).count() + 101
    wo_num = f"WO-{count}"

    default_checklist = wo_data.checklist or [
        {"item": "Traffic safety cordon established", "completed": False},
        {"item": "Surface debris cleared and perimeter squared", "completed": False},
        {"item": "Bitumen binder applied", "completed": False},
        {"item": "Hot mix asphalt compacted", "completed": False},
        {"item": "After-repair photo captured with GeoProof", "completed": False}
    ]

    work_order = WorkOrder(
        work_order_number=wo_num,
        incident_id=inc.id,
        title=wo_data.title,
        assigned_team=wo_data.assigned_team,
        assigned_inspector=wo_data.assigned_inspector,
        status="assigned",
        checklist=default_checklist,
        inspection_notes=wo_data.notes,
        due_date=wo_data.due_date or (datetime.now(timezone.utc) + timedelta(days=3))
    )
    db.add(work_order)

    # Transition to in_progress or assigned if appropriate
    if inc.current_status in ["candidate", "corroborated", "field_verified", "assigned"]:
        transition_incident_status(
            db=db,
            incident=inc,
            new_status="in_progress",
            actor=current_user.full_name,
            actor_role=current_user.role,
            reason=f"Work Order {wo_num} generated for execution.",
            notes=wo_data.notes
        )

    db.commit()
    return {"status": "success", "work_order_number": wo_num, "work_order_id": work_order.id}

@router.post("/{incident_id}/resolution-evidence")
async def upload_repair_resolution_evidence(
    incident_id: str,
    image: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    repair_team: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Attach after-photo repair evidence. Triggers 'resolution_pending_review', NEVER auto-closes!"""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    file_bytes = await image.read()
    author = current_user.full_name if current_user else (repair_team or "Contractor Field Crew")
    actor_role = current_user.role if current_user else "contractor"

    # Process after-repair photo with GeoProof overlay
    asset_data = process_intake_image(
        file_bytes=file_bytes,
        incident_number=f"{inc.incident_number}-REPAIR",
        readable_address=inc.readable_address,
        latitude=inc.latitude,
        longitude=inc.longitude,
        location_source="inspector_confirmed" if actor_role == "field_inspector" else "contractor_submission",
        accuracy_m=10.0,
        timestamp=datetime.now(timezone.utc),
        time_label="Repaired",
        verification_status="Pending Resolution Review"
    )

    # Create repair observation & asset
    obs = Observation(
        incident_id=inc.id,
        observation_number=f"REP-REPAIR-{inc.incident_number[-4:]}",
        source_type="contractor_repair_proof",
        capture_mode="camera",
        description=f"Repair completion evidence submitted: {notes or 'Surface restoration claimed'}",
        submitted_by=author,
        processing_status="completed"
    )
    db.add(obs)
    db.flush()

    asset = EvidenceAsset(
        observation_id=obs.id,
        incident_id=inc.id,
        original_path=asset_data["original_path"],
        annotated_path=asset_data["annotated_path"],
        thumbnail_path=asset_data["thumbnail_path"],
        sha256=asset_data["sha256"],
        perceptual_hash=asset_data["perceptual_hash"],
        mime_type=image.content_type or "image/jpeg",
        width=asset_data["width"],
        height=asset_data["height"],
        file_size=asset_data["file_size"],
        is_repair_evidence=True
    )
    db.add(asset)

    # Compare initial intake defect image vs post-repair photograph
    initial_asset = next((a for a in inc.evidence_assets if not a.is_repair_evidence), None)
    before_bytes = None
    if initial_asset and initial_asset.original_path and os.path.exists(initial_asset.original_path):
        try:
            with open(initial_asset.original_path, "rb") as f:
                before_bytes = f.read()
        except Exception:
            before_bytes = None

    comparison = compare_before_after_repair(before_bytes, file_bytes)
    comp_assessment = Assessment(
        observation_id=obs.id,
        incident_id=inc.id,
        model_name="CivicPulse-BeforeAfter-Comparator",
        model_version="1.0.0",
        structured_output={
            "category": inc.category,
            "visible_severity": "low" if comparison.get("defect_reduction_assessment") == "significant_improvement" else "medium",
            "image_quality": "adequate",
            "visual_evidence": comparison.get("summary", ""),
            "uncertainties": [
                comparison.get("scene_consistency_note", ""),
                "Human engineering sign-off required prior to incident closure.",
            ],
            "needs_human_review": True,
            "confidence_score": round((comparison.get("visual_change_score", 50.0)) / 100.0, 2),
            "analysis_source": "before_after_cv_comparison",
            "resolution_comparison": comparison,
        },
        is_fallback=False,
    )
    db.add(comp_assessment)

    # Transition state to 'resolution_pending_review'
    success, message = transition_incident_status(
        db=db,
        incident=inc,
        new_status="resolution_pending_review",
        actor=author,
        actor_role=actor_role,
        reason="Repair evidence uploaded with before/after visual comparison.",
        notes=notes
    )

    db.commit()
    return {
        "status": "success",
        "incident_status": inc.current_status,
        "message": "Repair evidence attached. Incident moved to 'resolution_pending_review' awaiting authorized human verification.",
        "annotated_url": f"/api/evidence/{asset.id}/annotated",
        "resolution_comparison": comparison
    }

@router.patch("/{incident_id}/location")
async def update_incident_location(
    incident_id: str,
    loc_data: LocationUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Attach or confirm geographic coordinates for an incident without overwriting original EXIF location claims."""
    if not (-90.0 <= loc_data.latitude <= 90.0) or not (-180.0 <= loc_data.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid geographic coordinates.")

    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    readable_address = await reverse_geocode(loc_data.latitude, loc_data.longitude)
    actor = current_user.full_name if current_user else "Contributor / Operator"
    actor_role = current_user.role if current_user else "citizen"

    first_obs = inc.observations[0] if inc.observations else None
    if first_obs:
        db.add(
            LocationObservation(
                observation_id=first_obs.id,
                incident_id=inc.id,
                latitude=loc_data.latitude,
                longitude=loc_data.longitude,
                accuracy_m=loc_data.accuracy_m,
                source=loc_data.source,
                collected_at=datetime.now(timezone.utc),
                is_user_corrected=True,
                readable_address=readable_address,
                verified=(loc_data.source == "inspector_confirmed"),
            )
        )

    # Update operational centroid while keeping historical LocationObservations intact
    inc.latitude = loc_data.latitude
    inc.longitude = loc_data.longitude
    inc.readable_address = readable_address
    inc.location_accuracy_m = loc_data.accuracy_m
    if inc.location_source != "photo_exif":
        inc.location_source = loc_data.source
    if loc_data.source == "inspector_confirmed":
        inc.location_verified = True

    if inc.current_status == "needs_location":
        transition_incident_status(
            db=db,
            incident=inc,
            new_status="candidate",
            actor=actor,
            actor_role=actor_role,
            reason=loc_data.reason or f"Location pinned at {readable_address} ({loc_data.source}).",
        )
    else:
        db.add(
            AuditEvent(
                incident_id=inc.id,
                actor=actor,
                actor_role=actor_role,
                action="LOCATION_OBSERVATION_ADDED",
                previous_state=inc.current_status,
                new_state=inc.current_status,
                reason=loc_data.reason or f"Added {loc_data.source} coordinate observation at {readable_address}.",
            )
        )

    db.flush()
    ev = evaluate_evidence(inc)
    inc.evidence_confidence = ev["confidence_level"]
    inc.evidence_confidence_score = ev["confidence_score"]
    db.commit()

    return {
        "status": "success",
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "readable_address": inc.readable_address,
        "current_status": inc.current_status,
    }

@router.post("/{incident_id}/verify-resolution")
def verify_resolution_and_close(
    incident_id: str,
    decision: str = Form("verify_and_close"),  # verify_and_close, reject_repair
    reason: str = Form(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin"]))
):
    """Authorized reviewer approves resolution verification and formally closes the incident."""
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id.upper())).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    if decision == "verify_and_close":
        # 1. Move to resolution_verified
        transition_incident_status(
            db=db,
            incident=inc,
            new_status="resolution_verified",
            actor=current_user.full_name,
            actor_role=current_user.role,
            reason=f"Resolution Verified: {reason}",
            notes=notes
        )
        # 2. Final close
        transition_incident_status(
            db=db,
            incident=inc,
            new_status="closed",
            actor=current_user.full_name,
            actor_role=current_user.role,
            reason="Formally closed after verified resolution.",
            notes=notes
        )
    else:
        # Reject repair, send back to in_progress
        transition_incident_status(
            db=db,
            incident=inc,
            new_status="in_progress",
            actor=current_user.full_name,
            actor_role=current_user.role,
            reason=f"Repair rejected by reviewer: {reason}",
            notes=notes
        )

    db.commit()
    return {"status": "success", "new_status": inc.current_status, "message": f"Incident updated to {inc.current_status}."}

@router.post("/links/{link_id}/status")
def update_incident_link_status(
    link_id: str,
    action: str = Form("confirm"),  # confirm, reject
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin"]))
):
    """Confirm or reject a duplicate relationship link between incidents."""
    link = db.query(IncidentLink).filter(IncidentLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Incident link not found.")

    new_status = "confirmed" if action == "confirm" else "rejected"
    link.status = new_status

    # Record audit event
    audit = AuditEvent(
        incident_id=link.from_incident_id,
        actor=current_user.full_name,
        actor_role=current_user.role,
        action=f"DUPLICATE_LINK_{new_status.upper()}",
        previous_state="candidate",
        new_state=new_status,
        reason=reason or f"Operator {action}ed candidate duplicate relationship with incident {link.to_incident_id}.",
        details={"link_id": link.id, "to_incident_id": link.to_incident_id}
    )
    db.add(audit)
    db.commit()
    db.refresh(link)
    return {"status": "success", "link_id": link.id, "new_status": link.status}


