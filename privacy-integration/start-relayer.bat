@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   Starting Ghost Privacy Relayer
echo ========================================
echo.

REM Check if already running
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Relayer is already running!
    echo.
    curl -s http://localhost:3000/stats
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b
)

echo Starting relayer service...
echo.

npx ts-node relayer-service.ts

pause
