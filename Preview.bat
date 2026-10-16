@echo off
rem Rebuild index.html only (no upload) and open it in the browser
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_tools\generate_index.ps1"
start "" "%~dp0index.html"
