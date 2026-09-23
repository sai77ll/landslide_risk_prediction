"""
Main FastAPI application entry point.
Landslide Risk Intelligence & Emergency Response Platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from database.database import Base, engine
from database import models  # noqa: F401 — ensure models are registered
from routers import predict, zones, reports, incidents, alerts, analytics, messaging
from models.train_model import train_and_save
from services.prediction_service import prediction_service


import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: train model if needed, then load it."""
    model_path = os.path.join(
        os.path.dirname(__file__), "models", "landslide_model.pkl"
    )
    if not os.path.exists(model_path):
        print("[INFO] No trained model found. Training now...")
        train_and_save()

    print("[INFO] Loading ML model...")
    prediction_service.load()

    # Create all database tables
    Base.metadata.create_all(bind=engine)

    # Seed initial data if DB is empty
    from database.database import SessionLocal
    from seed_data import seed_database
    db = SessionLocal()
    try:
        if db.query(models.RiskZone).count() == 0:
            print("[INFO] Seeding initial data...")
            seed_database(db)
            print("[OK] Seed data loaded")
    finally:
        db.close()

    print("[OK] Application ready!")
    yield
    print("[INFO] Shutting down...")


app = FastAPI(
    title="Landslide Risk Intelligence & Emergency Response Platform",
    description=(
        "AI-powered early prediction, explainability, incident verification, "
        "and emergency response prioritization system."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Register routers
app.include_router(predict.router)
app.include_router(zones.router)
app.include_router(reports.router)
app.include_router(incidents.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(messaging.router)


@app.get("/")
def root():
    return {
        "name": "Landslide Risk Intelligence Platform",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": prediction_service._loaded}
