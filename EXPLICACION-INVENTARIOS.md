# 📦 Explicación: Cómo Funcionan los 3 Inventarios en la Base de Datos

## ✅ Respuesta Corta

**NO necesitas tablas separadas.** El sistema usa **una sola tabla** con un campo `site` que diferencia entre los 3 almacenes. Esto es más eficiente y es la forma correcta de hacerlo.

---

## 🗄️ Estructura Actual de la Base de Datos

### Tabla: `inventory_items`

```sql
CREATE TABLE inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  size VARCHAR(50),
  stock_new INT DEFAULT 0,
  stock_recovered INT DEFAULT 0,
  stock_min INT DEFAULT 0,
  site ENUM('CEDIS', 'ACUÑA', 'NLD') NOT NULL,  -- 👈 Este campo separa los inventarios
  status ENUM('En Stock', 'Reordenar', 'Agotado') DEFAULT 'En Stock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_item_site (code, site)  -- 👈 Un mismo código puede existir en diferentes sitios
);
```

### 🔑 Punto Clave: `UNIQUE KEY unique_item_site (code, site)`

Esto significa:
- ✅ El mismo código (ej: `TS-0001`) **PUEDE existir** en CEDIS, ACUÑA y NLD
- ✅ Pero **NO puede haber duplicados** del mismo código en el mismo sitio
- ✅ Cada almacén tiene su propio inventario completamente independiente

---

## 📊 Ejemplo de Datos en la Tabla

| id | code    | description        | stock_new | stock_recovered | site  | status     |
|----|---------|-------------------|-----------|-----------------|-------|------------|
| 1  | TS-0001 | Chaleco táctico   | 50        | 10              | CEDIS | En Stock   |
| 2  | TS-0001 | Chaleco táctico   | 30        | 5               | ACUÑA | En Stock   |
| 3  | TS-0001 | Chaleco táctico   | 25        | 8               | NLD   | En Stock   |
| 4  | TS-0002 | Botas tácticas    | 20        | 3               | CEDIS | En Stock   |
| 5  | TS-0002 | Botas tácticas    | 15        | 2               | ACUÑA | Reordenar  |

**Como puedes ver:**
- `TS-0001` existe en los 3 almacenes con stocks diferentes
- Cada almacén tiene su propio stock independiente
- No hay mezcla de datos entre almacenes

---

## 🔍 Cómo se Filtran los Datos

### 1. Cuando un usuario de CEDIS consulta su inventario:

```sql
SELECT * FROM inventory_items WHERE site = 'CEDIS'
```

**Resultado:** Solo ve items con `site = 'CEDIS'`

### 2. Cuando un usuario de ACUÑA consulta su inventario:

```sql
SELECT * FROM inventory_items WHERE site = 'ACUÑA'
```

**Resultado:** Solo ve items con `site = 'ACUÑA'`

### 3. Cuando el Admin consulta un inventario específico:

```sql
SELECT * FROM inventory_items WHERE site = 'CEDIS'  -- o 'ACUÑA' o 'NLD'
```

**Resultado:** Ve el inventario del sitio que seleccione

---

## 🛡️ Seguridad y Separación

### Control de Acceso en el Backend:

```javascript
// Si el usuario NO es Admin
if (req.user.role !== 'Admin') {
  const roleSiteMap = {
    'AlmacenCedis': 'CEDIS',
    'AlmacenAcuna': 'ACUÑA',
    'AlmacenNld': 'NLD'
  };
  
  // Solo puede ver su propio inventario
  query += ' WHERE site = ?';
  params.push(roleSiteMap[req.user.role]);
}
```

**Esto garantiza que:**
- ✅ Usuario de CEDIS solo ve CEDIS
- ✅ Usuario de ACUÑA solo ve ACUÑA
- ✅ Usuario de NLD solo ve NLD
- ✅ Admin ve todos según lo que seleccione

---

## 📋 Otras Tablas que También Usan `site`

