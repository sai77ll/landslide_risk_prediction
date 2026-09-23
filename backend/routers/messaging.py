"""
/api/messaging — Broadcast alert messages to residents near a risk zone.
Uses simulated delivery: messages are logged in the DB as 'sent'.
No external SMS gateway is required.
"""
import math
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.database import get_db
from database import models
from services.language_service import (
    get_available_languages,
    build_bilingual_message,
    LANGUAGE_CODES,
)

router = APIRouter(prefix="/api/messaging", tags=["Messaging"])


# ─── Haversine distance ────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance between two points in kilometres."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class BroadcastRequest(BaseModel):
    zone_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = 10.0
    message: str
    alert_level: str = "warning"   # informational | advisory | warning | emergency
    language: str = "en"           # en | hi | mr | bn | ur | auto (per-resident)
    sent_by: str = "operator"
    alert_id: Optional[int] = None


class ResidentCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    district: Optional[str] = None
    state: str = "Uttarakhand"
    zone_id: Optional[int] = None
    preferred_language: str = "en"  # en | hi | mr | bn | ur


# ─── Helper serialisers ───────────────────────────────────────────────────────

def _resident_dict(r: models.Resident) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "phone": r.phone,          # full phone stored; mask in frontend
        "email": r.email,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "address": r.address,
        "district": r.district,
        "state": r.state,
        "zone_id": r.zone_id,
        "preferred_language": getattr(r, 'preferred_language', 'en') or 'en',
        "is_active": r.is_active,
        "registered_at": r.registered_at.isoformat() if r.registered_at else None,
    }


def _log_dict(l: models.MessageLog) -> dict:
    return {
        "id": l.id,
        "resident_id": l.resident_id,
        "zone_id": l.zone_id,
        "alert_id": l.alert_id,
        "recipient_name": l.recipient_name,
        # Mask middle digits: +91-XXXXX-XX789
        "recipient_phone": _mask_phone(l.recipient_phone),
        "message": l.message,
        "alert_level": l.alert_level,
        "language": getattr(l, 'language', 'en') or 'en',
        "channel": l.channel,
        "status": l.status,
        "twilio_sid": l.twilio_sid,
        "error_message": l.error_message,
        "sent_by": l.sent_by,
        "sent_at": l.sent_at.isoformat() if l.sent_at else None,
    }


def _mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "Unknown"
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) >= 4:
        return phone[: -len(digits) + 2] + "*" * (len(digits) - 4) + digits[-2:]
    return "****"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/languages")
def get_languages():
    """Return list of supported alert message languages."""
    return get_available_languages()

