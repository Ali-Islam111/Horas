@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   Starting AI Proctoring System...
echo ==========================================
echo.

:: --- CONFIGURATION VARIABLES ---
set "VENV_DIR=.venv"
set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

:: 1. PRE-FLIGHT CHECK
if not exist "%VENV_DIR%\Scripts\activate" (
    echo [ERROR] Virtual environment "%VENV_DIR%" not found!
    echo Please run setup_project.bat first or check your configuration variables.
    echo.
    pause
    exit /b 1
)

:: 2. START BACKEND 
echo [1/3] Launching FastAPI and AI Engine...
echo       (Please wait, loading AI models into memory takes time...)
start "FastAPI Backend" cmd /k "call "%VENV_DIR%\Scripts\activate" && cd /d "%BACKEND_DIR%" && python main.py"

:: 3. SMART WAIT FOR BACKEND
set MAX_RETRIES=45
set COUNT=0

echo [2/3] Waiting for the backend to initialize on port %BACKEND_PORT%...
echo       (If this takes longer than a minute, check the FastAPI terminal for crash logs)
:backend_loop
curl -s http://localhost:%BACKEND_PORT%/ >nul
if %errorlevel% neq 0 (
    set /a COUNT+=1
    if !COUNT! GTR %MAX_RETRIES% (
        echo.
        echo ====================================================================
        echo [CRITICAL ERROR] The Backend failed to start or took too long!
        echo ====================================================================
        echo Please check the "FastAPI Backend" terminal window for Python errors.
        echo The AI engine might have crashed during initialization.
        echo.
        pause
        exit /b 1
    )
    timeout /t 2 /nobreak >nul
    goto backend_loop
)
echo       Backend is up and running successfully!
echo.

:: 4. START FRONTEND
echo [3/3] Starting React/Vite Frontend...
start "Vite Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

:: 5. SMART WAIT FOR VITE
set VITE_RETRIES=15
set VITE_COUNT=0

echo       Waiting for Vite to spin up on port %FRONTEND_PORT%...
:vite_loop
curl -s http://localhost:%FRONTEND_PORT%/ >nul
if %errorlevel% neq 0 (
    set /a VITE_COUNT+=1
    if !VITE_COUNT! GTR %VITE_RETRIES% (
        echo       [WARNING] Vite took too long, opening browser anyway...
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