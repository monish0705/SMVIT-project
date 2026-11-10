import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    observation_id = Column(String(36), ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    
    model_name = Column(String(100), default="gemini-3.8-flash")
    model_version = Column(String(50), default="1.0.0")
    
    # Structured Pydantic payload stored as JSON
    structured_output = Column(JSON, default=dict)
    is_fallback = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    observation = relationship("Observation", back_populates="assessments")
    incident = relationship("Incident", back_populates="assessments")

