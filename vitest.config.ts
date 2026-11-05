import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          // Die Tests eröffnen viele Räume, die Grenze selbst prüft ein eigener Test.
          RAEUME_PRO_STUNDE: "100000",
          BETTER_AUTH_URL: "https://quiz-poker.test",
          BETTER_AUTH_SECRET: "nur-fuer-tests-nur-fuer-tests-nur-fuer-tests",
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "worker/**/*.test.ts"],
    setupFiles: ["./worker/testsetup.ts"],
    // WebSockets mit Durable Objects gehen laut Cloudflare nur mit gemeinsamem Speicher.
    maxWorkers: 1,
    isolate: false,
  },
}));
