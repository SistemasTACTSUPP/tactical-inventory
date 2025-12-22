# 🚀 Guía de Configuración del Backend

## Pasos para configurar el backend

### 1. ✅ Instalar MySQL

Si no tienes MySQL instalado:

**Opción A: MySQL Community Server**
- Descarga desde: https://dev.mysql.com/downloads/mysql/
- Instala MySQL Server
- Durante la instalación, configura una contraseña para el usuario `root`

**Opción B: XAMPP (más fácil)**
- Descarga desde: https://www.apachefriends.org/
- Instala XAMPP (incluye MySQL)
- Inicia MySQL desde el panel de control de XAMPP

### 2. ✅ Verificar que MySQL esté corriendo

Abre MySQL Workbench o la línea de comandos y verifica que puedas conectarte:
```bash
mysql -u root -p
```

Si te pide contraseña, ingrésala. Si no tienes contraseña, presiona Enter.

### 3. ✅ Configurar el archivo .env

El archivo `.env` ya está creado. Si necesitas cambiar la contraseña de MySQL, edítalo:

```env
DB_PASSWORD=tu_contraseña_aqui
```

Si no tienes contraseña, déjalo vacío:
```env
DB_PASSWORD=
```

### 4. ✅ Instalar dependencias del backend

```bash
cd backend
npm install
```

### 5. ✅ Crear la base de datos

Ejecuta el script de migración:
```bash
npm run migrate
```

O manualmente desde MySQL:
```sql
mysql -u root -p < src/database/schema.sql
```

### 6. ✅ (Opcional) Migrar datos iniciales de CEDIS

Si quieres cargar los datos reales de CEDIS:
```bash
node src/database/seed-cedis-simple.js
```

### 7. ✅ Iniciar el servidor

```bash
npm run dev
```

El servidor debería iniciar en `http://localhost:3001`

## 🔍 Solución de Problemas

### Error: "Failed to Connect to MySQL"

**Causas posibles:**
1. MySQL no está corriendo
   - **Solución:** Inicia MySQL desde XAMPP o como servicio de Windows

2. Puerto incorrecto
   - **Solución:** Verifica que MySQL esté en el puerto 3306 (por defecto)

3. Usuario/contraseña incorrectos
   - **Solución:** Verifica el archivo `.env`

4. MySQL no está instalado
   - **Solución:** Instala MySQL o XAMPP

### Verificar que MySQL esté corriendo en Windows:

```powershell
# Ver servicios de MySQL
Get-Service -Name "*mysql*"

# O verificar el puerto
netstat -an | findstr 3306
```

### Iniciar MySQL manualmente (XAMPP):
1. Abre XAMPP Control Panel
2. Haz clic en "Start" junto a MySQL
3. Espera a que el estado cambie a "Running"

## ✅ Checklist de Configuración

- [ ] MySQL instalado y corriendo
- [ ] Archivo `.env` configurado con las credenciales correctas
- [ ] Dependencias instaladas (`npm install`)
- [ ] Base de datos creada (`npm run migrate`)
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Servidor responde en `http://localhost:3001/api/health`

## 📝 Próximos Pasos

Una vez que el backend esté funcionando:
1. Conectar el frontend al backend
2. Probar los endpoints
3. Migrar datos desde localStorage


