import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authAPI } from "../services/api";
import { wsService } from "../services/websocket";

export type UserRole = "Admin" | "AlmacenCedis" | "AlmacenAcuna" | "AlmacenNld" | null;

interface AuthContextType {
  user: { role: UserRole; name: string; id?: number } | null;
  login: (code: string) => Promise<boolean>;
  logout: () => void;
  hasAccess: (requiredRole?: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ role: UserRole; name: string; id?: number } | null>(null);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (savedUser && token) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Conectar WebSocket cuando hay usuario
        wsService.connect();
      } catch (e) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  }, []);

  const login = async (code: string): Promise<boolean> => {
    try {
      const data = await authAPI.login(code);
      if (data.user && data.token) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        // Conectar WebSocket después del login
        wsService.connect();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Error en login:", error);
      // Re-lanzar el error para que LoginPage pueda mostrarlo
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    wsService.disconnect();
  };

  const hasAccess = (requiredRole?: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (!requiredRole) return true; // Si no se especifica rol, cualquier usuario autenticado tiene acceso
    
    if (user.role === "Admin") return true; // Admin tiene acceso a todo
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

