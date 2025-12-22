import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { recoveriesAPI } from "../services/api";
import { wsService } from "../services/websocket";

type InventorySite = "CEDIS" | "ACUÑA" | "NLD";
type RecoveryDestination = InventorySite | "Desecho";

interface RecoveredItem {
  id: number;
  code: string;
  description: string;
  qty: number;
  destination: RecoveryDestination;
  size?: string;
}

interface Recovery {
  id: number;
  date: string;
  employeeId: string;
  employeeName: string;
  totalItems: number;
  createdBy: string;
  items: RecoveredItem[];
  hasRecovered: boolean;
  hasDesecho: boolean;
}

const inventoryDisplayNames: Record<InventorySite, string> = {
  CEDIS: "INVENTARIO CEDIS",
  ACUÑA: "INVENTARIO ACUÑA",
  NLD: "INVENTARIO NLD",
};

type FilterType = "Todos" | "Recuperados" | "Desechos";

let tempId = 1;

export const RecoveredPage = () => {
  const { user } = useAuth();
  const [allRecoveries, setAllRecoveries] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRecovery, setSelectedRecovery] = useState<Recovery | null>(null);
  const [filter, setFilter] = useState<FilterType>("Todos");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [items, setItems] = useState<RecoveredItem[]>([]);
  
  // Determinar el inventario según el rol del usuario
  const getUserSite = (): InventorySite => {
    if (user?.role === "AlmacenCedis") return "CEDIS";
    if (user?.role === "AlmacenAcuna") return "ACUÑA";
    if (user?.role === "AlmacenNld") return "NLD";
    return "CEDIS";
  };
  
  const defaultSite = getUserSite();
  const isAdmin = user?.role === "Admin";
  
  // Cargar recuperaciones desde la API
  const loadRecoveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recoveriesAPI.getAll();
      setAllRecoveries(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar recuperaciones");
      console.error("Error al cargar recuperaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar recuperaciones al montar
  useEffect(() => {
    loadRecoveries();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar nuevas recuperaciones en tiempo real
    const handleNewRecovery = (data: any) => {
      console.log("📡 Nueva recuperación recibida en tiempo real:", data);
      loadRecoveries(); // Recargar recuperaciones
    };

    wsService.on('recovery-created', handleNewRecovery);
    wsService.on('inventory-updated', handleNewRecovery);

    return () => {
      wsService.off('recovery-created', handleNewRecovery);
      wsService.off('inventory-updated', handleNewRecovery);
    };
  }, []);

  const [newItem, setNewItem] = useState<
    Omit<RecoveredItem, "id"> & { destination?: RecoveryDestination }
  >({
    code: "",
    description: "",
    qty: 1,
    destination: defaultSite,
  });
  
  // Filtrar recuperaciones según el rol del usuario
  const recoveries = useMemo(() => {
    if (isAdmin) {
      return allRecoveries;
    }
    return allRecoveries.filter((r) => {
      return r.items.some((item) => 
        item.destination === defaultSite || item.destination === "Desecho"
      );
    });
  }, [allRecoveries, isAdmin, defaultSite]);
  
  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setEmployeeId("");
    setEmployeeName("");
    setItems([]);
    setNewItem({ code: "", description: "", qty: 1, destination: defaultSite });
  };

  const handleAddItem = () => {
    if (!newItem.code.trim() || !newItem.description.trim() || newItem.qty <= 0 || !newItem.destination) {
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: tempId++, ...newItem, destination: newItem.destination! },
    ]);
    setNewItem({ code: "", description: "", qty: 1, destination: defaultSite });
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCreateRecovery = async () => {
    if (!date || !employeeId || !employeeName || items.length === 0) return;
    
    try {
      await recoveriesAPI.create({
        date,
        employeeId,
        employeeName,
        items: items.map(item => ({
          code: item.code,
          description: item.description,
          qty: item.qty,
          destination: item.destination,
          size: item.size,
        })),
      });
      
      await loadRecoveries(); // Recargar desde la API
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al crear recuperación");
    }
  };

  const filteredRecoveries = recoveries.filter((r) => {
    if (filter === "Todos") return true;
    if (filter === "Recuperados") return r.hasRecovered;
    if (filter === "Desechos") return r.hasDesecho;
    return true;
  });

  const getDestinationBadge = (dest: RecoveryDestination) => {
    if (dest === "Desecho") {
      return <span className="tag tag-danger">Desecho</span>;
    }
    return (
      <span className={`badge badge-${dest.toLowerCase()}`}>{dest}</span>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {isAdmin
              ? "Artículos recuperados"
              : `Recuperados - ${inventoryDisplayNames[defaultSite]}`}
          </h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            {isAdmin
              ? "Registra los artículos que los colaboradores devuelven a la empresa. Puedes enviarlos a cualquier inventario o marcarlos como desecho."
              : `Registra los artículos que los colaboradores devuelven. Puedes enviarlos al inventario de ${defaultSite} o marcarlos como desecho.`
            }
          </p>
          {error && (
            <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>⚠️ {error}</p>
          )}
        </div>
        <button
          className="btn primary"
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
        >
          Registrar recuperado
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Historial de recuperaciones</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.5rem",
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                color: "#e5e7eb",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              <option value="Todos">Todos</option>
              <option value="Recuperados">Solo Recuperados</option>
              <option value="Desechos">Solo Desechos</option>
            </select>
            <span className="tag">
              {filteredRecoveries.length} registro{filteredRecoveries.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Cargando recuperaciones...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Colaborador</th>
                  <th>Total artículos</th>
                  <th>Tipo</th>
                  <th>Registrado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecoveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      No hay recuperaciones registradas.
                    </td>
                  </tr>
                ) : (
                  filteredRecoveries.map((r) => (
                    <tr key={r.id}>
                      <td>RE-{r.id}</td>
                      <td>{r.date}</td>
                      <td>
                        <div>
                          <div>{r.employeeName}</div>
                          <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                            {r.employeeId}
                          </div>
                        </div>
                      </td>
                      <td>{r.totalItems || r.items?.reduce((sum, i) => sum + i.qty, 0) || 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {r.hasRecovered && (
                            <span className="tag tag-success">Recuperado</span>
                          )}
                          {r.hasDesecho && (
                            <span className="tag tag-danger">Desecho</span>
                          )}
                        </div>
                      </td>
                      <td>{r.createdBy}</td>
                      <td>
                        <button
                          className="link-button"
                          onClick={() => setSelectedRecovery(r)}
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreating && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Registrar artículos recuperados</h2>
                <p>
                  Captura los artículos que el colaborador devuelve. Puedes enviarlos a
                  inventario o marcarlos como desecho.
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
                  <label>Fecha de recuperación</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>ID Colaborador</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Ej. EMP-040"
                  />
                </div>
                <div className="form-field">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Ej. Roberto Sánchez"
                  />
                </div>
              </div>

              <div className="items-section">
                <div className="items-header">
                  <h3>Artículos recuperados</h3>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Código</label>
                    <input
                      type="text"
                      value={newItem.code}
                      onChange={(e) =>
                        setNewItem((prev) => ({ ...prev, code: e.target.value }))
                      }
                      placeholder="Ej. TS-0001"
                    />
                  </div>
                  <div className="form-field">
                    <label>Descripción</label>
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Ej. Chaleco táctico"
                    />
                  </div>
                  <div className="form-field form-field-sm">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={newItem.qty}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          qty: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Destino</label>
                    <select
                      value={newItem.destination || defaultSite}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          destination: e.target.value as RecoveryDestination,
                        }))
                      }
                    >
                      {isAdmin && (
                        <>
                          <option value="CEDIS">CEDIS</option>
                          <option value="ACUÑA">ACUÑA</option>
                          <option value="NLD">NLD</option>
                        </>
                      )}
                      {!isAdmin && <option value={defaultSite}>{defaultSite}</option>}
                      <option value="Desecho">Desecho</option>
                    </select>
                  </div>
                  <div className="form-field form-field-sm align-end">
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={handleAddItem}
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                <div className="table-wrapper compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Destino</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-cell">
                            Aún no has añadido artículos a esta recuperación.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.code}</td>
                            <td>{item.description}</td>
                            <td>{item.qty}</td>
                            <td>{getDestinationBadge(item.destination)}</td>
                            <td>
                              <button
                                type="button"
                                className="link-button danger"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
                disabled={items.length === 0}
                onClick={handleCreateRecovery}
              >
                Guardar recuperación
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecovery && (
        <div className="modal-backdrop" onClick={() => setSelectedRecovery(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Detalles de recuperación RE-{selectedRecovery.id}</h2>
                <p>Información completa de la recuperación.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedRecovery(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Fecha</label>
                  <div>{selectedRecovery.date}</div>
                </div>
                <div className="form-field">
                  <label>Colaborador</label>
                  <div>
                    <div>{selectedRecovery.employeeName}</div>
                    <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      {selectedRecovery.employeeId}
                    </div>
                  </div>
                </div>
                <div className="form-field">
                  <label>Total artículos</label>
                  <div>{selectedRecovery.totalItems || selectedRecovery.items?.reduce((sum, i) => sum + i.qty, 0) || 0}</div>
                </div>
                <div className="form-field">
                  <label>Tipo</label>
                  <div>
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                      {selectedRecovery.hasRecovered && (
                        <span className="tag tag-success">Recuperado</span>
                      )}
                      {selectedRecovery.hasDesecho && (
                        <span className="tag tag-danger">Desecho</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Artículos recuperados
                </h3>
                <div className="table-wrapper compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRecovery.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.code}</td>
                          <td>{item.description}</td>
                          <td>{item.qty}</td>
                          <td>{getDestinationBadge(item.destination)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedRecovery(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
