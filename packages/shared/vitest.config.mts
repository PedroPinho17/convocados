import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    // Datas e horas em Portugal, como os utilizadores (e igual no CI, que corre em UTC).
    env: { TZ: 'Europe/Lisbon' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
