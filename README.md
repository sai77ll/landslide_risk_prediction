# LandGuard — AI-Powered Landslide Risk Intelligence & Emergency Response Platform

## Quick Start

### 1. Start the Backend (FastAPI + ML)
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```
Or double-click `start_backend.bat`

### 2. Start the Frontend (React + Vite)
```bash
cd frontend
npm run dev
```
Or double-click `start_frontend.bat`

### 3. Open the Dashboard
Navigate to: **http://localhost:5173**

API Documentation: **http://localhost:8000/docs**

---

## System Architecture

```
DATA SOURCES (Environmental + Reports)
      ↓
ML PREDICTION (RandomForest + SHAP)
      ↓
RISK SCORE + EXPLAINABILITY
      ↓
INCIDENT REPORTING (Citizen/Field)
      ↓
EVIDENCE + CORROBORATION
      ↓
INCIDENT VERIFICATION WORKFLOW
      ↓
IMPACT ASSESSMENT + PRIORITY SCORING
      ↓
EMERGENCY OPERATOR DASHBOARD
```

## Features

| Feature | Implementation |
|---|---|
| **Early Risk Prediction** | RandomForest (200 trees) trained on 8000 samples |
| **SHAP Explainability** | TreeExplainer with per-feature contribution |
| **Plain Language Explanation** | "Why is this area at risk?" |
| **Interactive Risk Map** | Leaflet.js with risk zone circles + incident markers |
| **Citizen Reporting** | Form with GPS, photo upload, observations |
| **Incident Verification** | 5-state workflow (Reported → Verified) |
| **Report Corroboration** | Multi-source confidence scoring |
| **Priority Queue** | Weighted scoring: severity, confidence, population, infrastructure |
| **Response Recommendations** | Context-aware immediate + follow-up actions |
| **Alerts System** | Auto-generated from HIGH/CRITICAL predictions |
| **Dark/Light Theme** | Full CSS variable theme system |
| **Audit Trail** | Every status change logged with timestamp + operator |
| **Historical Analytics** | Charts for trends, frequency, severity, distribution |
| **Responsive Design** | Desktop, tablet, and mobile layouts |

## Risk Levels

| Level | Score | Color | Meaning |
|---|---|---|---|
| 🟢 LOW | 0–25 | Green | Minimal conditions |
| 🟡 MODERATE | 26–50 | Yellow | Elevated monitoring |
| 🟠 HIGH | 51–75 | Orange | Significant risk |
| 🔴 CRITICAL | 76–100 | Red | Immediate attention |

## Incident Verification States

| State | Meaning |
|---|---|
| 🟡 Reported | Initial submission |
| 🔵 Under Review | Being assessed |
| 🟠 Corroborated | Multiple reports + evidence |
| 🟢 Verified | Field/authority confirmed |
| 🔴 Rejected | Determined false |

## Important Disclaimer

This system provides **decision support** for authorized emergency management personnel.
Predictions are estimates from a machine learning model — they require field verification
before emergency action. This system does not replace emergency services (call 112).

---

## Project Structure

```
sih6001/
├── backend/             FastAPI + ML Backend
│   ├── main.py          App entry point
│   ├── models/          RandomForest model + training
│   ├── database/        SQLAlchemy ORM models
│   ├── routers/         API endpoints
│   ├── services/        Business logic
│   └── seed_data.py     Initial zone/incident data
│
└── frontend/            React + Vite Frontend
    └── src/
        ├── App.jsx       Router + theme
        ├── pages/        Dashboard, Map, Prediction, Incidents...
        ├── components/   Sidebar, Header, Badges, Charts...
        └── utils/        API, formatters, color constants
```
