# start_all.ps1 - Arranque del entorno de desarrollo
# Lanza 3 ventanas de PowerShell independientes:
#   Ventana 1: Backend      (Ctrl+C para detener Node.js)
#   Ventana 2: Frontend     (Ctrl+C para detener Next.js)
#   Ventana 3: Dashboard    (Ctrl+C para detener el monitoreo)
#
# El acceso a DB/Redis se hace via Tailscale (IP dinámica leída de backend/.env)
# Detecta y mata procesos anteriores antes de arrancar.

$LOCAL_DEV_DIR = $PSScriptRoot
$SCRIPTS_DIR = Split-Path -Parent $LOCAL_DEV_DIR
$ROOT = Split-Path -Parent $SCRIPTS_DIR

$dashScript   = "$LOCAL_DEV_DIR\dashboard_loop.ps1"
$backendDir   = "$ROOT\backend"
$frontendDir  = "$ROOT\frontend"

# Leer IP de DB/Redis del archivo .env del backend
$dbHost = "100.127.144.125" # Fallback inicial
$envFile = "$backendDir\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match "^\s*DB_HOST\s*=\s*(.+)\s*$") {
            $dbHost = $Matches[1].Trim()
        }
    }
}

# Detectar PowerShell disponible
$psExe = "powershell"
if (Get-Command pwsh -ErrorAction SilentlyContinue) { $psExe = "pwsh" }

# ============================================================
# FUNCION: Matar proceso que ocupa un puerto dado
# ============================================================
function Stop-ProcessOnPort {
    param([int]$Port, [string]$Label)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid_ = $conn.OwningProcess | Select-Object -First 1
        $proc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "      Matando proceso en :$Port -> $($proc.Name) (PID $pid_)" -ForegroundColor DarkRed
            Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    } else {
        Write-Host "      Puerto :$Port libre." -ForegroundColor DarkGray
    }
}

# ============================================================
# INICIO
# ============================================================
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   BIENESTAR-DIGITAL - ARRANQUE (TAILSCALE)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Usando: $psExe | IP Oracle: $dbHost" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- PASO 1: LIMPIEZA DE PROCESOS PREVIOS ----
Write-Host "[LIMPIEZA] Verificando procesos anteriores..." -ForegroundColor Magenta
Write-Host ""

Write-Host "   Frontend (puerto 3000):" -ForegroundColor White
Stop-ProcessOnPort -Port 3000 -Label "Frontend"

Write-Host "   Backend (puerto 4000):" -ForegroundColor White
Stop-ProcessOnPort -Port 4000 -Label "Backend"

Write-Host ""
Write-Host "   Limpieza completada. Arrancando servicios..." -ForegroundColor Green
Write-Host ""

# ---- VENTANA 1: BACKEND NODE.JS ----
Write-Host "[1/3] Lanzando Backend (Node.js en :4000)..." -ForegroundColor Yellow
Start-Process $psExe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$backendDir'; pnpm run dev"

Write-Host "      Esperando 7s para que el backend inicialice..." -ForegroundColor DarkGray
Start-Sleep -Seconds 7

# ---- VENTANA 2: FRONTEND NEXT.JS ----
Write-Host "[2/3] Lanzando Frontend (Next.js en :3000)..." -ForegroundColor Yellow
Start-Process $psExe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$frontendDir'; pnpm run dev"

Write-Host "      Esperando 5s antes de iniciar el dashboard..." -ForegroundColor DarkGray
Start-Sleep -Seconds 5

# ---- VENTANA 3: DASHBOARD DE MONITOREO ----
Write-Host "[3/3] Lanzando Dashboard de monitoreo..." -ForegroundColor Yellow
Start-Process $psExe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$dashScript`""

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "   3 ventanas lanzadas correctamente." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend   : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend    : http://localhost:4000" -ForegroundColor White
Write-Host "  DB (Tail)  : ${dbHost}:3306" -ForegroundColor White
Write-Host "  Redis (Tail): ${dbHost}:6379" -ForegroundColor White
Write-Host ""
Write-Host "  Para detener un servicio: cierra su ventana o Ctrl+C en ella." -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow
Write-Host ""
