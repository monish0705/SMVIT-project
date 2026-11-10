from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class GeoProofAnalysisResponse(BaseModel):
    has_exif: bool
    exif_gps_found: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: str
    accuracy_m: Optional[float] = None
    readable_address: Optional[str] = None
    photo_capture_claimed_at: Optional[datetime] = None
    evidence_quality: str  # high, medium, low
    warning: Optional[str] = None
    sha256_hash: str

class ReportSubmissionResponse(BaseModel):
    report_id: str
    report_number: str
    incident_id: Optional[str] = None
    incident_number: Optional[str] = None
    processing_status: str
    category: str
    status: str
    location_source: str
    location_status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    readable_address: Optional[str] = None
    photo_capture_claimed_at: Optional[datetime] = None
    submitted_at: datetime
    sha256: str
    original_asset_url: str
    annotated_asset_url: Optional[str] = None
    duplicate_candidate_found: bool = False
    duplicate_candidate_id: Optional[str] = None
    duplicate_reason: Optional[str] = None
    risk_score: float = 0.0
    evidence_confidence: str = "low"
    message: str

