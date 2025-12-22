# 🚀 Guía Completa para Probar el Sistema en Tiempo Real

## 📋 Requisitos Previos

1. **MySQL instalado y corriendo**
2. **Node.js instalado** (versión 18 o superior)
3. **Base de datos creada** (se crea automáticamente con la migración)

---

## 🔧 Paso 1: Configurar el Backend

### 1.1. Navegar a la carpeta del backend
```bash
cd backend
```

### 1.2. Instalar dependencias (solo la primera vez)
```bash
npm install
```

### 1.3. Configurar variables de entorno
Asegúrate de que el archivo `.env` existe en la carpeta `backend/` con el siguiente contenido:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=tactical_inventory
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
CORS_ORIGIN=http://localhost:5173
```

**⚠️ IMPORTANTE:** Reemplaza `tu_contraseña_mysql` con tu contraseña real de MySQL.

### 1.4. Crear la base de datos y tablas
```bash
npm run migrate
```

Este comando:
- Crea la base de datos si no existe
- Crea todas las tablas necesarias
- Inserta usuarios iniciales con códigos de acceso

### 1.5. Iniciar el servidor backend
```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3001
📡 WebSocket disponible en ws://localhost:3001
✅ Cliente conectado: [socket-id]
```

**✅ El backend está listo cuando ves estos mensajes**

---

## 🎨 Paso 2: Configurar el Frontend

### 2.1. Abrir una NUEVA terminal (deja el backend corriendo)

### 2.2. Navegar a la carpeta del frontend
```bash
cd frontend
```

### 2.3. Instalar dependencias (solo la primera vez)
```bash
npm install
```

### 2.4. Iniciar el servidor de desarrollo
```bash
npm run dev
```

Deberías ver:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**✅ El frontend está listo cuando ves este mensaje**

---

## 🔐 Paso 3: Iniciar Sesión

### 3.1. Abrir el navegador
Ve a: **http://localhost:5173**

### 3.2. Usar uno de estos códigos de acceso:

| Rol | Código de Acceso |
|-----|------------------|
| **Admin** | `Tactical2025` |
| **Almacén CEDIS** | `Cedis2025` |
| **Almacén ACUÑA** | `Acuña2025` |
| **Almacén NLD** | `Nld2025` |

### 3.3. Verificar conexión en tiempo real
Después de iniciar sesión, deberías ver:
- **🟢 Tiempo real activo** en la parte superior de las páginas

---

## 🧪 Paso 4: Probar Funcionalidad en Tiempo Real

### 4.1. Preparar dos ventanas del navegador

**Opción A: Dos ventanas del mismo navegador**
- Abre una nueva pestaña en el mismo navegador
- Ve a `http://localhost:5173`
- Inicia sesión con el mismo código (o diferente para ver permisos)

**Opción B: Dos navegadores diferentes**
- Chrome y Firefox
- O dos ventanas de Chrome en modo incógnito

### 4.2. Prueba 1: Inventario en Tiempo Real

**En Ventana 1:**
1. Ve a **Inventario CEDIS** (o cualquier inventario)
2. Haz clic en **"Añadir nuevo artículo"**
3. Completa el formulario:
   - Código: `TEST-001`
   - Descripción: `Artículo de prueba`
   - Stock nuevo: `10`
   - Stock mínimo: `5`
4. Haz clic en **"Guardar artículo"**

**En Ventana 2:**
- ✅ Deberías ver el nuevo artículo aparecer automáticamente
- ✅ El contador de artículos se actualiza
- ✅ No necesitas refrescar la página

### 4.3. Prueba 2: Entradas en Tiempo Real

**En Ventana 1:**
1. Ve a **Entradas**
2. Haz clic en **"Crear entrada"**
3. Completa:
   - Fecha: (hoy)
   - Inventario destino: CEDIS
   - Añade un artículo:
     - Código: `TEST-001`
     - Descripción: `Artículo de prueba`
     - Cantidad: `5`
4. Haz clic en **"Guardar entrada"**

**En Ventana 2:**
- ✅ La nueva entrada aparece en el historial automáticamente
- ✅ El inventario se actualiza (el stock aumenta)

### 4.4. Prueba 3: Salidas en Tiempo Real

**En Ventana 1:**
1. Ve a **Salidas**
2. Haz clic en **"Crear salida"**
3. Completa:
   - Fecha: (hoy)
   - ID Colaborador: `EMP-999`
   - Nombre: `Prueba Tiempo Real`
   - Servicio: `Test`
   - Añade un artículo
4. Haz clic en **"Guardar salida"**

**En Ventana 2:**
- ✅ La nueva salida aparece en el historial
- ✅ El inventario se actualiza (el stock disminuye)

### 4.5. Prueba 4: Dashboard en Tiempo Real

