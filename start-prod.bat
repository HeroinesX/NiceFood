@echo off
cd /d "%~dp0"
title YouCan Server

echo.
echo ========================================
echo   YouCan Server - All on port 3001
echo   (Access from phone too)
echo ========================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

for /f "tokens=1" %%a in ('node -v') do echo [OK] Node.js %%a

:: Kill old server
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    for %%b in (%%a) do taskkill /f /pid %%b >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Install dependencies
if not exist "node_modules\.package-lock.json" (
    call npm install
)

:: Seed data
node src/server/seed.js

:: Build frontend with relative API paths
echo [INFO] Building frontend...
set REACT_APP_API_URL=/api
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

:: Start server (auto-detects build/ and serves frontend)
echo [INFO] Starting server...
start cmd /c "title YouCan-Server && node src/server/index.js"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo     Server ready on port 3001
echo ========================================
echo.
echo   Computer: http://localhost:3001
echo   Phone:    http://YOUR-IP:3001
echo.
echo   Admin: admin / admin123
echo.
start http://localhost:3001
echo.
pause
