import { useState, useMemo, useEffect } from "react";
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

export const InventoryPage = () => {
  const { site } = useParams<{ site: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const getInventorySiteFromUrl = (): InventorySite => {
    if (site?.toUpperCase() === "ACUNA") return "ACUÑA";
    if (site?.toUpperCase() === "NLD") return "NLD";
    if (site?.toUpperCase() === "CEDIS") return "CEDIS";
    return "CEDIS";
  };
  
  // Si el usuario es de un almacén específico, redirigir a su inventario
  useEffect(() => {
    if (user?.role === "AlmacenCedis" && site !== "cedis") {
      navigate("/inventory/cedis", { replace: true });
    } else if (user?.role === "AlmacenAcuna" && site !== "acuna") {
      navigate("/inventory/acuna", { replace: true });
    } else if (user?.role === "AlmacenNld" && site !== "nld") {
      navigate("/inventory/nld", { replace: true });
    }
  }, [user, site, navigate]);
  
  // Determinar el inventario: Admin usa la URL, usuarios de almacén usan su rol
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
  const [isCreating, setIsCreating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [stockNew, setStockNew] = useState(0);
  const [stockRecovered, setStockRecovered] = useState(0);
  const [stockMin, setStockMin] = useState(0);

  // Cargar inventario desde la API
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryAPI.get(inventorySite);
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar inventario");
      console.error("Error al cargar inventario:", err);
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
    // Asegurar que WebSocket esté conectado
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Unirse a la sala del inventario
    wsService.joinInventory(inventorySite);
    
    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data: any) => {
      console.log("📡 Actualización en tiempo real recibida:", data);
      // Recargar inventario cuando hay actualizaciones
      loadInventory();
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

  const totalStock = useMemo(
    () => (item: InventoryItem) => item.stockNew + item.stockRecovered,
    []
  );

  const getStockStatus = (item: InventoryItem): StockStatus => {
    const total = totalStock(item);
    if (total === 0) return "Agotado";
    if (total <= item.stockMin) return "Reordenar";
    return "En Stock";
  };

  const getStatusBadge = (status: StockStatus) => {
    const classes = {
      "En Stock": "tag-success",
      Reordenar: "tag-warning",
      Agotado: "tag-danger",
    };
    return `tag ${classes[status] || ""}`;
  };

  const resetForm = () => {
    setCode("");
    setDescription("");
    setSize("");
    setStockNew(0);
    setStockRecovered(0);
    setStockMin(0);
  };

  const handleCreateItem = async () => {
    if (!code || !description) return;
    
    try {
      await inventoryAPI.create(inventorySite, {
        code,
        description,
        size: size || undefined,
        stockNew,
        stockRecovered,
        stockMin,
      });
      
      await loadInventory(); // Recargar desde la API
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al crear artículo");
    }
  };

  const handleModify = (item: InventoryItem) => {
    setSelectedItem(item);
    setCode(item.code);
    setDescription(item.description);
    setSize(item.size || "");
    setStockMin(item.stockMin);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;
    
    try {
      await inventoryAPI.update(inventorySite, selectedItem.id, {
        description,
        size: size || undefined,
        stockMin,
      });
      
      await loadInventory(); // Recargar desde la API
      setSelectedItem(null);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al actualizar artículo");
    }
  };

  const siteNames: Record<InventorySite, string> = {
    CEDIS: "CEDIS",
    ACUÑA: "CAT ACUÑA",
    NLD: "CAT NLD",
  };

  if (loading && items.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Inventario {siteNames[inventorySite]}</h1>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventario {siteNames[inventorySite]}</h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            Gestiona el inventario exclusivo de {siteNames[inventorySite]}. Cada almacén
            tiene su propio inventario independiente. Añade nuevos artículos o modifica
            los existentes.
          </p>
          {error && (
            <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>⚠️ {error}</p>
          )}
        </div>
        {user?.role === "Admin" && (
          <button
            className="btn primary"
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
          >
            Añadir nuevo artículo
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Artículos en inventario</h2>
          <span className="tag">{items.length} artículos</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Talla</th>
                <th>Stock nuevo</th>
                <th>Stock recuperado</th>
                <th>Stock total</th>
                <th>Stock mínimo</th>
                <th>Estado</th>
                {user?.role === "Admin" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === "Admin" ? 9 : 8} className="empty-cell">
                    No hay artículos en este inventario.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const total = totalStock(item);
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.description}</td>
                      <td>{item.size || "N/A"}</td>
                      <td>{item.stockNew}</td>
                      <td>{item.stockRecovered}</td>
                      <td>{total}</td>
                      <td>{item.stockMin}</td>
                      <td>
                        <span className={getStatusBadge(status)}>{status}</span>
                      </td>
                      {user?.role === "Admin" && (
                        <td>
                          <button
                            className="link-button"
                            onClick={() => handleModify(item)}
                          >
                            Modificar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreating && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Nuevo artículo en inventario</h2>
                <p>
                  Registra un tipo de artículo que no existe en el catálogo. Para
                  añadir unidades a uno existente, usa "Entradas".
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Código</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej. TS-0001"
                  />
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej. Chaleco táctico"
                  />
                </div>
                <div className="form-field">
                  <label>Talla (opcional)</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="Ej. M, 42, Única"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Stock nuevo</label>
                  <input
                    type="number"
                    min={0}
                    value={stockNew}
                    onChange={(e) => setStockNew(Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Stock recuperado</label>
                  <input
                    type="number"
                    min={0}
                    value={stockRecovered}
                    onChange={(e) => setStockRecovered(Number(e.target.value))}
                  />
                </div>
                <div className="form-field">
                  <label>Stock mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={stockMin}
                    onChange={(e) => setStockMin(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn ghost"
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
              >
                Cancelar
              </button>
              <button
                className="btn primary"
                disabled={!code || !description}
                onClick={handleCreateItem}
              >
                Guardar artículo
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Modificar artículo</h2>
                <p>Actualiza la descripción, talla o stock mínimo del artículo.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Código</label>
                  <input type="text" value={selectedItem.code} disabled />
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Talla</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Stock nuevo</label>
                  <div>{selectedItem.stockNew}</div>
                </div>
                <div className="form-field">
                  <label>Stock recuperado</label>
                  <div>{selectedItem.stockRecovered}</div>
                </div>
                <div className="form-field">
                  <label>Stock total</label>
                  <div>{totalStock(selectedItem)}</div>
                </div>
                <div className="form-field">
                  <label>Stock mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={stockMin}
                    onChange={(e) => setStockMin(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedItem(null)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={handleUpdateItem}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
