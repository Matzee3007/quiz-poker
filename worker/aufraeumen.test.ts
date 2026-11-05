import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "./index";
import { BASIS } from "./testhilfen";

const STUNDE = 60 * 60 * 1000;

function aufraeumen(jetzt: number) {
  return worker.scheduled({ scheduledTime: jetzt } as ScheduledController, env);
}

async function zaehlerEintragen(key: string, lastRequest: number) {
  await env.DB.prepare(
    'INSERT INTO "rateLimit" (id, key, count, lastRequest) VALUES (?, ?, 1, ?)',
  )
    .bind(crypto.randomUUID(), key, lastRequest)
    .run();
}

async function zaehlerDa(key: string) {
  const zeile = await env.DB.prepare('SELECT id FROM "rateLimit" WHERE key = ?')
    .bind(key)
    .first();
  return zeile !== null;
}

async function linkEintragen(hash: string, gueltigBis: number) {
  await env.DB.prepare(
    "INSERT INTO passwort_link (token_hash, email, gueltig_bis) VALUES (?, 'a@beispiel.test', ?)",
  )
    .bind(hash, gueltigBis)
    .run();
}

async function linkDa(hash: string) {
  const zeile = await env.DB.prepare(
    "SELECT email FROM passwort_link WHERE token_hash = ?",
  )
    .bind(hash)
    .first();
  return zeile !== null;
}

describe("Daten sparsam halten", () => {
  it("speichert beim Abruf der Sitzung keine IP-Adresse", async () => {
    const ip = "192.0.2.77";
    const antwort = await exports.default.fetch(
      `${BASIS}/api/auth/get-session`,
      { headers: { "cf-connecting-ip": ip } },
    );
    await antwort.text();

    const { results } = await env.DB.prepare(
      'SELECT key FROM "rateLimit" WHERE key LIKE ?',
    )
      .bind(`${ip}|%`)
      .all();
    expect(results).toEqual([]);
  });

  it("löscht Zähler, die älter als einen Tag sind, und behält neuere", async () => {
    const jetzt = Date.now();
    await zaehlerEintragen("192.0.2.1|/sign-in/email", jetzt - 25 * STUNDE);
    await zaehlerEintragen("192.0.2.2|/sign-in/email", jetzt - 23 * STUNDE);

    await aufraeumen(jetzt);

    expect(await zaehlerDa("192.0.2.1|/sign-in/email")).toBe(false);
    expect(await zaehlerDa("192.0.2.2|/sign-in/email")).toBe(true);
  });

  it("löscht abgelaufene Links samt Adresse und behält gültige", async () => {
    const jetzt = Date.now();
    await linkEintragen("abgelaufen", jetzt - STUNDE);
    await linkEintragen("gueltig", jetzt + STUNDE);

    await aufraeumen(jetzt);

    expect(await linkDa("abgelaufen")).toBe(false);
    expect(await linkDa("gueltig")).toBe(true);
  });
});
