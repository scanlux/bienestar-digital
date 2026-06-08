# dashboard_loop.ps1
# Panel de monitoreo del entorno de desarrollo local aislado
# Verifica: MariaDB y Redis locales, Backend y Frontend cada 10 segundos

$LOCAL_DEV_DIR = $PSScriptRoot
if (-not $LOCAL_DEV_DIR) { $LOCAL_DEV_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path }
$SCRIPTS_DIR = Split-Path -Parent $LOCAL_DEV_DIR
$ROOT = Split-Path -Parent $SCRIPTS_DIR

$backendDir = "$ROOT\backend"
$envFile = "$backendDir\.env"

# Cargar configuración desde .env
$dbHost = "127.0.0.1"      # Fallback local aislado
$redisHost = "127.0.0.1"   # Fallback local aislado

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match "^\s*DB_HOST\s*=\s*(.+)\s*$") {
            $dbHost = $Matches[1].Trim()
        }
        if ($line -match "^\s*REDIS_HOST\s*=\s*(.+)\s*$") {
            $redisHost = $Matches[1].Trim()
        }
    }
}

$HOST_BACKEND  = "http://localhost:4000"
$HOST_FRONTEND = "http://localhost:3000"
$PORT_MARIADB  = 3306
$PORT_REDIS    = 6379

# Gracia de arranque: primeros N segundos un FAIL se muestra como STARTING
$GRACE_SECONDS_BACKEND  = 15
$GRACE_SECONDS_FRONTEND = 60

# Tracking de cuando vio OK por primera vez cada servicio
$backFirstOk  = $null
$frontFirstOk = $null

function Test-Port {
    param([string]$TargetHost, [int]$Port)
    try {
        $conn  = New-Object System.Net.Sockets.TcpClient
        $async = $conn.BeginConnect($TargetHost, $Port, $null, $null)
        $wait  = $async.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait) { $conn.EndConnect($async); $conn.Close(); return $true }
        $conn.Close(); return $false
    } catch { return $false }
}

function Test-Http {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        return $r.StatusCode -lt 500
    } catch [System.Net.WebException] {
        # Si hay respuesta HTTP (aunque sea 4xx), el servidor esta vivo
        if ($_.Exception.Response) { return $true }
        return $false
    } catch {
        return $false
    }
}

function Write-Status {
    param([string]$Label, [bool]$Ok, [string]$Extra = "", [bool]$InGrace = $false, [int]$GraceSecondsLeft = 0)
    if ($Ok) {
        $status = "[ OK ]"
        $color  = "Green"
        $suffix = if ($Extra) { "  ($Extra)" } else { "" }
    } elseif ($InGrace) {
        $status = "[WAIT]"
        $color  = "Yellow"
        $suffix = "  arrancando... (~${GraceSecondsLeft}s restantes)"
    } else {
        $status = "[FAIL]"
        $color  = "Red"
        $suffix = if ($Extra) { "  $Extra" } else { "" }
    }
    Write-Host "  " -NoNewline
    Write-Host $status -ForegroundColor $color -NoNewline
    Write-Host "  $Label$suffix"
}

$startTime = Get-Date
$iteration = 0

while ($true) {
    Clear-Host
    $iteration++
    $now        = Get-Date -Format "HH:mm:ss"
    $elapsed    = ((Get-Date) - $startTime).TotalSeconds
    $uptimeMin  = [math]::Round($elapsed / 60, 1)

    Write-Host ""
    Write-Host "  ==================================================" -ForegroundColor Cyan
    Write-Host "    BIENESTAR-DIGITAL  |  DEV DASHBOARD" -ForegroundColor Cyan
    Write-Host "  ==================================================" -ForegroundColor Cyan
    Write-Host "  Hora: $now  |  Activo: ${uptimeMin} min  |  Check #$iteration" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "  --- ENTORNO LOCAL (Bases de datos) ---------------" -ForegroundColor Yellow
    $mariaOk = Test-Port -TargetHost $dbHost -Port $PORT_MARIADB
    $redisOk = Test-Port -TargetHost $redisHost -Port $PORT_REDIS
    Write-Status "MariaDB Local -> ${dbHost}:${PORT_MARIADB}" $mariaOk
    Write-Status "Redis Local   -> ${redisHost}:${PORT_REDIS}" $redisOk

    Write-Host ""
    Write-Host "  --- BACKEND (Node.js) ---------------------------" -ForegroundColor Yellow
    $backOk = Test-Http -Url $HOST_BACKEND
    if ($backOk -and -not $backFirstOk) { $backFirstOk = Get-Date }
    $backInGrace   = (-not $backOk) -and ($elapsed -lt $GRACE_SECONDS_BACKEND)
    $backGraceLeft = [math]::Max(0, [int]($GRACE_SECONDS_BACKEND - $elapsed))
    $backExtra     = if ($backFirstOk) { "listo en $([math]::Round(($backFirstOk - $startTime).TotalSeconds, 1))s" } else { "" }
    Write-Status "Backend       -> localhost:4000" $backOk $backExtra $backInGrace $backGraceLeft

    Write-Host ""
    Write-Host "  --- FRONTEND (Next.js) --------------------------" -ForegroundColor Yellow
    $frontOk = Test-Http -Url $HOST_FRONTEND
    if ($frontOk -and -not $frontFirstOk) { $frontFirstOk = Get-Date }
    $frontInGrace   = (-not $frontOk) -and ($elapsed -lt $GRACE_SECONDS_FRONTEND)
    $frontGraceLeft = [math]::Max(0, [int]($GRACE_SECONDS_FRONTEND - $elapsed))
    $frontExtra     = if ($frontFirstOk) { "listo en $([math]::Round(($frontFirstOk - $startTime).TotalSeconds, 1))s" } else { "" }
    Write-Status "Frontend      -> localhost:3000" $frontOk $frontExtra $frontInGrace $frontGraceLeft

    Write-Host ""
    # Para el estado global, ignorar servicios en gracia de arranque
    $svcsDown = (-not $backOk -and -not $backInGrace) -or (-not $frontOk -and -not $frontInGrace) -or -not $mariaOk -or -not $redisOk

    if ($mariaOk -and $redisOk -and $backOk -and $frontOk) {
        Write-Host "  >> SISTEMA COMPLETO OPERATIVO <<" -ForegroundColor Green
    } elseif ($svcsDown) {
        Write-Host "  >> ENTORNO INCOMPLETO O CON FALLOS - revisar paneles <<" -ForegroundColor Red
    } else {
        Write-Host "  >> Servicios arrancando, espera un momento... <<" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  --- ACCESOS RAPIDOS -----------------------------" -ForegroundColor DarkGray
    Write-Host "  Frontend    : http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend     : http://localhost:4000" -ForegroundColor White
    Write-Host "  DB Local    : ${dbHost}:${PORT_MARIADB}" -ForegroundColor White
    Write-Host "  Redis Local : ${redisHost}:${PORT_REDIS}" -ForegroundColor White
    Write-Host ""
    Write-Host "  --- COMANDOS UTILES (en el panel del servicio) --" -ForegroundColor DarkGray
    Write-Host "  Next.js devmode : r + Enter = recarga manual" -ForegroundColor DarkGray
    Write-Host "  Nodemon backend : rs + Enter = restart manual" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Actualizando en 10s... (Ctrl+C para salir)" -ForegroundColor DarkGray
    Write-Host ""

    Start-Sleep -Seconds 10
}
