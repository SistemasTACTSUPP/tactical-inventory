import { useState, useEffect } from "react";

interface CountItem {
  code: string;
  description: string;
  size?: string;
  theoreticalStock: number;
  physicalCount: number;
  difference: number;
}

interface DailyInventoryRecord {
  id: number;
  date: string;
  assignedTo: string;
  completedBy: string;
  completedAt?: string;
  totalItems: number;
  itemsWithDifferences: number;
  items: CountItem[];
}

// Función para obtener el historial desde localStorage
const getHistoryFromStorage = (): DailyInventoryRecord[] => {
  try {
    const stored = localStorage.getItem("cyclic_inventory_history");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convertir el formato de DailyInventory a DailyInventoryRecord
      return parsed.map((task: any) => ({
        id: task.id,
        date: task.date,
        assignedTo: task.assignedTo,
        completedBy: task.completedBy || "Almacen CEDIS",
        completedAt: task.completedAt,
        totalItems: task.items.length,
        itemsWithDifferences: task.items.filter((item: any) => item.difference !== 0).length,
        items: task.items.map((item: any) => ({
          code: item.code,
          description: item.description,
          size: item.size,
          theoreticalStock: item.theoreticalStock,
          physicalCount: item.physicalCount || 0,
          difference: item.difference || 0,
        })),
      }));
    }
  } catch (e) {
    console.error("Error al cargar historial cíclico:", e);
  }
  return [];
};

export const DailyInventoryHistoryPage = () => {
  const [history, setHistory] = useState<DailyInventoryRecord[]>(getHistoryFromStorage);
  const [selectedRecord, setSelectedRecord] = useState<DailyInventoryRecord | null>(null);
  
  // Actualizar historial cuando cambie localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = getHistoryFromStorage();
      setHistory(updated);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Historial de inventario cíclico</h1>
          <p>
            Consulta el registro de todos los conteos físicos realizados en CEDIS.
            Solo visible para CEDIS y administradores.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Registros de conteo</h2>
          <span className="tag">{history.length} registros</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Asignado a</th>
                <th>Completado por</th>
                <th>Total artículos</th>
                <th>Con diferencias</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    No hay registros de conteo en el historial.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id}>
                    <td>CI-{record.id}</td>
                    <td>{record.date}</td>
                    <td>{record.assignedTo}</td>
                    <td>{record.completedBy}</td>
                    <td>{record.totalItems}</td>
                    <td>
                      {record.itemsWithDifferences > 0 ? (
                        <span className="tag tag-warning">
                          {record.itemsWithDifferences}
                        </span>
                      ) : (
                        <span className="tag tag-success">0</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="link-button"
                        onClick={() => setSelectedRecord(record)}
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
      </div>

      {selectedRecord && (
        <div className="modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px" }}>
            <div className="modal-header">
              <div>
                <h2>Detalles de conteo CI-{selectedRecord.id}</h2>
                <p>Información completa del conteo físico realizado.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedRecord(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Fecha</label>
                  <div>{selectedRecord.date}</div>
                </div>
                <div className="form-field">
                  <label>Asignado a</label>
                  <div>{selectedRecord.assignedTo}</div>
                </div>
                <div className="form-field">
                  <label>Completado por</label>
                  <div>{selectedRecord.completedBy}</div>
                </div>
                <div className="form-field">
                  <label>Total artículos</label>
                  <div>{selectedRecord.totalItems}</div>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Resultados del conteo
                </h3>
                <div className="table-wrapper compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Talla</th>
                        <th>Stock teórico</th>
                        <th>Conteo físico</th>
                        <th>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.code}</td>
                          <td>{item.description}</td>
                          <td>{item.size || "N/A"}</td>
                          <td>{item.theoreticalStock}</td>
                          <td>{item.physicalCount}</td>
                          <td>
                            <span
                              className={
                                item.difference === 0
                                  ? "tag tag-success"
                                  : item.difference > 0
                                  ? "tag tag-warning"
                                  : "tag tag-danger"
                              }
                            >
                              {item.difference > 0 ? "+" : ""}
                              {item.difference}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setSelectedRecord(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

