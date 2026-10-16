@echo off
rem Bind THIS folder to a GitHub account (first time, switch account, or renew token)
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed. Please install it from https://git-scm.com/download/win
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_tools\setup.ps1"
echo.
pause
