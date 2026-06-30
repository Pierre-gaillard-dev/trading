import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/testing/**', 'src/index.ts'],
    },
  },
});
