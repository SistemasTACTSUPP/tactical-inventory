import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { testConnection } from './config/database.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import entriesRoutes from './routes/entries.js';
import dispatchesRoutes from './routes/dispatches.js';
import recoveriesRoutes from './routes/recoveries.js';
import employeesRoutes from './routes/employees.js';
import ordersRoutes from './routes/orders.js';
import cyclicInventoryRoutes from './routes/cyclic-inventory.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/dispatches', dispatchesRoutes);
app.use('/api/recoveries', recoveriesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cyclic-inventory', cyclicInventoryRoutes);

// Ruta de salud
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// WebSocket para tiempo real
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });

  // Unirse a una sala específica (por sitio de inventario)
  socket.on('join-inventory', (site) => {
    socket.join(`inventory-${site}`);
    console.log(`Cliente ${socket.id} se unió a inventory-${site}`);
  });

  // Salir de una sala
  socket.on('leave-inventory', (site) => {
    socket.leave(`inventory-${site}`);
  });
});

// Función helper para emitir eventos a una sala específica
export const emitInventoryUpdate = (site, data) => {
  if (io) {
    io.to(`inventory-${site}`).emit('inventory-updated', data);
  }
};

export const emitEntryCreated = (data) => {
  if (io) {
    io.emit('entry-created', data);
  }
};

export const getIO = () => {
  return io;
};

// Iniciar servidor
const startServer = async () => {
  // Probar conexión a la base de datos
  await testConnection();

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 WebSocket disponible en ws://localhost:${PORT}`);
    console.log(`🌐 Accesible desde la red local en http://TU_IP:${PORT}`);
    console.log(`💡 Para ver tu IP, ejecuta: ipconfig (Windows) o ifconfig (Mac/Linux)`);
  });
};

startServer().catch(console.error);

export { io };

