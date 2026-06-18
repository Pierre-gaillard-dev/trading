import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/testing/**', 'src/index.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'api:routes',
          include: ['src/routes/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api:auth',
          include: ['src/auth/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api:binance',
          include: ['src/services/binance/**/*.test.ts'],
        },
      },
    ],
  },
});
