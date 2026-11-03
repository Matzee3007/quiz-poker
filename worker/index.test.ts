import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Worker", () => {
  it("meldet unter /api/health, dass der Server läuft", async () => {
    const antwort = await exports.default.fetch(
      "https://quiz-poker.test/api/health",
    );

    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toEqual({ status: "ok" });
  });

  it("antwortet auf unbekannte API-Pfade mit 404", async () => {
    const antwort = await exports.default.fetch(
      "https://quiz-poker.test/api/gibt-es-nicht",
    );
    await antwort.text();

    expect(antwort.status).toBe(404);
  });
});
