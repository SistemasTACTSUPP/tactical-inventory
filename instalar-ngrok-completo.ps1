# Script completo para instalar y configurar ngrok en Windows
# Ejecutar como Administrador

Write-Host ""
Write-Host "🚀 INSTALADOR DE NGROK PARA WINDOWS" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Este script necesita permisos de administrador" -ForegroundColor Yellow
    Write-Host "   Por favor ejecuta PowerShell como Administrador" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Clic derecho en PowerShell > Ejecutar como administrador" -ForegroundColor White
    Write-Host ""
    pause
    exit
}

# Verificar si ngrok ya está instalado
Write-Host "🔍 Verificando si ngrok está instalado..." -ForegroundColor Cyan
$ngrokInstalled = $false
try {
    $ngrokVersion = ngrok version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ngrok ya está instalado" -ForegroundColor Green
        Write-Host "   Versión: $ngrokVersion" -ForegroundColor Gray
        $ngrokInstalled = $true
    }
} catch {
    $ngrokInstalled = $false
}

if (-not $ngrokInstalled) {
    Write-Host "📥 ngrok no está instalado" -ForegroundColor Yellow
    Write-Host ""
    
    # Crear carpeta para ngrok
    $ngrokPath = "C:\ngrok"
    
    if (-not (Test-Path $ngrokPath)) {
        Write-Host "📁 Creando carpeta: $ngrokPath" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $ngrokPath -Force | Out-Null
    }
    
    Write-Host "📥 Descargando ngrok..." -ForegroundColor Cyan
    Write-Host "   Por favor descarga ngrok manualmente desde:" -ForegroundColor Yellow
    Write-Host "   https://ngrok.com/download" -ForegroundColor White
    Write-Host ""
    Write-Host "   O presiona Enter para abrir el navegador..." -ForegroundColor Yellow
    Read-Host
    
    Start-Process "https://ngrok.com/download"
    
    Write-Host ""
    Write-Host "📦 Después de descargar:" -ForegroundColor Cyan
    Write-Host "   1. Extrae el archivo ZIP" -ForegroundColor White
    Write-Host "   2. Copia ngrok.exe a: $ngrokPath" -ForegroundColor White
    Write-Host "   3. Presiona Enter cuando hayas copiado el archivo..." -ForegroundColor Yellow
    Read-Host
    
    # Verificar si ngrok.exe está en la carpeta
    if (Test-Path "$ngrokPath\ngrok.exe") {
        Write-Host "✅ ngrok.exe encontrado en $ngrokPath" -ForegroundColor Green
    } else {
        Write-Host "❌ No se encontró ngrok.exe en $ngrokPath" -ForegroundColor Red
        Write-Host "   Por favor copia ngrok.exe manualmente a esa carpeta" -ForegroundColor Yellow
        Write-Host ""
        pause
        exit
    }
    
    # Agregar al PATH
    Write-Host ""
    Write-Host "🔧 Agregando ngrok al PATH del sistema..." -ForegroundColor Cyan
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
    
    if ($currentPath -notlike "*$ngrokPath*") {
        $newPath = $currentPath + ";$ngrokPath"
        [Environment]::SetEnvironmentVariable("Path", $newPath, [EnvironmentVariableTarget]::Machine)
        Write-Host "✅ ngrok agregado al PATH" -ForegroundColor Green
        
        # Actualizar PATH en la sesión actual
        $env:Path += ";$ngrokPath"
    } else {
        Write-Host "✅ ngrok ya está en el PATH" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Reinicia la terminal para que los cambios surtan efecto" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar autenticación
Write-Host "🔑 Verificando autenticación de ngrok..." -ForegroundColor Cyan

$ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
$isAuthenticated = $false

if (Test-Path $ngrokConfig) {
    $configContent = Get-Content $ngrokConfig -Raw
    if ($configContent -match "authtoken:\s*\S+") {
        Write-Host "✅ ngrok está autenticado" -ForegroundColor Green
        $isAuthenticated = $true
    }
}

if (-not $isAuthenticated) {
    Write-Host "⚠️  ngrok no está autenticado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para autenticarte:" -ForegroundColor Cyan
    Write-Host "1. Crea una cuenta gratuita en: https://dashboard.ngrok.com/signup" -ForegroundColor White
    Write-Host "2. Obtén tu token en: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host ""
    
    $token = Read-Host "Ingresa tu token de ngrok (o presiona Enter para saltar)"
    
    if ($token) {
        Write-Host ""
        Write-Host "🔐 Autenticando ngrok..." -ForegroundColor Cyan
        ngrok config add-authtoken $token
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Autenticación exitosa" -ForegroundColor Green
        } else {
            Write-Host "❌ Error al autenticar. Verifica tu token." -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  Puedes autenticarte más tarde ejecutando:" -ForegroundColor Yellow
        Write-Host "   ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "✅ Instalación completada" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Reinicia la terminal" -ForegroundColor White
Write-Host "   2. Ejecuta: start-ngrok.bat" -ForegroundColor White
Write-Host "   3. O manualmente: ngrok http 5173 (frontend)" -ForegroundColor White
Write-Host "                    ngrok http 3001 (backend)" -ForegroundColor White
Write-Host ""
pause


