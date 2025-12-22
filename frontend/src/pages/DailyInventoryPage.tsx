import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

interface CountItem {
  id: number;
  code: string;
  description: string;
  size?: string;
  theoreticalStock: number;
  physicalCount?: number;
  difference?: number;
}

interface DailyInventory {
  id: number;
  date: string;
  assignedTo: string;
  status: "Pendiente" | "Completado";
  items: CountItem[];
  completedAt?: string;
  completedBy?: string;
}

interface InventoryItem {
  id: number;
  code: string;
  description: string;
  size?: string;
  stockNew: number;
  stockRecovered: number;
  stockMin: number;
}

// Función para obtener el inventario de CEDIS desde localStorage
const getCedisInventory = (): InventoryItem[] => {
  try {
    const stored = localStorage.getItem("inventory_CEDIS");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error al cargar inventario CEDIS:", e);
  }
  return [];
};

// Función para obtener artículos aleatorios del inventario
const getRandomItems = (inventory: InventoryItem[], count: number = 10): CountItem[] => {
  if (inventory.length === 0) return [];
  
  // Mezclar y tomar los primeros 'count' artículos
  const shuffled = [...inventory].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  
  return selected.map((item, index) => ({
    id: index + 1,
    code: item.code,
    description: item.description,
    size: item.size,
    theoreticalStock: item.stockNew + item.stockRecovered,
  }));
};

// Función para obtener el inicio de la semana (lunes)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea día 1
  return new Date(d.setDate(diff));
};

// Función para generar 2 días aleatorios de la semana actual
const generateWeeklyCyclicDays = (weekStart: Date): string[] => {
  const days: string[] = [];
  const usedDays = new Set<number>();
  
  // Generar 2 días aleatorios diferentes (lunes a viernes, excluyendo sábado y domingo)
  while (days.length < 2) {
    const randomDay = Math.floor(Math.random() * 5); // 0-4 (lunes a viernes)
    if (!usedDays.has(randomDay)) {
      usedDays.add(randomDay);
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + randomDay);
      days.push(date.toISOString().slice(0, 10));
    }
  }
  
  return days.sort();
};

// Función para obtener las tareas de la semana desde localStorage
const getWeeklyTasksFromStorage = (): DailyInventory[] => {
  try {
    const stored = localStorage.getItem("cyclic_inventory_tasks");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error al cargar tareas cíclicas:", e);
  }
  return [];
};

// Función para guardar las tareas en localStorage
const saveWeeklyTasksToStorage = (tasks: DailyInventory[]) => {
  try {
    localStorage.setItem("cyclic_inventory_tasks", JSON.stringify(tasks));
  } catch (e) {
    console.error("Error al guardar tareas cíclicas:", e);
  }
};

// Función para obtener el historial desde localStorage
const getHistoryFromStorage = (): DailyInventory[] => {
  try {
    const stored = localStorage.getItem("cyclic_inventory_history");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error al cargar historial cíclico:", e);
  }
  return [];
};

// Función para guardar en historial
const saveToHistory = (task: DailyInventory) => {
  try {
    const history = getHistoryFromStorage();
    const updated = [task, ...history];
    localStorage.setItem("cyclic_inventory_history", JSON.stringify(updated));
  } catch (e) {
    console.error("Error al guardar en historial:", e);
  }
};

