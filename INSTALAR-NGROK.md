# 🚀 Guía de Instalación de ngrok

## 📥 Paso 1: Descargar ngrok

1. Ve a: https://ngrok.com/download
2. Selecciona **Windows** (64-bit)
3. Descarga el archivo ZIP

---

## 📦 Paso 2: Extraer ngrok

1. Extrae el archivo ZIP que descargaste
2. Copia el archivo `ngrok.exe` a una carpeta permanente, por ejemplo:
   - `C:\ngrok\ngrok.exe`
   - O `C:\Program Files\ngrok\ngrok.exe`

---

## 🔧 Paso 3: Agregar ngrok al PATH

### Opción A: Desde la Interfaz de Windows (Recomendado)

1. **Busca "Variables de entorno" en el menú de inicio**
2. **Haz clic en "Editar las variables de entorno del sistema"**
3. **Haz clic en "Variables de entorno"**
4. **En "Variables del sistema", busca "Path" y haz clic en "Editar"**
5. **Haz clic en "Nuevo"**
6. **Agrega la ruta donde está ngrok.exe** (ejemplo: `C:\ngrok`)
7. **Haz clic en "Aceptar" en todas las ventanas**

### Opción B: Desde PowerShell (Como Administrador)

```powershell
# Reemplaza C:\ngrok con la ruta donde guardaste ngrok.exe
$ngrokPath = "C:\ngrok"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$ngrokPath", [EnvironmentVariableTarget]::Machine)
```

---

## ✅ Paso 4: Verificar la Instalación

Abre una **nueva** terminal (PowerShell o CMD) y ejecuta:

```bash
ngrok version
```

Si ves la versión, ¡está instalado correctamente!

---

## 🔑 Paso 5: Configurar tu Token de ngrok

1. **Crea una cuenta en ngrok** (si no tienes): https://dashboard.ngrok.com/signup
2. **Copia tu token de autenticación** desde: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Ejecuta en la terminal:**
   ```bash
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

---

## 🎯 Paso 6: Usar ngrok con tu Aplicación

Una vez configurado, puedes usar los scripts que creé para iniciar ngrok automáticamente.

---

## 📝 Notas

- Necesitas reiniciar la terminal después de agregar al PATH
- El token de ngrok es gratuito pero necesitas crear una cuenta
- La versión gratuita tiene algunas limitaciones pero es suficiente para desarrollo


