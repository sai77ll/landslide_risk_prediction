"""
/api/alerts — Active system alerts.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from database.database import get_db
from database import models

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("")
def get_alerts(active_only: bool = True, limit: int = 50, db: Session = Depends(get_db)):
    """Get system alerts."""
    query = db.query(models.Alert)
    if active_only:
        query = query.filter(models.Alert.is_active == True)
    alerts = query.order_by(models.Alert.created_at.desc()).limit(limit).all()
    return [_alert_to_dict(a) for a in alerts]


@router.patch("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, acknowledged_by: str = "operator", db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    alert.acknowledged_by = acknowledged_by
    db.commit()
    return {"status": "acknowledged"}


def _alert_to_dict(a: models.Alert) -> dict:
    return {
        "id": a.id,
        "alert_type": a.alert_type,
        "level": a.level,
        "title": a.title,
        "message": a.message,
        "location": a.location,
        "latitude": a.latitude,
        "longitude": a.longitude,
        "zone_id": a.zone_id,
        "incident_id": a.incident_id,
        "is_active": a.is_active,
        "acknowledged": a.acknowledged,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
