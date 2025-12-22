# 📱 Cómo Acceder a la Aplicación desde tu Celular

Hay varias formas de acceder a la aplicación desde tu celular. Te explico las opciones:

---

## 🌐 Opción 1: Misma Red WiFi (Recomendado)

Esta es la forma más fácil si tu computadora y tu celular están en la misma red WiFi.

### Paso 1: Obtener la IP de tu computadora

**En Windows:**
1. Abre PowerShell o CMD
2. Ejecuta: `ipconfig`
3. Busca "Dirección IPv4" (ejemplo: `192.168.1.100`)

**En Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Paso 2: Configurar el Backend

El backend ya está configurado para aceptar conexiones desde la red local. Solo necesitas saber tu IP.

### Paso 3: Configurar el Frontend

1. Edita `frontend/vite.config.mts` y agrega:
```typescript
export default defineConfig({
  server: {
    host: '0.0.0.0', // Acepta conexiones desde cualquier IP
    port: 5173,
  },
  // ... resto de la configuración
});
```

2. Reinicia el servidor de desarrollo del frontend:
```bash
cd frontend
npm run dev
```

### Paso 4: Acceder desde tu celular

1. Asegúrate de que tu celular esté en la misma red WiFi
2. Abre el navegador en tu celular
3. Ve a: `http://TU_IP:5173` (ejemplo: `http://192.168.1.100:5173`)

---

## 🔧 Opción 2: Usando ngrok (Acceso desde cualquier lugar)

Si quieres acceder desde cualquier lugar (incluso fuera de tu WiFi), puedes usar ngrok.

⚠️ **IMPORTANTE: Necesitas 2 rutas de ngrok** - Una para el frontend y otra para el backend, porque el frontend hace llamadas API al backend.

### Instalación de ngrok:

1. Descarga ngrok desde: https://ngrok.com/download
2. Extrae el archivo
3. Agrega ngrok a tu PATH o úsalo directamente

### Configuración Paso a Paso:

#### Paso 1: Inicia el Backend
```bash
cd backend
npm run dev
```
Debería estar corriendo en `http://localhost:3001`

#### Paso 2: Inicia el Frontend
```bash
cd frontend
npm run dev
```
Debería estar corriendo en `http://localhost:5173`

#### Paso 3: Crea el túnel para el Backend (Terminal 1)
Abre una **nueva terminal** y ejecuta:
```bash
ngrok http 3001
```

Copia la URL que ngrok te da, por ejemplo:
```
https://abcd-1234-5678.ngrok-free.app
```

#### Paso 4: Crea el túnel para el Frontend (Terminal 2)
Abre **otra terminal nueva** y ejecuta:
```bash
ngrok http 5173
```

Copia la URL que ngrok te da, por ejemplo:
```
https://wxyz-9876-5432.ngrok-free.app
```

#### Paso 5: Configura las Variables de Entorno del Frontend

Crea o edita el archivo `frontend/.env`:
```env
VITE_API_URL=https://abcd-1234-5678.ngrok-free.app/api
VITE_SOCKET_URL=https://abcd-1234-5678.ngrok-free.app
```

**⚠️ IMPORTANTE:** 
- Reemplaza `abcd-1234-5678.ngrok-free.app` con la URL de ngrok del **BACKEND** (la del puerto 3001)
- Usa la misma URL para `VITE_API_URL` y `VITE_SOCKET_URL` (ambas apuntan al backend)

#### Paso 6: Configura CORS en el Backend

Edita `backend/.env` y agrega:
```env
CORS_ORIGIN=https://wxyz-9876-5432.ngrok-free.app
```

**⚠️ IMPORTANTE:**
- Reemplaza `wxyz-9876-5432.ngrok-free.app` con la URL de ngrok del **FRONTEND** (la del puerto 5173)

#### Paso 7: Reinicia Ambos Servidores

1. Detén el backend (Ctrl + C)
2. Detén el frontend (Ctrl + C)
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

#### Paso 8: Accede desde tu Celular

Abre el navegador en tu celular y ve a:
```
https://wxyz-9876-5432.ngrok-free.app
```
(Usa la URL de ngrok del **FRONTEND**)

---

### 📋 Resumen de URLs:

- **Backend ngrok:** `https://abcd-1234-5678.ngrok-free.app` → Va en `frontend/.env` como `VITE_API_URL` y `VITE_SOCKET_URL`
- **Frontend ngrok:** `https://wxyz-9876-5432.ngrok-free.app` → Va en `backend/.env` como `CORS_ORIGIN` y es la URL que usas en el celular

---

### ⚠️ Notas Importantes:

1. **Cada vez que reinicies ngrok, las URLs cambian** (a menos que tengas cuenta de pago)
2. **Debes actualizar las URLs en los archivos `.env` cada vez que cambien**
3. **Mantén ambas terminales de ngrok abiertas** mientras uses la aplicación
4. **Si cierras ngrok, la aplicación dejará de funcionar desde internet**

---

## ⚙️ Configuración Automática (Recomendado)

Voy a crear scripts que detecten automáticamente tu IP y configuren todo.

### Script para Windows:

```powershell
# Obtener IP automáticamente
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"}).IPAddress
Write-Host "Tu IP es: $ip"
Write-Host "Accede desde tu celular: http://$ip:5173"
```

---

## 🔒 Consideraciones de Seguridad

⚠️ **Importante:**
- Solo usa estas opciones en redes de confianza
- No expongas la aplicación a Internet sin protección
- Si usas ngrok, considera usar autenticación

---

## 🐛 Solución de Problemas

### No puedo acceder desde el celular:

1. **Verifica el firewall:**
   - Windows: Permite Node.js y el puerto 5173 en el firewall
   - Mac: Configuración del Sistema > Red > Firewall

2. **Verifica que estén en la misma red:**
   - Tu computadora y celular deben estar en la misma WiFi

3. **Verifica la IP:**
   - Asegúrate de usar la IP correcta (no localhost)

4. **Verifica los puertos:**
   - Frontend: 5173
   - Backend: 3001

### El backend no responde:

1. Verifica que el backend esté corriendo
2. Verifica que el puerto 3001 esté abierto
3. Verifica la configuración de CORS

---

## 📝 Notas

- La IP puede cambiar si te desconectas y reconectas a la WiFi
- Si cambias de red, necesitarás actualizar la IP
- Para producción, considera usar un servidor con dominio propio

