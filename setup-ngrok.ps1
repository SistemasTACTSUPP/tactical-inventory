# Script de PowerShell para instalar y configurar ngrok

Write-Host ""
Write-Host "🚀 CONFIGURACIÓN DE NGROK" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Verificar si ngrok ya está instalado
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
    Write-Host "Por favor sigue estos pasos:" -ForegroundColor Yellow
    Write-Host "1. Descarga ngrok desde: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extrae ngrok.exe a una carpeta (ej: C:\ngrok)" -ForegroundColor White
    Write-Host "3. Ejecuta este script nuevamente para agregarlo al PATH" -ForegroundColor White
    Write-Host ""
    
    $addToPath = Read-Host "¿Quieres que agregue ngrok al PATH automáticamente? (S/N)"
    
    if ($addToPath -eq "S" -or $addToPath -eq "s") {
        $ngrokPath = Read-Host "Ingresa la ruta completa donde está ngrok.exe (ej: C:\ngrok)"
        
        if (Test-Path "$ngrokPath\ngrok.exe") {
            # Agregar al PATH del sistema
            $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
            
            if ($currentPath -notlike "*$ngrokPath*") {
                $newPath = $currentPath + ";$ngrokPath"
                [Environment]::SetEnvironmentVariable("Path", $newPath, [EnvironmentVariableTarget]::Machine)
                Write-Host "✅ ngrok agregado al PATH" -ForegroundColor Green
                Write-Host "⚠️  Por favor reinicia la terminal para que los cambios surtan efecto" -ForegroundColor Yellow
            } else {
                Write-Host "✅ ngrok ya está en el PATH" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ No se encontró ngrok.exe en: $ngrokPath" -ForegroundColor Red
            Write-Host "   Por favor verifica la ruta" -ForegroundColor Yellow
        }
    }
    
    exit
}

# Verificar si está autenticado
Write-Host ""
Write-Host "🔑 Verificando autenticación de ngrok..." -ForegroundColor Cyan

$ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (Test-Path $ngrokConfig) {
    $configContent = Get-Content $ngrokConfig -Raw
    if ($configContent -match "authtoken") {
        Write-Host "✅ ngrok está autenticado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  ngrok no está autenticado" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para autenticarte:" -ForegroundColor Yellow
        Write-Host "1. Crea una cuenta en: https://dashboard.ngrok.com/signup" -ForegroundColor White
        Write-Host "2. Obtén tu token en: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
        Write-Host "3. Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
        Write-Host ""
        
        $token = Read-Host "¿Tienes tu token listo? Ingrésalo aquí (o presiona Enter para saltar)"
        
        if ($token) {
            ngrok config add-authtoken $token
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Autenticación exitosa" -ForegroundColor Green
            } else {
                Write-Host "❌ Error al autenticar. Verifica tu token." -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "⚠️  ngrok no está autenticado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para autenticarte:" -ForegroundColor Yellow
    Write-Host "1. Crea una cuenta en: https://dashboard.ngrok.com/signup" -ForegroundColor White
    Write-Host "2. Obtén tu token en: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host "3. Ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Configuración completada" -ForegroundColor Green
Write-Host ""
Write-Host "Para usar ngrok:" -ForegroundColor Cyan
Write-Host "  - Ejecuta: start-ngrok.bat" -ForegroundColor White
Write-Host "  - O manualmente: ngrok http 5173 (para frontend)" -ForegroundColor White
Write-Host "                  ngrok http 3001 (para backend)" -ForegroundColor White
Write-Host ""


