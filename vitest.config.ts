import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    include: ["src/**/*.test.ts", "worker/**/*.test.ts"],
    // WebSockets mit Durable Objects gehen laut Cloudflare nur mit gemeinsamem Speicher.
    maxWorkers: 1,
    isolate: false,
  },
});
