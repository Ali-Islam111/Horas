@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   Starting AI Proctoring System...
echo ==========================================
echo.

:: --- CONFIGURATION VARIABLES ---
:: Mirrors setup.bat — change folder names once, applies everywhere.
set "VENV_DIR=.venv"
set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

:: ===========================================================================
:: STEP 1 — PRE-FLIGHT CHECK
:: ===========================================================================
:: Startup trusts that setup.bat has already produced a correct environment.
:: It does not attempt any repairs. If the venv is missing, it fails fast.
if not exist "%VENV_DIR%\Scripts\activate" (
    echo [ERROR] Virtual environment "%VENV_DIR%" not found!
    echo Please run project_setup.bat first to build the environment.
    echo.
    pause
    exit /b 1
)

:: ===========================================================================
:: STEP 2 — START BACKEND
:: ===========================================================================
echo [1/3] Launching FastAPI and AI Engine...
echo       (Loading AI models — this takes time on first boot.)

start "FastAPI Backend" cmd /k "call "%VENV_DIR%\Scripts\activate" && cd /d "%BACKEND_DIR%" && python main.py"

:: ===========================================================================
:: STEP 3 — WAIT FOR BACKEND (curl polling)
:: ===========================================================================
:: 45 retries x 2 seconds = 90 seconds maximum wait.
set MAX_RETRIES=45
set COUNT=0

echo [2/3] Waiting for the backend on port %BACKEND_PORT%...
echo       (Check the FastAPI terminal if this takes longer than 90 seconds.)

:backend_loop
curl -s http://localhost:%BACKEND_PORT%/ >nul
if %errorlevel% neq 0 (
    set /a COUNT+=1
    if !COUNT! GTR %MAX_RETRIES% (
        echo.
        echo ====================================================================
        echo [CRITICAL ERROR] Backend failed to start within 90 seconds!
        echo ====================================================================
        echo Check the "FastAPI Backend" window for Python errors.
        echo.
        pause
        exit /b 1
    )
    timeout /t 2 /nobreak >nul
    goto backend_loop
)
echo       Backend is up and running!
echo.

:: ===========================================================================
:: STEP 4 — START FRONTEND
:: ===========================================================================
echo [3/3] Starting React/Vite Frontend...

start "Vite Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

:: ===========================================================================
:: STEP 5 — WAIT FOR VITE (curl polling)
:: ===========================================================================
:: Vite cold-start (no cache) can take 5-10 seconds — a hardcoded sleep
:: opens the browser before the dev server is ready, showing "connection refused".
:: 15 retries x 1 second = 15 seconds maximum before opening anyway.
set VITE_RETRIES=15
set VITE_COUNT=0

echo       Waiting for Vite on port %FRONTEND_PORT%...

:vite_loop
curl -s http://localhost:%FRONTEND_PORT%/ >nul
if %errorlevel% neq 0 (
    set /a VITE_COUNT+=1
    if !VITE_COUNT! GTR %VITE_RETRIES% (
        echo       [WARNING] Vite is taking longer than expected — opening browser anyway.
        goto open_browser
    )
    timeout /t 1 /nobreak >nul
    goto vite_loop
)

:open_browser
echo.
echo ==========================================
echo Opening Browser...
echo You can close this launcher window now.
echo ==========================================
start http://localhost:%FRONTEND_PORT%

:: Close this launcher window
exit