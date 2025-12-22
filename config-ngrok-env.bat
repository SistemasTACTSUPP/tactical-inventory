@echo off
echo.
echo 🔧 CONFIGURAR VARIABLES DE ENTORNO PARA NGROK
echo =============================================
echo.

REM Verificar si ngrok está instalado
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ngrok no está instalado o no está en el PATH
    echo    Por favor ejecuta: setup-ngrok.ps1 primero
    echo.
    pause
    exit /b 1
)

echo ✅ ngrok encontrado
echo.

REM Iniciar ngrok para frontend y backend
echo 📡 Iniciando ngrok para FRONTEND (puerto 5173)...
start "ngrok-frontend" cmd /k "ngrok http 5173"

timeout /t 3 /nobreak >nul

echo 📡 Iniciando ngrok para BACKEND (puerto 3001)...
start "ngrok-backend" cmd /k "ngrok http 3001"

timeout /t 3 /nobreak >nul

echo.
echo ✅ ngrok iniciado en dos ventanas
echo.
echo 📋 IMPORTANTE: Copia las URLs de ngrok que aparecen en las ventanas
echo.
echo Las URLs se ven así:
echo   Frontend: https://xxxx-xxxx-xxxx.ngrok-free.app
echo   Backend:  https://yyyy-yyyy-yyyy.ngrok-free.app
echo.
echo Presiona cualquier tecla cuando hayas copiado las URLs...
pause >nul

set /p FRONTEND_URL="Ingresa la URL del FRONTEND (ngrok): "
set /p BACKEND_URL="Ingresa la URL del BACKEND (ngrok): "

echo.
echo 🔧 Configurando variables de entorno...
echo.

REM Crear/actualizar .env en frontend
if not exist "frontend\.env" (
    echo VITE_API_URL=%BACKEND_URL%/api > frontend\.env
    echo ✅ Archivo .env creado en frontend
) else (
    echo VITE_API_URL=%BACKEND_URL%/api > frontend\.env
    echo ✅ Archivo .env actualizado en frontend
)

REM Crear/actualizar .env en backend
if not exist "backend\.env" (
    (
        echo CORS_ORIGIN=%FRONTEND_URL% > backend\.env
        echo PORT=3001 >> backend\.env
        echo JWT_SECRET=tu_secret_key_aqui >> backend\.env
    )
    echo ✅ Archivo .env creado en backend
) else (
    REM Actualizar solo CORS_ORIGIN
    powershell -Command "(Get-Content backend\.env) -replace 'CORS_ORIGIN=.*', 'CORS_ORIGIN=%FRONTEND_URL%' | Set-Content backend\.env"
    echo ✅ Archivo .env actualizado en backend
)

echo.
echo ✅ Configuración completada
echo.
echo 📝 Archivos actualizados:
echo    - frontend\.env (VITE_API_URL=%BACKEND_URL%/api)
echo    - backend\.env (CORS_ORIGIN=%FRONTEND_URL%)
echo.
echo ⚠️  IMPORTANTE:
echo    1. Reinicia el backend: cd backend ^&^& npm run dev
echo    2. Reinicia el frontend: cd frontend ^&^& npm run dev
echo    3. Accede a la aplicación usando: %FRONTEND_URL%
echo.
pause

