# create_startup_shortcut.ps1
# Crea un acceso directo en la carpeta Startup de Windows

$SCRIPT_PATH    = "C:\Users\starlux\.gemini\antigravity\scratch\bienestar-digital\start_all.ps1"
$STARTUP_FOLDER = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$SHORTCUT_PATH  = "$STARTUP_FOLDER\BienestarDigital-Dev.lnk"

if (-not (Test-Path $SCRIPT_PATH)) {
    Write-Host "ERROR: No se encontro start_all.ps1 en: $SCRIPT_PATH" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Creando acceso directo de arranque..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$WshShell  = New-Object -ComObject WScript.Shell
$shortcut  = $WshShell.CreateShortcut($SHORTCUT_PATH)

$shortcut.TargetPath       = "powershell.exe"
$shortcut.Arguments        = "-ExecutionPolicy Bypass -WindowStyle Minimized -File `"$SCRIPT_PATH`""
$shortcut.WorkingDirectory = Split-Path $SCRIPT_PATH
$shortcut.Description      = "Bienestar-Digital - Arranque entorno de desarrollo"
$shortcut.IconLocation     = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe,0"
$shortcut.WindowStyle      = 7

$shortcut.Save()

if (Test-Path $SHORTCUT_PATH) {
    Write-Host "OK - Acceso directo creado exitosamente:" -ForegroundColor Green
    Write-Host "   $SHORTCUT_PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "   El entorno arrancara automaticamente al iniciar sesion en Windows." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Para desactivarlo: elimina BienestarDigital-Dev.lnk" -ForegroundColor DarkGray
    Write-Host "   de la carpeta Startup (Win+R > shell:startup)" -ForegroundColor DarkGray
} else {
    Write-Host "ERROR al crear el acceso directo." -ForegroundColor Red
}
Write-Host ""
pause
