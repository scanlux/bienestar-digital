# dashboard_loop.ps1
# Panel de monitoreo del entorno de desarrollo
# Verifica: Tailscale (DB/Redis), Backend, Frontend cada 10 segundos

$HOST_BACKEND  = "http://localhost:4000"
$HOST_FRONTEND = "http://localhost:3000"
$PORT_MARIADB  = 3306
$PORT_REDIS    = 6379

function Test-Port {
    param([int]$Port)
    try {
        $conn  = New-Object System.Net.Sockets.TcpClient
        $async = $conn.BeginConnect("100.124.223.45", $Port, $null, $null)
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
    param([string]$Label, [bool]$Ok, [string]$Detail = "")
    $status = if ($Ok) { "[ OK ]" } else { "[FAIL]" }
    $color  = if ($Ok) { "Green" } else { "Red" }
    Write-Host "  " -NoNewline
    Write-Host $status -ForegroundColor $color -NoNewline
    Write-Host "  $Label" -NoNewline
    if ($Detail) { Write-Host " ($Detail)" -ForegroundColor DarkGray } else { Write-Host "" }
}

$startTime = Get-Date
$iteration = 0

while ($true) {
    Clear-Host
    $iteration++
    $now    = Get-Date -Format "HH:mm:ss"
    $uptime = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

    Write-Host ""
    Write-Host "  ==================================================" -ForegroundColor Cyan
    Write-Host "    BIENESTAR-DIGITAL  |  DEV DASHBOARD" -ForegroundColor Cyan
    Write-Host "  ==================================================" -ForegroundColor Cyan
    Write-Host "  Hora: $now  |  Activo: ${uptime} min  |  Check #$iteration" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "  --- TAILSCALE VPN (Oracle Cloud) -----------------" -ForegroundColor Yellow
    $mariaOk = Test-Port -Port $PORT_MARIADB
    $redisOk = Test-Port -Port $PORT_REDIS
    Write-Status "MariaDB  -> 100.124.223.45:3306" $mariaOk
    Write-Status "Redis    -> 100.124.223.45:6379" $redisOk

    Write-Host ""
    Write-Host "  --- BACKEND (Node.js) ---------------------------" -ForegroundColor Yellow
    $backOk = Test-Http -Url $HOST_BACKEND
    Write-Status "Backend  -> localhost:4000" $backOk "API Node.js"

    Write-Host ""
    Write-Host "  --- FRONTEND (Next.js) --------------------------" -ForegroundColor Yellow
    $frontOk = Test-Http -Url $HOST_FRONTEND
    Write-Status "Frontend -> localhost:3000" $frontOk "Next.js"

    Write-Host ""
    $allOk = $mariaOk -and $redisOk -and $backOk -and $frontOk
    if ($allOk) {
        Write-Host "  >> SISTEMA COMPLETO OPERATIVO <<" -ForegroundColor Green
    } else {
        Write-Host "  >> HAY SERVICIOS CAIDOS - revisar paneles <<" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "  --- ACCESOS RAPIDOS -----------------------------" -ForegroundColor DarkGray
    Write-Host "  Frontend  : http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend   : http://localhost:4000" -ForegroundColor White
    Write-Host "  Produccion: https://trendy.sytes.net" -ForegroundColor White
    Write-Host ""
    Write-Host "  --- COMANDOS UTILES (en el panel del servicio) --" -ForegroundColor DarkGray
    Write-Host "  Next.js devmode : r + Enter = recarga manual" -ForegroundColor DarkGray
    Write-Host "  Nodemon backend : rs + Enter = restart manual" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Actualizando en 10s... (Ctrl+C para salir)" -ForegroundColor DarkGray
    Write-Host ""

    Start-Sleep -Seconds 10
}
