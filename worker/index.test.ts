import { describe, expect, it } from "vitest";
import worker from "./index";

describe("Worker", () => {
  it("meldet unter /api/health, dass der Server läuft", async () => {
    const antwort = await worker.fetch(
      new Request("https://quiz-poker.test/api/health"),
    );

    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toEqual({ status: "ok" });
  });

  it("antwortet auf unbekannte API-Pfade mit 404", async () => {
    const antwort = await worker.fetch(
      new Request("https://quiz-poker.test/api/gibt-es-nicht"),
    );

    expect(antwort.status).toBe(404);
  });
});
