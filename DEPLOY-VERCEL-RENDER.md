# 🚀 Guía Paso a Paso: Deploy en Vercel + Render + PlanetScale

Esta guía te llevará paso a paso para hostear tu aplicación completamente gratis.

---

## 📋 Requisitos Previos

- Cuenta de GitHub (gratis)
- Tu código subido a un repositorio de GitHub
- 30-45 minutos de tiempo

---

## Paso 1: Preparar Base de Datos en PlanetScale

### 1.1 Crear Cuenta
1. Ve a: https://planetscale.com
2. Click en "Sign up" (puedes usar GitHub)
3. Confirma tu email

### 1.2 Crear Base de Datos
1. Click en "Create database"
2. Nombre: `tactical-inventory` (o el que prefieras)
3. Región: Elige la más cercana a ti
4. Plan: **Hobby** (gratis)
5. Click "Create database"

### 1.3 Obtener Credenciales
1. Ve a la pestaña "Connect"
2. Click en "Generate new password"
3. Copia las credenciales:
   - **Host**: `xxxx.xxxx.planetscale.com`
   - **Username**: `xxxx`
   - **Password**: `xxxx` (guárdala bien, solo se muestra una vez)
   - **Database**: `tactical-inventory`

### 1.4 Ejecutar Migraciones
1. En tu computadora, actualiza `backend/.env` temporalmente:
   ```env
   DB_HOST=tu-host-planetscale
   DB_USER=tu-usuario
   DB_PASSWORD=tu-password
   DB_NAME=tactical-inventory
   DB_PORT=3306
   ```

2. Ejecuta las migraciones:
   ```bash
   cd backend
   npm run migrate
   npm run seed-users
   npm run seed-cedis
   ```

3. Verifica que los datos se crearon correctamente

---

## Paso 2: Hostear Backend en Render

### 2.1 Crear Cuenta
1. Ve a: https://render.com
2. Click "Get Started for Free"
3. Conecta con GitHub

### 2.2 Crear Web Service
1. Click en "New +" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Selecciona el repositorio con tu código

### 2.3 Configurar el Servicio
**Nombre**: `tactical-inventory-backend` (o el que prefieras)

**Configuración**:
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Plan**: **Free**

**Environment Variables** (agrega estas):
```
PORT=10000
NODE_ENV=production
DB_HOST=tu-host-planetscale
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=tactical-inventory
DB_PORT=3306
JWT_SECRET=genera-una-clave-secreta-muy-larga-y-segura-aqui
CORS_ORIGIN=https://tu-app.vercel.app
```

⚠️ **Nota**: Por ahora deja `CORS_ORIGIN` con un placeholder. Lo actualizarás después.

### 2.4 Crear el Servicio
1. Click "Create Web Service"
2. Render comenzará a construir y desplegar tu backend
3. Espera 5-10 minutos
4. Cuando termine, copia la URL: `https://tu-backend.onrender.com`

---

## Paso 3: Hostear Frontend en Vercel

### 3.1 Crear Cuenta
1. Ve a: https://vercel.com
2. Click "Sign Up"
3. Conecta con GitHub

### 3.2 Importar Proyecto
1. Click "Add New..." → "Project"
2. Selecciona tu repositorio
3. Click "Import"

### 3.3 Configurar el Proyecto
**Framework Preset**: Vite (debería detectarlo automáticamente)

**Root Directory**: `frontend`

**Build and Output Settings**:
- **Build Command**: `npm run build` (o `cd frontend && npm run build`)
- **Output Directory**: `dist` (o `frontend/dist`)

**Environment Variables** (agrega estas):
```
VITE_API_URL=https://tu-backend.onrender.com/api
VITE_SOCKET_URL=https://tu-backend.onrender.com
```

⚠️ **Reemplaza** `tu-backend.onrender.com` con la URL real de Render.

### 3.4 Deploy
1. Click "Deploy"
2. Espera 2-5 minutos
3. Cuando termine, copia la URL: `https://tu-app.vercel.app`

---

## Paso 4: Actualizar CORS en Render

1. Vuelve a Render
2. Ve a tu servicio del backend
3. Click en "Environment"
4. Actualiza `CORS_ORIGIN` con la URL de Vercel:
   ```
   CORS_ORIGIN=https://tu-app.vercel.app
   ```
5. Click "Save Changes"
6. Render reiniciará automáticamente el servicio

---

## Paso 5: Verificar que Todo Funciona

### 5.1 Verificar Backend
Abre en tu navegador:
```
https://tu-backend.onrender.com/api/health
```

Deberías ver un JSON con el estado del servidor.

### 5.2 Verificar Frontend
Abre en tu navegador:
```
https://tu-app.vercel.app
```

Deberías ver la pantalla de login.

### 5.3 Probar Login
1. Intenta hacer login con uno de los códigos de acceso
2. Si funciona, ¡todo está configurado correctamente!

---

## 🔧 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que las credenciales de PlanetScale sean correctas
- Asegúrate de que el password esté bien copiado (sin espacios)
- Verifica que la base de datos exista en PlanetScale

### Error: "CORS error" en el navegador
- Verifica que `CORS_ORIGIN` en Render tenga la URL correcta de Vercel
- Asegúrate de que no tenga `/` al final
- Reinicia el servicio en Render después de cambiar la variable

### El backend se "duerme" y tarda en responder
- Esto es normal en el plan gratuito de Render
- La primera petición después de 15 min de inactividad tarda ~30 segundos
- Las siguientes peticiones son rápidas
- Si necesitas que no se duerma, considera Railway (Opción 2)

### Error: "WebSocket connection failed"
- Verifica que `VITE_SOCKET_URL` en Vercel tenga la URL correcta del backend
- Asegúrate de que Render soporte WebSocket (sí lo soporta)

---

## 📝 Notas Importantes

1. **URLs Permanentes**: Las URLs de Vercel y Render no cambian (a diferencia de ngrok)
2. **Actualizaciones Automáticas**: Cada vez que hagas `git push`, Vercel y Render desplegarán automáticamente
3. **Logs**: Puedes ver los logs en tiempo real en los dashboards de Vercel y Render
4. **Base de Datos**: PlanetScale tiene un límite de 1GB en el plan gratuito (suficiente para desarrollo)

---

## ✅ Checklist Final

- [ ] Base de datos creada en PlanetScale
- [ ] Migraciones ejecutadas en PlanetScale
- [ ] Backend desplegado en Render
- [ ] Frontend desplegado en Vercel
- [ ] CORS configurado correctamente
- [ ] Variables de entorno configuradas
- [ ] Login funciona desde la URL de Vercel
- [ ] Puedes acceder desde cualquier dispositivo

---

## 🎉 ¡Listo!

Tu aplicación ahora está online y accesible desde cualquier lugar. Puedes compartir la URL de Vercel con tu equipo.

**URL de tu aplicación**: `https://tu-app.vercel.app`

---

## 🔄 Actualizar la Aplicación

Cada vez que quieras actualizar la aplicación:

1. Haz tus cambios en el código
2. Haz commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push
   ```
3. Vercel y Render desplegarán automáticamente los cambios en 2-5 minutos

¡No necesitas hacer nada más! 🚀

