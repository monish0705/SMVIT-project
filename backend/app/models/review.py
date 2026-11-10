import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    reviewer_name = Column(String(255), nullable=False)
    reviewer_role = Column(String(50), nullable=False)
    decision = Column(String(50), nullable=False)  # approve, reject, request_evidence, corroborate, verify_field, verify_resolution
    reason = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    incident = relationship("Incident", back_populates="reviews")
    reviewer = relationship("User")

