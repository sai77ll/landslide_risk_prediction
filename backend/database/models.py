"""
SQLAlchemy ORM models for the Landslide Risk Intelligence Platform.
"""
from sqlalchemy import (
    Column, Integer, Float, String, Text, DateTime, Boolean, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class RiskZone(Base):
    """Geographic risk zone with current predicted risk."""
    __tablename__ = "risk_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    district = Column(String(100))
    state = Column(String(100), default="Uttarakhand")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # GeoJSON polygon or circle radius (km)
    geom_type = Column(String(20), default="point")  # point | polygon
    radius_km = Column(Float, default=5.0)
    polygon_coords = Column(JSON)  # list of [lat, lon] pairs

    # Current risk assessment
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")  # LOW|MODERATE|HIGH|CRITICAL
    prediction_confidence = Column(Float, default=0.0)
    last_predicted_at = Column(DateTime, default=utcnow)

    # Environmental conditions at time of last prediction
    rainfall_mm = Column(Float)
    rainfall_intensity = Column(Float)
    cumulative_rainfall = Column(Float)
    soil_moisture = Column(Float)
    slope_degrees = Column(Float)
    elevation_m = Column(Float)
    vegetation_index = Column(Float)
    geology_risk = Column(Float)
    drainage_score = Column(Float)

    # SHAP / feature importance (JSON)
    feature_importance = Column(JSON)
    risk_explanation = Column(Text)

    # Population and infrastructure
    population_at_risk = Column(Integer, default=0)
    roads_at_risk = Column(Integer, default=0)
    hospitals_nearby = Column(Integer, default=0)
    schools_nearby = Column(Integer, default=0)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    incidents = relationship("Incident", back_populates="zone")


class Incident(Base):
    """A reported or detected landslide incident."""
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(20), unique=True, index=True)  # e.g. INC-2024-001
    zone_id = Column(Integer, ForeignKey("risk_zones.id"), nullable=True)

    title = Column(String(300))
    incident_type = Column(String(50))   # landslide|rockfall|mudslide|ground_cracks|road_blockage|other
    severity = Column(String(20))         # minor|moderate|severe|critical

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_description = Column(String(500))
    district = Column(String(100))
    state = Column(String(100), default="Uttarakhand")

    # Verification lifecycle
    status = Column(String(30), default="reported")
    # reported | under_review | corroborated | verified | rejected
    verification_confidence = Column(Float, default=0.0)
    verified_by = Column(String(100))
    verified_at = Column(DateTime)

    # Impact
    road_blocked = Column(Boolean, default=False)
    road_name = Column(String(200))
    people_affected = Column(Integer, default=0)
    houses_damaged = Column(Integer, default=0)
    infrastructure_affected = Column(Text)

    # Response prioritization
    priority_score = Column(Float, default=0.0)
    priority_level = Column(String(20), default="low")  # low|medium|high|critical
    response_team_assigned = Column(String(200))
    response_status = Column(String(50), default="pending")  # pending|dispatched|on_site|resolved

    # Environmental at time of incident
    predicted_risk_score = Column(Float)
    rainfall_at_incident = Column(Float)

    description = Column(Text)
    notes = Column(Text)

    # Timestamps
    incident_time = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    zone = relationship("RiskZone", back_populates="incidents")
    reports = relationship("Report", back_populates="incident")
    photos = relationship("IncidentPhoto", back_populates="incident")
    audit_logs = relationship("AuditLog", back_populates="incident")


