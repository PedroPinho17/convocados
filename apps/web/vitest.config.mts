import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Testes de componentes (jsdom). Os testes no browser a sério estão em e2e/ (Playwright). */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    env: { TZ: "Europe/Lisbon" },
    coverage: {
      provider: "v8",
      include: ["src/components/**", "src/lib/**"],
      reporter: ["text-summary", "json-summary"],
    },
  },
});
