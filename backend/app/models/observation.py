import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    observation_number = Column(String(50), unique=True, index=True, nullable=False)
    
    source_type = Column(String(50), default="citizen_mobile")  # citizen_mobile, field_inspector, gallery_upload, contractor, synthetic_seed
    capture_mode = Column(String(50), default="gallery")  # gallery, camera, manual
    description = Column(Text, nullable=True)
    
    observed_at = Column(DateTime, nullable=True)  # Claimed capture time from EXIF or user
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_by = Column(String(255), default="Anonymous Contributor")
    reporter_device_info = Column(String(255), nullable=True)
    
    processing_status = Column(String(50), default="queued")  # queued, analyzing, needs_review, completed, failed
    
    # Relationships
    incident = relationship("Incident", back_populates="observations")
    locations = relationship("LocationObservation", back_populates="observation", cascade="all, delete-orphan")
    evidence_assets = relationship("EvidenceAsset", back_populates="observation", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="observation", cascade="all, delete-orphan")

