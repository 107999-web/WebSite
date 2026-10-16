@echo off
rem Rebuild index.html from the Htmls folder tree, then deploy to the GitHub account bound to THIS folder
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed. Please install it from https://git-scm.com/download/win
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_tools\sync.ps1"
echo.
pause
