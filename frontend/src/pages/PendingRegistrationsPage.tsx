import { useState, useEffect } from "react";
import { employeesAPI } from "../services/api";
import { wsService } from "../services/websocket";

interface PendingEmployee {
  id?: number;
  employeeId?: string;
  name: string;
  service: string;
  hireDate: string;
  secondUniformDate?: string;
  lastRenewalDate?: string;
  nextRenewalDate?: string;
  registeredAt: string;
  registeredBy: string;
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

export const PendingRegistrationsPage = () => {
  const [pending, setPending] = useState<PendingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPending, setSelectedPending] = useState<PendingEmployee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<PendingEmployee | null>(null);

  // Cargar registros pendientes desde la API
  const loadPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeesAPI.getPending();
      setPending(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar registros pendientes");
      console.error("Error al cargar registros pendientes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar registros pendientes al montar
  useEffect(() => {
    loadPending();
  }, []);

  // Configurar WebSocket para tiempo real
  useEffect(() => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }

    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data: any) => {
      console.log("📡 Actualización de registros pendientes recibida:", data);
      loadPending();
    };

    wsService.on('pending-employee-created', handleUpdate);
    wsService.on('pending-employee-approved', handleUpdate);

    return () => {
      wsService.off('pending-employee-created', handleUpdate);
      wsService.off('pending-employee-approved', handleUpdate);
    };
  }, []);

  // Calcular fechas automáticamente cuando se edita
  const editSecondUniformDate = editData?.hireDate ? calculateSecondUniformDate(editData.hireDate) : undefined;
  const editNextRenewalDate = editData?.hireDate ? calculateNextRenewalDate(editData.hireDate, editData.lastRenewalDate) : "";

  const handleApprove = async (employee: PendingEmployee) => {
    if (!employee.employeeId || !employee.employeeId.trim()) {
      alert("Debes asignar un ID de empleado antes de aprobar el registro.");
      return;
    }
    if (!confirm("¿Aprobar este registro y moverlo a colaboradores activos?")) return;
    
    try {
      if (employee.id) {
        await employeesAPI.approvePending(employee.id, employee.employeeId);
        await loadPending();
        setSelectedPending(null);
      }
    } catch (err: any) {
      alert(err.message || "Error al aprobar registro");
    }
  };

  const handleModify = (employee: PendingEmployee) => {
    setEditData({ ...employee });
    setIsEditing(true);
  };

  const handleSaveModification = async () => {
    if (!editData) return;
    
    try {
      // Recalcular fechas automáticamente antes de guardar
      const updatedData: PendingEmployee = {
        ...editData,
        secondUniformDate: calculateSecondUniformDate(editData.hireDate),
        nextRenewalDate: calculateNextRenewalDate(editData.hireDate, editData.lastRenewalDate),
      };
      
      // Aquí se actualizaría en la API
      // await employeesAPI.updatePending(editData.id, updatedData);
      await loadPending();
      setIsEditing(false);
      setEditData(null);
    } catch (err: any) {
      alert(err.message || "Error al guardar cambios");
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("¿Estás seguro de cancelar este registro? Se eliminará permanentemente.")) return;
    
    try {
      // Aquí se eliminaría de la API
      // await employeesAPI.deletePending(id);
      await loadPending();
    } catch (err: any) {
      alert(err.message || "Error al cancelar registro");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Registros pendientes</h1>
          <p>
            {wsService.isConnected() && (
              <span style={{ color: '#10b981', marginRight: '1rem' }}>🟢 Tiempo real activo</span>
            )}
            Revisa y aprueba los nuevos colaboradores registrados antes de que se
            integren al sistema. Solo visible para administradores.
          </p>
          {error && (
            <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>⚠️ {error}</p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Colaboradores pendientes de aprobación</h2>
          <span className="tag tag-warning">
            {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
          </span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Cargando registros pendientes...
          </div>
        ) : pending.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            No hay registros pendientes de aprobación.
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
                  <th>Registrado el</th>
                  <th>Registrado por</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id || `pending-${p.name}`}>
                    <td>
                      {p.employeeId ? (
                        p.employeeId
                      ) : (
                        <span className="tag tag-warning">Sin ID</span>
                      )}
                    </td>
                    <td>{p.name}</td>
                    <td>{p.service}</td>
                    <td>{p.hireDate}</td>
                    <td>{p.registeredAt}</td>
                    <td>{p.registeredBy}</td>
                    <td>
                      {p.employeeId ? (
                        <span className="tag tag-success">Listo para aprobar</span>
                      ) : (
                        <span className="tag tag-warning">Pendiente ID</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          className="link-button"
                          onClick={() => setSelectedPending(p)}
                        >
                          Ver detalles
                        </button>
                        <button
                          className="link-button"
                          onClick={() => handleModify(p)}
                        >
                          {p.employeeId ? "Modificar" : "Asignar ID"}
                        </button>
                        <button
                          className="link-button"
                          onClick={() => handleApprove(p)}
                          disabled={!p.employeeId}
                          style={{
                            opacity: p.employeeId ? 1 : 0.5,
                            cursor: p.employeeId ? "pointer" : "not-allowed",
                          }}
                        >
                          Aprobar registro
                        </button>
                        {p.id && (
                          <button
                            className="link-button danger"
                            onClick={() => handleCancel(p.id!)}
                          >
                            Cancelar registro
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isEditing && editData && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Asignar ID y modificar registro</h2>
                <p>Asigna el ID de empleado y corrige cualquier dato antes de aprobar el registro.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setIsEditing(false);
                  setEditData(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>ID de empleado</label>
                  <input
                    type="text"
                    value={editData.employeeId || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, employeeId: e.target.value || undefined })
                    }
                    placeholder="Ej. EMP-046"
                    style={{
                      borderColor: !editData.employeeId ? "rgba(234, 179, 8, 0.5)" : undefined,
                    }}
                  />
                  {!editData.employeeId && (
                    <div style={{ fontSize: "0.7rem", color: "#fde047", marginTop: "0.25rem" }}>
                      ⚠️ Debes asignar un ID antes de aprobar
                    </div>
                  )}
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Servicio</label>
                  <input
                    type="text"
                    value={editData.service}
                    onChange={(e) =>
                      setEditData({ ...editData, service: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Fecha de ingreso</label>
                  <input
                    type="date"
                    value={editData.hireDate}
                    onChange={(e) =>
                      setEditData({ ...editData, hireDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>2do uniforme (calculado automáticamente)</label>
                  <input
                    type="date"
                    value={editSecondUniformDate || ""}
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
                    value={editData.lastRenewalDate || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        lastRenewalDate: e.target.value || undefined,
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Próxima renovación (calculada automáticamente)</label>
                  <input
                    type="date"
                    value={editNextRenewalDate}
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
                  setIsEditing(false);
                  setEditData(null);
                }}
              >
                Cancelar
              </button>
              <button className="btn primary" onClick={handleSaveModification}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPending && (
        <div className="modal-backdrop" onClick={() => setSelectedPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Detalles del registro pendiente</h2>
                <p>Revisa la información antes de aprobar o modificar.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedPending(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>ID de empleado</label>
                  <div>
                    {selectedPending.employeeId ? (
                      selectedPending.employeeId
                    ) : (
                      <span className="tag tag-warning">Sin asignar</span>
                    )}
                  </div>
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Nombre completo</label>
                  <div>{selectedPending.name}</div>
                </div>
                <div className="form-field">
                  <label>Servicio</label>
                  <div>{selectedPending.service}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Fecha de ingreso</label>
                  <div>{selectedPending.hireDate}</div>
                </div>
                <div className="form-field">
                  <label>2do uniforme</label>
                  <div>{selectedPending.secondUniformDate || "N/A"}</div>
                </div>
                <div className="form-field">
                  <label>Última renovación</label>
                  <div>{selectedPending.lastRenewalDate || "N/A"}</div>
                </div>
                <div className="form-field">
                  <label>Próxima renovación</label>
                  <div>{selectedPending.nextRenewalDate || "N/A"}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Registrado el</label>
                  <div>{selectedPending.registeredAt}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Registrado por</label>
                  <div>{selectedPending.registeredBy}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedPending(null)}>
                Cerrar
              </button>
              <button
                className="link-button"
                onClick={() => {
                  setSelectedPending(null);
                  handleModify(selectedPending);
                }}
              >
                Modificar
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  handleApprove(selectedPending);
                  if (selectedPending.employeeId) {
                    setSelectedPending(null);
                  }
                }}
                disabled={!selectedPending.employeeId}
                style={{
                  opacity: selectedPending.employeeId ? 1 : 0.5,
                  cursor: selectedPending.employeeId ? "pointer" : "not-allowed",
                }}
              >
                Aprobar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
