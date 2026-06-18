import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/testing/**', 'src/index.ts'],
    },
  },
});
