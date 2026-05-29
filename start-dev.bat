@echo off
echo Starting Orchid Construction ERP Development Servers...
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
start "ERP Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak >nul
start "ERP Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both servers started!
echo.
echo Backend API: http://localhost:5000/api/v1
echo Health Check: http://localhost:5000/api/health
echo Frontend App: http://localhost:5173
