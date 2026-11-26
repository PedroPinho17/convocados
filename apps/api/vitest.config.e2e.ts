import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Registar contas usa scrypt (lento de propósito).
    testTimeout: 20_000,
    // O teste de concorrência regista 20 contas do mesmo IP; o limite de pedidos tem testes próprios.
    env: { RATE_LIMIT_DISABLED: 'true' },
    // Um ficheiro de cada vez: cada um arranca a app, que corre as migrações; em paralelo,
    // numa base de dados vazia (CI), as migrações colidem.
    fileParallelism: false,
  },
});
