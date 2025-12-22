const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Función helper para hacer peticiones
const request = async (endpoint: string, options: RequestInit = {}) => {
  // Obtener el token desde localStorage (se guarda por separado)
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `Error ${response.status}`);
  }
  
  return response.json();
};

// API de Autenticación
export const authAPI = {
  login: async (code: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido', message: 'Error desconocido' }));
      const errorMessage = errorData.error || errorData.message || `Error ${response.status}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    if (data.token && data.user) {
      const userData = { ...data.user, token: data.token };
      localStorage.setItem('user', JSON.stringify(userData));
    }
    return data;
  },
  
  verify: async () => {
    return request('/auth/verify');
  },
};

// API de Inventario
export const inventoryAPI = {
  get: async (site: string) => {
    return request(`/inventory/${site}`);
  },
  
  create: async (site: string, item: any) => {
    return request(`/inventory/${site}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },
  
  update: async (site: string, id: number, item: any) => {
    return request(`/inventory/${site}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },
  
  updateStock: async (site: string, id: number, stock: { stockNew?: number; stockRecovered?: number }) => {
    return request(`/inventory/${site}/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(stock),
    });
  },
};

// API de Entradas
export const entriesAPI = {
  getAll: async () => {
    return request('/entries');
  },
  
  create: async (entry: any) => {
    return request('/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
};

// API de Salidas
export const dispatchesAPI = {
  getAll: async () => {
    return request('/dispatches');
  },
  
  create: async (dispatch: any) => {
    return request('/dispatches', {
      method: 'POST',
      body: JSON.stringify(dispatch),
    });
  },
  
  approve: async (id: number) => {
    return request(`/dispatches/${id}/approve`, {
      method: 'PATCH',
    });
  },
};

// API de Recuperaciones
export const recoveriesAPI = {
  getAll: async () => {
    return request('/recoveries');
  },
  
  create: async (recovery: any) => {
    return request('/recoveries', {
      method: 'POST',
      body: JSON.stringify(recovery),
    });
  },
};

// API de Colaboradores
export const employeesAPI = {
  getAll: async (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return request(`/employees${query}`);
  },
  
  create: async (employee: any) => {
    return request('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  },
  
  getPending: async () => {
    return request('/employees/pending');
  },
  
  createPending: async (employee: any) => {
    return request('/employees/pending', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  },
  
  approvePending: async (id: number, employeeId: string) => {
    return request(`/employees/pending/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
  },
};

// API de Pedidos
export const ordersAPI = {
  getAll: async () => {
    return request('/orders');
  },
  
  create: async (order: any) => {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },
};

// API de Inventario Cíclico
export const cyclicInventoryAPI = {
  getTasks: async () => {
    return request('/cyclic-inventory/tasks');
  },
  
  createTask: async (task: any) => {
    return request('/cyclic-inventory/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },
  
  completeTask: async (id: number, items: any[]) => {
    return request(`/cyclic-inventory/tasks/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    });
  },
};

