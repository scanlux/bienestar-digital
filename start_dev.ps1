# =======================================================
# start_dev.ps1 - Arranque completo del entorno de dev
# PREREQUISITO: start_dev_tunnel.ps1 debe estar activo
# =======================================================

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   BIENESTAR-DIGITAL - MODO DEV LOCAL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Lanzando BACKEND en localhost:4000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$ROOT\backend'; npm run dev`""

Start-Sleep -Seconds 2

Write-Host "[2/2] Lanzando FRONTEND en localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$ROOT\frontend'; npm run dev`""

Write-Host ""
Write-Host "✅ Listo! Accede en: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend API:       http://localhost:4000" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANTE: Asegurate de tener start_dev_tunnel.ps1 activo en otra terminal." -ForegroundColor Yellow
