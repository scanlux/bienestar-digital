# ============================================================
# start_dev_tunnel.ps1
# Abre un tunel SSH persistente:
#   localhost:3306 -> Oracle:3306 (MariaDB)
#   localhost:6379 -> Oracle:6379 (Redis)
# ============================================================

$KEY = "$env:USERPROFILE\.ssh\ssh-key.key"
$HOST_SSH = "ubuntu@143.47.104.153"

Write-Host "🚀 Iniciando tunel SSH hacia Oracle Cloud..." -ForegroundColor Cyan
Write-Host "   MariaDB : localhost:3306 -> Oracle:3306" -ForegroundColor Green
Write-Host "   Redis   : localhost:6379 -> Oracle:6379" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para cerrar el tunel." -ForegroundColor Yellow

ssh -i $KEY `
    -o StrictHostKeyChecking=no `
    -o ServerAliveInterval=60 `
    -o ExitOnForwardFailure=yes `
    -N `
    -L 3306:127.0.0.1:3306 `
    -L 6379:127.0.0.1:6379 `
    $HOST_SSH
