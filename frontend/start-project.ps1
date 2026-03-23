# Quick Start Script - Full Project
# يشغل Backend و Frontend معاً

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   AI Proctoring System - Full Stack Startup  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# تشغيل Backend في terminal منفصل
Write-Host "Starting Backend (Flask)..." -ForegroundColor Yellow

$backendPath = "$PSScriptRoot\backend"

if (Test-Path $backendPath) {
    # Check if venv exists
    if (Test-Path "$backendPath\venv") {
        # فتح terminal جديد لـ Backend with venv
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\venv\Scripts\Activate.ps1; python app.py"
    } else {
        # فتح terminal جديد لـ Backend without venv
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python app.py"
    }
    Write-Host "✓ Backend terminal opened" -ForegroundColor Green
} else {
    Write-Host "✗ Backend not found at $backendPath!" -ForegroundColor Red
    Write-Host "Please ensure backend folder exists" -ForegroundColor Yellow
    exit 1
}

Start-Sleep -Seconds 2

# تشغيل Frontend في terminal منفصل
Write-Host "Starting Frontend (React)..." -ForegroundColor Yellow

$frontendPath = $PSScriptRoot

if (Test-Path "$frontendPath\package.json") {
    # فتح terminal جديد لـ Frontend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"
    Write-Host "✓ Frontend terminal opened" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "           Both servers are starting!          " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend (Flask):  http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend (React): http://localhost:5174" -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait for both servers to start, then:" -ForegroundColor Cyan
Write-Host "1. Open browser to http://localhost:5174" -ForegroundColor White
Write-Host "2. Login as Examiner" -ForegroundColor White
Write-Host "3. Click 'Live Monitor' to test AI Proctoring" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
