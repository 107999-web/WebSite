@echo off
chcp 65001 >nul

echo ========================================
echo  Touch Games - Chrome Kiosk Launcher
echo ========================================

:: Detect Chrome path
set CHROME=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
    echo [OK] Chrome found at Program Files
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    echo [OK] Chrome found at Program Files x86
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
    echo [OK] Chrome found at LocalAppData
) else (
    echo [ERROR] Google Chrome not found!
    pause
    exit /b 1
)

:: Use PowerShell to build properly encoded file:/// URL
for /f "delims=" %%i in ('powershell -NoProfile -Command "[uri]::new('%~dp0index.html').AbsoluteUri"') do set "FILE_URL=%%i"

echo [INFO] Chrome : %CHROME%
echo [INFO] URL    : %FILE_URL%

:: Kill existing Chrome and close server
echo [INFO] Closing existing Chrome...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start close server in background using PowerShell (no install needed)
echo [INFO] Starting close server...
start /b powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0close_server.ps1"
timeout /t 1 /nobreak >nul

:: Launch Chrome in true Kiosk mode
echo [INFO] Launching Chrome Kiosk...
start "" "%CHROME%" ^
  --kiosk ^
  --no-first-run ^
  --disable-translate ^
  --disable-infobars ^
  --noerrdialogs ^
  --disable-session-crashed-bubble ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --user-data-dir="%TEMP%\TouchGameKiosk" ^
  "%FILE_URL%"

echo [OK] Done.
timeout /t 2 /nobreak >nul
