import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Le front appelle "/api/..." et Vite relaie vers le backend → pas de souci de CORS.
    proxy: {
      '/api': 'http://localhost:3001',
      // WebSocket des données de marché (ws: true = on relaie l'upgrade WebSocket).
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
