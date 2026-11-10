import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    work_order_number = Column(String(50), unique=True, index=True, nullable=False)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    assigned_team = Column(String(255), nullable=False)
    assigned_inspector = Column(String(255), nullable=True)
    
    status = Column(String(50), default="draft")  # draft, assigned, in_progress, repair_claimed, verified_complete, cancelled
    checklist = Column(JSON, default=list)
    inspection_notes = Column(Text, nullable=True)
    repair_notes = Column(Text, nullable=True)
    
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    incident = relationship("Incident", back_populates="work_orders")

