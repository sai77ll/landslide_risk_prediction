"""
/api/reports — Citizen and field officer incident reports.
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from database.database import get_db
from database import models
from services.verification_service import compute_verification_confidence, determine_verification_status
from services.alert_service import generate_incident_alert

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/reports", tags=["Reports"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.get("")
def get_reports(status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """List all citizen/field reports."""
    query = db.query(models.Report)
    if status:
        query = query.filter(models.Report.status == status)
    reports = query.order_by(models.Report.reported_at.desc()).limit(limit).all()
    return [_report_to_dict(r) for r in reports]


@router.post("")
async def submit_report(
    # Location
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_description: str = Form(""),
    # Reporter
    reporter_name: str = Form("Anonymous"),
    reporter_phone: str = Form(""),
    reporter_type: str = Form("citizen"),
    # Incident details
    incident_type: str = Form(...),
    severity: str = Form(...),
    description: str = Form(""),
    # Observations (booleans as strings from form)
    road_blocked: str = Form("false"),
    cracks_visible: str = Form("false"),
    rockfall: str = Form("false"),
    soil_movement: str = Form("false"),
    water_flow_change: str = Form("false"),
    casualties_reported: str = Form("false"),
    houses_damaged: int = Form(0),
    # Photos
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    """Submit a citizen or field officer landslide report."""

    def parse_bool(v):
        return str(v).lower() in ("true", "1", "yes")

    report = models.Report(
        latitude=latitude,
        longitude=longitude,
        location_description=location_description,
        reporter_name=reporter_name,
        reporter_phone=reporter_phone,
        reporter_type=reporter_type,
        incident_type=incident_type,
        severity=severity,
        description=description,
        road_blocked=parse_bool(road_blocked),
        cracks_visible=parse_bool(cracks_visible),
        rockfall=parse_bool(rockfall),
        soil_movement=parse_bool(soil_movement),
        water_flow_change=parse_bool(water_flow_change),
        casualties_reported=parse_bool(casualties_reported),
        houses_damaged=houses_damaged,
        status="pending",
    )
    db.add(report)
    db.flush()  # get report.id

    # Save uploaded photos
    saved_photos = []
    if photos:
        for photo in photos:
            if photo.content_type in ALLOWED_TYPES:
                ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
                fname = f"report_{report.id}_{uuid.uuid4().hex[:8]}.{ext}"
                fpath = os.path.join(UPLOAD_DIR, fname)
                content = await photo.read()
                with open(fpath, "wb") as f:
                    f.write(content)
                rp = models.ReportPhoto(
                    report_id=report.id,
                    filename=fname,
                    filepath=fpath,
                )
                db.add(rp)
                saved_photos.append(fname)

    # Check if there's a nearby existing incident to link to
    nearby_incident = _find_nearby_incident(latitude, longitude, db)

    if nearby_incident:
        report.incident_id = nearby_incident.id
        # Recalculate verification confidence
        all_reports = db.query(models.Report).filter(
            models.Report.incident_id == nearby_incident.id
        ).all()
        has_photo_any = any(r.photos for r in all_reports) or len(saved_photos) > 0
        field_reports = sum(1 for r in all_reports if r.reporter_type == "field_officer")
        road_blocks = sum(1 for r in all_reports if r.road_blocked)
        casualties = any(r.casualties_reported for r in all_reports)

        conf = compute_verification_confidence(
            report_count=len(all_reports),
            has_photo=has_photo_any,
            has_field_report=field_reports > 0,
            model_risk_score=nearby_incident.predicted_risk_score,
            road_blocked_reports=road_blocks,
            casualties_reported=casualties,
        )
        new_status = determine_verification_status(conf)
        old_status = nearby_incident.status

        nearby_incident.verification_confidence = conf
        nearby_incident.status = new_status

        # Audit log
        if old_status != new_status:
            audit = models.AuditLog(
                incident_id=nearby_incident.id,
                action="status_updated_by_new_report",
                previous_status=old_status,
                new_status=new_status,
                performed_by="system",
                comment=f"New report received. Confidence updated to {conf:.0f}%.",
            )
            db.add(audit)
    else:
        # Create a new incident from this report
        incident_num = db.query(models.Incident).count() + 1
        incident_id_str = f"INC-{datetime.now(timezone.utc).year}-{incident_num:04d}"

        new_incident = models.Incident(
            incident_id=incident_id_str,
            title=f"{incident_type.replace('_', ' ').title()} at {location_description or f'{latitude:.3f}, {longitude:.3f}'}",
            incident_type=incident_type,
            severity=severity,
            latitude=latitude,
            longitude=longitude,
            location_description=location_description,
            status="reported",
            verification_confidence=20.0,
            road_blocked=parse_bool(road_blocked),
            people_affected=0,
            description=description,
        )
        db.add(new_incident)
        db.flush()

        report.incident_id = new_incident.id

        # Generate alert
        alert_data = generate_incident_alert(
            incident_id=incident_id_str,
            severity=severity,
            location=location_description or f"{latitude:.3f}, {longitude:.3f}",
            incident_type=incident_type,
            latitude=latitude,
            longitude=longitude,
            db_incident_id=new_incident.id,
        )
        alert = models.Alert(**{k: v for k, v in alert_data.items() if k != "expires_at"})
        db.add(alert)

        # Audit log
        audit = models.AuditLog(
            incident_id=new_incident.id,
            action="incident_created_from_report",
            previous_status=None,
            new_status="reported",
            performed_by="system",
            comment="New incident created from citizen report.",
        )
        db.add(audit)

    db.commit()
    db.refresh(report)

    return {
        "status": "success",
        "report_id": report.id,
        "incident_id": report.incident_id,
        "photos_saved": saved_photos,
        "message": "Report submitted successfully. Thank you for helping keep communities safe.",
    }


@router.get("/{report_id}")
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _report_to_dict(report)


def _find_nearby_incident(lat: float, lon: float, db: Session, radius_deg: float = 0.05):
    """Find an existing incident within ~5km of the reported location."""
    return (
        db.query(models.Incident)
        .filter(
            models.Incident.latitude.between(lat - radius_deg, lat + radius_deg),
            models.Incident.longitude.between(lon - radius_deg, lon + radius_deg),
            models.Incident.status.notin_(["rejected", "resolved"]),
        )
        .order_by(models.Incident.created_at.desc())
        .first()
    )


def _report_to_dict(r: models.Report) -> dict:
    return {
        "id": r.id,
        "incident_id": r.incident_id,
        "reporter_type": r.reporter_type,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "location_description": r.location_description,
        "incident_type": r.incident_type,
        "severity": r.severity,
        "description": r.description,
        "road_blocked": r.road_blocked,
        "cracks_visible": r.cracks_visible,
        "rockfall": r.rockfall,
        "soil_movement": r.soil_movement,
        "water_flow_change": r.water_flow_change,
        "casualties_reported": r.casualties_reported,
        "houses_damaged": r.houses_damaged,
        "status": r.status,
        "reported_at": r.reported_at.isoformat() if r.reported_at else None,
        "photo_count": len(r.photos) if r.photos else 0,
    }
