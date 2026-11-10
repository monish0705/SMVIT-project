import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class LocationObservation(Base):
    __tablename__ = "location_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    observation_id = Column(String(36), ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_m = Column(Float, nullable=True)
    
    # Source provenance
    source = Column(String(50), nullable=False)  # photo_exif, device_gps_at_capture, device_gps_at_submission, manual_map_pin, inspector_confirmed
    collected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_user_corrected = Column(Boolean, default=False)
    
    readable_address = Column(String(500), nullable=True)
    verified = Column(Boolean, default=False)
    reviewer_note = Column(Text, nullable=True)
    
    observation = relationship("Observation", back_populates="locations")
    incident = relationship("Incident", back_populates="location_observations")

