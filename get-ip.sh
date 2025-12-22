#!/bin/bash

echo ""
echo "📱 OBTENER IP PARA ACCESO DESDE CELULAR"
echo "========================================"
echo ""

# Obtener IP en Mac/Linux
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$IP" ]; then
    IP=$(hostname -I | awk '{print $1}')
fi

echo "Tu IP es: $IP"
echo ""
echo "🌐 Accede desde tu celular:"
echo "   http://$IP:5173"
echo ""
echo "⚠️  Asegúrate de que:"
echo "   1. Tu celular esté en la misma red WiFi"
echo "   2. El firewall permita conexiones en el puerto 5173"
echo ""


