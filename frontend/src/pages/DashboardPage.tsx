import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeesAPI, inventoryAPI, dispatchesAPI } from "../services/api";
import { wsService } from "../services/websocket";

interface Employee {
  id: string;
  name: string;
  service: string;
  nextRenewalDate?: string;
  secondRenewalDate?: string;
}

interface LowStockItem {
  code: string;
  description: string;
  site: "CEDIS" | "ACUÑA" | "NLD";
  currentStock: number;
  minStock: number;
  suggestedQty: number;
}

interface Service {
  name: string;
  activeEmployees: number;
}

export const DashboardPage = () => {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos del dashboard
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [nextRenewals, setNextRenewals] = useState<Employee[]>([]);
  const [secondRenewals, setSecondRenewals] = useState<Employee[]>([]);
  const [inactiveEmployees, setInactiveEmployees] = useState(0);
  const [inventoryDistribution, setInventoryDistribution] = useState({
    CEDIS: 0,
    ACUÑA: 0,
    NLD: 0,
  });
  const [dispatchesBySite, setDispatchesBySite] = useState({
    CEDIS: 0,
    ACUÑA: 0,
    NLD: 0,
  });

  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar colaboradores activos
      const employees = await employeesAPI.getAll("Activo");
      setActiveEmployees(employees);
      
      // Calcular servicios
      const serviceMap = new Map<string, number>();
      employees.forEach(emp => {
        serviceMap.set(emp.service, (serviceMap.get(emp.service) || 0) + 1);
      });
      setServices(Array.from(serviceMap.entries()).map(([name, count]) => ({
        name,
        activeEmployees: count,
      })));

      // Filtrar próximas renovaciones (próximos 3 meses)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const upcomingRenewals = employees.filter(emp => {
        if (!emp.nextRenewalDate) return false;
        const renewalDate = new Date(emp.nextRenewalDate);
        return renewalDate <= threeMonthsFromNow;
      });
      setNextRenewals(upcomingRenewals);

      // Filtrar 2do uniforme próximos
      const upcomingSecondRenewals = employees.filter(emp => {
        if (!emp.secondRenewalDate) return false;
        const renewalDate = new Date(emp.secondRenewalDate);
        return renewalDate <= threeMonthsFromNow;
      });
      setSecondRenewals(upcomingSecondRenewals);

      // Cargar colaboradores inactivos
      const inactive = await employeesAPI.getAll("Inactivo");
      setInactiveEmployees(inactive.length);

      // Cargar inventario de los 3 almacenes
      const [cedisInventory, acunaInventory, nldInventory] = await Promise.all([
        inventoryAPI.get("CEDIS"),
        inventoryAPI.get("ACUÑA"),
        inventoryAPI.get("NLD"),
      ]);

      // Calcular distribución de inventario
      const totalStock = 
        cedisInventory.reduce((sum: number, item: any) => sum + (item.stockNew || 0) + (item.stockRecovered || 0), 0) +
        acunaInventory.reduce((sum: number, item: any) => sum + (item.stockNew || 0) + (item.stockRecovered || 0), 0) +
        nldInventory.reduce((sum: number, item: any) => sum + (item.stockNew || 0) + (item.stockRecovered || 0), 0);

      if (totalStock > 0) {
        const cedisStock = cedisInventory.reduce((sum: number, item: any) => sum + (item.stockNew || 0) + (item.stockRecovered || 0), 0);
        const acunaStock = acunaInventory.reduce((sum: number, item: any) => sum + (item.stockNew || 0) + (item.stockRecovered || 0), 0);
        const nldStock = nldInventory.reduce((sum: number, item: any) => sum + (item.stockNew || 0) + (item.stockRecovered || 0), 0);

        setInventoryDistribution({
          CEDIS: Math.round((cedisStock / totalStock) * 100),
          ACUÑA: Math.round((acunaStock / totalStock) * 100),
          NLD: Math.round((nldStock / totalStock) * 100),
        });
      }

      // Calcular artículos con stock bajo
      const allLowStock: LowStockItem[] = [];
      
      [...cedisInventory, ...acunaInventory, ...nldInventory].forEach((item: any) => {
        const totalStock = (item.stockNew || 0) + (item.stockRecovered || 0);
        if (totalStock < item.stockMin) {
          allLowStock.push({
            code: item.code,
            description: item.description,
            site: item.site,
            currentStock: totalStock,
            minStock: item.stockMin,
            suggestedQty: Math.max(item.stockMin - totalStock + 10, 10),
          });
        }
      });
      setLowStockItems(allLowStock);

      // Cargar salidas por almacén
      const dispatches = await dispatchesAPI.getAll();
      const dispatchesBySiteCount = {
        CEDIS: dispatches.filter((d: any) => d.site === "CEDIS").length,
        ACUÑA: dispatches.filter((d: any) => d.site === "ACUÑA").length,
        NLD: dispatches.filter((d: any) => d.site === "NLD").length,
      };
      setDispatchesBySite(dispatchesBySiteCount);

    } catch (err: any) {
      setError(err.message || "Error al cargar datos del dashboard");
      console.error("Error al cargar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data: any) => {
      console.log("📡 Actualización del dashboard recibida:", data);
      loadDashboardData();
    };

    wsService.on('inventory-updated', handleUpdate);
    wsService.on('entry-created', handleUpdate);
    wsService.on('dispatch-created', handleUpdate);
    wsService.on('employee-created', handleUpdate);

    return () => {
      wsService.off('inventory-updated', handleUpdate);
      wsService.off('entry-created', handleUpdate);
      wsService.off('dispatch-created', handleUpdate);
      wsService.off('employee-created', handleUpdate);
    };
  }, []);

  const openModal = (modal: string) => {
    setSelectedModal(modal);
  };

  const closeModal = () => {
    setSelectedModal(null);
  };

  const handleGenerateOrderFromSuggestions = () => {
    // Guardar las sugerencias en localStorage para que OrdersPage las pueda usar
    const suggestions = lowStockItems.map((item) => ({
      code: item.code,
      description: item.description,
      qty: item.suggestedQty,
      unitPrice: 0, // El usuario puede agregar el precio después
    }));
    localStorage.setItem("orderSuggestions", JSON.stringify(suggestions));
    navigate("/orders");
    closeModal();
  };

  const totalDispatches = dispatchesBySite.CEDIS + dispatchesBySite.ACUÑA + dispatchesBySite.NLD;
  const maxDispatches = Math.max(dispatchesBySite.CEDIS, dispatchesBySite.ACUÑA, dispatchesBySite.NLD) || 1;

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard General</h1>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard General</h1>
        <p>
          {wsService.isConnected() && (
            <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
          )}
          Resumen del estado de inventario, colaboradores y salidas por almacén.
        </p>
        {error && (
          <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>⚠️ {error}</p>
        )}
      </div>

      <div className="grid-cards">
        <div
          className="stat-card primary clickable"
          onClick={() => openModal("activeEmployees")}
        >
          <div className="stat-label">Colaboradores activos</div>
          <div className="stat-value">{activeEmployees.length}</div>
          <div className="stat-hint">Haz clic para ver la lista completa</div>
        </div>

        <div
          className="stat-card clickable"
          onClick={() => openModal("services")}
        >
          <div className="stat-label">Total de servicios</div>
          <div className="stat-value">{services.length}</div>
          <div className="stat-hint">Haz clic para ver los servicios</div>
        </div>

        <div
          className="stat-card warning clickable"
          onClick={() => openModal("suggestions")}
        >
          <div className="stat-label">Sugerencia de pedido</div>
          <div className="stat-value">{lowStockItems.length}</div>
          <div className="stat-hint">Haz clic para ver artículos sugeridos</div>
        </div>

        <div
          className="stat-card clickable"
          onClick={() => openModal("renewals")}
        >
          <div className="stat-label">Próximas renovaciones</div>
          <div className="stat-value">{nextRenewals.length}</div>
          <div className="stat-hint">Haz clic para ver colaboradores</div>
        </div>

        <div
          className="stat-card warning clickable"
          onClick={() => openModal("lowStock")}
        >
          <div className="stat-label">Stock bajo</div>
          <div className="stat-value">{lowStockItems.length}</div>
          <div className="stat-hint">Artículos por debajo del mínimo</div>
        </div>

        <div
          className="stat-card clickable"
          onClick={() => openModal("secondRenewals")}
        >
          <div className="stat-label">Próximas renovaciones 2do uniforme</div>
          <div className="stat-value">{secondRenewals.length}</div>
          <div className="stat-hint">Haz clic para ver colaboradores</div>
        </div>

        <div
          className="stat-card clickable"
          onClick={() => openModal("inactive")}
        >
          <div className="stat-label">Colaboradores inactivos</div>
          <div className="stat-value">{inactiveEmployees}</div>
          <div className="stat-hint">Haz clic para ver detalles</div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="panel">
          <div className="panel-header">
            <h2>Inventario general</h2>
            <span className="tag tag-success">Distribución entre almacenes</span>
          </div>
          <div className="inventory-health">
            <div className="gauge">
              <div
                className="gauge-needle"
                style={{
                  transform: `rotate(${100 * 1.4}deg)`,
                }}
              />
              <div className="gauge-center">
                <div className="gauge-value">100%</div>
                <div className="gauge-label">Inventario total</div>
              </div>
            </div>
            <ul className="gauge-legend">
              <li>
                <span className="dot" style={{ background: "#38bdf8" }} />
                CEDIS: {inventoryDistribution.CEDIS}%
              </li>
              <li>
                <span className="dot" style={{ background: "#a855f7" }} />
                ACUÑA: {inventoryDistribution.ACUÑA}%
              </li>
              <li>
                <span className="dot" style={{ background: "#f97316" }} />
                NLD: {inventoryDistribution.NLD}%
              </li>
              <li style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>
                  Distribución del inventario entre los 3 almacenes
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Desglose de salidas por almacén</h2>
          </div>
          <div className="bar-chart">
            <div className="bar-row">
              <span>CEDIS</span>
              <div className="bar-track">
                <div
                  className="bar-fill cedis"
                  style={{
                    width: `${(dispatchesBySite.CEDIS / maxDispatches) * 100}%`,
                  }}
                />
              </div>
              <span className="bar-value">{dispatchesBySite.CEDIS}</span>
            </div>
            <div className="bar-row">
              <span>ACUÑA</span>
              <div className="bar-track">
                <div
                  className="bar-fill acuna"
                  style={{
                    width: `${(dispatchesBySite.ACUÑA / maxDispatches) * 100}%`,
                  }}
                />
              </div>
              <span className="bar-value">{dispatchesBySite.ACUÑA}</span>
            </div>
            <div className="bar-row">
              <span>NLD</span>
              <div className="bar-track">
                <div
                  className="bar-fill nld"
                  style={{
                    width: `${(dispatchesBySite.NLD / maxDispatches) * 100}%`,
                  }}
                />
              </div>
              <span className="bar-value">{dispatchesBySite.NLD}</span>
            </div>
          </div>
          <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.8rem", color: "#9ca3af" }}>
            Total: {totalDispatches} salidas
          </div>
        </div>
      </div>

      {/* Modal: Colaboradores activos */}
      {selectedModal === "activeEmployees" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Colaboradores activos</h2>
                <p>Lista completa de colaboradores activos en el sistema.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="table-wrapper compact">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Servicio</th>
                      <th>Próxima renovación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.id}</td>
                        <td>{emp.name}</td>
                        <td>{emp.service}</td>
                        <td>{emp.nextRenewalDate || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Servicios */}
      {selectedModal === "services" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Servicios activos</h2>
                <p>Lista de todos los servicios en el sistema.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="table-wrapper compact">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Colaboradores activos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.name}>
                        <td>{service.name}</td>
                        <td>{service.activeEmployees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sugerencias de pedido */}
      {selectedModal === "suggestions" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Sugerencias de pedido</h2>
                <p>Artículos con stock bajo que requieren reabastecimiento.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="table-wrapper compact">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Almacén</th>
                      <th>Stock actual</th>
                      <th>Stock mínimo</th>
                      <th>Cantidad sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={`${item.code}-${item.site}`}>
                        <td>{item.code}</td>
                        <td>{item.description}</td>
                        <td>
                          <span className={`badge badge-${item.site.toLowerCase()}`}>
                            {item.site}
                          </span>
                        </td>
                        <td>{item.currentStock}</td>
                        <td>{item.minStock}</td>
                        <td>
                          <strong>{item.suggestedQty}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
              <button className="btn primary" onClick={handleGenerateOrderFromSuggestions}>
                Generar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Próximas renovaciones */}
      {selectedModal === "renewals" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Próximas renovaciones</h2>
                <p>Colaboradores con renovación de equipo próxima a vencer.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="table-wrapper compact">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Servicio</th>
                      <th>Fecha de renovación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextRenewals.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.id}</td>
                        <td>{emp.name}</td>
                        <td>{emp.service}</td>
                        <td>
                          <span className="tag tag-warning">
                            {emp.nextRenewalDate}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Stock bajo */}
      {selectedModal === "lowStock" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Artículos con stock bajo</h2>
                <p>Artículos que están por debajo de su stock mínimo.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="table-wrapper compact">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Almacén</th>
                      <th>Stock actual</th>
                      <th>Stock mínimo</th>
                      <th>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => {
                      const difference = item.currentStock - item.minStock;
                      return (
                        <tr key={`${item.code}-${item.site}`}>
                          <td>{item.code}</td>
                          <td>{item.description}</td>
                          <td>
                            <span className={`badge badge-${item.site.toLowerCase()}`}>
                              {item.site}
                            </span>
                          </td>
                          <td>{item.currentStock}</td>
                          <td>{item.minStock}</td>
                          <td>
                            <span
                              className={
                                difference < 0
                                  ? "tag tag-danger"
                                  : "tag tag-warning"
                              }
                            >
                              {difference > 0 ? "+" : ""}
                              {difference}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Próximas renovaciones 2do uniforme */}
      {selectedModal === "secondRenewals" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Próximas renovaciones 2do uniforme</h2>
                <p>Colaboradores con renovación de segundo uniforme próxima.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="table-wrapper compact">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Servicio</th>
                      <th>Fecha de renovación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secondRenewals.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.id}</td>
                        <td>{emp.name}</td>
                        <td>{emp.service}</td>
                        <td>
                          <span className="tag tag-warning">
                            {emp.secondRenewalDate}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Colaboradores inactivos */}
      {selectedModal === "inactive" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Colaboradores inactivos</h2>
                <p>Total de colaboradores dados de baja en el sistema.</p>
              </div>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {inactiveEmployees}
                </div>
                <p style={{ color: "#9ca3af", margin: 0 }}>
                  Colaboradores inactivos en el sistema
                </p>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "0.8rem",
                    marginTop: "1rem",
                  }}
                >
                  Para ver el listado completo, ve a la sección "Inactivos" en el
                  menú lateral.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
