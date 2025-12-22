import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { SidebarLayout } from "./components/SidebarLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EntriesPage } from "./pages/EntriesPage";
import { DispatchesPage } from "./pages/DispatchesPage";
import { RecoveredPage } from "./pages/RecoveredPage";
import { OrdersPage } from "./pages/OrdersPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { PendingRegistrationsPage } from "./pages/PendingRegistrationsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { DailyInventoryPage } from "./pages/DailyInventoryPage";
import { DailyInventoryHistoryPage } from "./pages/DailyInventoryHistoryPage";
import { InactivePage } from "./pages/InactivePage";

export const App = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <SidebarLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/entries"
          element={
            <ProtectedRoute>
              <EntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatches"
          element={
            <ProtectedRoute>
              <DispatchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recovered"
          element={
            <ProtectedRoute>
              <RecoveredPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute requiredRole="Admin">
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-registrations"
          element={
            <ProtectedRoute requiredRole="Admin">
              <PendingRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/cedis"
          element={
            <ProtectedRoute requiredRole={["Admin", "AlmacenCedis"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/acuna"
          element={
            <ProtectedRoute requiredRole={["Admin", "AlmacenAcuna"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/nld"
          element={
            <ProtectedRoute requiredRole={["Admin", "AlmacenNld"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-inventory"
          element={
            <ProtectedRoute requiredRole={["Admin", "AlmacenCedis"]}>
              <DailyInventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-inventory-history"
          element={
            <ProtectedRoute requiredRole={["Admin", "AlmacenCedis"]}>
              <DailyInventoryHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inactive"
          element={
            <ProtectedRoute>
              <InactivePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SidebarLayout>
  );
};


