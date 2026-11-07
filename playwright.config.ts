// Browser-Durchlauf: npm run test:browser. Läuft gegen den lokalen Server, siehe docs/tools/Playwright.md.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./browser",
  // Ein Durchlauf legt ein Konto an und arbeitet damit nacheinander.
  workers: 1,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/api/health",
    reuseExistingServer: true,
  },
});
