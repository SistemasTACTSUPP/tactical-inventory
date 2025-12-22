import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../contexts/AuthContext";

interface SidebarLayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
}

const allNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/entries", label: "Entradas" },
  { to: "/dispatches", label: "Salidas" },
  { to: "/recovered", label: "Recuperados" },
  { to: "/orders", label: "Pedidos (Admin)", roles: ["Admin"] },
  { to: "/employees", label: "Colaboradores" },
  { to: "/pending-registrations", label: "Registros Pendientes", roles: ["Admin"] },
  { to: "/inventory/cedis", label: "Inventario CEDIS", roles: ["Admin", "AlmacenCedis"] },
  { to: "/inventory/acuna", label: "Inventario ACUÑA", roles: ["Admin", "AlmacenAcuna"] },
  { to: "/inventory/nld", label: "Inventario NLD", roles: ["Admin", "AlmacenNld"] },
  { to: "/daily-inventory", label: "Inventario Cíclico", roles: ["Admin", "AlmacenCedis"] },
  { to: "/daily-inventory-history", label: "Historial Cíclico", roles: ["Admin", "AlmacenCedis"] },
  { to: "/inactive", label: "Inactivos" },
];

export const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  const { user, logout, hasAccess } = useAuth();

  const navItems = allNavItems.filter((item) => {
    // Sin restricción de rol - mostrar siempre
    if (!item.roles) return true;
    
    // Si es un inventario específico
    if (item.to.includes("/inventory/")) {
      // Admin ve TODOS los inventarios - verificar explícitamente
      const isAdmin = user?.role === "Admin";
      if (isAdmin) {
        return true;
      }
      
      // Usuarios de almacén solo ven su propio inventario
      if (user?.role === "AlmacenCedis" && item.to === "/inventory/cedis") return true;
      if (user?.role === "AlmacenAcuna" && item.to === "/inventory/acuna") return true;
      if (user?.role === "AlmacenNld" && item.to === "/inventory/nld") return true;
      
      return false;
    }
    
    // Para otros items, usar hasAccess
    return hasAccess(item.roles);
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo-dot" />
          <div>
            <div className="sidebar-title">TACTICAL SUPPORT</div>
            <div className="sidebar-subtitle">Gestión de Inventario</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "nav-item" + (isActive ? " nav-item-active" : "")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">Panel de Control</div>
          <div className="topbar-user">
            <div className="user-avatar">
              {user ? getInitials(user.name) : "TS"}
            </div>
            <div>
              <div className="user-name">{user?.name || "Usuario"}</div>
              <div className="user-role">{user?.role || "Sin rol"}</div>
            </div>
            <button
              onClick={logout}
              style={{
                marginLeft: "1rem",
                padding: "0.4rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid rgba(148, 163, 184, 0.4)",
                background: "rgba(15, 23, 42, 0.9)",
                color: "#9ca3af",
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "all 0.16s ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(31, 41, 55, 0.95)";
                e.currentTarget.style.color = "#e5e7eb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(15, 23, 42, 0.9)";
                e.currentTarget.style.color = "#9ca3af";
              }}
            >
              Salir
            </button>
          </div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
};




