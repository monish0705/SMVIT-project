# CivicPulse AI — Unified Windows PowerShell Launch Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         CIVICPULSE AI — INFRASTRUCTURE PLATFORM          " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python Venv
if (-not (Test-Path "d:\MINI-PROJECT\backend\venv\Scripts\python.exe")) {
    Write-Host "[!] Virtual environment not detected. Creating..." -ForegroundColor Yellow
    python -m venv d:\MINI-PROJECT\backend\venv
    & d:\MINI-PROJECT\backend\venv\Scripts\pip.exe install -r d:\MINI-PROJECT\backend\requirements.txt
}

# 2. Seed Database if needed
Write-Host "[*] Checking and verifying synthetic demonstration database..." -ForegroundColor Green
$env:PYTHONPATH="."
& d:\MINI-PROJECT\backend\venv\Scripts\python.exe d:\MINI-PROJECT\backend\seed_demo.py

Write-Host ""
Write-Host "[*] Starting CivicPulse AI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\MINI-PROJECT\backend; `$env:PYTHONPATH='.'; .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

Write-Host "[*] Starting CivicPulse AI Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\MINI-PROJECT\frontend; npm run dev"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Backend API:   http://127.0.0.1:8000/api/docs" -ForegroundColor Yellow
Write-Host "  Frontend App:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Demo Admin:    admin@civicpulse.ai | Admin@CivicPulse2026!" -ForegroundColor White
Write-Host "  Demo Operator: operator@civicpulse.ai | Operator@CivicPulse2026!" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

