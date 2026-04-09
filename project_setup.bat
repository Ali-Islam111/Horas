@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   AI Proctoring System - Environment Setup
echo ==========================================
echo.

:: --- CONFIGURATION VARIABLES ---
set "REPO_URL=https://github.com/Ali-Islam111/Horas.git"
set "REPO_DIR=Horas"
set "VENV_DIR=.venv"
set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"

:: ===========================================================================
:: STEP 0 — PROJECT REPOSITORY SYNC
:: ===========================================================================
echo [0/6] Checking project repository...

:: Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git and try again.
    pause
    exit /b 1
)

:: Check if we are ALREADY inside the cloned project (e.g., backend folder is right here)
if exist "%BACKEND_DIR%\" (
    echo   Found project files. Already inside the repository.
) else (
    :: We are outside. Check if the folder already exists before cloning.
    if not exist "%REPO_DIR%\" (
        echo   Project not found locally. Cloning from GitHub...
        git clone "%REPO_URL%"
        if !errorlevel! neq 0 (
            echo [CRITICAL ERROR] Failed to clone the repository.
            echo Please check your internet connection or Git credentials.
            pause
            exit /b 1
        )
    ) else (
        echo   Found existing "%REPO_DIR%" directory.
    )

    echo   Navigating into the project folder...
    cd /d "%REPO_DIR%"
)
echo.

:: ===========================================================================
:: STEP 1 — PREREQUISITE CHECKS
:: ===========================================================================
echo [1/6] Checking system requirements...

py -3.10 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.10.* is not installed or not in PATH!
    echo Please install Python 3.10 and try again.
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install NodeJS and try again.
    pause
    exit /b 1
)
echo System requirements met!
echo.

:: ===========================================================================
:: STEP 2 — VIRTUAL ENVIRONMENT
:: ===========================================================================
echo [2/6] Building the isolated virtual environment at PROJECT ROOT...

if exist "%VENV_DIR%\" (
    echo Found existing "%VENV_DIR%". Skipping creation...
) else (
    py -3.10 -m venv "%VENV_DIR%"
    echo "%VENV_DIR%" created successfully.
)

:: Activate it for the script session
call "%VENV_DIR%\Scripts\activate"
echo.

:: ===========================================================================
:: STEP 3 — CORE DEPENDENCIES
:: ===========================================================================
echo [3/6] Installing core dependencies (Order matters!)...

:: Use explicit venv paths — no reliance on activation state.
:: Explicit paths are unambiguous in scripted automation regardless of shell state.
"%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip

:: Primary PyTorch install (cu130). On failure, automatic cu121 fallback.
:: This is an architectural fallback, not a band-aid — the root cause (CUDA version
:: mismatch between driver and build) is handled at install time, not at runtime.
"%VENV_DIR%\Scripts\pip.exe" install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] cu121 build unavailable for this driver. Trying cu130 fallback...
    "%VENV_DIR%\Scripts\pip.exe" install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130
    if %errorlevel% neq 0 (
        echo [CRITICAL ERROR] PyTorch installation failed on both cu130 and cu121.
        echo Check your internet connection, disk space, and NVIDIA driver version.
        pause
        exit /b 1
    )
    echo [INFO] PyTorch installed successfully via cu121 fallback.
)

:: Quoted version specifier. Without quotes, CMD treats > as a
:: stdout redirect operator — pip never sees the constraint and a file named
:: "=4.0.0" is created in the working directory.
"%VENV_DIR%\Scripts\pip.exe" install "ctranslate2>=4.0.0"
if %errorlevel% neq 0 (
    echo [CRITICAL ERROR] ctranslate2 installation failed.
    pause
    exit /b 1
)
echo.

:: ===========================================================================
:: STEP 4 — REQUIREMENTS & MEDIAPIPE CONFLICT RESOLUTION
:: ===========================================================================
echo [4/6] Installing requirements.txt...

if not exist "%BACKEND_DIR%\requirements.txt" (
    echo [CRITICAL ERROR] "%BACKEND_DIR%\requirements.txt" not found!
    echo Verify that %BACKEND_DIR% is the correct backend folder name.
    pause
    exit /b 1
)

"%VENV_DIR%\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"
set INSTALL_ERR=%errorlevel%

:: mediapipe may be commented out in requirements.txt — verify it actually landed
"%VENV_DIR%\Scripts\pip.exe" show mediapipe >nul 2>&1
if %errorlevel% neq 0 set INSTALL_ERR=1

if %INSTALL_ERR% neq 0 (    echo.
    echo ==========================================================
    echo [WARNING] requirements.txt installation failed!
    echo This is likely the known MediaPipe version conflict.
    echo Choose which version to install:
    echo ==========================================================
    echo 1 - Saif's version   (mediapipe ^>=0.10.11)
    echo 2 - Ali's version    (mediapipe ^>=0.10.14)
    echo 3 - Exit ^& fix it manually
    echo.
    choice /C 123 /M "Select an option:"

    :: else-if chain prevents the sequential if-errorlevel bug where choosing
    :: option 2 would fire BOTH the errorlevel-2 AND errorlevel-1 blocks,
    :: running Ali's fix then immediately overwriting it with Saif's.
    if errorlevel 3 (
        echo Exiting setup.
        pause
        exit /b 1
    ) else if errorlevel 2 (
        echo Applying Ali's fix...
        "%VENV_DIR%\Scripts\pip.exe" uninstall -y mediapipe
        "%VENV_DIR%\Scripts\pip.exe" install "mediapipe>=0.10.14"
    ) else (
        echo Applying Saif's fix...
        "%VENV_DIR%\Scripts\pip.exe" uninstall -y mediapipe
        "%VENV_DIR%\Scripts\pip.exe" install "mediapipe>=0.10.11"
    )

    if !errorlevel! neq 0 (
        echo [CRITICAL ERROR] MediaPipe fallback fix also failed.
        pause
        exit /b 1
    )
)
echo.

:: ===========================================================================
:: STEP 5 — FRONTEND SETUP
:: ===========================================================================
echo [5/6] Installing Frontend dependencies...

if not exist "%FRONTEND_DIR%\package.json" (
    echo [ERROR] "%FRONTEND_DIR%\package.json" not found!
    echo Skipping frontend installation.
) else (
    cd /d "%FRONTEND_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Check your Node.js installation.
        cd /d ..
        pause
        exit /b 1
    )
    cd /d ..
)
echo.

:: ===========================================================================
:: STEP 6 — CUDA VERIFICATION
:: ===========================================================================
echo [6/6] Verifying CUDA and GPU availability...

:: python -c one-liner: no temp files, no cleanup, no residue if interrupted.
"%VENV_DIR%\Scripts\python.exe" -c "import torch, sys; sys.exit(0 if torch.cuda.is_available() else 1)"

if %errorlevel% neq 0 (
    echo.
    echo =======================================================================
    echo [CRITICAL ERROR] CUDA is NOT available or GPU was not detected!
    echo =======================================================================
    echo The AI Engine requires an NVIDIA GPU and CUDA to function properly.
    echo.
    echo Please verify:
    echo   1. You have an NVIDIA GPU installed.
    echo   2. Your NVIDIA drivers are up to date (nvidia-smi in terminal).
    echo   3. The installed PyTorch CUDA build matches your driver version.
    echo =======================================================================
    pause
    exit /b 1
)

:: Print the detected GPU name as confirmation
"%VENV_DIR%\Scripts\python.exe" -c "import torch; print('[SUCCESS] GPU Detected:', torch.cuda.get_device_name(0))"

echo.
echo ==========================================
echo Setup Complete!
echo You can now run server_startup.bat
echo ==========================================
pause