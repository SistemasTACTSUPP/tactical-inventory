# 🧪 Guía para Probar el Sistema en Tiempo Real

## 📋 Pasos para Probar

### 1. Iniciar el Backend

```bash
cd backend
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3001
📡 WebSocket disponible en ws://localhost:3001
✅ Conexión a MySQL establecida correctamente
```

### 2. Iniciar el Frontend

En otra terminal:
```bash
cd frontend
npm run dev
```

### 3. Probar la Conexión

1. Abre el navegador en `http://localhost:5173`
2. Inicia sesión con el código: `Tactical2025`
3. Deberías ver "🟢 Conectado en tiempo real" en la parte superior

### 4. Probar Actualizaciones en Tiempo Real

**Opción A: Desde el Frontend**
- Abre dos ventanas del navegador (o dos navegadores diferentes)
- Inicia sesión en ambas con el mismo o diferente usuario
- En una ventana, crea una entrada o modifica el inventario
- En la otra ventana, deberías ver la actualización automáticamente

**Opción B: Desde la API directamente**

Usa Postman o curl para hacer cambios:

```bash
# Crear una entrada
curl -X POST http://localhost:3001/api/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "date": "2025-01-15",
    "site": "CEDIS",
    "items": [
      {
        "code": "PT28",
        "description": "Pantalón Tactico 28",
        "qty": 5
      }
    ]
  }'
```

### 5. Verificar WebSockets

Abre la consola del navegador (F12) y deberías ver:
```
✅ Conectado al servidor WebSocket
📡 Actualización en tiempo real recibida: {...}
```

## 🔍 Qué Observar

1. **Estado de Conexión**: Deberías ver "🟢 Conectado en tiempo real" cuando esté funcionando
2. **Actualizaciones Automáticas**: Los cambios se reflejan sin recargar la página
3. **Consola del Navegador**: Muestra los eventos WebSocket recibidos
4. **Consola del Backend**: Muestra cuando los clientes se conectan/desconectan

## 🐛 Solución de Problemas

### No se conecta al WebSocket
- Verifica que el backend esté corriendo
- Verifica que el puerto 3001 no esté bloqueado por firewall
- Revisa la consola del navegador para errores

### No se ven actualizaciones
- Verifica que ambos clientes estén en la misma "sala" (mismo inventario)
- Revisa que el WebSocket esté conectado (debería mostrar 🟢)
- Verifica la consola del backend para ver si se están emitiendo eventos

### Error de CORS
- Verifica que `CORS_ORIGIN` en `.env` sea `http://localhost:5173`
- Reinicia el servidor backend después de cambiar `.env`

## 📝 Notas

- Los WebSockets se conectan automáticamente al iniciar sesión
- Cada inventario tiene su propia "sala" de WebSocket
- Los cambios se propagan a todos los clientes conectados a esa sala
- Si te desconectas, los cambios se sincronizan al reconectar


