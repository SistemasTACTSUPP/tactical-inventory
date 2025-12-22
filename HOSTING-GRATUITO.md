# 🆓 Guía: Hosting Gratuito para tu Aplicación

Hay varias opciones **100% gratuitas** para hostear tu aplicación y que todos puedan acceder sin usar ngrok. Te explico las mejores opciones:

---

## 🏆 Opción 1: Vercel (Frontend) + Render (Backend) + PlanetScale (MySQL)

**Esta es la opción más recomendada y fácil de configurar.**

### ✅ Ventajas:
- **100% Gratis** (con límites generosos)
- URLs permanentes (no cambian)
- Fácil de configurar
- Sin necesidad de mantener servidores corriendo
- Soporte para WebSocket

### ⚠️ Limitaciones del plan gratuito:
- **Render**: El backend se "duerme" después de 15 min de inactividad (tarda ~30 seg en despertar)
- **Vercel**: 100GB de ancho de banda/mes
- **PlanetScale**: 1 base de datos, 1GB de almacenamiento

### 📋 Pasos:

#### 1. Crear Base de Datos en PlanetScale (Gratis)

1. Ve a: https://planetscale.com
2. Crea una cuenta gratuita
3. Crea una nueva base de datos
4. Copia las credenciales de conexión (host, usuario, contraseña)
5. Ejecuta las migraciones en tu base de datos de PlanetScale

#### 2. Hostear Backend en Render

1. Ve a: https://render.com
2. Crea una cuenta gratuita
3. Conecta tu repositorio de GitHub (o sube el código)
4. Crea un nuevo "Web Service"
5. Configuración:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**:
     ```
     PORT=10000
     DB_HOST=tu-host-planetscale
     DB_USER=tu-usuario
     DB_PASSWORD=tu-password
     DB_NAME=tu-database
     CORS_ORIGIN=https://tu-app.vercel.app
     JWT_SECRET=tu-secret-key-segura
     NODE_ENV=production
     ```
6. Render te dará una URL como: `https://tu-backend.onrender.com`

#### 3. Hostear Frontend en Vercel

1. Ve a: https://vercel.com
2. Crea una cuenta gratuita
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     ```
     VITE_API_URL=https://tu-backend.onrender.com/api
     VITE_SOCKET_URL=https://tu-backend.onrender.com
     ```
5. Vercel te dará una URL como: `https://tu-app.vercel.app`

#### 4. Actualizar CORS en Render

Vuelve a Render y actualiza `CORS_ORIGIN` con la URL de Vercel.

---

## 🥈 Opción 2: Netlify (Frontend) + Railway (Backend) + PlanetScale (MySQL)

### ✅ Ventajas:
- **100% Gratis** (con créditos mensuales)
- Railway no se "duerme" como Render
- URLs permanentes

### ⚠️ Limitaciones:
- **Railway**: $5 de créditos gratis/mes (suficiente para desarrollo)
- **Netlify**: 100GB de ancho de banda/mes

### 📋 Pasos:

#### 1. Base de Datos: PlanetScale (igual que Opción 1)

#### 2. Backend en Railway

1. Ve a: https://railway.app
2. Crea cuenta gratuita
3. Conecta GitHub y crea nuevo proyecto
4. Agrega servicio "Database" → MySQL (o usa PlanetScale)
5. Agrega servicio "Web Service" desde tu repo
6. Configura:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
   - **Environment Variables** (igual que Render)

#### 3. Frontend en Netlify

1. Ve a: https://netlify.com
2. Crea cuenta y conecta GitHub
3. Configura:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
   - **Environment Variables**: Igual que Vercel

---

## 🥉 Opción 3: Todo en Render (Frontend + Backend)

### ✅ Ventajas:
- Todo en un solo lugar
- Más simple de gestionar

### ⚠️ Limitaciones:
- Ambos servicios se "duermen" después de 15 min
- Puede ser más lento al despertar

### 📋 Pasos:

1. **Base de Datos**: PlanetScale (igual)
2. **Backend en Render**: Igual que Opción 1
3. **Frontend en Render**: 
   - Crea otro "Static Site"
   - Build: `cd frontend && npm install && npm run build`
   - Publish: `frontend/dist`

---

## 📊 Comparación Rápida

| Servicio | Plan Gratuito | Se "Duerme" | Dificultad |
|----------|---------------|-------------|------------|
| **Vercel** | ✅ Generoso | ❌ No | ⭐ Fácil |
| **Netlify** | ✅ Generoso | ❌ No | ⭐ Fácil |
| **Render** | ✅ Bueno | ⚠️ Sí (15 min) | ⭐⭐ Media |
| **Railway** | ✅ $5 créditos/mes | ❌ No | ⭐⭐ Media |
| **PlanetScale** | ✅ 1 DB, 1GB | ❌ No | ⭐ Fácil |

---

## 🎯 Recomendación Final

**Para empezar rápido:** Vercel + Render + PlanetScale
- Más fácil de configurar
- Documentación excelente
- Comunidad grande

**Para mejor rendimiento:** Netlify + Railway + PlanetScale
- No se duerme
- Más rápido
- Requiere un poco más de configuración

---

## 📝 Archivos Necesarios para Deploy

Voy a crear los archivos de configuración necesarios para cada plataforma.

### Para Vercel/Netlify (Frontend):
- `vercel.json` o `netlify.toml`

### Para Render/Railway (Backend):
- `render.yaml` o configuración en Railway

---

## 🚀 Próximos Pasos

1. Elige una opción (recomiendo Opción 1)
2. Te ayudo a crear los archivos de configuración
3. Te guío paso a paso en el deploy

¿Cuál opción prefieres? Te ayudo a configurarla. 🎉

