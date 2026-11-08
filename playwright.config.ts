import { defineConfig, devices } from "@playwright/test";

/** Testa o site exportado em out/, como em produção. Rode npm run build antes. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    ...devices["Pixel 5"],
    viewport: { width: 360, height: 740 },
    locale: "pt-BR",
  },
  webServer: {
    command: "node e2e/servidor.mjs",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
});
