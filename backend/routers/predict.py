"""
POST /api/predict — Run ML prediction for a zone or ad-hoc inputs.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from database.database import get_db
from database import models
from services.prediction_service import prediction_service
from services.alert_service import generate_prediction_alert

router = APIRouter(prefix="/api/predict", tags=["Prediction"])


class PredictRequest(BaseModel):
    zone_id: Optional[int] = None
    zone_name: Optional[str] = "Unknown Zone"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Environmental inputs
    rainfall_mm: float = Field(..., ge=0, le=1000, description="Rainfall mm/day")
    rainfall_intensity: float = Field(..., ge=0, le=100, description="mm/hr")
    cumulative_rainfall: float = Field(..., ge=0, le=2000, description="72h cumulative mm")
    soil_moisture: float = Field(..., ge=0, le=1, description="Fraction 0-1")
    slope_degrees: float = Field(..., ge=0, le=90, description="Slope angle in degrees")
    elevation_m: float = Field(..., ge=0, le=8848, description="Elevation in meters")
    vegetation_index: float = Field(..., ge=0, le=1, description="NDVI-like 0-1")
    geology_risk: float = Field(..., ge=0, le=1, description="Geology risk 0-1")
    drainage_score: float = Field(..., ge=0, le=1, description="Drainage capacity 0-1")

    class Config:
        json_schema_extra = {
            "example": {
                "zone_name": "Chamoli - Badrinath Road",
                "latitude": 30.744,
                "longitude": 79.493,
                "rainfall_mm": 120,
                "rainfall_intensity": 8.5,
                "cumulative_rainfall": 280,
                "soil_moisture": 0.78,
                "slope_degrees": 42,
                "elevation_m": 1800,
                "vegetation_index": 0.35,
                "geology_risk": 0.65,
                "drainage_score": 0.3,
            }
        }


@router.post("")
async def predict_risk(request: PredictRequest, db: Session = Depends(get_db)):
    """Run ML landslide risk prediction and return risk score + SHAP explanation."""
    try:
        inputs = {
            "rainfall_mm": request.rainfall_mm,
            "rainfall_intensity": request.rainfall_intensity,
            "cumulative_rainfall": request.cumulative_rainfall,
            "soil_moisture": request.soil_moisture,
            "slope_degrees": request.slope_degrees,
            "elevation_m": request.elevation_m,
            "vegetation_index": request.vegetation_index,
            "geology_risk": request.geology_risk,
            "drainage_score": request.drainage_score,
        }

        result = prediction_service.predict(inputs)

        # Update zone if zone_id provided
        zone = None
        if request.zone_id:
            zone = db.query(models.RiskZone).filter(models.RiskZone.id == request.zone_id).first()
            if zone:
                zone.risk_score = result["risk_score"]
                zone.risk_level = result["risk_level"]
                zone.prediction_confidence = result["confidence"]
                zone.last_predicted_at = datetime.now(timezone.utc)
                zone.feature_importance = {
                    c["feature"]: c["importance_pct"]
                    for c in result["feature_contributions"]
                }
                zone.risk_explanation = result["explanation"]
                for k, v in inputs.items():
                    setattr(zone, k, v)
                db.commit()

        # Save prediction history
        hist = models.PredictionHistory(
            zone_id=request.zone_id,
            zone_name=request.zone_name or (zone.name if zone else "Ad-hoc"),
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            **inputs,
            feature_importance={
                c["feature"]: c["importance_pct"]
                for c in result["feature_contributions"]
            },
        )
        db.add(hist)

        # Create alert if HIGH or CRITICAL
        if result["risk_level"] in ("HIGH", "CRITICAL") and (request.latitude or (zone and zone.latitude)):
            lat = request.latitude or (zone.latitude if zone else 0)
            lon = request.longitude or (zone.longitude if zone else 0)
            alert_data = generate_prediction_alert(
                zone_name=request.zone_name or (zone.name if zone else "Unknown"),
                risk_level=result["risk_level"],
                risk_score=result["risk_score"],
                latitude=lat,
                longitude=lon,
                zone_id=request.zone_id,
            )
            alert = models.Alert(**{k: v for k, v in alert_data.items() if k != "expires_at"})
            db.add(alert)

        db.commit()

        return {
            "status": "success",
            "zone_name": request.zone_name,
            "inputs": inputs,
            **result,
            "predicted_at": datetime.now(timezone.utc).isoformat(),
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"ML model not available: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
