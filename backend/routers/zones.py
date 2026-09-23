"""
/api/zones — Risk zone CRUD and geospatial data.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from database.database import get_db
from database import models

router = APIRouter(prefix="/api/zones", tags=["Zones"])


@router.get("")
def get_zones(
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all risk zones, optionally filtered by risk level."""
    query = db.query(models.RiskZone)
    if risk_level:
        query = query.filter(models.RiskZone.risk_level == risk_level.upper())
    zones = query.all()
    return [_zone_to_dict(z) for z in zones]


@router.get("/{zone_id}")
def get_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(models.RiskZone).filter(models.RiskZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return _zone_to_dict(zone)


@router.get("/{zone_id}/history")
def get_zone_history(zone_id: int, limit: int = 48, db: Session = Depends(get_db)):
    """Return prediction history for a zone (for trend charts)."""
    history = (
        db.query(models.PredictionHistory)
        .filter(models.PredictionHistory.zone_id == zone_id)
        .order_by(models.PredictionHistory.predicted_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "risk_score": h.risk_score,
            "risk_level": h.risk_level,
            "confidence": h.confidence,
            "rainfall_mm": h.rainfall_mm,
            "soil_moisture": h.soil_moisture,
            "predicted_at": h.predicted_at.isoformat() if h.predicted_at else None,
        }
        for h in reversed(history)
    ]


def _zone_to_dict(z: models.RiskZone) -> dict:
    return {
        "id": z.id,
        "name": z.name,
        "district": z.district,
        "state": z.state,
        "latitude": z.latitude,
        "longitude": z.longitude,
        "geom_type": z.geom_type,
        "radius_km": z.radius_km,
        "polygon_coords": z.polygon_coords,
        "risk_score": z.risk_score,
        "risk_level": z.risk_level,
        "prediction_confidence": z.prediction_confidence,
        "last_predicted_at": z.last_predicted_at.isoformat() if z.last_predicted_at else None,
        "rainfall_mm": z.rainfall_mm,
        "soil_moisture": z.soil_moisture,
        "slope_degrees": z.slope_degrees,
        "elevation_m": z.elevation_m,
        "vegetation_index": z.vegetation_index,
        "geology_risk": z.geology_risk,
        "drainage_score": z.drainage_score,
        "feature_importance": z.feature_importance,
        "risk_explanation": z.risk_explanation,
        "population_at_risk": z.population_at_risk,
        "roads_at_risk": z.roads_at_risk,
        "hospitals_nearby": z.hospitals_nearby,
        "schools_nearby": z.schools_nearby,
    }
