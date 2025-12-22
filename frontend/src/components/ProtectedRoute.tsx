import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export const ProtectedRoute = ({
  children,
  requiredRole,
}: ProtectedRouteProps) => {
  const { user, hasAccess } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasAccess(requiredRole)) {
    return (
      <div className="page">
        <div className="panel">
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            <h2 style={{ margin: "0 0 1rem", color: "#e5e7eb" }}>
              Acceso denegado
            </h2>
            <p>No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

