import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class IncidentLink(Base):
    __tablename__ = "incident_links"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    from_incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    to_incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    relation_type = Column(String(50), nullable=False)  # supports, possible_duplicate_of, contradicts, updates, resolution_evidence_for, reviewed_by
    score = Column(Float, default=1.0)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="candidate")  # candidate, confirmed, rejected
    
    created_by = Column(String(255), default="CivicPulse Correlation Engine")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    from_incident = relationship("Incident", foreign_keys=[from_incident_id])
    to_incident = relationship("Incident", foreign_keys=[to_incident_id])

