# 📱 Guía Rápida: Acceder desde tu Celular

## ✅ Ya está configurado

He configurado el frontend y backend para aceptar conexiones desde tu red local.

---

## 🚀 Pasos para Acceder

### 1. Inicia el Backend
```bash
cd backend
npm run dev
```

### 2. Inicia el Frontend
```bash
cd frontend
npm run dev
```

### 3. Obtén tu IP

**En Windows:**
- Ejecuta: `get-ip.bat` (en la raíz del proyecto)
- O ejecuta: `ipconfig` y busca "Dirección IPv4"

**Tu IP probablemente es:** `192.168.68.120`

### 4. Accede desde tu Celular

1. **Asegúrate de que tu celular esté en la misma red WiFi que tu computadora**

2. **Abre el navegador en tu celular** (Chrome, Safari, etc.)

3. **Ve a:** `http://192.168.68.120:5173`

   ⚠️ **Reemplaza `192.168.68.120` con tu IP real si es diferente**

---

## 🔍 Verificar tu IP

Si no estás seguro de tu IP, ejecuta:

**Windows:**
```bash
ipconfig | findstr /i "IPv4"
```

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## ⚠️ Problemas Comunes

### No puedo acceder desde el celular:

1. **Verifica el Firewall de Windows:**
   - Ve a: Configuración > Red e Internet > Firewall de Windows
   - Permite Node.js y el puerto 5173

2. **Verifica que estén en la misma red:**
   - Tu computadora y celular deben estar en la misma WiFi
   - No uses datos móviles en el celular

3. **Verifica que los servidores estén corriendo:**
   - Backend: `http://localhost:3001/api/health`
   - Frontend: `http://localhost:5173`

4. **Prueba con la IP correcta:**
   - La IP puede cambiar si te desconectas y reconectas
   - Ejecuta `get-ip.bat` nuevamente para obtener la IP actual

---

## 📝 Notas

- La IP puede cambiar si te desconectas y reconectas a la WiFi
- Si cambias de red WiFi, necesitarás obtener la nueva IP
- El backend debe estar corriendo para que la app funcione

---

## 🎯 URLs Importantes

- **Frontend (desde celular):** `http://TU_IP:5173`
- **Backend API:** `http://TU_IP:3001/api`
- **Health Check:** `http://TU_IP:3001/api/health`

---

## 💡 Tip

Si quieres una URL más fácil de recordar, puedes usar **ngrok** (ver `ACCESO-DESDE-CELULAR.md` para más detalles).


