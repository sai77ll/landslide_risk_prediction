"""
/api/incidents — Incident management with full CRUD and verification workflow.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os, uuid

from database.database import get_db
from database import models
from services.verification_service import (
    compute_verification_confidence,
    determine_verification_status,
    get_status_label,
)
from services.priority_service import compute_priority_score, get_response_actions

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("")
def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    priority_level: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List incidents with optional filters."""
    query = db.query(models.Incident)
    if status:
        query = query.filter(models.Incident.status == status)
    if severity:
        query = query.filter(models.Incident.severity == severity)
    if priority_level:
        query = query.filter(models.Incident.priority_level == priority_level.lower())
    incidents = query.order_by(models.Incident.priority_score.desc()).limit(limit).all()
    return [_incident_to_dict(i) for i in incidents]


@router.get("/priority-queue")
def get_priority_queue(db: Session = Depends(get_db)):
    """Return incidents ordered by priority score (emergency response queue)."""
    incidents = (
        db.query(models.Incident)
        .filter(models.Incident.status.notin_(["rejected"]))
        .order_by(models.Incident.priority_score.desc())
        .limit(50)
        .all()
    )
    return [_incident_to_dict(i) for i in incidents]


@router.get("/{incident_id_str}")
def get_incident(incident_id_str: str, db: Session = Depends(get_db)):
    """Get incident by INC-YYYY-NNNN ID string."""
    # Try numeric first, then string ID
    incident = None
    if incident_id_str.startswith("INC-"):
        incident = db.query(models.Incident).filter(
            models.Incident.incident_id == incident_id_str
        ).first()
    else:
        try:
            iid = int(incident_id_str)
            incident = db.query(models.Incident).filter(models.Incident.id == iid).first()
        except ValueError:
            pass

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = _incident_to_dict(incident)

    # Include detailed data
    result["reports"] = [
        {
            "id": r.id,
            "reporter_type": r.reporter_type,
            "severity": r.severity,
            "description": r.description,
            "road_blocked": r.road_blocked,
            "reported_at": r.reported_at.isoformat() if r.reported_at else None,
            "photo_count": len(r.photos) if r.photos else 0,
        }
        for r in incident.reports
    ]
    result["audit_trail"] = [
        {
            "action": a.action,
            "previous_status": a.previous_status,
            "new_status": a.new_status,
            "performed_by": a.performed_by,
            "comment": a.comment,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in sorted(incident.audit_logs, key=lambda x: x.timestamp or datetime.min)
    ]

    # Response recommendations
    hours_since = (
        (datetime.now(timezone.utc) - incident.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
        if incident.created_at else 0
    )
    result["response_actions"] = get_response_actions(
        priority_level=incident.priority_level.upper() if incident.priority_level else "LOW",
        incident_type=incident.incident_type or "landslide",
        road_blocked=incident.road_blocked,
    )

    return result


class StatusUpdate(BaseModel):
    status: str
    performed_by: str = "operator"
    comment: Optional[str] = None
    response_team: Optional[str] = None


@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    update: StatusUpdate,
    db: Session = Depends(get_db),
):
    """Update verification/response status of an incident (audit logged)."""
    VALID_STATUSES = {"reported", "under_review", "corroborated", "verified", "rejected"}
    VALID_RESPONSE = {"pending", "dispatched", "on_site", "resolved"}

    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = incident.status
    new_status = update.status.lower()

    if new_status not in VALID_STATUSES and new_status not in VALID_RESPONSE:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    # Determine if it's verification or response status
    if new_status in VALID_STATUSES:
        incident.status = new_status
        if new_status == "verified":
            incident.verified_by = update.performed_by
            incident.verified_at = datetime.now(timezone.utc)
    else:
        incident.response_status = new_status

    if update.response_team:
        incident.response_team_assigned = update.response_team

    audit = models.AuditLog(
        incident_id=incident.id,
        action="status_updated",
        previous_status=old_status,
        new_status=new_status,
        performed_by=update.performed_by,
        comment=update.comment,
    )
    db.add(audit)

    # Recalculate priority after status change
    hours_since = (
        (datetime.now(timezone.utc) - incident.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
        if incident.created_at else 0
    )
    priority = compute_priority_score(
        severity=incident.severity or "moderate",
        verification_confidence=incident.verification_confidence or 0,
        risk_score=incident.predicted_risk_score,
        people_affected=incident.people_affected or 0,
        road_blocked=incident.road_blocked,
        hospitals_nearby=0,
        schools_nearby=0,
        response_status=incident.response_status,
        hours_since_incident=hours_since,
    )
    incident.priority_score = priority["priority_score"]
    incident.priority_level = priority["priority_level"].lower()

    db.commit()
    return {"status": "updated", "incident_id": incident_id, "new_status": new_status}


def _incident_to_dict(i: models.Incident) -> dict:
    status_meta = get_status_label(i.status or "reported")
    return {
        "id": i.id,
        "incident_id": i.incident_id,
        "title": i.title,
        "incident_type": i.incident_type,
        "severity": i.severity,
        "latitude": i.latitude,
        "longitude": i.longitude,
        "location_description": i.location_description,
        "district": i.district,
        "state": i.state,
        "status": i.status,
        "status_meta": status_meta,
        "verification_confidence": i.verification_confidence,
        "verified_by": i.verified_by,
        "verified_at": i.verified_at.isoformat() if i.verified_at else None,
        "road_blocked": i.road_blocked,
        "road_name": i.road_name,
        "people_affected": i.people_affected,
        "houses_damaged": i.houses_damaged,
        "infrastructure_affected": i.infrastructure_affected,
        "priority_score": i.priority_score,
        "priority_level": i.priority_level,
        "response_team_assigned": i.response_team_assigned,
        "response_status": i.response_status,
        "predicted_risk_score": i.predicted_risk_score,
        "rainfall_at_incident": i.rainfall_at_incident,
        "description": i.description,
        "incident_time": i.incident_time.isoformat() if i.incident_time else None,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "report_count": len(i.reports) if i.reports else 0,
    }
