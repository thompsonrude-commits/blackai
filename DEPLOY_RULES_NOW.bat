@echo off
cd /d "%~dp0"
echo Deploying Firestore rules...
firebase deploy --only firestore:rules
echo.
echo Done!
pause
