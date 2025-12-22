# 🚀 Guía Rápida: ngrok

## 📋 Pasos Rápidos

### 1. Instalar ngrok

**Opción A: Automático (Recomendado)**
```powershell
# Ejecutar PowerShell como Administrador
.\instalar-ngrok-completo.ps1
```

**Opción B: Manual**
1. Descarga: https://ngrok.com/download
2. Extrae `ngrok.exe` a `C:\ngrok`
3. Agrega `C:\ngrok` al PATH del sistema
4. Reinicia la terminal

### 2. Autenticarse

1. Crea cuenta: https://dashboard.ngrok.com/signup
2. Obtén token: https://dashboard.ngrok.com/get-started/your-authtoken
3. Ejecuta:
   ```bash
   ngrok config add-authtoken TU_TOKEN
   ```

### 3. Usar ngrok

**Opción A: Script automático**
```bash
.\start-ngrok.bat
```

**Opción B: Manual**
```bash
# Terminal 1: Frontend
ngrok http 5173

# Terminal 2: Backend
ngrok http 3001
```

### 4. Configurar variables de entorno

```bash
.\config-ngrok-env.bat
```

Este script te pedirá las URLs de ngrok y configurará automáticamente:
- `frontend/.env` → `VITE_API_URL`
- `backend/.env` → `CORS_ORIGIN`

### 5. Reiniciar servidores

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 6. Acceder desde tu celular

Usa la URL de ngrok del frontend que aparece en la ventana de ngrok.

---

## 🔍 Verificar Instalación

```bash
ngrok version
```

Si muestra la versión, está instalado correctamente.

---

## ⚠️ Notas Importantes

- **Cuenta gratuita**: Tiene límites pero es suficiente para desarrollo
- **URLs temporales**: Las URLs de ngrok cambian cada vez que reinicias (a menos que uses plan de pago)
- **Reiniciar servidores**: Después de configurar las variables de entorno, reinicia backend y frontend

---

## 🐛 Solución de Problemas

### "ngrok no se reconoce como comando"
- Verifica que esté en el PATH
- Reinicia la terminal
- Ejecuta: `instalar-ngrok-completo.ps1` como administrador

### "Error de autenticación"
- Verifica tu token en: https://dashboard.ngrok.com/get-started/your-authtoken
- Ejecuta: `ngrok config add-authtoken TU_TOKEN`

### "No puedo acceder desde el celular"
- Verifica que ambas ventanas de ngrok estén corriendo
- Verifica que las URLs estén correctas en los archivos .env
- Reinicia backend y frontend después de cambiar .env


