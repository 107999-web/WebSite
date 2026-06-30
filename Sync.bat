@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0generate_index.ps1"
git add .
git commit -m "update %date% %time%"
git push
pause
