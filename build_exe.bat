@echo off
title Building NEURAPRESS Windows App
color 0b
echo ========================================================
echo   NEURAPRESS QUANTUM - WINDOWS EXE COMPILATION SUITE
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo.
    echo Node.js is required to compile Electron Windows .exe apps.
    echo 1. Download and install Node.js (LTS version) from: https://nodejs.org
    echo 2. Rerun this build_exe.bat file after installing.
    echo.
    echo ALTERNATIVE: If you have Python, run "build_python_exe.bat"
    echo to compile a native Windows .exe without needing Node.js!
    echo.
    pause
    exit /b
)

echo [1/3] Installing Electron dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

echo.
echo [2/3] Compiling 64-Bit Portable and Installer EXE files...
call npm run build:all
if %errorlevel% neq 0 (
    echo [ERROR] Build step failed.
    pause
    exit /b
)

echo.
echo ========================================================
echo [SUCCESS] Windows App Compiled Successfully!
echo Check the 'dist' folder for your .exe files:
echo   - NEURAPRESS Quantum PDF Compressor.exe (Portable)
echo   - NEURAPRESS Quantum Setup.exe (Installer)
echo ========================================================
echo.
pause