class Report(Base):
    """A citizen or field officer report of a suspected incident."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)

    # Reporter info (kept private)
    reporter_name = Column(String(200))
    reporter_phone = Column(String(20))
    reporter_type = Column(String(30), default="citizen")  # citizen|field_officer|authority

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_description = Column(String(500))

    # Incident details
    incident_type = Column(String(50))
    severity = Column(String(20))
    description = Column(Text)

    # Observations
    road_blocked = Column(Boolean, default=False)
    cracks_visible = Column(Boolean, default=False)
    rockfall = Column(Boolean, default=False)
    soil_movement = Column(Boolean, default=False)
    water_flow_change = Column(Boolean, default=False)
    casualties_reported = Column(Boolean, default=False)
    houses_damaged = Column(Integer, default=0)

    # Status
    status = Column(String(30), default="pending")  # pending|reviewed|linked|rejected
    reviewed_by = Column(String(100))
    reviewed_at = Column(DateTime)

    reported_at = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)

    incident = relationship("Incident", back_populates="reports")
    photos = relationship("ReportPhoto", back_populates="report")


class IncidentPhoto(Base):
    __tablename__ = "incident_photos"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    filename = Column(String(300))
    filepath = Column(String(500))
    caption = Column(String(500))
    uploaded_at = Column(DateTime, default=utcnow)

    incident = relationship("Incident", back_populates="photos")


class ReportPhoto(Base):
    __tablename__ = "report_photos"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    filename = Column(String(300))
    filepath = Column(String(500))
    uploaded_at = Column(DateTime, default=utcnow)

    report = relationship("Report", back_populates="photos")


class Alert(Base):
    """System-generated alert for a risk zone or incident."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50))  # prediction|incident|weather|system
    level = Column(String(20))       # informational|advisory|warning|emergency
    title = Column(String(300))
    message = Column(Text)
    location = Column(String(300))
    latitude = Column(Float)
    longitude = Column(Float)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(100))
    created_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime)


class PredictionHistory(Base):
    """Historical log of predictions for a zone."""
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"))
    zone_name = Column(String(200))
    risk_score = Column(Float)
    risk_level = Column(String(20))
    confidence = Column(Float)

    # Inputs at prediction time
    rainfall_mm = Column(Float)
    rainfall_intensity = Column(Float)
    cumulative_rainfall = Column(Float)
    soil_moisture = Column(Float)
    slope_degrees = Column(Float)
    elevation_m = Column(Float)
    vegetation_index = Column(Float)
    geology_risk = Column(Float)
    drainage_score = Column(Float)

    feature_importance = Column(JSON)
    predicted_at = Column(DateTime, default=utcnow)


class AuditLog(Base):
    """Audit trail for incident status changes."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    action = Column(String(100))
    previous_status = Column(String(50))
    new_status = Column(String(50))
    performed_by = Column(String(100), default="system")
    comment = Column(Text)
    timestamp = Column(DateTime, default=utcnow)

    incident = relationship("Incident", back_populates="audit_logs")


class Resident(Base):
    """A person registered to receive landslide alerts near a risk zone."""
    __tablename__ = "residents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(200))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500))
    district = Column(String(100))
    state = Column(String(100), default="Uttarakhand")
    zone_id = Column(Integer, ForeignKey("risk_zones.id"), nullable=True)
    preferred_language = Column(String(10), default="en")  # en|hi|mr|bn|ur
    is_active = Column(Boolean, default=True)
    registered_at = Column(DateTime, default=utcnow)

    message_logs = relationship("MessageLog", back_populates="resident")


class MessageLog(Base):
    """Log of a broadcast alert message sent to a resident."""
    __tablename__ = "message_logs"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("risk_zones.id"), nullable=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)

    recipient_name = Column(String(200))
    recipient_phone = Column(String(20))
    message = Column(Text, nullable=False)
    alert_level = Column(String(20), default="warning")   # informational|advisory|warning|emergency
    channel = Column(String(20), default="sms")            # sms|app
    language = Column(String(10), default="en")            # language code of the sent message

    # Delivery status
    status = Column(String(20), default="pending")         # pending|sent|failed|simulated
    twilio_sid = Column(String(100))                       # Twilio message SID (if real SMS)
    error_message = Column(Text)                           # error if failed

    sent_by = Column(String(100), default="operator")
    sent_at = Column(DateTime, default=utcnow)

    resident = relationship("Resident", back_populates="message_logs")
