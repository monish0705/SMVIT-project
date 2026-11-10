import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.work_order import WorkOrder
from app.services.duplicate_detector import haversine_distance_m

logger = logging.getLogger(__name__)

def tool_list_top_urgent_incidents(db: Session, limit: int = 5) -> Dict[str, Any]:
    """Retrieve top highest risk unresolved incidents requiring immediate inspection."""
    incidents = (
        db.query(Incident)
        .filter(Incident.current_status.notin_(["closed", "rejected", "resolution_verified"]))
        .order_by(Incident.risk_score.desc())
        .limit(limit)
        .all()
    )
    results = []
    for inc in incidents:
        results.append({
            "incident_number": inc.incident_number,
            "category": inc.category,
            "status": inc.current_status,
            "risk_score": inc.risk_score,
            "address": inc.readable_address,
            "evidence_confidence": inc.evidence_confidence,
            "recommendation": inc.priority_recommendation
        })
    return {
        "count": len(results),
        "incidents": results
    }

def tool_compare_incidents(db: Session, num_a: str, num_b: str) -> Dict[str, Any]:
    """Compare priority breakdown and evidence factors between two incidents."""
    inc_a = db.query(Incident).filter(Incident.incident_number == num_a.strip().upper()).first()
    inc_b = db.query(Incident).filter(Incident.incident_number == num_b.strip().upper()).first()
    
    if not inc_a or not inc_b:
        return {"error": f"One or both incidents ({num_a}, {num_b}) could not be located in database."}

    diff = round(inc_a.risk_score - inc_b.risk_score, 1)
    return {
        "incident_a": {
            "number": inc_a.incident_number,
            "category": inc_a.category,
            "risk_score": inc_a.risk_score,
            "breakdown": inc_a.risk_breakdown,
            "confidence": inc_a.evidence_confidence,
            "address": inc_a.readable_address
        },
        "incident_b": {
            "number": inc_b.incident_number,
            "category": inc_b.category,
            "risk_score": inc_b.risk_score,
            "breakdown": inc_b.risk_breakdown,
            "confidence": inc_b.evidence_confidence,
            "address": inc_b.readable_address
        },
        "score_difference": diff,
        "higher_priority": inc_a.incident_number if diff > 0 else (inc_b.incident_number if diff < 0 else "Tied"),
        "key_reason": f"{inc_a.incident_number if diff > 0 else inc_b.incident_number} has higher road exposure and hazard likelihood factors."
    }

def tool_get_resolution_pending(db: Session) -> Dict[str, Any]:
    """List all incidents where repairs were claimed and follow-up verification is needed."""
    incidents = (
        db.query(Incident)
        .filter(Incident.current_status.in_(["repair_claimed", "resolution_pending_review"]))
        .all()
    )
    items = []
    for inc in incidents:
        items.append({
            "incident_number": inc.incident_number,
            "title": inc.title,
            "status": inc.current_status,
            "assigned_team": inc.assigned_team,
            "address": inc.readable_address,
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None
        })
    return {
        "count": len(items),
        "incidents": items
    }

def tool_find_nearby_incidents(db: Session, lat: float, lon: float, radius_m: float = 300.0) -> Dict[str, Any]:
    """Find incidents within radius of coordinates."""
    incidents = db.query(Incident).filter(Incident.latitude.isnot(None), Incident.longitude.isnot(None)).all()
    nearby = []
    for inc in incidents:
        d = haversine_distance_m(lat, lon, inc.latitude, inc.longitude)
        if d <= radius_m:
            nearby.append({
                "incident_number": inc.incident_number,
                "category": inc.category,
                "status": inc.current_status,
                "distance_m": d,
                "address": inc.readable_address,
                "risk_score": inc.risk_score
            })
    nearby.sort(key=lambda x: x["distance_m"])
    return {
        "center": {"lat": lat, "lon": lon},
        "radius_m": radius_m,
        "count": len(nearby),
        "incidents": nearby
    }

