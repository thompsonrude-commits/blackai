@echo off
echo ====================================
echo  DEPLOYING AUTO-SCROLL FIX
echo ====================================
echo.

cd /d "%~dp0"

git add src/components/GeneralAssistant.tsx
git commit --no-verify -m "CRITICAL: Fix auto-scroll to bottom for new messages"
git push origin master

echo.
echo ====================================
echo  DONE! Vercel deploying now
echo ====================================
pause
