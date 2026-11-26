import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta no browser: web + API + Postgres verdadeiros.
 *
 * - No CI: arranca a API compilada e o `next start` (o build tem de vir antes,
 *   com NEXT_PUBLIC_API_URL=http://localhost:3001).
 * - Em casa: se já tiveres `pnpm dev` a correr, usa esses servidores; senão arranca-os.
 *   Precisa do Postgres (pnpm db:up) e do .env na raiz.
 */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: CI ? "node dist/main.js" : "pnpm dev",
      cwd: "../api",
      url: "http://localhost:3001/health",
      reuseExistingServer: !CI,
      timeout: 120_000,
      env: { PORT: "3001" },
    },
    {
      command: CI ? "pnpm start" : "pnpm dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
});
