import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { employeesAPI } from "../services/api";
import { wsService } from "../services/websocket";

type EmployeeStatus = "Activo" | "Inactivo";
type RenewalStatus = "Vigente" | "Próximo a renovar" | "Vencido";

interface Employee {
  id: string;
  name: string;
  service: string;
  hireDate: string;
  secondUniformDate?: string;
  lastRenewalDate?: string;
  nextRenewalDate?: string;
  status: EmployeeStatus;
  renewalStatus: RenewalStatus;
}

// Función para calcular la fecha del 2do uniforme (15 días después, ajustado al 15 o 30 más cercano)
const calculateSecondUniformDate = (hireDate: string): string | undefined => {
  if (!hireDate) return undefined;
  
  const hire = new Date(hireDate);
  const after15Days = new Date(hire);
  after15Days.setDate(hire.getDate() + 15);
  
  const year = after15Days.getFullYear();
  const month = after15Days.getMonth();
  const day = after15Days.getDate();
  
  // Determinar si es más cercano al 15 o al 30
  let targetDay: number;
  if (day <= 15) {
    targetDay = 15;
  } else if (day <= 30) {
    targetDay = 30;
  } else {
    // Si es después del 30, ir al 15 del siguiente mes
    targetDay = 15;
    after15Days.setMonth(month + 1);
  }
  
  const secondUniform = new Date(after15Days.getFullYear(), after15Days.getMonth(), targetDay);
  return secondUniform.toISOString().slice(0, 10);
};

// Función para calcular la próxima renovación (6 meses después)
const calculateNextRenewalDate = (hireDate: string, lastRenewalDate?: string): string => {
  const baseDate = lastRenewalDate ? new Date(lastRenewalDate) : new Date(hireDate);
  const nextRenewal = new Date(baseDate);
  nextRenewal.setMonth(nextRenewal.getMonth() + 6);
  return nextRenewal.toISOString().slice(0, 10);
};

