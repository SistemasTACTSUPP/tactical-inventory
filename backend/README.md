# Backend - Sistema de Gestión de Inventario Táctico

Backend API desarrollado con Node.js, Express y MySQL para el sistema de gestión de inventario.

## 🚀 Características

- ✅ API REST completa
- ✅ Autenticación JWT
- ✅ WebSockets para tiempo real (Socket.io)
- ✅ Base de datos MySQL
- ✅ Control de acceso por roles
- ✅ Validación de datos

## 📋 Requisitos Previos

- Node.js 18+ 
- MySQL 8.0+
- npm o yarn

## 🔧 Instalación

1. **Instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:
```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=tactical_inventory
JWT_SECRET=tu_secret_key_muy_segura_aqui
CORS_ORIGIN=http://localhost:5173
```

3. **Crear la base de datos:**
```bash
# Asegúrate de que MySQL esté corriendo
mysql -u root -p < src/database/schema.sql

# O ejecuta la migración
npm run migrate
```

4. **Iniciar el servidor:**
```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3001`

## 📡 Endpoints de la API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/verify` - Verificar token

### Inventario
- `GET /api/inventory/:site` - Obtener inventario por sitio (CEDIS, ACUÑA, NLD)
- `POST /api/inventory/:site` - Crear/actualizar item
- `PUT /api/inventory/:site/:id` - Actualizar item
- `PATCH /api/inventory/:site/:id/stock` - Actualizar stock

### Entradas
- `GET /api/entries` - Obtener todas las entradas
- `POST /api/entries` - Crear nueva entrada

### Salidas
- `GET /api/dispatches` - Obtener todas las salidas
- `POST /api/dispatches` - Crear nueva salida
- `PATCH /api/dispatches/:id/approve` - Aprobar salida (Admin)

### Recuperaciones
- `GET /api/recoveries` - Obtener todas las recuperaciones
- `POST /api/recoveries` - Crear nueva recuperación

### Colaboradores
- `GET /api/employees` - Obtener colaboradores
- `POST /api/employees` - Crear colaborador
- `GET /api/employees/pending` - Obtener registros pendientes
- `POST /api/employees/pending` - Crear registro pendiente
- `POST /api/employees/pending/:id/approve` - Aprobar registro

### Pedidos
- `GET /api/orders` - Obtener pedidos (Admin)
- `POST /api/orders` - Crear pedido (Admin)

### Inventario Cíclico
- `GET /api/cyclic-inventory/tasks` - Obtener tareas
- `POST /api/cyclic-inventory/tasks` - Crear tarea (Admin)
- `PATCH /api/cyclic-inventory/tasks/:id/complete` - Completar tarea

## 🔐 Autenticación

Todas las rutas (excepto `/api/auth/login`) requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

## 🔌 WebSockets

El servidor también expone WebSockets en el mismo puerto para actualizaciones en tiempo real:

```javascript
// Conectarse
const socket = io('http://localhost:3001');

// Unirse a una sala de inventario
socket.emit('join-inventory', 'CEDIS');

// Escuchar actualizaciones
socket.on('inventory-updated', (data) => {
  console.log('Inventario actualizado:', data);
});

// Escuchar nuevas entradas
socket.on('entry-created', (data) => {
  console.log('Nueva entrada:', data);
});
```

## 📊 Estructura de Base de Datos

El esquema incluye las siguientes tablas:
- `users` - Usuarios y autenticación
- `inventory_items` - Items de inventario por sitio
- `entries` / `entry_items` - Entradas de inventario
- `dispatches` / `dispatch_items` - Salidas de almacén
- `recoveries` / `recovery_items` - Recuperaciones
- `employees` - Colaboradores
- `pending_employees` - Registros pendientes
- `orders` / `order_items` - Pedidos
- `cyclic_inventory_tasks` / `cyclic_inventory_items` - Inventario cíclico

## 🛠️ Desarrollo

Para desarrollo con recarga automática:
```bash
npm run dev
```

## 📝 Notas

- El servidor usa CORS para permitir conexiones desde el frontend
- Los tokens JWT expiran en 24 horas
- Las actualizaciones de inventario se emiten en tiempo real vía WebSocket
- La base de datos usa transacciones para mantener consistencia

