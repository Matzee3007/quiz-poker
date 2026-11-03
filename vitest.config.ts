import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // Die Tests eröffnen viele Räume, die Grenze selbst prüft ein eigener Test.
      miniflare: { bindings: { RAEUME_PRO_STUNDE: "100000" } },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "worker/**/*.test.ts"],
    // WebSockets mit Durable Objects gehen laut Cloudflare nur mit gemeinsamem Speicher.
    maxWorkers: 1,
    isolate: false,
  },
});