**En Ventana 1:**
1. Ve a **Dashboard**
2. Observa los números en las tarjetas

**En Ventana 2:**
1. Crea una entrada o salida
2. Vuelve al Dashboard

**En Ventana 1:**
- ✅ Los números en las tarjetas se actualizan automáticamente
- ✅ La gráfica de inventario general se actualiza
- ✅ El gráfico de salidas se actualiza

---

## 📊 Paso 5: Verificar Todas las Secciones

### 5.1. Secciones que funcionan en tiempo real:

✅ **Inventario** (CEDIS, ACUÑA, NLD)
- Ver artículos
- Añadir nuevos artículos
- Modificar artículos
- Actualización automática de stock

✅ **Entradas**
- Crear nuevas entradas
- Ver historial
- Actualización de inventario

✅ **Salidas**
- Crear nuevas salidas
- Aprobar salidas (solo Admin)
- Ver historial

✅ **Recuperados**
- Registrar recuperaciones
- Filtrar por tipo (Recuperado/Desecho)
- Ver historial

✅ **Colaboradores**
- Ver lista de activos
- Registrar nuevos (van a pendientes)
- Filtrar por servicio y estado

✅ **Registros Pendientes** (solo Admin)
- Asignar ID a nuevos colaboradores
- Aprobar registros
- Ver detalles

✅ **Pedidos** (solo Admin)
- Crear pedidos
- Cargar sugerencias del dashboard
- Aprobar pedidos

✅ **Dashboard**
- Ver estadísticas en tiempo real
- Hacer clic en tarjetas para ver detalles
- Generar pedidos desde sugerencias

---

## 🔍 Paso 6: Verificar la Consola

### 6.1. En el Backend (Terminal 1)
Deberías ver mensajes como:
```
✅ Cliente conectado: abc123
Cliente abc123 se unió a inventory-CEDIS
📡 Emitiendo evento: entry-created
```

### 6.2. En el Frontend (Navegador - F12)
Abre la consola del navegador (F12) y deberías ver:
```
✅ Conectado al servidor WebSocket
📡 Actualización en tiempo real recibida: {...}
```

---

## ⚠️ Solución de Problemas

### Problema: "Error: listen EADDRINUSE: address already in use :::3001"
**Solución:**
```bash
# En Windows PowerShell:
netstat -ano | findstr ":3001"
# Anota el PID (número)
taskkill /PID [PID] /F

# Luego vuelve a iniciar:
npm run dev
```

### Problema: "Error de conexión a la base de datos"
**Solución:**
1. Verifica que MySQL esté corriendo
2. Verifica las credenciales en `.env`
3. Asegúrate de que la base de datos existe:
   ```bash
   npm run migrate
   ```

### Problema: "No veo actualizaciones en tiempo real"
**Solución:**
1. Verifica que el backend esté corriendo (Terminal 1)
2. Verifica que el frontend esté corriendo (Terminal 2)
3. Revisa la consola del navegador (F12) para ver errores
4. Asegúrate de ver "🟢 Tiempo real activo" en las páginas
5. Verifica que ambos estén en la misma red (localhost)

### Problema: "Error 401 Unauthorized"
**Solución:**
1. Cierra sesión y vuelve a iniciar sesión
2. Verifica que el token se guardó correctamente
3. Revisa la consola del navegador para ver el error específico

---

## ✅ Checklist de Verificación

Antes de probar, verifica:

- [ ] MySQL está corriendo
- [ ] Backend está corriendo en puerto 3001
- [ ] Frontend está corriendo en puerto 5173
- [ ] Base de datos creada (`npm run migrate`)
- [ ] Archivo `.env` configurado correctamente
- [ ] Puedes iniciar sesión con un código de acceso
- [ ] Ves "🟢 Tiempo real activo" en las páginas
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en la terminal del backend

---

## 🎯 Prueba Rápida (2 minutos)

1. **Inicia backend y frontend** (pasos 1 y 2)
2. **Abre 2 ventanas del navegador** y inicia sesión en ambas
3. **En Ventana 1:** Ve a Inventario CEDIS → Añade un artículo
4. **En Ventana 2:** Deberías ver el artículo aparecer automáticamente
5. **✅ Si funciona, el sistema está operativo**

---

## 📝 Notas Importantes

- **El backend debe estar corriendo siempre** mientras uses el frontend
- **No cierres la terminal del backend** mientras pruebas
- **Los cambios se guardan en MySQL**, no en localStorage
- **Cada usuario ve solo lo que su rol permite**
- **Admin ve todo**, usuarios de almacén solo ven su inventario

---

## 🎉 ¡Listo!

Si sigues estos pasos, deberías tener el sistema funcionando completamente en tiempo real. Cualquier problema, revisa la sección de "Solución de Problemas" o los logs en las consolas.


