@echo off
cd /d "%~dp0"
title YouCan Share

echo.
echo ========================================
echo   Share YouCan to the Internet
echo ========================================
echo.

:: Check if server is running
curl -s -o nul http://localhost:3001
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Server not running. Starting...
    start "YouCan-Server" cmd /c "title YouCan-Server && node src/server/index.js"
    timeout /t 3 /nobreak >nul
)

:: Install localtunnel
where npx >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

echo [INFO] Creating public URL...
echo [INFO] First time? Browser will show a page - click "Click to Continue"
echo.
npx localtunnel --port 3001

pause
