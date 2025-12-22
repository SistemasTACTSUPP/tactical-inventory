# 🌐 Guía Completa: Usar ngrok para Acceso desde Cualquier Lugar

## 📋 ¿Por qué necesitas 2 rutas de ngrok?

Tu aplicación tiene **2 servidores**:
- **Frontend** (puerto 5173): La interfaz web que ves en el navegador
- **Backend** (puerto 3001): La API que maneja los datos y la base de datos

El frontend hace llamadas al backend para:
- Autenticación (login)
- Obtener datos del inventario
- Crear entradas, salidas, recuperaciones
- WebSocket para actualizaciones en tiempo real

Por eso necesitas **2 túneles de ngrok**:
1. Uno para el frontend (puerto 5173)
2. Uno para el backend (puerto 3001)

---

## 🚀 Pasos para Configurar ngrok

### Paso 1: Instalar ngrok

1. Ve a: https://ngrok.com/download
2. Descarga la versión para Windows
3. Extrae el archivo `ngrok.exe`
4. Agrega ngrok a tu PATH o guárdalo en una carpeta fácil de acceder

**Para agregar al PATH manualmente:**
1. Copia `ngrok.exe` a una carpeta (ej: `C:\ngrok\`)
2. Abre "Variables de entorno" en Windows
3. Edita la variable "Path"
4. Agrega la ruta donde está `ngrok.exe` (ej: `C:\ngrok\`)

### Paso 2: Iniciar los Servidores

#### Terminal 1: Backend
```bash
cd "C:\Users\Tactical_IT_2\Desktop\Nueva carpeta\backend"
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3001
```

#### Terminal 2: Frontend
```bash
cd "C:\Users\Tactical_IT_2\Desktop\Nueva carpeta\frontend"
npm run dev
```

Deberías ver:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Paso 3: Crear Túneles de ngrok

#### Terminal 3: ngrok para Backend
```bash
ngrok http 3001
```

Verás algo como:
```
Forwarding   https://abcd-1234-5678.ngrok-free.app -> http://localhost:3001
```

**Copia esta URL:** `https://abcd-1234-5678.ngrok-free.app`

#### Terminal 4: ngrok para Frontend
```bash
ngrok http 5173
```

Verás algo como:
```
Forwarding   https://wxyz-9876-5432.ngrok-free.app -> http://localhost:5173
```

**Copia esta URL:** `https://wxyz-9876-5432.ngrok-free.app`

### Paso 4: Configurar Variables de Entorno

#### Opción A: Usar el Script Automático (Recomendado)

Ejecuta el script de configuración:
```powershell
cd "C:\Users\Tactical_IT_2\Desktop\Nueva carpeta"
.\configurar-ngrok.ps1
```

El script te pedirá las URLs y configurará todo automáticamente.

#### Opción B: Configuración Manual

**1. Crear/Editar `frontend/.env`:**
```env
VITE_API_URL=https://abcd-1234-5678.ngrok-free.app/api
VITE_SOCKET_URL=https://abcd-1234-5678.ngrok-free.app
```

⚠️ **Usa la URL del BACKEND aquí** (la del puerto 3001)

**2. Editar `backend/.env`:**
Agrega o actualiza:
```env
CORS_ORIGIN=https://wxyz-9876-5432.ngrok-free.app
```

⚠️ **Usa la URL del FRONTEND aquí** (la del puerto 5173)

### Paso 5: Reiniciar los Servidores

**IMPORTANTE:** Debes reiniciar ambos servidores para que tomen las nuevas variables de entorno.

1. Detén el backend (Ctrl + C en Terminal 1)
2. Detén el frontend (Ctrl + C en Terminal 2)
3. Reinicia el backend:
   ```bash
   cd backend
   npm run dev
   ```
4. Reinicia el frontend:
   ```bash
   cd frontend
   npm run dev
   ```

### Paso 6: Acceder desde tu Celular

1. Abre el navegador en tu celular
2. Ve a la URL de ngrok del **FRONTEND**:
   ```
   https://wxyz-9876-5432.ngrok-free.app
   ```
3. Deberías ver la pantalla de login

---

## 📋 Resumen de Configuración

| Componente | Puerto Local | URL ngrok | Dónde se usa |
|------------|--------------|-----------|--------------|
| **Backend** | 3001 | `https://abcd-1234-5678.ngrok-free.app` | En `frontend/.env` como `VITE_API_URL` y `VITE_SOCKET_URL` |
| **Frontend** | 5173 | `https://wxyz-9876-5432.ngrok-free.app` | En `backend/.env` como `CORS_ORIGIN` y para acceder desde el celular |

---

## ⚠️ Notas Importantes

### 1. URLs Temporales
- Con ngrok gratuito, las URLs cambian cada vez que reinicias ngrok
- Si reinicias ngrok, debes actualizar los archivos `.env` y reiniciar los servidores

### 2. Mantener ngrok Corriendo
- Debes mantener **ambas terminales de ngrok abiertas** mientras uses la aplicación
- Si cierras ngrok, la aplicación dejará de funcionar desde internet

### 3. Cuenta de pago de ngrok (Opcional)
- Con una cuenta de pago puedes tener URLs fijas (reserved domains)
- Esto evita tener que actualizar las URLs cada vez

### 4. Seguridad
- ⚠️ **ngrok expone tu aplicación a internet**
- Cualquiera con la URL puede acceder
- Solo úsalo para desarrollo y pruebas
- No uses ngrok en producción sin autenticación adicional

---

## 🐛 Solución de Problemas

### Error: "Failed to fetch" o "CORS error"
- Verifica que `CORS_ORIGIN` en `backend/.env` tenga la URL correcta del frontend
- Reinicia el backend después de cambiar `.env`

### Error: "WebSocket connection failed"
- Verifica que `VITE_SOCKET_URL` en `frontend/.env` tenga la URL correcta del backend
- Reinicia el frontend después de cambiar `.env`

### La aplicación carga pero no se conecta al backend
- Verifica que `VITE_API_URL` en `frontend/.env` tenga la URL correcta del backend
- Asegúrate de que termine en `/api` (ej: `https://xxxx.ngrok-free.app/api`)
- Reinicia el frontend

### ngrok muestra "Tunnel session closed"
- Reinicia ngrok
- Actualiza las URLs en los archivos `.env`
- Reinicia ambos servidores

---

## ✅ Checklist de Verificación

Antes de acceder desde tu celular, verifica:

- [ ] Backend corriendo en `http://localhost:3001`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] ngrok para backend corriendo (puerto 3001)
- [ ] ngrok para frontend corriendo (puerto 5173)
- [ ] `frontend/.env` configurado con URL del backend
- [ ] `backend/.env` configurado con URL del frontend
- [ ] Ambos servidores reiniciados después de configurar `.env`
- [ ] Puedes acceder a `http://localhost:5173` desde tu computadora

---

## 🎯 Próximos Pasos

Una vez configurado, puedes:
1. Acceder desde cualquier dispositivo con internet
2. Compartir la URL con tu equipo
3. Probar la aplicación en tiempo real desde diferentes lugares

¡Listo! Ya puedes acceder a tu aplicación desde cualquier lugar. 🚀

