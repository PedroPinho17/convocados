import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // O 1.º import do Nest/TypeORM + scrypt em paralelo passa dos 5s num runner de 2 cores.
    testTimeout: 20_000,
  },
});
