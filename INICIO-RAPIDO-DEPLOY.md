# ⚡ Inicio Rápido: Deploy Gratuito en 3 Pasos

## 🎯 Objetivo
Tener tu aplicación online y accesible desde cualquier lugar, **100% gratis**.

---

## 📋 Paso 1: Subir Código a GitHub (5 min)

Si ya tienes tu código en GitHub, salta al Paso 2.

### 1.1 Crear Repositorio
1. Ve a: https://github.com/new
2. Nombre: `tactical-inventory` (o el que prefieras)
3. Click "Create repository"

### 1.2 Subir Código
```bash
cd "C:\Users\Tactical_IT_2\Desktop\Nueva carpeta"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/tactical-inventory.git
git push -u origin main
```

---

## 📋 Paso 2: Base de Datos en PlanetScale (10 min)

### 2.1 Crear Cuenta y Base de Datos
1. Ve a: https://planetscale.com
2. Sign up con GitHub
3. Click "Create database"
4. Nombre: `tactical-inventory`
5. Plan: **Hobby** (gratis)
6. Click "Create database"

### 2.2 Obtener Credenciales
1. Ve a "Connect" → "Generate new password"
2. Copia las credenciales (guárdalas bien)

### 2.3 Ejecutar Migraciones
1. Actualiza `backend/.env` con las credenciales de PlanetScale
2. Ejecuta:
   ```bash
   cd backend
   npm run migrate
   npm run seed-users
   npm run seed-cedis
   ```

---

## 📋 Paso 3: Deploy (20 min)

### 3.1 Backend en Render
1. Ve a: https://render.com
2. Sign up con GitHub
3. "New +" → "Web Service"
4. Conecta tu repositorio
5. Configura:
   - **Build**: `cd backend && npm install`
   - **Start**: `cd backend && npm start`
   - **Plan**: Free
6. Agrega variables de entorno (ver `DEPLOY-VERCEL-RENDER.md`)
7. Click "Create Web Service"
8. Copia la URL: `https://tu-backend.onrender.com`

### 3.2 Frontend en Vercel
1. Ve a: https://vercel.com
2. Sign up con GitHub
3. "Add New..." → "Project"
4. Selecciona tu repositorio
5. Configura:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Agrega variables de entorno:
   - `VITE_API_URL=https://tu-backend.onrender.com/api`
   - `VITE_SOCKET_URL=https://tu-backend.onrender.com`
7. Click "Deploy"
8. Copia la URL: `https://tu-app.vercel.app`

### 3.3 Actualizar CORS
1. Vuelve a Render
2. Actualiza `CORS_ORIGIN` con la URL de Vercel
3. Guarda y espera el reinicio

---

## ✅ Verificar

1. Abre: `https://tu-backend.onrender.com/api/health`
2. Abre: `https://tu-app.vercel.app`
3. Prueba hacer login

---

## 🎉 ¡Listo!

Tu aplicación está online. Comparte la URL de Vercel con tu equipo.

**Para más detalles**, lee: `DEPLOY-VERCEL-RENDER.md`

---

## 🔄 Actualizar la App

Cada vez que hagas cambios:
```bash
git add .
git commit -m "Descripción"
git push
```

Vercel y Render desplegarán automáticamente. ✨

