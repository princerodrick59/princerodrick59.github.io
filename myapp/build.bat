@echo off
echo Building Pit Display...
cd /d "%~dp0"
neu build
if %errorlevel% neq 0 (
    echo.
    echo Build failed. Make sure neu is installed: npm install -g @neutralinojs/neu
    pause
    exit /b 1
)
echo.
echo Done! EXE is in the dist\ folder.
pause
