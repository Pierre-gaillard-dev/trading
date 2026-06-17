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
          name: 'shared:utils',
          include: ['src/utils/**/*.test.ts'],
        },
      },
    ],
  },
});
