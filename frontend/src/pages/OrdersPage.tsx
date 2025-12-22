import { useState, useEffect } from "react";
import { ordersAPI } from "../services/api";
import { wsService } from "../services/websocket";

type OrderStatus = "Pendiente" | "Pedido" | "Recibido" | "Cancelado";

interface OrderItem {
  id: number;
  code: string;
  description: string;
  qty: number;
  unitPrice?: number;
}

interface Order {
  id: number;
  date: string;
  status: OrderStatus;
  totalItems: number;
  totalAmount?: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  items?: OrderItem[];
}

let tempId = 1;

export const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState<Omit<OrderItem, "id">>({
    code: "",
    description: "",
    qty: 1,
    unitPrice: 0,
  });

  // Cargar pedidos desde la API
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersAPI.getAll();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar pedidos");
      console.error("Error al cargar pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar pedidos al montar
  useEffect(() => {
    loadOrders();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data: any) => {
      console.log("📡 Actualización de pedidos recibida:", data);
      loadOrders();
    };

    wsService.on('order-created', handleUpdate);
    wsService.on('order-updated', handleUpdate);

    return () => {
      wsService.off('order-created', handleUpdate);
      wsService.off('order-updated', handleUpdate);
    };
  }, []);

  // Cargar sugerencias del dashboard si existen
  useEffect(() => {
    const suggestions = localStorage.getItem("orderSuggestions");
    if (suggestions) {
      try {
        const parsed = JSON.parse(suggestions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const orderItems: OrderItem[] = parsed.map((item, index) => ({
            id: tempId++,
            code: item.code,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice || 0,
          }));
          setItems(orderItems);
          setIsCreating(true);
          // Limpiar las sugerencias después de cargarlas
          localStorage.removeItem("orderSuggestions");
        }
      } catch (e) {
        console.error("Error al cargar sugerencias:", e);
        localStorage.removeItem("orderSuggestions");
      }
    }
  }, []);

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setItems([]);
    setNewItem({ code: "", description: "", qty: 1, unitPrice: 0 });
  };

  const loadSuggestionsFromDashboard = () => {
    // Simular carga de sugerencias (en producción vendría del backend)
    const suggestions = [
      { code: "TS-0002", description: "Botas tácticas", qty: 20, unitPrice: 0 },
      { code: "TS-0003", description: "Uniforme completo", qty: 25, unitPrice: 0 },
      { code: "TS-0004", description: "Gorra", qty: 15, unitPrice: 0 },
      { code: "TS-0005", description: "Guantes tácticos", qty: 12, unitPrice: 0 },
    ];
    const orderItems: OrderItem[] = suggestions.map((item) => ({
      id: tempId++,
      code: item.code,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice || 0,
    }));
    setItems(orderItems);
    if (!isCreating) {
      setIsCreating(true);
    }
  };

  const handleAddItem = () => {
    if (!newItem.code.trim() || !newItem.description.trim() || newItem.qty <= 0) {
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: tempId++,
        ...newItem,
        qty: Number(newItem.qty),
        unitPrice: Number(newItem.unitPrice) || 0,
      },
    ]);
    setNewItem({ code: "", description: "", qty: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCreateOrder = async () => {
    if (!date || items.length === 0) return;
    
    try {
      await ordersAPI.create({
        date,
        items: items.map(item => ({
          code: item.code,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice || 0,
        })),
      });
      
      await loadOrders();
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al crear pedido");
    }
  };

  const handleApprove = async (id: number) => {
    try {
      // Aquí se actualizaría el estado a "Pedido" en la API
      // await ordersAPI.approve(id);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Error al aprobar pedido");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      // Aquí se actualizaría el estado a "Cancelado" en la API
      // await ordersAPI.cancel(id);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Error al cancelar pedido");
    }
  };

  const handleReceive = async (id: number) => {
    try {
      // Aquí se actualizaría el estado a "Recibido" en la API
      // await ordersAPI.receive(id);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Error al marcar como recibido");
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const classes = {
      Pendiente: "tag-warning",
      Pedido: "tag-success",
      Recibido: "tag-success",
      Cancelado: "tag-danger",
    };
    return `tag ${classes[status] || ""}`;
  };

  const totalAmount = items.reduce(
    (sum, i) => sum + (i.unitPrice || 0) * i.qty,
    0
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Pedidos a proveedores</h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            Gestiona las órdenes de compra para reabastecer el inventario. Solo
            visible para administradores.
          </p>
          {error && (
            <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>⚠️ {error}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn secondary"
            onClick={loadSuggestionsFromDashboard}
          >
            Cargar sugerencias
          </button>
          <button
            className="btn primary"
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
          >
            Crear pedido
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Historial de pedidos</h2>
          <span className="tag">{orders.length} pedidos</span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Cargando pedidos...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Total artículos</th>
                  <th>Monto total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      No hay pedidos registrados.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td>PE-{o.id}</td>
                      <td>{o.date}</td>
                      <td>{o.totalItems || o.items?.reduce((sum, i) => sum + i.qty, 0) || 0}</td>
                      <td>
                        {o.totalAmount
                          ? `$${o.totalAmount.toLocaleString("es-MX")}`
                          : "N/A"}
                      </td>
                      <td>
                        <span className={getStatusBadge(o.status)}>{o.status}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            className="link-button"
                            onClick={() => setSelectedOrder(o)}
                          >
                            Ver detalles
                          </button>
                          {o.status === "Pendiente" && (
                            <>
                              <button
                                className="link-button"
                                onClick={() => handleApprove(o.id)}
                              >
                                Aprobar pedido
                              </button>
                              <button className="link-button">Modificar</button>
                              <button
                                className="link-button danger"
                                onClick={() => handleCancel(o.id)}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {o.status === "Pedido" && (
                            <button
                              className="link-button"
                              onClick={() => handleReceive(o.id)}
                            >
                              Marcar recibido
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
                <h2>Nueva orden de compra</h2>
                <p>Registra los artículos y cantidades para el pedido al proveedor.</p>
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
                  <label>Fecha del pedido</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="items-section">
                <div className="items-header">
                  <h3>Artículos a pedir</h3>
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
                  <div className="form-field form-field-sm">
                    <label>Precio unit.</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={newItem.unitPrice || ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          unitPrice: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
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
                        <th>Precio unit.</th>
                        <th>Subtotal</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-cell">
                            Aún no has añadido artículos a este pedido.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => {
                          const subtotal = (item.unitPrice || 0) * item.qty;
                          return (
                            <tr key={item.id}>
                              <td>{item.code}</td>
                              <td>{item.description}</td>
                              <td>{item.qty}</td>
                              <td>
                                {item.unitPrice
                                  ? `$${item.unitPrice.toLocaleString("es-MX")}`
                                  : "N/A"}
                              </td>
                              <td>
                                {subtotal > 0
                                  ? `$${subtotal.toLocaleString("es-MX")}`
                                  : "N/A"}
                              </td>
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
                          );
                        })
                      )}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ textAlign: "right", fontWeight: 600 }}>
                            Total:
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            ${totalAmount.toLocaleString("es-MX")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
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
                onClick={handleCreateOrder}
              >
                Guardar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px" }}>
            <div className="modal-header">
              <div>
                <h2>Orden de Compra PE-{selectedOrder.id}</h2>
                <p>Formato imprimible de orden de compra.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "white",
                  color: "#1f2937",
                  padding: "2rem",
                  borderRadius: "0.5rem",
                }}
              >
                <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                  <h2 style={{ margin: 0, fontSize: "1.5rem" }}>ORDEN DE COMPRA</h2>
                  <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
                    Folio: PE-{selectedOrder.id}
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                  <div>
                    <strong>Fecha:</strong> {selectedOrder.date}
                  </div>
                  <div>
                    <strong>Estado:</strong> {selectedOrder.status}
                  </div>
                  {selectedOrder.approvedBy && (
                    <>
                      <div>
                        <strong>Aprobado por:</strong> {selectedOrder.approvedBy}
                      </div>
                      <div>
                        <strong>Fecha de aprobación:</strong> {selectedOrder.approvedAt}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Artículos solicitados:</strong> {selectedOrder.totalItems || selectedOrder.items?.reduce((sum, i) => sum + i.qty, 0) || 0}
                </div>
                {selectedOrder.totalAmount && (
                  <div style={{ marginBottom: "1rem" }}>
                    <strong>Monto total:</strong> ${selectedOrder.totalAmount.toLocaleString("es-MX")}
                  </div>
                )}
                <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                    Esta orden de compra fue generada por el sistema de gestión de inventario.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedOrder(null)}>
                Cerrar
              </button>
              <button
                className="btn primary"
                onClick={() => window.print()}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
