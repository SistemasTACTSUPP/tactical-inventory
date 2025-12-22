# Sistema de Gestión de Inventario Táctico

Sistema completo de gestión de inventario con backend en Node.js + Express + MySQL y frontend en React + TypeScript.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (v18 o superior)
- MySQL (v8 o superior)
- npm o yarn

### Instalación

1. **Clonar el repositorio** (si aplica)

2. **Configurar el Backend**

```bash
cd backend
npm install
```

3. **Configurar la Base de Datos**

Crea un archivo `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=tactical_inventory
JWT_SECRET=tu_clave_secreta_muy_larga
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

4. **Ejecutar Migraciones**

```bash
cd backend
npm run migrate
npm run seed-users
npm run seed-cedis
```

5. **Iniciar el Backend**

```bash
cd backend
npm run dev
```

El backend estará disponible en: `http://localhost:3001`

6. **Configurar el Frontend**

```bash
cd frontend
npm install
```

7. **Iniciar el Frontend**

```bash
cd frontend
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

## 👤 Códigos de Acceso

- **Admin**: `Tactical2025`
- **Almacén CEDIS**: `Cedis2025`
- **Almacén ACUÑA**: `Acuña2025`
- **Almacén NLD**: `Nld2025`

## 📁 Estructura del Proyecto

```
.
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── config/   # Configuración de base de datos
│   │   ├── routes/    # Rutas de la API
│   │   ├── middleware/# Middleware (auth, etc.)
│   │   └── database/  # Scripts de migración y seed
│   └── package.json
│
└── frontend/         # Aplicación React + TypeScript
    ├── src/
    │   ├── pages/     # Páginas de la aplicación
    │   ├── components/# Componentes reutilizables
    │   ├── contexts/  # Context API (Auth)
    │   └── services/  # Servicios (API, WebSocket)
    └── package.json
```

## 🔧 Scripts Disponibles

### Backend

- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm start` - Inicia el servidor en modo producción
- `npm run migrate` - Ejecuta las migraciones de la base de datos
- `npm run seed-users` - Crea los usuarios iniciales
- `npm run seed-cedis` - Carga el inventario inicial de CEDIS

### Frontend

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción

## 🌐 API Endpoints

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/inventory/:site` - Obtener inventario por sitio
- `POST /api/entries` - Crear entrada
- `POST /api/dispatches` - Crear salida
- `POST /api/recoveries` - Crear recuperación
- Y más...

## 📡 WebSocket

La aplicación usa Socket.io para actualizaciones en tiempo real:
- `inventory-updated` - Cuando se actualiza el inventario
- `entry-created` - Cuando se crea una entrada
- `dispatch-created` - Cuando se crea una salida
- `recovery-created` - Cuando se crea una recuperación

## 🗄️ Base de Datos

El sistema usa MySQL con las siguientes tablas principales:
- `users` - Usuarios del sistema
- `inventory_items` - Items de inventario (con columna `site` para diferenciar inventarios)
- `entries` - Entradas de inventario
- `dispatches` - Salidas de inventario
- `recoveries` - Recuperaciones
- Y más...

## 📝 Notas

- El backend debe estar corriendo antes de iniciar el frontend
- Asegúrate de que MySQL esté corriendo antes de iniciar el backend
- Los cambios en tiempo real se sincronizan automáticamente entre todos los clientes conectados

