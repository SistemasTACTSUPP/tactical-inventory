# 🚀 Inicio Rápido - Backend

## ✅ Estado Actual

- ✅ MySQL instalado y corriendo
- ✅ Base de datos creada
- ✅ Dependencias instaladas
- ✅ Archivo .env configurado

## 🎯 Próximos Pasos

### 1. Iniciar el servidor backend

```bash
cd backend
npm run dev
```

El servidor estará disponible en: `http://localhost:3001`

### 2. Verificar que funciona

Abre en tu navegador o usa curl:
```
http://localhost:3001/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

### 3. Probar el login

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "accessCode": "Tactical2025"
}
```

### 4. Conectar el frontend

Una vez que el backend esté corriendo, necesitamos actualizar el frontend para que use la API en lugar de localStorage.

## 📋 Endpoints Disponibles

- `GET /api/health` - Estado del servidor
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/inventory/:site` - Obtener inventario (CEDIS, ACUÑA, NLD)
- `GET /api/entries` - Obtener entradas
- `POST /api/entries` - Crear entrada
- `GET /api/dispatches` - Obtener salidas
- `POST /api/dispatches` - Crear salida
- Y más...

## 🔌 WebSockets

El servidor también expone WebSockets en el mismo puerto para actualizaciones en tiempo real.

## ⚠️ Nota

Si el servidor no inicia, verifica:
1. Que el puerto 3001 no esté en uso
2. Que MySQL esté corriendo
3. Que el archivo .env tenga la contraseña correcta

