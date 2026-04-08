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

:: 0. PROJECT REPOSITORY SYNC
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

:: 1. PREREQUISITE CHECKS
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

:: 2. VIRTUAL ENVIRONMENT
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

:: 3. CORE DEPENDENCIES
echo [3/6] Installing core dependencies (Order matters!)...
"%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip

"%VENV_DIR%\Scripts\pip.exe" install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130
if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL ERROR] PyTorch installation failed!
    echo Please check your internet connection, disk space, and CUDA compatibility.
    pause
    exit /b 1
)

"%VENV_DIR%\Scripts\pip.exe" install "ctranslate2>=4.0.0"
echo.

:: 4. REQUIREMENTS & MEDIAPIPE CONFLICT RESOLUTION
echo [4/6] Installing requirements.txt...

if not exist "%BACKEND_DIR%\requirements.txt" (
    echo [CRITICAL ERROR] "%BACKEND_DIR%\requirements.txt" not found!
    echo The repository structure might be incorrect.
    pause
    exit /b 1
)

"%VENV_DIR%\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"

if %errorlevel% neq 0 (
    echo.
    echo ==========================================================
    echo [WARNING] requirements.txt installation failed!
    echo This is likely the known MediaPipe version conflict.
    echo Let's fix this manually. Choose a team member's version:
    echo ==========================================================
    echo 1 - Saif's version (mediapipe^>=0.10.9,^<0.11.0)
    echo 2 - Ali's version  (mediapipe^>=0.10.14)
    echo 3 - Exit and let me fix it manually
    
    choice /C 123 /M "Select an option:"
    
    if errorlevel 3 (
        echo Exiting setup.
        pause
        exit /b 1
    )
    if errorlevel 2 (
        echo Applying Ali's fix...
        "%VENV_DIR%\Scripts\pip.exe" uninstall -y mediapipe
        "%VENV_DIR%\Scripts\pip.exe" install "mediapipe>=0.10.14"
    )
    if errorlevel 1 (
        echo Applying Saif's fix...
        "%VENV_DIR%\Scripts\pip.exe" uninstall -y mediapipe
        "%VENV_DIR%\Scripts\pip.exe" install "mediapipe>=0.10.11"
    )

    if !errorlevel! neq 0 (
        echo [CRITICAL ERROR] The MediaPipe fallback fix also failed.
        pause
        exit /b 1
    )
)
echo.

:: 5. FRONTEND SETUP
echo [5/6] Installing Frontend dependencies...
if not exist "%FRONTEND_DIR%\package.json" (
    echo [ERROR] "%FRONTEND_DIR%\package.json" not found! 
    echo Skipping frontend installation.
) else (
    cd /d "%FRONTEND_DIR%"
    call npm install
    cd /d ..
)
echo.

:: 6. CUDA VERIFICATION WITH ERROR HANDLING
echo [6/6] Verifying CUDA and GPU availability...
"%VENV_DIR%\Scripts\python.exe" -c "try: import torch, sys; available=torch.cuda.is_available(); print('GPU Detected:', torch.cuda.get_device_name(0)) if available else sys.exit(1); except Exception as e: print('Error:', e); sys.exit(1)"

if %errorlevel% neq 0 (
    echo.
    echo =======================================================================
    echo [CRITICAL ERROR] CUDA is NOT available or PyTorch is broken!
    echo =======================================================================
    echo The AI Engine requires an NVIDIA GPU and CUDA to function properly.
    echo Please verify:
    echo 1. You have an NVIDIA GPU installed.
    echo 2. Your NVIDIA drivers are up to date.
    echo 3. The PyTorch CUDA version matches your system.
    echo =======================================================================
    echo.
    echo [FATAL] Setup cannot continue without a functioning GPU environment.
    pause
    exit /b 1
) else (
    echo.
    echo [SUCCESS] CUDA and GPU are properly configured!
)

echo.
echo ==========================================
echo Setup Complete! 
:: We check our current directory. If we are still in the parent folder, we remind them to go into Horas.
for %%I in (.) do set "CURRENT_FOLDER=%%~nxI"
if /I "%CURRENT_FOLDER%" neq "%REPO_DIR%" (
    echo Navigate into the "%REPO_DIR%" folder to find run_project.bat
) else (
    echo You can now use run_project.bat to start the servers.
)
echo ==========================================
pause