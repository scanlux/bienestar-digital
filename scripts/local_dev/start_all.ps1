# start_all.ps1 - Arranque del entorno de desarrollo local
# Lanza 3 ventanas de PowerShell independientes:
#   Ventana 1: Backend      (Ctrl+C para detener Node.js)
#   Ventana 2: Frontend     (Ctrl+C para detener Next.js)
#   Ventana 3: Dashboard    (Ctrl+C para detener el monitoreo)
#
# El acceso a la DB y a Redis se realiza localmente (127.0.0.1) para un aislamiento completo.
# Detecta y detiene procesos previos ocupando los puertos de desarrollo antes de arrancar.

$LOCAL_DEV_DIR = $PSScriptRoot
$SCRIPTS_DIR = Split-Path -Parent $LOCAL_DEV_DIR
$ROOT = Split-Path -Parent $SCRIPTS_DIR

$dashScript   = "$LOCAL_DEV_DIR\dashboard_loop.ps1"
$backendDir   = "$ROOT\backend"
$frontendDir  = "$ROOT\frontend"

# Leer IP de DB/Redis del archivo .env del backend
$dbHost = "127.0.0.1" # Por defecto local aislado
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
Write-Host "   BIENESTAR-DIGITAL - ARRANQUE LOCAL AISLADO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Usando: $psExe | IP Host: $dbHost" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- PASO 1: VERIFICAR Y LEVANTAR REDIS LOCAL ----
Write-Host "[REDIS] Verificando servidor Redis local..." -ForegroundColor Magenta
$redisConn = Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue
if (-not $redisConn) {
    Write-Host "   Redis no está corriendo en el puerto 6379. Buscando ejecutable..." -ForegroundColor Yellow
    $redisExe = $null
    $wingetRedisDir = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "*redis*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($wingetRedisDir) {
        $found = Get-ChildItem -Path $wingetRedisDir.FullName -Filter "redis-server.exe" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { $redisExe = $found.FullName }
    }
    if (-not $redisExe) {
        $cmd = Get-Command "redis-server" -ErrorAction SilentlyContinue
        if ($cmd) { $redisExe = $cmd.Source }
    }

    if ($redisExe) {
        Write-Host "   Iniciando Redis Server local en segundo plano..." -ForegroundColor Green
        Start-Process $redisExe -ArgumentList "--port 6379" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    } else {
        Write-Warning "No se encontró redis-server.exe en PATH ni en WinGet. Asegúrate de iniciar Redis manualmente."
    }
} else {
    Write-Host "   Redis ya está en ejecución local (puerto 6379)." -ForegroundColor Green
}
Write-Host ""

# ---- PASO 2: VERIFICAR MARIADB LOCAL ----
Write-Host "[MARIADB] Verificando base de datos local..." -ForegroundColor Magenta
$dbConn = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $dbConn) {
    Write-Warning "La base de datos local (puerto 3306) no está escuchando. Asegúrate de iniciar tu servidor de MariaDB local."
} else {
    Write-Host "   MariaDB local ya está en ejecución (puerto 3306)." -ForegroundColor Green
}
Write-Host ""

# ---- PASO 3: LIMPIEZA DE PUERTOS DE TRABAJO (PROCESOS PREVIOS) ----
Write-Host "[LIMPIEZA] Limpiando procesos de desarrollo previos..." -ForegroundColor Magenta
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
Write-Host "   Entorno de desarrollo local iniciado correctamente." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend    : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend     : http://localhost:4000" -ForegroundColor White
Write-Host "  DB Local    : ${dbHost}:3306" -ForegroundColor White
Write-Host "  Redis Local : ${dbHost}:6379" -ForegroundColor White
Write-Host ""
Write-Host "  Para detener un servicio: cierra su ventana o presiona Ctrl+C en ella." -ForegroundColor Yellow
Write-Host ""
