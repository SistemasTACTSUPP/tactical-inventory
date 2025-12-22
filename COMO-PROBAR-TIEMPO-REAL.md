# 🧪 Cómo Probar el Sistema en Tiempo Real

## ✅ Estado Actual

- ✅ **Backend corriendo** en `http://localhost:3001`
- ✅ **Base de datos MySQL** configurada
- ✅ **WebSockets habilitados** y funcionando
- ✅ **Frontend completamente integrado** con API y WebSockets
- ✅ **Todas las páginas actualizadas** para tiempo real

---

## 🚀 Pasos Rápidos para Probar

### 1️⃣ Iniciar el Backend

```bash
cd backend
npm run dev
```

**✅ Deberías ver:**
```
🚀 Servidor corriendo en http://localhost:3001
📡 WebSocket disponible en ws://localhost:3001
✅ Cliente conectado: [socket-id]
```

### 2️⃣ Iniciar el Frontend (en otra terminal)

```bash
cd frontend
npm run dev
```

**✅ Deberías ver:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### 3️⃣ Abrir el Navegador

1. Ve a: **http://localhost:5173**
2. Inicia sesión con uno de estos códigos:

| Rol | Código |
|-----|--------|
| Admin | `Tactical2025` |
| Almacén CEDIS | `Cedis2025` |
| Almacén ACUÑA | `Acuña2025` |
| Almacén NLD | `Nld2025` |

3. **Verifica que veas:** "🟢 Tiempo real activo" en las páginas

---

## 🧪 Prueba Rápida de Tiempo Real (2 minutos)

### Paso 1: Abre DOS ventanas del navegador

- **Ventana 1:** `http://localhost:5173` (inicia sesión)
- **Ventana 2:** `http://localhost:5173` (inicia sesión)

### Paso 2: En Ventana 1

1. Ve a **"Inventario CEDIS"**
2. Haz clic en **"Añadir nuevo artículo"**
3. Completa:
   - Código: `TEST-001`
   - Descripción: `Prueba Tiempo Real`
   - Stock nuevo: `10`
4. Haz clic en **"Guardar artículo"**

### Paso 3: Observa Ventana 2

- ✅ El nuevo artículo aparece **automáticamente**
- ✅ No necesitas refrescar la página
- ✅ El contador se actualiza solo

**🎉 Si funciona, el sistema está operativo en tiempo real**

---

## 📋 Pruebas Completas por Sección

### ✅ Prueba 1: Inventario en Tiempo Real

**Ventana 1:**
- Ve a cualquier inventario (CEDIS, ACUÑA, NLD)
- Añade o modifica un artículo

**Ventana 2:**
- Deberías ver los cambios automáticamente

### ✅ Prueba 2: Entradas en Tiempo Real

**Ventana 1:**
- Ve a "Entradas"
- Crea una nueva entrada con artículos

**Ventana 2:**
- La entrada aparece en el historial
- El inventario se actualiza automáticamente

### ✅ Prueba 3: Salidas en Tiempo Real

**Ventana 1:**
- Ve a "Salidas"
- Crea una nueva salida

**Ventana 2:**
- La salida aparece en el historial
- El inventario se reduce automáticamente

### ✅ Prueba 4: Dashboard en Tiempo Real

**Ventana 1:**
- Ve a "Dashboard"
- Observa los números en las tarjetas

**Ventana 2:**
- Crea una entrada o salida

**Ventana 1:**
- Los números se actualizan automáticamente
- Las gráficas se actualizan

---

## 🔍 Verificar que Funciona

### En el Navegador (F12 - Consola)

Deberías ver:
```
✅ Conectado al servidor WebSocket
📡 Actualización en tiempo real recibida: {...}
```

### En el Backend (Terminal)

Deberías ver:
```
✅ Cliente conectado: abc123
Cliente abc123 se unió a inventory-CEDIS
📡 Emitiendo evento: entry-created
```

### En las Páginas

Deberías ver:
- **🟢 Tiempo real activo** en la parte superior

---

## ⚠️ Solución de Problemas

### Error: "address already in use :::3001"
```bash
# Windows PowerShell:
netstat -ano | findstr ":3001"
taskkill /PID [PID] /F
```

### No veo actualizaciones en tiempo real
1. ✅ Verifica que el backend esté corriendo
2. ✅ Verifica que el frontend esté corriendo
3. ✅ Revisa la consola del navegador (F12)
4. ✅ Asegúrate de ver "🟢 Tiempo real activo"

### Error de conexión a la base de datos
1. Verifica que MySQL esté corriendo
2. Verifica el archivo `.env` en `backend/`
3. Ejecuta: `npm run migrate` en la carpeta `backend/`

---

## 📝 Checklist de Verificación

Antes de probar, verifica:

- [ ] MySQL está corriendo
- [ ] Backend corriendo en puerto 3001
- [ ] Frontend corriendo en puerto 5173
- [ ] Base de datos creada (`npm run migrate`)
- [ ] Puedes iniciar sesión
- [ ] Ves "🟢 Tiempo real activo"
- [ ] No hay errores en consolas

---

## 🎯 Todas las Secciones Funcionan en Tiempo Real

✅ **Inventario** - CEDIS, ACUÑA, NLD  
✅ **Entradas** - Crear y ver en tiempo real  
✅ **Salidas** - Crear y aprobar en tiempo real  
✅ **Recuperados** - Registrar y filtrar  
✅ **Colaboradores** - Ver y registrar  
✅ **Registros Pendientes** - Asignar ID y aprobar  
✅ **Pedidos** - Crear desde sugerencias  
✅ **Dashboard** - Estadísticas en tiempo real  

---

## 🎉 ¡Listo para Usar!

El sistema está completamente funcional en tiempo real. Cualquier cambio que hagas en una ventana se reflejará automáticamente en todas las demás ventanas conectadas.
