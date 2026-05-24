@echo off
cd /d "%~dp0"
title YouCan App

echo.
echo ========================================
echo     YouCan App Launcher
echo ========================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found
    echo Please install from: https://nodejs.org
    pause
    exit /b 1
)

node -v
echo [OK]

:: Kill any old servers still running on these ports
echo [INFO] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    for %%b in (%%a) do taskkill /f /pid %%b >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    for %%b in (%%a) do taskkill /f /pid %%b >nul 2>&1
)
timeout /t 1 /nobreak >nul

if not exist "node_modules\.package-lock.json" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

:: Seed data (safe mode - only imports if empty)
echo [INFO] Checking seed data...
node src/server/seed.js

echo [INFO] Starting backend (port 3001)...
start "youcan-backend" cmd /c "title YouCan-Backend && node src/server/index.js"
timeout /t 2 /nobreak >nul

echo [INFO] Starting frontend (port 3000)...
start "youcan-frontend" cmd /c "title YouCan-Frontend && set BROWSER=none && npm start"

echo.
echo ========================================
echo     All services started!
echo ========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo   Login: admin / admin123
echo.
echo   IMPORTANT: Do a hard refresh (Ctrl+F5)
echo   Close the 2 terminal windows to stop.
echo.
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo.
pause
