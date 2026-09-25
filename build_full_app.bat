@echo off
setlocal
title Building NEURAPRESS Full Windows App
color 0b
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is required to build the app.
    exit /b 1
)

if not exist "package-lock.json" (
    echo [ERROR] package-lock.json was not found.
    exit /b 1
)

if not exist "node_modules\.bin\electron-builder.cmd" (
    echo [1/2] Installing exact dependencies...
    call npm ci
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        exit /b 1
    )
) else (
    echo [1/2] Using existing dependencies.
)

echo [2/2] Building portable and installer...
call npm run build:all
if errorlevel 1 (
    echo [ERROR] Build failed.
    exit /b 1
)

echo.
echo [SUCCESS] Full app build completed.
echo Portable: dist\NEURAPRESS Quantum PDF Compressor 5.0.0.exe
echo Installer: dist\NEURAPRESS Quantum PDF Compressor Setup 5.0.0.exe
exit /b 0
