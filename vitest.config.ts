import { defineConfig } from 'vitest/config';

/**
 * Config Vitest du monorepo : un seul `vitest run` à la racine exécute (et groupe)
 * les tests des trois packages testés. Chaque package garde sa propre config
 * (nom + réglages) ; elle est référencée ici comme un « projet ».
 *
 * - `pnpm test` (racine)            → tout, groupé par projet (core, shared, api)
 * - `pnpm --filter @trading/api test` → uniquement ce package (sa config locale)
 *
 * apps/web n'a pas de tests Vitest (Playwright pour l'E2E) → volontairement absent.
 */
export default defineConfig({
  test: {
    projects: ['packages/core', 'packages/shared', 'apps/api'],
    coverage: {
      provider: 'v8',
      // Code de production uniquement (exclut tests, test doubles et points d'entrée).
      include: ['packages/*/src/**/*.ts', 'apps/api/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/testing/**', '**/src/index.ts'],
    },
  },
});
