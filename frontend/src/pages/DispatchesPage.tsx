import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dispatchesAPI } from "../services/api";
import { wsService } from "../services/websocket";

type InventorySite = "CEDIS" | "ACUÑA" | "NLD";
type DispatchStatus = "Pendiente" | "Aprobado" | "Cancelado";
type DispatchType = "Normal" | "2do uniforme" | "Próxima renovación";

interface DispatchItem {
  id: number;
  code: string;
  description: string;
  qty: number;
}

interface Dispatch {
  id: number;
  date: string;
  employeeId: string;
  employeeName: string;
  service: string;
  site: InventorySite;
  status: DispatchStatus;
  dispatchType?: DispatchType;
  totalItems: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  items?: DispatchItem[];
}

const inventoryDisplayNames: Record<InventorySite, string> = {
  CEDIS: "INVENTARIO CEDIS",
  ACUÑA: "INVENTARIO ACUÑA",
  NLD: "INVENTARIO NLD",
};

let tempId = 1;

export const DispatchesPage = () => {
  const { user, hasAccess } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [allDispatches, setAllDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [service, setService] = useState("");
  
  // Determinar el inventario según el rol del usuario
  const getUserSite = (): InventorySite => {
    if (user?.role === "AlmacenCedis") return "CEDIS";
    if (user?.role === "AlmacenAcuna") return "ACUÑA";
    if (user?.role === "AlmacenNld") return "NLD";
    return "CEDIS";
  };
  
  const defaultSite = getUserSite();
  const [site, setSite] = useState<InventorySite>(defaultSite);
  const [dispatchType, setDispatchType] = useState<DispatchType>("Normal");
  
  // Cargar salidas desde la API
  const loadDispatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dispatchesAPI.getAll();
      setAllDispatches(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar salidas");
      console.error("Error al cargar salidas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar salidas al montar
  useEffect(() => {
    loadDispatches();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar nuevas salidas en tiempo real
    const handleNewDispatch = (data: any) => {
      console.log("📡 Nueva salida recibida en tiempo real:", data);
      loadDispatches(); // Recargar salidas
    };

    wsService.on('dispatch-created', handleNewDispatch);
    wsService.on('inventory-updated', handleNewDispatch);

    return () => {
      wsService.off('dispatch-created', handleNewDispatch);
      wsService.off('inventory-updated', handleNewDispatch);
    };
  }, []);

  // Filtrar salidas según el rol del usuario
  const dispatches = useMemo(() => {
    if (isAdmin) {
      return allDispatches;
    }
    return allDispatches.filter((d) => d.site === defaultSite);
  }, [allDispatches, isAdmin, defaultSite]);
  
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [newItem, setNewItem] = useState<Omit<DispatchItem, "id">>({
    code: "",
    description: "",
    qty: 1,
  });

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setEmployeeId("");
    setEmployeeName("");
    setService("");
    setSite(defaultSite);
    setDispatchType("Normal");
    setItems([]);
    setNewItem({ code: "", description: "", qty: 1 });
  };

  const handleAddItem = () => {
    if (!newItem.code.trim() || !newItem.description.trim() || newItem.qty <= 0) {
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: tempId++, ...newItem, qty: Number(newItem.qty) },
    ]);
    setNewItem({ code: "", description: "", qty: 1 });
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCreateDispatch = async () => {
    if (!date || !employeeId || !employeeName || !service || items.length === 0) return;
    
    try {
      await dispatchesAPI.create({
        date,
        employeeId,
        employeeName,
        service,
        site,
        dispatchType: dispatchType !== "Normal" ? dispatchType : undefined,
        items: items.map(item => ({
          code: item.code,
          description: item.description,
          qty: item.qty,
        })),
      });
      
      await loadDispatches(); // Recargar desde la API
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al crear salida");
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await dispatchesAPI.approve(id);
      await loadDispatches(); // Recargar desde la API
    } catch (err: any) {
      alert(err.message || "Error al aprobar salida");
    }
  };

  const getStatusBadge = (status: DispatchStatus) => {
    const classes = {
      Pendiente: "tag-warning",
      Aprobado: "tag-success",
      Cancelado: "tag-danger",
    };
    return `tag ${classes[status] || ""}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {isAdmin 
              ? "Salidas de almacén"
              : `Salidas - ${inventoryDisplayNames[defaultSite]}`}
          </h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            {isAdmin 
              ? "Registra la entrega de equipo y uniformes a colaboradores desde cualquier almacén."
              : `Registra la entrega de equipo y uniformes a colaboradores desde el inventario de ${defaultSite}. Solo puedes crear salidas para tu almacén.`
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
          Crear salida
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Historial de salidas</h2>
          <span className="tag">{dispatches.length} salidas</span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Cargando salidas...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Colaborador</th>
                  <th>Servicio</th>
                  <th>Inventario</th>
                  <th>Tipo</th>
                  <th>Total artículos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-cell">
                      No hay salidas registradas.
                    </td>
                  </tr>
                ) : (
                  dispatches.map((d) => (
                    <tr key={d.id}>
                      <td>SA-{d.id}</td>
                      <td>{d.date}</td>
                      <td>
                        <div>
                          <div>{d.employeeName}</div>
                          <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                            {d.employeeId}
                          </div>
                        </div>
                      </td>
                      <td>{d.service}</td>
                      <td>
                        <span className={`badge badge-${d.site.toLowerCase()}`}>
                          {d.site}
                        </span>
                      </td>
                      <td>
                        {d.dispatchType && d.dispatchType !== "Normal" ? (
                          <span className={
                            d.dispatchType === "2do uniforme" 
                              ? "tag tag-warning" 
                              : "tag tag-success"
                          }>
                            {d.dispatchType}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Normal</span>
                        )}
                      </td>
                      <td>{d.totalItems || d.items?.reduce((sum, i) => sum + i.qty, 0) || 0}</td>
                      <td>
                        <span className={getStatusBadge(d.status)}>{d.status}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            className="link-button"
                            onClick={() => setSelectedDispatch(d)}
                          >
                            Ver detalles
                          </button>
                          {d.status === "Pendiente" && isAdmin && (
                            <button
                              className="link-button"
                              onClick={() => handleApprove(d.id)}
                            >
                              Aprobar
                            </button>
                          )}
                        </div>
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
                <h2>Nueva salida de almacén</h2>
                <p>Registra la entrega de equipo a un colaborador.</p>
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
                  <label>Fecha de salida</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Inventario origen</label>
                  {isAdmin ? (
                    <select
                      value={site}
                      onChange={(e) => setSite(e.target.value as InventorySite)}
                    >
                      <option value="CEDIS">CEDIS</option>
                      <option value="ACUÑA">CAT ACUÑA</option>
                      <option value="NLD">CAT NLD</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={site}
                      disabled
                      style={{
                        opacity: 0.6,
                        cursor: "not-allowed",
                      }}
                    />
                  )}
                </div>
                <div className="form-field">
                  <label>Tipo de salida</label>
                  <select
                    value={dispatchType}
                    onChange={(e) => setDispatchType(e.target.value as DispatchType)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="2do uniforme">2do uniforme</option>
                    <option value="Próxima renovación">Próxima renovación</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>ID Colaborador</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Ej. EMP-045"
                  />
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Ej. Juan Pérez García"
                  />
                </div>
                <div className="form-field">
                  <label>Servicio</label>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="Ej. Guardia"
                  />
                </div>
              </div>

              <div className="items-section">
                <div className="items-header">
                  <h3>Artículos a entregar</h3>
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
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-cell">
                            Aún no has añadido artículos a esta salida.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.code}</td>
                            <td>{item.description}</td>
                            <td>{item.qty}</td>
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
                onClick={handleCreateDispatch}
              >
                Guardar salida
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDispatch && (
        <div className="modal-backdrop" onClick={() => setSelectedDispatch(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Detalles de salida SA-{selectedDispatch.id}</h2>
                <p>Información completa de la salida de almacén.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedDispatch(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Fecha</label>
                  <div>{selectedDispatch.date}</div>
                </div>
                <div className="form-field">
                  <label>Colaborador</label>
                  <div>
                    <div>{selectedDispatch.employeeName}</div>
                    <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      {selectedDispatch.employeeId}
                    </div>
                  </div>
                </div>
                <div className="form-field">
                  <label>Servicio</label>
                  <div>{selectedDispatch.service}</div>
                </div>
                <div className="form-field">
                  <label>Inventario</label>
                  <div>
                    <span className={`badge badge-${selectedDispatch.site.toLowerCase()}`}>
                      {selectedDispatch.site}
                    </span>
                  </div>
                </div>
                <div className="form-field">
                  <label>Tipo</label>
                  <div>
                    {selectedDispatch.dispatchType && selectedDispatch.dispatchType !== "Normal" ? (
                      <span className={
                        selectedDispatch.dispatchType === "2do uniforme" 
                          ? "tag tag-warning" 
                          : "tag tag-success"
                      }>
                        {selectedDispatch.dispatchType}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Normal</span>
                    )}
                  </div>
                </div>
                <div className="form-field">
                  <label>Estado</label>
                  <div>
                    <span className={getStatusBadge(selectedDispatch.status)}>
                      {selectedDispatch.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Artículos entregados
                </h3>
                <div className="table-wrapper compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDispatch.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.code}</td>
                          <td>{item.description}</td>
                          <td>{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedDispatch(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
