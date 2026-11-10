from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class RiskBreakdown(BaseModel):
    severity_score: float = 0.0
    severity_contribution: float = 0.0
    exposure_score: float = 0.0
    exposure_contribution: float = 0.0
    criticality_score: float = 0.0
    criticality_contribution: float = 0.0
    hazard_score: float = 0.0
    hazard_contribution: float = 0.0
    time_unresolved_score: float = 0.0
    time_unresolved_contribution: float = 0.0
    emergency_escalation: bool = False
    formula_version: str = "1.0"
    explanation: str = ""

class LocationDetail(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_m: Optional[float] = None
    source: str = "unknown"
    readable_address: Optional[str] = None
    verified: bool = False
    collected_at: Optional[datetime] = None

class ObservationDetail(BaseModel):
    id: str
    observation_number: str
    source_type: str
    capture_mode: str
    description: Optional[str] = None
    observed_at: Optional[datetime] = None
    submitted_at: datetime
    submitted_by: str
    original_asset_url: Optional[str] = None
    annotated_asset_url: Optional[str] = None
    sha256: Optional[str] = None
    locations: List[LocationDetail] = []

class AssessmentDetail(BaseModel):
    id: str
    model_name: str
    model_version: str
    category: str
    visible_severity: str
    image_quality: str
    visual_evidence: str
    uncertainties: List[str] = []
    needs_human_review: bool = True
    confidence_score: float = 0.0
    is_fallback: bool = False
    created_at: datetime

class IncidentLinkDetail(BaseModel):
    id: str
    linked_incident_id: str
    linked_incident_number: str
    relation_type: str
    score: float
    reason: str
    status: str
    created_at: datetime

class WorkOrderDetail(BaseModel):
    id: str
    work_order_number: str
    title: str
    assigned_team: str
    assigned_inspector: Optional[str] = None
    status: str
    checklist: List[Dict[str, Any]] = []
    inspection_notes: Optional[str] = None
    repair_notes: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AuditEventDetail(BaseModel):
    id: str
    actor: str
    actor_role: str
    action: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    reason: Optional[str] = None
    timestamp: datetime

class IncidentDetailResponse(BaseModel):
    id: str
    incident_number: str
    title: str
    description: Optional[str] = None
    category: str
    current_status: str
    location: LocationDetail
    risk_score: float
    risk_breakdown: RiskBreakdown
    evidence_confidence: str
    evidence_confidence_score: float
    priority_recommendation: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_team: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    
    # Assets & Evidence
    original_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    sha256: Optional[str] = None
    
    # Nested Collections
    observations: List[ObservationDetail] = []
    assessments: List[AssessmentDetail] = []
    links: List[IncidentLinkDetail] = []
    work_orders: List[WorkOrderDetail] = []
    audit_events: List[AuditEventDetail] = []

class IncidentSummary(BaseModel):
    id: str
    incident_number: str
    title: str
    category: str
    current_status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    readable_address: Optional[str] = None
    location_source: str
    location_accuracy_m: Optional[float] = None
    risk_score: float
    evidence_confidence: str
    observation_count: int = 1
    has_annotated_image: bool = False
    original_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    assigned_team: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ReviewActionRequest(BaseModel):
    decision: str  # approve, reject, request_evidence, corroborate, verify_field, verify_resolution
    reason: str
    notes: Optional[str] = None
    new_status: Optional[str] = None

class AssignRequest(BaseModel):
    assigned_to: Optional[str] = None
    assigned_team: str
    notes: Optional[str] = None

class WorkOrderCreateRequest(BaseModel):
    title: str
    assigned_team: str
    assigned_inspector: Optional[str] = None
    due_date: Optional[datetime] = None
    checklist: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class IncidentStatsResponse(BaseModel):
    total_incidents: int
    open_incidents: int
    critical_incidents: int
    awaiting_verification: int
    assigned_incidents: int
    repair_claimed: int
    resolution_pending_review: int
    resolved_incidents: int
    by_category: Dict[str, int]
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    daily_trend: List[Dict[str, Any]]

