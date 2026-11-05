import { env, exports } from "cloudflare:workers";
import { getMigrations } from "better-auth/db/migration";
import { describe, expect, it } from "vitest";
import { auth } from "./auth";

const BASIS = "https://quiz-poker.test";

function anAuth(pfad: string, daten?: unknown) {
  return exports.default.fetch(`${BASIS}/api/auth${pfad}`, {
    method: daten === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Origin: BASIS },
    body: daten === undefined ? undefined : JSON.stringify(daten),
  });
}

describe("Better Auth", () => {
  it("findet alle Tabellen und Spalten, die es erwartet", async () => {
    const { toBeCreated, toBeAdded } = await getMigrations(auth.options);

    expect(toBeCreated).toEqual([]);
    expect(toBeAdded).toEqual([]);
  });

  it("lässt die Registrierung ohne Einladungscode nicht zu", async () => {
    const email = "ohne-einladung@beispiel.test";
    const antwort = await anAuth("/sign-up/email", {
      email,
      password: "geheim-123",
      name: "Quiz-Master",
    });
    await antwort.text();

    expect(antwort.status).toBe(404);
    const konto = await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
      .bind(email)
      .first();
    expect(konto).toBeNull();
  });

  it("kennt ohne Anmeldung keine Sitzung", async () => {
    const antwort = await anAuth("/get-session");

    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toBeNull();
  });
});
