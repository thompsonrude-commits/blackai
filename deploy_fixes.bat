@echo off
echo ====================================
echo  DEPLOYING SPEED AND OVERFLOW FIXES
echo ====================================
echo.

cd /d "%~dp0"

echo Adding changes...
git add src/components/GeneralAssistant.tsx

echo Committing...
git commit -m "Fix: Speed up AI text display and prevent overflow covering chatbar"

echo Pushing to GitHub...
git push origin master

echo.
echo ====================================
echo  DONE! Vercel will auto-deploy
echo ====================================
echo.
pause
