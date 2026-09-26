@echo off
title Compiling Native Python Windows App (.exe)
color 0a
echo ========================================================
echo   NEURAPRESS - NATIVE PYTHON EXE COMPILER
echo   (Deterministic Build with Pinned Dependencies)
echo ========================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH!
    echo Download Python from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/2] Installing pinned dependencies from requirements.txt...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install pinned dependencies.
    pause
    exit /b 1
)

echo.
echo [2/2] Compiling standalone Windows .exe using NEURAPRESS_Quantum_Native.spec...
pyinstaller --clean --noconfirm NEURAPRESS_Quantum_Native.spec
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller compilation failed.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [SUCCESS] Windows Native .exe created!
echo Location: dist/NEURAPRESS_Quantum_Native.exe
echo ========================================================
echo.
exit /b 0
