@echo off
cd /d "C:\Users\Administrator\Desktop\zk\privacy-integration"

REM Check if relayer is running, start if needed
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% neq 0 (
    start "Relayer" /min cmd /c "npx ts-node relayer-service.ts"
    timeout /t 2 /nobreak >nul
)

REM Launch CLI
npx ts-node cli.ts

pause