@router.post("/broadcast")
def broadcast_alert(req: BroadcastRequest, db: Session = Depends(get_db)):
    """
    Send a simulated SMS alert to all active residents within `radius_km`
    of the target zone centre (or explicit lat/lon).
    Returns the count of residents notified and a summary log.
    """
    # Resolve centre coordinates
    centre_lat = req.latitude
    centre_lon = req.longitude

    if req.zone_id and (centre_lat is None or centre_lon is None):
        zone = db.query(models.RiskZone).filter(models.RiskZone.id == req.zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        centre_lat = zone.latitude
        centre_lon = zone.longitude

    if centre_lat is None or centre_lon is None:
        raise HTTPException(
            status_code=400,
            detail="Provide zone_id or explicit latitude/longitude"
        )

    # Find residents within radius
    all_residents = db.query(models.Resident).filter(models.Resident.is_active == True).all()
    targets = [
        r for r in all_residents
        if _haversine_km(centre_lat, centre_lon, r.latitude, r.longitude) <= req.radius_km
    ]

    if not targets:
        return {
            "notified": 0,
            "radius_km": req.radius_km,
            "message": "No active residents found within the specified radius.",
            "logs": [],
        }

    logs_created = []
    for resident in targets:
        # Determine language: auto = use resident's own preference
        lang = (
            (getattr(resident, 'preferred_language', 'en') or 'en')
            if req.language == "auto"
            else (req.language if req.language in LANGUAGE_CODES else "en")
        )
        # Build bilingual message; override with custom message if provided
        # Custom message overrides only for 'en'; for other languages always use curated
        if req.language in ("auto",) or lang != "en":
            final_message = build_bilingual_message(
                alert_level=req.alert_level,
                language_code=lang,
                zone_name=req.zone_id and "" or "",
            )
        else:
            # Use the operator-written custom message (English only)
            final_message = req.message

        log = models.MessageLog(
            resident_id=resident.id,
            zone_id=req.zone_id,
            alert_id=req.alert_id,
            recipient_name=resident.name,
            recipient_phone=resident.phone,
            message=final_message,
            alert_level=req.alert_level,
            channel="sms",
            language=lang,
            status="sent",          # simulated — always succeeds
            twilio_sid=None,
            error_message=None,
            sent_by=req.sent_by,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        logs_created.append(log)

    db.commit()
    for log in logs_created:
        db.refresh(log)

    return {
        "notified": len(logs_created),
        "radius_km": req.radius_km,
        "zone_id": req.zone_id,
        "alert_level": req.alert_level,
        "language": req.language,
        "message": req.message,
        "logs": [_log_dict(l) for l in logs_created],
    }


@router.get("/preview")
def preview_broadcast(
    zone_id: Optional[int] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 10.0,
    db: Session = Depends(get_db),
):
    """Return how many residents would receive an alert (dry-run)."""
    centre_lat, centre_lon = latitude, longitude

    if zone_id and (centre_lat is None or centre_lon is None):
        zone = db.query(models.RiskZone).filter(models.RiskZone.id == zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        centre_lat, centre_lon = zone.latitude, zone.longitude

    if centre_lat is None or centre_lon is None:
        return {"count": 0, "residents": []}

    all_residents = db.query(models.Resident).filter(models.Resident.is_active == True).all()
    targets = [
        r for r in all_residents
        if _haversine_km(centre_lat, centre_lon, r.latitude, r.longitude) <= radius_km
    ]
    return {
        "count": len(targets),
        "residents": [
            {
                "id": r.id,
                "name": r.name,
                "phone": _mask_phone(r.phone),
                "district": r.district,
                "distance_km": round(
                    _haversine_km(centre_lat, centre_lon, r.latitude, r.longitude), 2
                ),
            }
            for r in targets
        ],
    }


@router.get("/logs")
def get_message_logs(
    zone_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Return message broadcast logs, optionally filtered by zone."""
    query = db.query(models.MessageLog)
    if zone_id:
        query = query.filter(models.MessageLog.zone_id == zone_id)
    logs = query.order_by(models.MessageLog.sent_at.desc()).limit(limit).all()
    return [_log_dict(l) for l in logs]


@router.get("/residents")
def get_residents(
    zone_id: Optional[int] = None,
    district: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """List registered residents."""
    query = db.query(models.Resident)
    if zone_id:
        query = query.filter(models.Resident.zone_id == zone_id)
    if district:
        query = query.filter(models.Resident.district.ilike(f"%{district}%"))
    if active_only:
        query = query.filter(models.Resident.is_active == True)
    return [_resident_dict(r) for r in query.all()]


@router.post("/residents", status_code=201)
def register_resident(data: ResidentCreate, db: Session = Depends(get_db)):
    """Register a new resident to receive alerts."""
    resident = models.Resident(**data.model_dump())
    db.add(resident)
    db.commit()
    db.refresh(resident)
    return _resident_dict(resident)


@router.delete("/residents/{resident_id}")
def delete_resident(resident_id: int, db: Session = Depends(get_db)):
    """Deactivate (soft-delete) a resident."""
    resident = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    resident.is_active = False
    db.commit()
    return {"status": "deactivated", "id": resident_id}
