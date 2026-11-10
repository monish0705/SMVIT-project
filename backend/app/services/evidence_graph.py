from typing import Dict, Any, List
from app.models.incident import Incident
from app.models.incident_link import IncidentLink

def build_incident_evidence_graph(incident: Incident, linked_records: List[IncidentLink]) -> Dict[str, Any]:
    """Generate database-backed nodes and edges for the interactive Evidence Graph visualization."""
    nodes = []
    edges = []

    # 1. Central Incident Node
    incident_node_id = f"inc_{incident.id}"
    nodes.append({
        "id": incident_node_id,
        "label": incident.incident_number,
        "sublabel": incident.category.replace("_", " ").title(),
        "type": "incident",
        "status": incident.current_status,
        "risk_score": incident.risk_score,
        "is_root": True
    })

    # 2. Observation / Report Nodes
    for obs in (incident.observations or []):
        obs_node_id = f"obs_{obs.id}"
        nodes.append({
            "id": obs_node_id,
            "label": obs.observation_number,
            "sublabel": obs.source_type.replace("_", " ").title(),
            "type": "observation",
            "status": obs.processing_status,
            "submitted_by": obs.submitted_by
        })
        edges.append({
            "id": f"e_{obs_node_id}_{incident_node_id}",
            "source": obs_node_id,
            "target": incident_node_id,
            "relation_type": "supports",
            "label": "supports"
        })

    # 3. Evidence Assets (Images)
    for asset in (incident.evidence_assets or []):
        asset_node_id = f"ast_{asset.id}"
        label = "Repair Photo" if asset.is_repair_evidence else "Defect Photo"
        nodes.append({
            "id": asset_node_id,
            "label": label,
            "sublabel": f"SHA: {asset.sha256[:8]}...",
            "type": "asset",
            "is_repair": asset.is_repair_evidence,
            "thumbnail_url": f"/api/evidence/{asset.id}/thumbnail"
        })
        parent_obs_id = f"obs_{asset.observation_id}" if asset.observation_id else incident_node_id
        edges.append({
            "id": f"e_{asset_node_id}_{parent_obs_id}",
            "source": asset_node_id,
            "target": parent_obs_id,
            "relation_type": "resolution_evidence_for" if asset.is_repair_evidence else "visual_evidence",
            "label": "after_repair" if asset.is_repair_evidence else "photo_evidence"
        })

    # 4. Location Observations
    for loc in (incident.location_observations or []):
        loc_node_id = f"loc_{loc.id}"
        source_label = loc.source.replace("_", " ").title()
        nodes.append({
            "id": loc_node_id,
            "label": f"GPS ({round(loc.latitude, 4)}, {round(loc.longitude, 4)})",
            "sublabel": source_label,
            "type": "location",
            "verified": loc.verified
        })
        parent_id = f"obs_{loc.observation_id}" if loc.observation_id else incident_node_id
        edges.append({
            "id": f"e_{loc_node_id}_{parent_id}",
            "source": loc_node_id,
            "target": parent_id,
            "relation_type": "location_provenance",
            "label": source_label
        })

    # 5. AI / Heuristic Assessments
    for asm in (incident.assessments or []):
        asm_node_id = f"asm_{asm.id}"
        nodes.append({
            "id": asm_node_id,
            "label": f"AI: {asm.model_name}",
            "sublabel": f"Severity: {asm.structured_output.get('visible_severity', 'N/A').title()}",
            "type": "assessment",
            "is_fallback": asm.is_fallback
        })
        parent_id = f"obs_{asm.observation_id}" if asm.observation_id else incident_node_id
        edges.append({
            "id": f"e_{asm_node_id}_{parent_id}",
            "source": asm_node_id,
            "target": parent_id,
            "relation_type": "analyzed_by",
            "label": "ai_triage"
        })

    # 6. Work Orders
    for wo in (incident.work_orders or []):
        wo_node_id = f"wo_{wo.id}"
        nodes.append({
            "id": wo_node_id,
            "label": wo.work_order_number,
            "sublabel": f"Team: {wo.assigned_team}",
            "type": "work_order",
            "status": wo.status
        })
        edges.append({
            "id": f"e_{wo_node_id}_{incident_node_id}",
            "source": incident_node_id,
            "target": wo_node_id,
            "relation_type": "assigned_work",
            "label": f"Work: {wo.status}"
        })

    # 7. Reviews
    for rev in (incident.reviews or []):
        rev_node_id = f"rev_{rev.id}"
        nodes.append({
            "id": rev_node_id,
            "label": f"Review: {rev.decision.title()}",
            "sublabel": rev.reviewer_name,
            "type": "review",
            "decision": rev.decision
        })
        edges.append({
            "id": f"e_{rev_node_id}_{incident_node_id}",
            "source": rev_node_id,
            "target": incident_node_id,
            "relation_type": "reviewed_by",
            "label": rev.decision
        })

    # 8. Linked Incidents (Duplicates / Contradictions)
    for link in linked_records:
        other_inc = link.to_incident if link.from_incident_id == incident.id else link.from_incident
        if other_inc:
            linked_node_id = f"inc_{other_inc.id}"
            nodes.append({
                "id": linked_node_id,
                "label": other_inc.incident_number,
                "sublabel": link.relation_type.replace("_", " ").title(),
                "type": "linked_incident",
                "status": other_inc.current_status,
                "risk_score": other_inc.risk_score
            })
            edges.append({
                "id": f"e_link_{link.id}",
                "source": incident_node_id,
                "target": linked_node_id,
                "relation_type": link.relation_type,
                "label": f"{link.relation_type} ({int(link.score * 100)}%)"
            })

    return {
        "nodes": nodes,
        "edges": edges
    }