export const DailyInventoryPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const userRole = user?.role || null;
  
  const today = new Date().toISOString().slice(0, 10);
  const [weeklyTasks, setWeeklyTasks] = useState<DailyInventory[]>(getWeeklyTasksFromStorage);
  const [items, setItems] = useState<CountItem[]>([]);
  
  // Inicializar tareas semanales automáticamente al inicio de cada semana
  useEffect(() => {
    if (isAdmin) {
      const today = new Date();
      const weekStart = getWeekStart(today);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      
      // Verificar si ya hay tareas para esta semana
      const hasTasksForThisWeek = weeklyTasks.some((task) => {
        const taskDate = new Date(task.date);
        const taskWeekStart = getWeekStart(taskDate);
        return taskWeekStart.toISOString().slice(0, 10) === weekStartStr;
      });
      
      if (!hasTasksForThisWeek) {
        const inventory = getCedisInventory();
        
        if (inventory.length === 0) {
          console.warn("No hay artículos en el inventario de CEDIS para generar conteo cíclico");
          return;
        }
        
        const days = generateWeeklyCyclicDays(weekStart);
        const newTasks: DailyInventory[] = days.map((date, index) => ({
          id: Date.now() + index,
          date,
          assignedTo: "AlmacenCedis",
          status: "Pendiente",
          items: getRandomItems(inventory, 10),
        }));
        
        setWeeklyTasks((prev) => {
          const updated = [...prev, ...newTasks];
          saveWeeklyTasksToStorage(updated);
          return updated;
        });
      }
    }
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Obtener la tarea del día actual
  const todayTask = useMemo(() => {
    return weeklyTasks.find((task) => task.date === today && task.status === "Pendiente");
  }, [weeklyTasks, today]);
  
  // Inicializar items cuando hay una tarea del día
  useEffect(() => {
    if (todayTask) {
      setItems(
        todayTask.items.map((item) => ({
          ...item,
          physicalCount: undefined,
          difference: undefined,
        }))
      );
    } else {
      setItems([]);
    }
  }, [todayTask]);

  const handleCountChange = (itemId: number, count: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const difference = count - item.theoreticalStock;
          return { ...item, physicalCount: count, difference };
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    if (!todayTask) return;
    
    // Validar que se esté completando el mismo día
    if (todayTask.date !== today) {
      alert(`Esta tarea debe completarse el mismo día que fue asignada (${todayTask.date}). Hoy es ${today}.`);
      return;
    }
    
    // Validar que todos los conteos estén completos
    if (!allCounted) {
      alert("Debes completar el conteo físico de todos los artículos antes de guardar.");
      return;
    }
    
    const completedTask: DailyInventory = {
      ...todayTask,
      status: "Completado",
      items: items.map((item) => ({
        ...item,
        physicalCount: item.physicalCount || 0,
        difference: item.difference || 0,
      })),
      completedAt: new Date().toISOString(),
      completedBy: user?.name || "AlmacenCedis",
    };
    
    // Actualizar la tarea en weeklyTasks
    const updatedTasks = weeklyTasks.map((task) =>
      task.id === todayTask.id ? completedTask : task
    );
    setWeeklyTasks(updatedTasks);
    saveWeeklyTasksToStorage(updatedTasks);
    
    // Guardar en historial
    saveToHistory(completedTask);
    
    setItems([]);
    alert("Conteo guardado exitosamente. Se ha registrado en el historial.");
  };

  const handleGenerateWeeklyTasks = () => {
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    
    // Verificar si ya hay tareas para esta semana
    const existingTasksForWeek = weeklyTasks.filter((task) => {
      const taskDate = new Date(task.date);
      const taskWeekStart = getWeekStart(taskDate);
      return taskWeekStart.toISOString().slice(0, 10) === weekStartStr;
    });
    
    if (existingTasksForWeek.length > 0) {
      if (confirm(`Ya existen tareas para esta semana (${existingTasksForWeek.length}). ¿Deseas reemplazarlas?`)) {
        // Eliminar tareas existentes de esta semana
        const filteredTasks = weeklyTasks.filter((task) => {
          const taskDate = new Date(task.date);
          const taskWeekStart = getWeekStart(taskDate);
          return taskWeekStart.toISOString().slice(0, 10) !== weekStartStr;
        });
        
        const inventory = getCedisInventory();
        if (inventory.length === 0) {
          alert("No hay artículos en el inventario de CEDIS para generar el conteo.");
          return;
        }
        
        const days = generateWeeklyCyclicDays(weekStart);
        const newTasks: DailyInventory[] = days.map((date, index) => ({
          id: Date.now() + index,
          date,
          assignedTo: "AlmacenCedis",
          status: "Pendiente",
          items: getRandomItems(inventory, 10),
        }));
        
        const updated = [...filteredTasks, ...newTasks];
        setWeeklyTasks(updated);
        saveWeeklyTasksToStorage(updated);
        alert(`Se han generado 2 nuevas tareas de conteo para esta semana: ${days.join(", ")}`);
      }
    } else {
      const inventory = getCedisInventory();
      if (inventory.length === 0) {
        alert("No hay artículos en el inventario de CEDIS para generar el conteo.");
        return;
      }
      
      const days = generateWeeklyCyclicDays(weekStart);
      const newTasks: DailyInventory[] = days.map((date, index) => ({
        id: Date.now() + index,
        date,
        assignedTo: "AlmacenCedis",
        status: "Pendiente",
        items: getRandomItems(inventory, 10),
      }));
      
      const updated = [...weeklyTasks, ...newTasks];
      setWeeklyTasks(updated);
      saveWeeklyTasksToStorage(updated);
      alert(`Se han generado 2 tareas de conteo para esta semana: ${days.join(", ")}`);
    }
  };

  const allCounted = items.every((item) => item.physicalCount !== undefined);
  const hasDifferences = items.some((item) => item.difference !== 0 && item.difference !== undefined);

  // Vista para Admin
  if (isAdmin) {
    const pendingTasks = weeklyTasks.filter((t) => t.status === "Pendiente");
    const completedTasks = weeklyTasks.filter((t) => t.status === "Completado");
    
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Inventario cíclico</h1>
            <p>
              Sistema automático de conteo cíclico. Se generan 2 días aleatorios por semana
              con artículos aleatorios del inventario de CEDIS.
            </p>
          </div>
          <button className="btn primary" onClick={handleGenerateWeeklyTasks}>
            Generar tareas semanales
          </button>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Tareas de conteo cíclico</h2>
            <span className="tag">
              {pendingTasks.length} pendiente{pendingTasks.length !== 1 ? "s" : ""} |{" "}
              {completedTasks.length} completada{completedTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          {weeklyTasks.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
              <p>No hay tareas de conteo generadas para esta semana.</p>
              <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                Haz clic en "Generar tareas semanales" para crear 2 días aleatorios de conteo.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Artículos</th>
                    <th>Estado</th>
                    <th>Completado por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        {task.date}
                        {task.date === today && (
                          <span className="tag tag-warning" style={{ marginLeft: "0.5rem" }}>
                            Hoy
                          </span>
                        )}
                      </td>
                      <td>{task.items.length} artículos</td>
                      <td>
                        <span className={task.status === "Completado" ? "tag tag-success" : "tag tag-warning"}>
                          {task.status}
                        </span>
                      </td>
                      <td>{task.completedBy || "N/A"}</td>
                      <td>
                        {task.status === "Pendiente" && task.date === today && (
                          <span className="tag tag-success">Disponible para completar</span>
                        )}
                        {task.status === "Pendiente" && task.date !== today && (
                          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                            {new Date(task.date) < new Date(today) ? "Vencida" : "Pendiente"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista para AlmacenCedis
  if (userRole === "AlmacenCedis") {
    if (!todayTask) {
      return (
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Inventario cíclico</h1>
              <p>
                Realiza el conteo físico de los artículos asignados para hoy. El sistema
                calculará automáticamente las diferencias con el stock teórico.
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>No hay tarea de conteo para hoy</h2>
            </div>
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
              <p>
                No hay una tarea de conteo asignada para el día de hoy ({today}).
              </p>
              <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                Las tareas se generan automáticamente 2 días aleatorios por semana.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Inventario cíclico</h1>
            <p>
              Realiza el conteo físico de los artículos asignados para hoy ({today}).
              Debes completar este conteo antes de finalizar el día. El sistema calculará
              automáticamente las diferencias con el stock teórico.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Tarea de conteo del día</h2>
            <span className="tag tag-warning">Fecha: {todayTask.date}</span>
          </div>
          <div className="table-wrapper">
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.description}</td>
                    <td>{item.size || "N/A"}</td>
                    <td>{item.theoreticalStock}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={item.physicalCount ?? ""}
                        onChange={(e) =>
                          handleCountChange(item.id, Number(e.target.value) || 0)
                        }
                        style={{
                          width: "80px",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "0.4rem",
                          border: "1px solid rgba(148, 163, 184, 0.35)",
                          background: "rgba(15, 23, 42, 0.9)",
                          color: "#e5e7eb",
                        }}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      {item.difference !== undefined && (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "1rem", borderTop: "1px solid rgba(148, 163, 184, 0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {hasDifferences && (
                  <span className="tag tag-warning">
                    Se detectaron diferencias en el conteo
                  </span>
                )}
                {!hasDifferences && allCounted && (
                  <span className="tag tag-success">Conteo completo sin diferencias</span>
                )}
                {!allCounted && (
                  <span className="tag tag-warning">Completa todos los conteos</span>
                )}
              </div>
              <button
                className="btn primary"
                disabled={!allCounted}
                onClick={handleSave}
              >
                Finalizar conteo del día
              </button>
            </div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
              ⚠️ Este conteo debe completarse hoy ({today}). No podrás completarlo después.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventario cíclico</h1>
          <p>Esta sección solo está disponible para CEDIS y administradores.</p>
        </div>
      </div>
      <div className="panel">
        <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
          No tienes acceso a esta sección.
        </div>
      </div>
    </div>
  );
};
