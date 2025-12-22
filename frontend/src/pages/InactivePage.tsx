import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface InactiveEmployee {
  id: string;
  name: string;
  service: string;
  hireDate: string;
  deactivationDate: string;
  lastRenewalDate?: string;
  nextRenewalDate?: string;
}

const mockInactive: InactiveEmployee[] = [
  {
    id: "EMP-020",
    name: "José Martínez",
    service: "Guardia",
    hireDate: "2021-05-10",
    deactivationDate: "2024-11-30",
    lastRenewalDate: "2024-10-01",
    nextRenewalDate: "2025-10-01",
  },
  {
    id: "EMP-015",
    name: "Patricia Ruiz",
    service: "Supervisión",
    hireDate: "2020-03-15",
    deactivationDate: "2024-10-15",
  },
];

export const InactivePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [inactive, setInactive] = useState<InactiveEmployee[]>(mockInactive);
  const [selectedEmployee, setSelectedEmployee] = useState<InactiveEmployee | null>(null);

  const handleReactivate = (id: string) => {
    if (confirm("¿Reactivar a este colaborador y moverlo a la lista de activos?")) {
      setInactive((prev) => prev.filter((e) => e.id !== id));
      // En un sistema real, esto movería el colaborador a la lista de activos
      alert("Colaborador reactivado exitosamente.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Colaboradores inactivos</h1>
          <p>
            Archivo histórico del personal que ha sido dado de baja. Los
            administradores pueden reactivar colaboradores.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Lista de colaboradores inactivos</h2>
          <span className="tag">{inactive.length} inactivos</span>
        </div>
        {inactive.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            No hay colaboradores inactivos en el sistema.
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
                  <th>Fecha de baja</th>
                  <th>Última renovación</th>
                  <th>Próxima renovación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inactive.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.name}</td>
                    <td>{e.service}</td>
                    <td>{e.hireDate}</td>
                    <td>
                      <span className="tag tag-danger">{e.deactivationDate}</span>
                    </td>
                    <td>{e.lastRenewalDate || "N/A"}</td>
                    <td>{e.nextRenewalDate || "N/A"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          className="link-button"
                          onClick={() => setSelectedEmployee(e)}
                        >
                          Ver detalles
                        </button>
                        {isAdmin && (
                          <button
                            className="link-button"
                            onClick={() => handleReactivate(e.id)}
                          >
                            Reactivar
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

      {selectedEmployee && (
        <div className="modal-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Ficha de colaborador inactivo {selectedEmployee.id}</h2>
                <p>Información completa del colaborador dado de baja.</p>
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
                  <label>Fecha de baja</label>
                  <div>
                    <span className="tag tag-danger">
                      {selectedEmployee.deactivationDate}
                    </span>
                  </div>
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
                          No hay historial de equipo asignado disponible.
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
              {isAdmin && (
                <button
                  className="btn primary"
                  onClick={() => {
                    handleReactivate(selectedEmployee.id);
                    setSelectedEmployee(null);
                  }}
                >
                  Reactivar colaborador
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

