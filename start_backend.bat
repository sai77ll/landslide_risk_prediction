@echo off
echo ============================================
echo  LandGuard - Landslide Risk Intelligence
echo  Starting Backend (FastAPI + ML)
echo ============================================
cd /d "%~dp0backend"
python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