### 1. `entries` (Entradas)
```sql
CREATE TABLE entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  site ENUM('CEDIS', 'ACUÑA', 'NLD') NOT NULL,  -- 👈 Separa entradas por almacén
  total_items INT DEFAULT 0,
  created_by VARCHAR(100) NOT NULL,
  ...
);
```

### 2. `dispatches` (Salidas)
```sql
CREATE TABLE dispatches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  site ENUM('CEDIS', 'ACUÑA', 'NLD') NOT NULL,  -- 👈 Separa salidas por almacén
  ...
);
```

### 3. `recovery_items` (Recuperaciones)
```sql
CREATE TABLE recovery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recovery_id INT NOT NULL,
  destination ENUM('CEDIS', 'ACUÑA', 'NLD', 'Desecho') NOT NULL,  -- 👈 A dónde va el item
  ...
);
```

---

## ✅ Ventajas de Este Diseño

### 1. **Eficiencia**
- Una sola tabla es más rápida de consultar
- Menos tablas = menos complejidad
- Fácil de mantener

### 2. **Flexibilidad**
- Fácil agregar un nuevo almacén (solo agregar al ENUM)
- Consultas simples con `WHERE site = ?`
- Reportes consolidados fáciles

### 3. **Integridad de Datos**
- El `UNIQUE KEY (code, site)` previene duplicados
- Cada almacén tiene su propio stock
- No hay riesgo de mezclar datos

### 4. **Escalabilidad**
- Si en el futuro necesitas más almacenes, solo agregas al ENUM
- No necesitas crear nuevas tablas

---

## 🔄 Flujo de Datos

### Ejemplo: Usuario de CEDIS crea una entrada

1. **Frontend:** Usuario selecciona "CEDIS" (automático según su rol)
2. **Backend:** Verifica que el usuario tenga permiso para CEDIS
3. **Base de Datos:** Inserta en `entries` con `site = 'CEDIS'`
4. **Actualización de Stock:** Actualiza solo items con `site = 'CEDIS'`
5. **WebSocket:** Emite evento solo para sala `inventory-CEDIS`
6. **Frontend:** Solo usuarios viendo CEDIS reciben la actualización

**Resultado:** Los otros almacenes (ACUÑA y NLD) **NO se ven afectados**

---

## 📊 Consultas de Ejemplo

### Ver todos los inventarios (solo Admin):
```sql
SELECT site, COUNT(*) as total_items, 
       SUM(stock_new + stock_recovered) as total_stock
FROM inventory_items
GROUP BY site;
```

**Resultado:**
| site  | total_items | total_stock |
|-------|-------------|-------------|
| CEDIS | 150         | 5000        |
| ACUÑA | 120         | 3500        |
| NLD   | 100         | 2800        |

### Ver stock bajo por almacén:
```sql
SELECT site, code, description, 
       (stock_new + stock_recovered) as total_stock, 
       stock_min
FROM inventory_items
WHERE (stock_new + stock_recovered) <= stock_min
ORDER BY site, code;
```

---

## 🎯 Conclusión

**El diseño actual es correcto y eficiente:**

✅ **Una tabla** `inventory_items` con campo `site`  
✅ **Separación completa** de datos por almacén  
✅ **Seguridad** mediante filtros por rol  
✅ **Escalable** para futuros almacenes  
✅ **Eficiente** en consultas y mantenimiento  

**NO necesitas tablas separadas.** El sistema ya está diseñado correctamente para manejar los 3 inventarios de forma independiente.

---

## 🔧 Si Quieres Verificar los Datos

### Ver todos los items de CEDIS:
```sql
SELECT * FROM inventory_items WHERE site = 'CEDIS';
```

### Ver todos los items de ACUÑA:
```sql
SELECT * FROM inventory_items WHERE site = 'ACUÑA';
```

### Ver todos los items de NLD:
```sql
SELECT * FROM inventory_items WHERE site = 'NLD';
```

### Ver distribución de inventario:
```sql
SELECT site, 
       COUNT(*) as total_items,
       SUM(stock_new + stock_recovered) as total_stock
FROM inventory_items
GROUP BY site;
```


