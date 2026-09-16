@echo off
echo ====================================
echo  DEPLOYING FIRESTORE RULES
echo ====================================
echo.

cd /d "%~dp0"

echo Deploying updated security rules to Firebase...
firebase deploy --only firestore:rules

echo.
echo ====================================
echo  DONE! Rules updated on Firebase
echo ====================================
pause
