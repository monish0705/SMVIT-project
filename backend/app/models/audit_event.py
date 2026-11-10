import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    
    actor = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    
    previous_state = Column(String(100), nullable=True)
    new_state = Column(String(100), nullable=True)
    reason = Column(Text, nullable=True)
    details = Column(JSON, default=dict)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    incident = relationship("Incident", back_populates="audit_events")

