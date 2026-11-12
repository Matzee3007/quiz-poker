// Browser-Durchlauf: npm run test:browser. Läuft gegen den lokalen Server, siehe docs/tools/Playwright.md.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./browser",
  // Ein Durchlauf legt ein Konto an und arbeitet damit nacheinander.
  workers: 1,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /handy\.spec\.ts/,
    },
    // Spieler am Handy: Safari-Kern WebKit in Handybreite, siehe ADR 0010.
    {
      name: "handy",
      use: { ...devices["iPhone 13 Mini"] },
      testMatch: /handy\.spec\.ts/,
    },
  ],
  webServer: {
    // strictPort: Ist 5173 belegt, bricht Vite mit klarer Meldung ab, statt still auf einen anderen Port auszuweichen.
    command: "npx vite --strictPort",
    url: "http://localhost:5173/api/health",
    reuseExistingServer: true,
  },
});
