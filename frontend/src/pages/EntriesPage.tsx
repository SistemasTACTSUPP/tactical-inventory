import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { entriesAPI } from "../services/api";
import { wsService } from "../services/websocket";

type InventorySite = "CEDIS" | "ACUÑA" | "NLD";

interface EntryItem {
  id: number;
  code: string;
  description: string;
  qty: number;
  size?: string;
}

interface InventoryEntry {
  id: number;
  date: string;
  site: InventorySite;
  totalItems: number;
  createdBy: string;
  items?: EntryItem[];
}

const siteNames: Record<InventorySite, string> = {
  CEDIS: "CEDIS",
  ACUÑA: "CAT ACUÑA",
  NLD: "CAT NLD",
};

const inventoryDisplayNames: Record<InventorySite, string> = {
  CEDIS: "INVENTARIO CEDIS",
  ACUÑA: "INVENTARIO ACUÑA",
  NLD: "INVENTARIO NLD",
};

let tempId = 1;

export const EntriesPage = () => {
  const { user } = useAuth();
  const [allEntries, setAllEntries] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  // Determinar el inventario según el rol del usuario
  const getUserSite = (): InventorySite => {
    if (user?.role === "AlmacenCedis") return "CEDIS";
    if (user?.role === "AlmacenAcuna") return "ACUÑA";
    if (user?.role === "AlmacenNld") return "NLD";
    return "CEDIS"; // Default para Admin
  };
  
  const defaultSite = getUserSite();
  const [site, setSite] = useState<InventorySite>(defaultSite);
  
  // Cargar entradas desde la API
  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await entriesAPI.getAll();
      setAllEntries(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar entradas");
      console.error("Error al cargar entradas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar entradas al montar
  useEffect(() => {
    loadEntries();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar nuevas entradas en tiempo real
    const handleNewEntry = (data: any) => {
      console.log("📡 Nueva entrada recibida en tiempo real:", data);
      loadEntries(); // Recargar entradas
    };

    wsService.on('entry-created', handleNewEntry);
    wsService.on('inventory-updated', handleNewEntry);

    return () => {
      wsService.off('entry-created', handleNewEntry);
      wsService.off('inventory-updated', handleNewEntry);
    };
  }, []);

  // Filtrar entradas según el rol del usuario
  const entries = useMemo(() => {
    if (user?.role === "Admin") {
      return allEntries; // Admin ve todas las entradas
    }
    // Usuarios de almacén solo ven sus propias entradas
    return allEntries.filter((e) => e.site === defaultSite);
  }, [allEntries, user, defaultSite]);
  
  const [items, setItems] = useState<EntryItem[]>([]);
  const [newItem, setNewItem] = useState<Omit<EntryItem, "id">>({
    code: "",
    description: "",
    qty: 1,
  });

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setSite(defaultSite);
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

  const handleCreateEntry = async () => {
    if (!date || !site || items.length === 0) return;
    
    try {
      await entriesAPI.create({
        date,
        site,
        items: items.map(item => ({
          code: item.code,
          description: item.description,
          qty: item.qty,
          size: item.size,
        })),
      });
      
      await loadEntries(); // Recargar desde la API
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al crear entrada");
    }
  };

  const handleScanCode = () => {
    // Simulación simple de escaneo
    setNewItem({
      code: "TS-" + Math.floor(Math.random() * 9000 + 1000),
      description: "Artículo escaneado",
      qty: 1,
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {user?.role === "Admin" 
              ? "Entradas de inventario"
              : `Entradas - ${inventoryDisplayNames[defaultSite]}`}
          </h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            {user?.role === "Admin" 
              ? "Registra el ingreso de mercancía nueva a los almacenes CEDIS, ACUÑA y NLD."
              : `Registra el ingreso de mercancía nueva al inventario de ${siteNames[defaultSite]}. Solo puedes registrar entradas para tu almacén.`
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
          Crear entrada
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Historial de entradas</h2>
          <span className="tag">{entries.length} entradas</span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Cargando entradas...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Inventario</th>
                  <th>Total artículos</th>
                  <th>Registrado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      No hay entradas registradas.
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id}>
                      <td>EN-{e.id}</td>
                      <td>{e.date}</td>
                      <td>
                        <span className={`badge badge-${e.site.toLowerCase()}`}>
                          {e.site}
                        </span>
                      </td>
                      <td>{e.totalItems || e.items?.reduce((sum, i) => sum + i.qty, 0) || 0}</td>
                      <td>{e.createdBy}</td>
                      <td>
                        <button className="link-button">Ver detalles</button>
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
                <h2>Nueva entrada de inventario</h2>
                <p>Captura la fecha, inventario de destino y los artículos.</p>
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
                  <label>Fecha de ingreso</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Inventario destino</label>
                  {user?.role === "Admin" ? (
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
                      value={siteNames[defaultSite]}
                      disabled
                      style={{
                        opacity: 0.6,
                        cursor: "not-allowed",
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="items-section">
                <div className="items-header">
                  <h3>Artículos</h3>
                  <div className="items-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={handleScanCode}
                    >
                      Escanear código
                    </button>
                  </div>
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
                            Aún no has añadido artículos a esta entrada.
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
                onClick={handleCreateEntry}
              >
                Guardar entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
