# 🚀 Cómo Iniciar el Backend Manualmente

## Pasos para Iniciar el Backend

### 1. Abre una terminal (PowerShell o CMD)

### 2. Navega a la carpeta del backend:
```bash
cd "C:\Users\Tactical_IT_2\Desktop\Nueva carpeta\backend"
```

### 3. Inicia el servidor:
```bash
npm run dev
```

### 4. Verifica que esté corriendo:
Deberías ver un mensaje como:
```
🚀 Servidor corriendo en http://localhost:3001
📡 WebSocket disponible en ws://localhost:3001
```

---

## ✅ Verificar que el Backend Está Funcionando

Abre tu navegador y ve a:
```
http://localhost:3001/api/health
```

Deberías ver un mensaje JSON indicando que el servidor está funcionando.

---

## 🛑 Para Detener el Backend

Presiona `Ctrl + C` en la terminal donde está corriendo.

---

## 📝 Notas

- El backend debe estar corriendo antes de iniciar el frontend
- El puerto por defecto es 3001
- Si el puerto está ocupado, verás un error. En ese caso, detén el proceso que lo está usando.


