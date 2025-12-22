import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Acepta conexiones desde cualquier IP (incluyendo tu celular)
    port: 5173,
  },
});