export const EmployeesPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [filterService, setFilterService] = useState<string>("");
  const [filterRenewal, setFilterRenewal] = useState<string>("");
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [lastRenewalDate, setLastRenewalDate] = useState("");

  // Cargar colaboradores desde la API
  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeesAPI.getAll("Activo");
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar colaboradores");
      console.error("Error al cargar colaboradores:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar colaboradores al montar
  useEffect(() => {
    loadEmployees();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data: any) => {
      console.log("📡 Actualización de colaboradores recibida:", data);
      loadEmployees();
    };

    wsService.on('employee-created', handleUpdate);
    wsService.on('employee-updated', handleUpdate);

    return () => {
      wsService.off('employee-created', handleUpdate);
      wsService.off('employee-updated', handleUpdate);
    };
  }, []);

  // Calcular fechas automáticamente cuando cambia la fecha de ingreso
  const secondUniformDate = hireDate ? calculateSecondUniformDate(hireDate) : undefined;
  const nextRenewalDate = hireDate ? calculateNextRenewalDate(hireDate, lastRenewalDate || undefined) : "";

  const resetForm = () => {
    setName("");
    setService("");
    setHireDate("");
    setLastRenewalDate("");
  };

  const handleCreateEmployee = async () => {
    if (!name || !service || !hireDate) return;
    
    try {
      // Calcular fechas automáticamente
      const calculatedSecondUniform = calculateSecondUniformDate(hireDate);
      const calculatedNextRenewal = calculateNextRenewalDate(hireDate, lastRenewalDate || undefined);
      
      // Crear registro pendiente sin ID (se asignará en Registros Pendientes)
      await employeesAPI.createPending({
        name,
        service,
        hireDate,
        secondUniformDate: calculatedSecondUniform,
        lastRenewalDate: lastRenewalDate || undefined,
        nextRenewalDate: calculatedNextRenewal,
      });
      
      alert("Colaborador registrado. Debe ser aprobado y asignado un ID en 'Registros Pendientes'.");
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Error al registrar colaborador");
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("¿Estás seguro de dar de baja a este colaborador?")) return;
    
    try {
      // Aquí se actualizaría el estado a inactivo en la API
      // await employeesAPI.update(id, { status: "Inactivo" });
      await loadEmployees();
    } catch (err: any) {
      alert(err.message || "Error al dar de baja colaborador");
    }
  };

  const getRenewalBadge = (status: RenewalStatus) => {
    const classes = {
      Vigente: "tag-success",
      "Próximo a renovar": "tag-warning",
      Vencido: "tag-danger",
    };
    return `tag ${classes[status] || ""}`;
  };

  const services = Array.from(new Set(employees.map((e) => e.service)));
  const filteredEmployees = employees.filter((e) => {
    if (filterService && e.service !== filterService) return false;
    if (filterRenewal && e.renewalStatus !== filterRenewal) return false;
    return e.status === "Activo";
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Colaboradores</h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            Administra la información de tu personal activo. Los nuevos registros
            pasan a "Registros Pendientes" para aprobación.
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
          Añadir colaborador
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Lista de colaboradores activos</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.5rem",
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                color: "#e5e7eb",
                fontSize: "0.75rem",
              }}
            >
              <option value="">Todos los servicios</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterRenewal}
              onChange={(e) => setFilterRenewal(e.target.value)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.5rem",
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                color: "#e5e7eb",
                fontSize: "0.75rem",
              }}
            >
              <option value="">Todos los estados</option>
              <option value="Vigente">Vigente</option>
              <option value="Próximo a renovar">Próximo a renovar</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Cargando colaboradores...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre completo</th>
                  <th>Servicio</th>
                  <th>Fecha de ingreso</th>
                  <th>2do uniforme</th>
                  <th>Última renovación</th>
                  <th>Próxima renovación</th>
                  <th>Estado de renovación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-cell">
                      No hay colaboradores activos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((e) => (
                    <tr key={e.id}>
                      <td>{e.id}</td>
                      <td>{e.name}</td>
                      <td>{e.service}</td>
                      <td>{e.hireDate}</td>
                      <td>{e.secondUniformDate || "N/A"}</td>
                      <td>{e.lastRenewalDate || "N/A"}</td>
                      <td>{e.nextRenewalDate || "N/A"}</td>
                      <td>
                        <span className={getRenewalBadge(e.renewalStatus)}>
                          {e.renewalStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            className="link-button"
                            onClick={() => setSelectedEmployee(e)}
                          >
                            Ver detalles
                          </button>
                          <button className="link-button">Modificar</button>
                          <button
                            className="link-button danger"
                            onClick={() => handleDeactivate(e.id)}
                          >
                            Dar de baja
                          </button>
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
                <h2>Nuevo colaborador</h2>
                <p>
                  Registra un nuevo colaborador. El registro pasará a "Registros
                  Pendientes" donde se le asignará el ID de empleado antes de aprobar.
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
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                <div className="form-field">
                  <label>Fecha de ingreso</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>2do uniforme (calculado automáticamente)</label>
                  <input
                    type="date"
                    value={secondUniformDate || ""}
                    disabled
                    style={{
                      opacity: 0.6,
                      cursor: "not-allowed",
                    }}
                  />
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                    Se calcula 15 días después del ingreso, ajustado al 15 o 30 del mes
                  </div>
                </div>
                <div className="form-field">
                  <label>Última renovación (opcional)</label>
                  <input
                    type="date"
                    value={lastRenewalDate}
                    onChange={(e) => setLastRenewalDate(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Próxima renovación (calculada automáticamente)</label>
                  <input
                    type="date"
                    value={nextRenewalDate}
                    disabled
                    style={{
                      opacity: 0.6,
                      cursor: "not-allowed",
                    }}
                  />
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                    Se calcula 6 meses después del ingreso o última renovación
                  </div>
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
                disabled={!name || !service || !hireDate}
                onClick={handleCreateEmployee}
              >
                Guardar colaborador
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className="modal-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Ficha de colaborador {selectedEmployee.id}</h2>
                <p>Información completa y historial de equipo asignado.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedEmployee(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>ID</label>
                  <div>{selectedEmployee.id}</div>
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Nombre completo</label>
                  <div>{selectedEmployee.name}</div>
                </div>
                <div className="form-field">
                  <label>Servicio</label>
                  <div>{selectedEmployee.service}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Fecha de ingreso</label>
                  <div>{selectedEmployee.hireDate}</div>
                </div>
                <div className="form-field">
                  <label>2do uniforme</label>
                  <div>{selectedEmployee.secondUniformDate || "N/A"}</div>
                </div>
                <div className="form-field">
                  <label>Última renovación</label>
                  <div>{selectedEmployee.lastRenewalDate || "N/A"}</div>
                </div>
                <div className="form-field">
                  <label>Próxima renovación</label>
                  <div>{selectedEmployee.nextRenewalDate || "N/A"}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Estado de renovación</label>
                  <span className={getRenewalBadge(selectedEmployee.renewalStatus)}>
                    {selectedEmployee.renewalStatus}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(148, 163, 184, 0.35)" }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Historial de equipo asignado
                </h3>
                <div className="table-wrapper compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Artículo</th>
                        <th>Cantidad</th>
                        <th>Folio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          No hay historial de equipo asignado aún.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedEmployee(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
