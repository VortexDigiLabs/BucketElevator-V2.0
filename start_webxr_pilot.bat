@echo off
title SAGMA WebXR Machinery Inspection Pilot & Technical Video Setup
set "PATH=C:\Program Files\nodejs;C:\Users\PC 1\AppData\Local\Programs\Python\Python312;%PATH%"

cd /d "%~dp0"
if exist "sagma_webxr_pilot" cd "sagma_webxr_pilot"

echo ==============================================================
echo   SAGMA DIAGRAM 69(b) INDUSTRIAL MACHINERY DIGITAL TWIN
echo   Authoritative 9.63m Elevation ^| 391mm Crowned Pulleys
echo   Meta Quest WebXR 6DoF ^| Immersive Web Emulator
echo ==============================================================
echo.
echo Select Launch Mode:
echo   [1] Desktop WebXR Preview (HTTP: http://localhost:5173/)
echo       * Ideal for Chrome/Edge with Immersive Web Emulator
echo       * No SSL certificate warnings; instant 90 FPS preview
echo.
echo   [2] Wireless Meta Quest VR Headset (HTTPS: https://localhost:5173/)
echo       * Required for wireless Meta Quest Browser over LAN
echo.
echo   [3] Standalone Interactive Game Simulator (Python: http://localhost:8080/)
echo       * Serves bucket_elevator_master_app/
echo.
set /p choice="Enter option (1, 2, or 3) [Default: 1]: "

if "%choice%"=="2" (
    echo.
    echo Starting HTTPS WebXR Server on https://localhost:5173/ ...
    echo For Quest Browser on local WiFi, replace 'localhost' with your PC's LAN IP.
    echo.
    npm run dev:https
) else if "%choice%"=="3" (
    echo.
    echo Starting Python HTTP Server on http://localhost:8080/ ...
    cd ..\bucket_elevator_master_app
    python -m http.server 8080
) else (
    echo.
    echo Starting HTTP WebXR Dev Server on http://localhost:5173/ ...
    echo Open in Chrome or Edge:
    echo    http://localhost:5173/
    echo.
    npm run dev
)

pause
