import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="pothole", index=True)
    
    current_status = Column(String(50), default="candidate", index=True)
    # Statuses: candidate, needs_location, needs_review, corroborated, field_verified,
    # assigned, in_progress, repair_claimed, resolution_pending_review, resolution_verified, closed, rejected
    
    # Primary representative location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    readable_address = Column(String(500), nullable=True)
    location_source = Column(String(50), default="unknown")
    location_accuracy_m = Column(Float, nullable=True)
    location_verified = Column(Boolean, default=False)
    
    # Priority & Evidence Risk Engine
    risk_score = Column(Float, default=0.0)
    risk_breakdown = Column(JSON, default=dict)
    evidence_confidence = Column(String(20), default="low")  # low, medium, high
    evidence_confidence_score = Column(Float, default=0.0)
    priority_recommendation = Column(Text, nullable=True)
    
    # Operational Assignment
    assigned_to = Column(String(255), nullable=True)
    assigned_team = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    observations = relationship("Observation", back_populates="incident", cascade="all, delete-orphan")
    location_observations = relationship("LocationObservation", back_populates="incident", cascade="all, delete-orphan")
    evidence_assets = relationship("EvidenceAsset", back_populates="incident", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="incident", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="incident", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="incident", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="incident", cascade="all, delete-orphan")

