@echo off
title Compiling Native Python Windows App (.exe)
color 0a
echo ========================================================
echo   NEURAPRESS - NATIVE PYTHON EXE COMPILER
echo   (No Node.js or Electron needed!)
echo ========================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH!
    echo Download Python from: https://www.python.org/downloads/
    pause
    exit /b
)

echo [1/2] Installing PyInstaller and PDF compression engine...
pip install --upgrade pyinstaller pypdf

echo.
echo [2/2] Compiling standalone Windows .exe...
pyinstaller --noconsole --onefile --name "NEURAPRESS_Quantum_Native" standalone_gui.py

echo.
echo ========================================================
echo [SUCCESS] Windows .exe created!
echo Location: dist/NEURAPRESS_Quantum_Native.exe
echo ========================================================
echo.
pause
