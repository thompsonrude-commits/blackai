@echo off
cls
echo ========================================
echo    DEPLOYING FIRESTORE RULES
echo ========================================
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Checking Firebase CLI...
firebase --version
echo.
echo Deploying rules...
echo.
firebase deploy --only firestore:rules
echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! Rules deployed successfully
) else (
    echo FAILED! Error code: %ERRORLEVEL%
)
echo ========================================
echo.
pause
