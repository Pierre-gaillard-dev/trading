import { defineConfig } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Avale les resets de socket bénins (ECONNRESET/EPIPE) du proxy WebSocket : quand
 * le navigateur ferme la connexion (reload, HMR, reconnexion après refresh du token),
 * http-proxy tente une dernière écriture dans une socket déjà fermée et déverse une
 * stack trace alors qu'il n'y a rien à corriger. On loggue alors une ligne discrète.
 */
const quietProxyResets: ProxyOptions['configure'] = (proxy) => {
  proxy.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
      console.warn(`[ws proxy] connexion fermée (${err.code})`);
      return;
    }
    console.error('[ws proxy]', err);
  });
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Le front appelle "/api/..." et Vite relaie vers le backend → pas de souci de CORS.
    proxy: {
      '/api': 'http://localhost:3001',
      // WebSocket des données de marché (ws: true = on relaie l'upgrade WebSocket).
      '/ws': { target: 'ws://localhost:3001', ws: true, configure: quietProxyResets },
    },
  },
});
