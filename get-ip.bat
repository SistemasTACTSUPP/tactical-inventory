@echo off
echo.
echo 📱 OBTENER IP PARA ACCESO DESDE CELULAR
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
    set ip=!ip: =!
    echo Tu IP es: !ip!
    echo.
    echo 🌐 Accede desde tu celular:
    echo    http://!ip!:5173
    echo.
    echo ⚠️  Asegurate de que:
    echo    1. Tu celular este en la misma red WiFi
    echo    2. El firewall permita conexiones en el puerto 5173
    echo.
    goto :done
)

:done
pause


