import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const token = user?.token;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      query: { token },
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor WebSocket');
    });

    // Escuchar eventos de inventario
    this.socket.on('inventory-updated', (data) => {
      this.emit('inventory-updated', data);
    });

    // Escuchar eventos de entradas
    this.socket.on('entry-created', (data) => {
      this.emit('entry-created', data);
    });

    // Escuchar eventos de salidas
    this.socket.on('dispatch-created', (data) => {
      this.emit('dispatch-created', data);
    });

    // Escuchar eventos de recuperaciones
    this.socket.on('recovery-created', (data) => {
      this.emit('recovery-created', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinInventory(site: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-inventory', site);
    }
  }

  leaveInventory(site: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-inventory', site);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();

