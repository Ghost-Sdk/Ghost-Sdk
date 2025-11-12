@echo off
REM Quick CLI test script for Windows
REM Run with: test-cli.bat

echo.
echo Testing Ghost SDK CLI
echo ========================
echo.

cd packages\cli

echo.
echo Installing dependencies...
call npm install

echo.
echo Building CLI...
call npm run build

echo.
echo Build complete!
echo.
echo Available commands:
echo.
echo   ghost init              - Initialize wallet
echo   ghost balance           - Check balance
echo   ghost transfer          - Send private transfer
echo   ghost deposit           - Deposit to shielded pool
echo   ghost withdraw          - Withdraw from pool
echo   ghost issue-token       - Issue private token
echo   ghost swap              - Private token swap
echo   ghost stake             - Stake privately
echo.
echo Try: ghost --help
echo.

pause