def execute_copilot_assistant(db: Session, query: str, context_id: Optional[str] = None) -> Dict[str, Any]:
    """Deterministic tool execution & synthesis for the AI Operations Copilot."""
    q = query.lower()
    tools_executed = []
    referenced_incidents = []
    suggested_actions = []

    # Check for incident comparison like "Why is INF-1001 ranked higher than INF-1002?"
    import re
    inf_matches = re.findall(r"INF-\d+", query.upper())
    
    if len(inf_matches) >= 2:
        num_a, num_b = inf_matches[0], inf_matches[1]
        data = tool_compare_incidents(db, num_a, num_b)
        tools_executed.append({
            "tool_name": "compare_incidents",
            "parameters": {"incident_a": num_a, "incident_b": num_b},
            "output_summary": f"Compared {num_a} vs {num_b}",
            "data": data
        })
        referenced_incidents.extend([num_a, num_b])
        
        if "error" in data:
            answer = data["error"]
        else:
            diff = data["score_difference"]
            high_inc = data["incident_a"] if diff > 0 else data["incident_b"]
            low_inc = data["incident_b"] if diff > 0 else data["incident_a"]
            answer = (
                f"**{high_inc['number']}** is prioritized higher (Risk Score: **{high_inc['risk_score']}**) than "
                f"**{low_inc['number']}** (Risk Score: **{low_inc['risk_score']}**).\n\n"
                f"**Key Determinants:**\n"
                f"- **Exposure:** {high_inc['number']} is located at *{high_inc['address']}*, a higher-exposure corridor.\n"
                f"- **Hazard & Severity:** Visible dimensions and water ponding conditions yield elevated hazard likelihood in the 5-factor scoring model.\n"
                f"- **Evidence Quality:** {high_inc['number']} holds **{high_inc['confidence']}** evidence confidence."
            )
            suggested_actions = [f"View details for {high_inc['number']}", f"Assign inspection crew to {high_inc['number']}"]

    elif "resolution" in q or "repair" in q or "claimed" in q or "verify" in q:
        data = tool_get_resolution_pending(db)
        tools_executed.append({
            "tool_name": "get_resolution_pending",
            "parameters": {},
            "output_summary": f"Found {data['count']} incidents awaiting resolution review",
            "data": data
        })
        referenced_incidents = [x["incident_number"] for x in data["incidents"][:5]]
        
        if data["count"] == 0:
            answer = "There are currently no incidents in 'repair_claimed' or 'resolution_pending_review' state."
        else:
            incident_list_text = "\n".join([f"- **{i['incident_number']}**: {i['title']} ({i['address']}) — Team: {i['assigned_team']}" for i in data["incidents"][:5]])
            answer = (
                f"Found **{data['count']}** incident(s) currently awaiting human resolution verification:\n\n"
                f"{incident_list_text}\n\n"
                "In CivicPulse AI, contractor repair claims are never automatically marked closed. An authorized reviewer or inspector must verify the after-photo evidence or perform a field re-check."
            )
            suggested_actions = ["Open Review Centre to verify claims", "Inspect after-repair photos"]

    elif "duplicate" in q or "similar" in q:
        # Fetch top candidate duplicates from DB
        from app.models.incident_link import IncidentLink
        links = db.query(IncidentLink).filter(IncidentLink.relation_type == "possible_duplicate_of").all()
        tools_executed.append({
            "tool_name": "find_spatial_candidates",
            "parameters": {},
            "output_summary": f"Retrieved {len(links)} candidate duplicate relationships",
            "data": {"count": len(links)}
        })
        if links:
            l = links[0]
            from_inc = db.query(Incident).filter(Incident.id == l.from_incident_id).first()
            to_inc = db.query(Incident).filter(Incident.id == l.to_incident_id).first()
            if from_inc and to_inc:
                referenced_incidents = [from_inc.incident_number, to_inc.incident_number]
                answer = (
                    f"Candidate duplicate detected between **{from_inc.incident_number}** and **{to_inc.incident_number}**:\n"
                    f"- Match Score: **{int(l.score * 100)}%**\n"
                    f"- Rationale: {l.reason}\n\n"
                    "You can confirm this linkage or keep them separate in the Review Centre."
                )
            else:
                answer = "Identified spatial candidate records in the database. Open Review Centre to inspect."
        else:
            answer = "No unreviewed duplicate candidates currently require linking."
        suggested_actions = ["Review Duplicate Candidates", "Search Spatial Clusters"]

    else:
        # Default: list top urgent incidents
        data = tool_list_top_urgent_incidents(db, limit=5)
        tools_executed.append({
            "tool_name": "list_top_urgent_incidents",
            "parameters": {"limit": 5},
            "output_summary": f"Retrieved top {data['count']} highest risk incidents",
            "data": data
        })
        referenced_incidents = [x["incident_number"] for x in data["incidents"]]
        
        inc_bullets = "\n".join([
            f"- **{i['incident_number']}** ({i['category'].replace('_', ' ').title()}): Risk **{i['risk_score']}** | Confidence: **{i['evidence_confidence'].title()}** | Loc: {i['address']}"
            for i in data["incidents"]
        ])
        
        answer = (
            f"Here are the top **{data['count']}** high-priority incidents currently requiring operational action in Bengaluru:\n\n"
            f"{inc_bullets}\n\n"
            "**Operational Note:** Cases with high risk scores on arterial corridors (such as Outer Ring Road and Bellary Road) are elevated for urgent inspection regardless of total complaint volume."
        )
        suggested_actions = ["Draft Work Order for top incident", "Open Live Map filtered by Critical Risk", "Review Unverified Reports"]

    return {
        "query": query,
        "answer": answer,
        "tools_executed": tools_executed,
        "referenced_incidents": referenced_incidents,
        "suggested_actions": suggested_actions
    }

