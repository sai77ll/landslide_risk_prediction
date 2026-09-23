"""
Alert generation service — creates system alerts from predictions and incidents.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional


def generate_prediction_alert(
    zone_name: str,
    risk_level: str,
    risk_score: float,
    latitude: float,
    longitude: float,
    zone_id: Optional[int] = None,
) -> dict:
    """Generate an alert dict from a high-risk prediction."""
    level_map = {
        "CRITICAL": "emergency",
        "HIGH": "warning",
        "MODERATE": "advisory",
        "LOW": "informational",
    }
    title_map = {
        "CRITICAL": f"⚠️ CRITICAL Risk — {zone_name}",
        "HIGH": f"🔶 High Landslide Risk — {zone_name}",
        "MODERATE": f"🟡 Elevated Risk Advisory — {zone_name}",
        "LOW": f"ℹ️ Low Risk Update — {zone_name}",
    }
    now = datetime.now(timezone.utc)
    return {
        "alert_type": "prediction",
        "level": level_map.get(risk_level, "informational"),
        "title": title_map.get(risk_level, f"Risk Update — {zone_name}"),
        "message": (
            f"Predicted landslide risk score: {risk_score:.0f}/100 ({risk_level}). "
            f"Location: {zone_name}. "
            f"This is a model-based prediction — field verification recommended."
        ),
        "location": zone_name,
        "latitude": latitude,
        "longitude": longitude,
        "zone_id": zone_id,
        "is_active": risk_level in ("CRITICAL", "HIGH"),
        "expires_at": (now + timedelta(hours=6)).isoformat(),
    }


def generate_incident_alert(
    incident_id: str,
    severity: str,
    location: str,
    incident_type: str,
    latitude: float,
    longitude: float,
    db_incident_id: Optional[int] = None,
) -> dict:
    """Generate an alert dict from a new or escalated incident."""
    sev_level = {
        "critical": "emergency",
        "severe": "warning",
        "moderate": "advisory",
        "minor": "informational",
    }
    now = datetime.now(timezone.utc)
    return {
        "alert_type": "incident",
        "level": sev_level.get(severity.lower(), "advisory"),
        "title": f"🚨 New {severity.title()} {incident_type.replace('_', ' ').title()} — {location}",
        "message": (
            f"Incident {incident_id} reported: {incident_type.replace('_', ' ')} "
            f"at {location}. Severity: {severity.upper()}. "
            f"Awaiting field verification."
        ),
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "incident_id": db_incident_id,
        "is_active": True,
        "expires_at": (now + timedelta(hours=12)).isoformat(),
    }
