# Flask Backend Setup Script
# تشغيل هذا الملف لتثبيت وتشغيل Backend

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     Flask Backend Setup - AI Proctoring      " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# التحقق من وجود Python
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

Write-Host ""

# إنشاء مجلد Backend إذا لم يكن موجود
$backendPath = "D:\A gradution Project\AI_Proctoring"

if (Test-Path $backendPath) {
    Write-Host "✓ Backend folder already exists" -ForegroundColor Green
    Set-Location $backendPath
} else {
    Write-Host "Cloning Backend Repository..." -ForegroundColor Yellow
    Set-Location "D:\A gradution Project"
    
    git clone https://github.com/mohamedemad6244/AI_Proctoring.git
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Repository cloned successfully" -ForegroundColor Green
        Set-Location $backendPath
    } else {
        Write-Host "✗ Failed to clone repository" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# إنشاء Virtual Environment
if (Test-Path "venv") {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
} else {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Virtual environment created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# تفعيل Virtual Environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

Write-Host "✓ Virtual environment activated" -ForegroundColor Green
Write-Host ""

# تثبيت المكتبات
Write-Host "Installing requirements..." -ForegroundColor Yellow

if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Requirements installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Some requirements failed to install" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ requirements.txt not found, skipping..." -ForegroundColor Yellow
}

Write-Host ""

# تثبيت Flask-CORS
Write-Host "Installing Flask-CORS..." -ForegroundColor Yellow
pip install flask-cors

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Flask-CORS installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Failed to install Flask-CORS" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "         Backend Setup Complete!               " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the Flask server, run:" -ForegroundColor Yellow
Write-Host "  python app.py" -ForegroundColor White
Write-Host ""
Write-Host "Or run this script again to auto-start" -ForegroundColor Yellow
Write-Host ""

# سؤال المستخدم إذا كان يريد تشغيل السيرفر
$startServer = Read-Host "Do you want to start Flask server now? (y/n)"

if ($startServer -eq "y" -or $startServer -eq "Y") {
    Write-Host ""
    Write-Host "Starting Flask server..." -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (Test-Path "app.py") {
        python app.py
    } else {
        Write-Host "✗ app.py not found!" -ForegroundColor Red
        Write-Host "Please check the backend repository structure" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Setup complete! You can start the server manually." -ForegroundColor Green
    Write-Host ""
}
