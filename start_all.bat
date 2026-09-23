@echo off
title LandGuard System Launcher
echo ===================================================
echo  Starting LandGuard System (Backend + Frontend)
echo ===================================================

echo [1/2] Starting FastAPI Backend on port 8000...
start "LandGuard Backend (Port 8000)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --port 8000 --host 127.0.0.1"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Vite Frontend on port 5173...
start "LandGuard Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  LandGuard is running!
echo  - Frontend Dashboard: http://localhost:5173
echo  - Backend API:        http://localhost:8000
echo  - Interactive Docs:   http://localhost:8000/docs
echo ===================================================
pause
