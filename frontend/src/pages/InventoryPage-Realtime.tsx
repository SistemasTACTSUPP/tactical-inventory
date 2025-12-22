// Versión de ejemplo con tiempo real - para probar
// Este archivo muestra cómo usar la API y WebSockets

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { inventoryAPI } from "../services/api";
import { wsService } from "../services/websocket";

type InventorySite = "CEDIS" | "ACUÑA" | "NLD";
type StockStatus = "En Stock" | "Reordenar" | "Agotado";

interface InventoryItem {
  id: number;
  code: string;
  description: string;
  size?: string;
  stockNew: number;
  stockRecovered: number;
  stockMin: number;
  status: StockStatus;
}

export const InventoryPageRealtime = () => {
  const { site } = useParams<{ site: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const getInventorySiteFromUrl = (): InventorySite => {
    if (site?.toUpperCase() === "ACUNA") return "ACUÑA";
    if (site?.toUpperCase() === "NLD") return "NLD";
    if (site?.toUpperCase() === "CEDIS") return "CEDIS";
    return "CEDIS";
  };
  
  const inventorySite = useMemo(() => {
    if (user?.role === "Admin") {
      return getInventorySiteFromUrl();
    } else if (user?.role === "AlmacenCedis") {
      return "CEDIS";
    } else if (user?.role === "AlmacenAcuna") {
      return "ACUÑA";
    } else if (user?.role === "AlmacenNld") {
      return "NLD";
    }
    return getInventorySiteFromUrl();
  }, [user?.role, site]);
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar inventario desde la API
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryAPI.get(inventorySite);
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar inventario");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar inventario al montar y cuando cambie el sitio
  useEffect(() => {
    loadInventory();
  }, [inventorySite]);
  
  // Configurar WebSocket para tiempo real
  useEffect(() => {
    // Unirse a la sala del inventario
    wsService.joinInventory(inventorySite);
    
    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data: any) => {
      console.log("📡 Actualización en tiempo real recibida:", data);
      // Recargar inventario cuando hay actualizaciones
      if (data.type === 'inventory' || data.type === 'entry' || data.type === 'dispatch' || data.type === 'recovery') {
        loadInventory();
      }
    };
    
    wsService.on('inventory-updated', handleUpdate);
    wsService.on('entry-created', handleUpdate);
    wsService.on('dispatch-created', handleUpdate);
    wsService.on('recovery-created', handleUpdate);
    
    return () => {
      wsService.off('inventory-updated', handleUpdate);
      wsService.off('entry-created', handleUpdate);
      wsService.off('dispatch-created', handleUpdate);
      wsService.off('recovery-created', handleUpdate);
      wsService.leaveInventory(inventorySite);
    };
  }, [inventorySite]);
  
  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Cargando inventario...</h1>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Error</h1>
          <p>{error}</p>
          <button onClick={loadInventory}>Reintentar</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventario {inventorySite}</h1>
        <p>
          {wsService.isConnected() ? (
            <span style={{ color: '#10b981' }}>🟢 Conectado en tiempo real</span>
          ) : (
            <span style={{ color: '#ef4444' }}>🔴 Desconectado</span>
          )}
        </p>
      </div>
      
      <div className="panel">
        <div className="panel-header">
          <h2>Artículos ({items.length})</h2>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Talla</th>
                <th>Stock Nuevo</th>
                <th>Stock Recuperado</th>
                <th>Stock Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.description}</td>
                  <td>{item.size || "N/A"}</td>
                  <td>{item.stockNew}</td>
                  <td>{item.stockRecovered}</td>
                  <td>{item.stockNew + item.stockRecovered}</td>
                  <td>
                    <span className={`tag tag-${item.status === 'En Stock' ? 'success' : item.status === 'Reordenar' ? 'warning' : 'danger'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


