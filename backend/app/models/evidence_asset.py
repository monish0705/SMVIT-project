import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class EvidenceAsset(Base):
    __tablename__ = "evidence_assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    observation_id = Column(String(36), ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    
    original_path = Column(String(500), nullable=False)
    annotated_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    
    sha256 = Column(String(64), nullable=False, index=True)
    perceptual_hash = Column(String(64), nullable=True, index=True)
    
    mime_type = Column(String(100), default="image/jpeg")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    
    exif_data = Column(JSON, default=dict)
    is_repair_evidence = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    observation = relationship("Observation", back_populates="evidence_assets")
    incident = relationship("Incident", back_populates="evidence_assets")

