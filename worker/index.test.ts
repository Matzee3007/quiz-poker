import { evictDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
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

describe("Spielraum", () => {
  it("nimmt eine WebSocket-Verbindung an und antwortet nach dem Schlafen", async () => {
    const raum = env.SPIELRAUM.getByName("TEST");
    const antwort = await raum.fetch("https://quiz-poker.test/verbindung", {
      headers: { Upgrade: "websocket" },
    });
    const verbindung = antwort.webSocket;
    expect(verbindung).toBeTruthy();
    verbindung?.accept();

    await evictDurableObject(raum);

    const nachricht = new Promise<string>((erfuellt) => {
      verbindung?.addEventListener("message", (ereignis) => {
        erfuellt(ereignis.data as string);
      });
    });
    verbindung?.send("hallo");

    expect(JSON.parse(await nachricht)).toEqual({
      typ: "fehler",
      code: "ungueltige-nachricht",
    });
    verbindung?.close();
  });
});
