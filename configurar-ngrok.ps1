# Script para configurar ngrok automáticamente
# Este script te ayuda a configurar las URLs de ngrok en los archivos .env

Write-Host "🔧 Configuración de ngrok para la Aplicación" -ForegroundColor Cyan
Write-Host ""

# Solicitar URLs de ngrok
Write-Host "Necesitas tener 2 túneles de ngrok corriendo:" -ForegroundColor Yellow
Write-Host "  1. ngrok http 3001  (Backend)" -ForegroundColor White
Write-Host "  2. ngrok http 5173  (Frontend)" -ForegroundColor White
Write-Host ""

$backendUrl = Read-Host "Ingresa la URL de ngrok del BACKEND (puerto 3001) [ej: https://abcd-1234.ngrok-free.app]"
$frontendUrl = Read-Host "Ingresa la URL de ngrok del FRONTEND (puerto 5173) [ej: https://wxyz-9876.ngrok-free.app]"

# Validar URLs
if (-not $backendUrl -or -not $frontendUrl) {
    Write-Host "❌ Error: Debes ingresar ambas URLs" -ForegroundColor Red
    exit 1
}

# Limpiar URLs (quitar espacios y trailing slashes)
$backendUrl = $backendUrl.Trim().TrimEnd('/')
$frontendUrl = $frontendUrl.Trim().TrimEnd('/')

Write-Host ""
Write-Host "📝 Configurando archivos .env..." -ForegroundColor Cyan

# Configurar frontend/.env
$frontendEnvPath = "frontend\.env"
$frontendEnvContent = @"
# Configuración para ngrok
VITE_API_URL=$backendUrl/api
VITE_SOCKET_URL=$backendUrl
"@

Set-Content -Path $frontendEnvPath -Value $frontendEnvContent
Write-Host "✅ Configurado: $frontendEnvPath" -ForegroundColor Green
Write-Host "   VITE_API_URL=$backendUrl/api" -ForegroundColor Gray
Write-Host "   VITE_SOCKET_URL=$backendUrl" -ForegroundColor Gray

# Configurar backend/.env (agregar o actualizar CORS_ORIGIN)
$backendEnvPath = "backend\.env"
$backendEnvContent = Get-Content $backendEnvPath -ErrorAction SilentlyContinue

if ($backendEnvContent) {
    # Si existe, actualizar o agregar CORS_ORIGIN
    $updated = $false
    $newContent = @()
    foreach ($line in $backendEnvContent) {
        if ($line -match "^CORS_ORIGIN=") {
            $newContent += "CORS_ORIGIN=$frontendUrl"
            $updated = $true
        } else {
            $newContent += $line
        }
    }
    if (-not $updated) {
        $newContent += "CORS_ORIGIN=$frontendUrl"
    }
    Set-Content -Path $backendEnvPath -Value $newContent
} else {
    # Si no existe, crear nuevo
    Set-Content -Path $backendEnvPath -Value "CORS_ORIGIN=$frontendUrl"
}

Write-Host "✅ Configurado: $backendEnvPath" -ForegroundColor Green
Write-Host "   CORS_ORIGIN=$frontendUrl" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen:" -ForegroundColor Cyan
Write-Host "   Backend ngrok:  $backendUrl" -ForegroundColor White
Write-Host "   Frontend ngrok: $frontendUrl" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   1. Reinicia el backend y frontend para aplicar los cambios" -ForegroundColor White
Write-Host "   2. Accede desde tu celular usando: $frontendUrl" -ForegroundColor White
Write-Host "   3. Si reinicias ngrok, las URLs cambiarán y debes ejecutar este script de nuevo" -ForegroundColor White

