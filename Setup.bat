@echo off
cd /d "%~dp0"
echo ============================================
echo   GitHub Website Sync - First Time Setup
echo ============================================
echo.
echo Before continuing, please make sure you have:
echo   1. Created a GitHub account (https://github.com)
echo   2. Installed Git (https://git-scm.com/download/win)
echo   3. Created a new PUBLIC repository on GitHub (e.g. WebSite, do NOT add README)
echo.
pause

set /p GH_NAME="Enter your name (for git commit log): "
set /p GH_EMAIL="Enter your Email: "
set /p GH_USER="Enter your GitHub username: "
set /p GH_REPO="Enter your repository name (default WebSite, press Enter to use default): "
if "%GH_REPO%"=="" set GH_REPO=WebSite

git init
git config user.name "%GH_NAME%"
git config user.email "%GH_EMAIL%"
git branch -M main
git remote add origin https://github.com/%GH_USER%/%GH_REPO%.git

(
echo [InternetShortcut]
echo URL=https://%GH_USER%.github.io/%GH_REPO%/
) > "MyWebsite.url"

echo.
echo ============================================
echo Setup complete! Next steps:
echo   1. On GitHub repo, go to Settings -^> Pages -^> Source -^> select "GitHub Actions"
echo   2. Double-click "Sync.bat" to push for the first time
echo   3. If asked to login, use a Personal Access Token as the password
echo      (GitHub -^> Settings -^> Developer settings -^> Personal access tokens)
echo   4. Wait 1-2 minutes, then visit https://%GH_USER%.github.io/%GH_REPO%/
echo ============================================
pause
