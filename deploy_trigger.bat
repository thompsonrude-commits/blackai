@echo off
echo ====================================
echo  TRIGGERING VERCEL DEPLOYMENT
echo ====================================
echo.

cd /d "%~dp0"

git add DEPLOYMENT_TRIGGER.md
git commit -m "Trigger: Force Vercel redeploy with env vars"
git push origin master

echo.
echo ====================================
echo  DONE! Check Vercel in 2-3 minutes
echo ====================================
pause
