"""
/api/analytics — Historical trends and statistics.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from database.database import get_db
from database import models

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Top-level KPI summary for the dashboard."""
    total_zones = db.query(models.RiskZone).count()
    high_risk_zones = db.query(models.RiskZone).filter(
        models.RiskZone.risk_level.in_(["HIGH", "CRITICAL"])
    ).count()
    critical_zones = db.query(models.RiskZone).filter(
        models.RiskZone.risk_level == "CRITICAL"
    ).count()

    active_incidents = db.query(models.Incident).filter(
        models.Incident.status.notin_(["rejected"])
    ).count()
    verified_incidents = db.query(models.Incident).filter(
        models.Incident.status == "verified"
    ).count()
    pending_reports = db.query(models.Report).filter(
        models.Report.status == "pending"
    ).count()

    people_affected = db.query(func.sum(models.Incident.people_affected)).scalar() or 0
    roads_blocked = db.query(models.Incident).filter(
        models.Incident.road_blocked == True,
        models.Incident.status.notin_(["rejected"]),
    ).count()

    critical_incidents = db.query(models.Incident).filter(
        models.Incident.priority_level == "critical"
    ).count()

    active_alerts = db.query(models.Alert).filter(
        models.Alert.is_active == True,
        models.Alert.acknowledged == False,
    ).count()

    return {
        "total_zones": total_zones,
        "high_risk_zones": high_risk_zones,
        "critical_zones": critical_zones,
        "active_incidents": active_incidents,
        "verified_incidents": verified_incidents,
        "pending_reports": pending_reports,
        "people_affected": int(people_affected),
        "roads_blocked": roads_blocked,
        "critical_incidents": critical_incidents,
        "active_alerts": active_alerts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/risk-trend")
def get_risk_trend(zone_id: int = None, days: int = 7, db: Session = Depends(get_db)):
    """Return risk score trend over time."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    query = db.query(models.PredictionHistory).filter(
        models.PredictionHistory.predicted_at >= since
    )
    if zone_id:
        query = query.filter(models.PredictionHistory.zone_id == zone_id)
    history = query.order_by(models.PredictionHistory.predicted_at).all()

    return [
        {
            "zone_name": h.zone_name,
            "risk_score": h.risk_score,
            "risk_level": h.risk_level,
            "rainfall_mm": h.rainfall_mm,
            "soil_moisture": h.soil_moisture,
            "predicted_at": h.predicted_at.isoformat() if h.predicted_at else None,
        }
        for h in history
    ]


@router.get("/incident-frequency")
def get_incident_frequency(days: int = 30, db: Session = Depends(get_db)):
    """Return daily incident counts for the past N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    incidents = db.query(models.Incident).filter(
        models.Incident.created_at >= since
    ).all()

    # Group by date
    from collections import defaultdict
    counts = defaultdict(int)
    for inc in incidents:
        if inc.created_at:
            date_key = inc.created_at.strftime("%Y-%m-%d")
            counts[date_key] += 1

    # Fill in all days
    result = []
    for i in range(days):
        day = (since + timedelta(days=i)).strftime("%Y-%m-%d")
        result.append({"date": day, "count": counts.get(day, 0)})

    return result


@router.get("/severity-breakdown")
def get_severity_breakdown(db: Session = Depends(get_db)):
    """Incident count by severity."""
    results = (
        db.query(models.Incident.severity, func.count(models.Incident.id))
        .group_by(models.Incident.severity)
        .all()
    )
    return [{"severity": r[0], "count": r[1]} for r in results]


@router.get("/zone-risk-distribution")
def get_zone_risk_distribution(db: Session = Depends(get_db)):
    """Count of zones per risk level."""
    results = (
        db.query(models.RiskZone.risk_level, func.count(models.RiskZone.id))
        .group_by(models.RiskZone.risk_level)
        .all()
    )
    return [{"risk_level": r[0], "count": r[1]} for r in results]
