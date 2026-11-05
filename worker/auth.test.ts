import { env, exports } from "cloudflare:workers";
import { getMigrations } from "better-auth/db/migration";
import { describe, expect, it } from "vitest";
import { auth } from "./auth";
import { BASIS, cookieAus, kontoAnlegen, neueAdresse } from "./testhilfen";

const PASSWORT = "geheim-123";

function anAuth(
  pfad: string,
  daten?: unknown,
  kopf: Record<string, string> = {},
) {
  return exports.default.fetch(`${BASIS}/api/auth${pfad}`, {
    method: daten === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Origin: BASIS, ...kopf },
    body: daten === undefined ? undefined : JSON.stringify(daten),
  });
}

/** Die Tests teilen sich den Speicher. Eine eigene Adresse hält ihre Zähler getrennt. */
let letzteAdresse = 0;
function neueIp() {
  letzteAdresse += 1;
  return `203.0.113.${letzteAdresse}`;
}

function anmelden(
  email: string,
  passwort: string,
  ip: string,
  kopf: Record<string, string> = {},
) {
  return anAuth(
    "/sign-in/email",
    { email, password: passwort },
    { "cf-connecting-ip": ip, ...kopf },
  );
}

async function sitzung(cookie: string) {
  const antwort = await anAuth("/get-session", undefined, { Cookie: cookie });
  return antwort.json();
}

describe("Anmelden", () => {
  it("meldet mit richtigem Passwort für 30 Tage an", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);

    const antwort = await anmelden(email, PASSWORT, neueIp());
    await antwort.text();

    expect(antwort.status).toBe(200);
    expect(antwort.headers.getSetCookie().join("\n")).toContain(
      "Max-Age=2592000",
    );
    expect(await sitzung(cookieAus(antwort))).toMatchObject({
      user: { email },
    });
  });

  it("antwortet bei falschem Passwort und unbekannter Adresse gleich", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);

    const falsch = await anmelden(email, "falsch-123", neueIp());
    const unbekannt = await anmelden(neueAdresse(), PASSWORT, neueIp());

    expect(falsch.status).toBe(401);
    expect(unbekannt.status).toBe(401);
    expect(await falsch.json()).toEqual(await unbekannt.json());
  });

  it("speichert auch beim Anmelden weder IP-Adresse noch Browserkennung", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);

    const antwort = await anmelden(email, PASSWORT, neueIp(), {
      "User-Agent": "Testbrowser",
    });
    await antwort.text();

    const { results } = await env.DB.prepare(
      'SELECT s.ipAddress, s.userAgent FROM session s JOIN "user" u ON u.id = s.userId WHERE u.email = ?',
    )
      .bind(email)
      .all();
    expect(results).toHaveLength(2);
    for (const zeile of results) {
      expect(zeile).toEqual({ ipAddress: null, userAgent: null });
    }
  });

  it("begrenzt die Versuche je IP-Adresse auf 10 pro Minute", async () => {
    const ip = neueIp();
    for (let versuch = 0; versuch < 10; versuch++) {
      const antwort = await anmelden(neueAdresse(), PASSWORT, ip);
      await antwort.text();
      expect(antwort.status).toBe(401);
    }

    const elfter = await anmelden(neueAdresse(), PASSWORT, ip);
    await elfter.text();
    expect(elfter.status).toBe(429);

    const andereAdresse = await anmelden(neueAdresse(), PASSWORT, neueIp());
    await andereAdresse.text();
    expect(andereAdresse.status).toBe(401);
  });

  it("lässt sich mit einem gefälschten X-Forwarded-For nicht umgehen", async () => {
    const ip = neueIp();
    for (let versuch = 0; versuch < 10; versuch++) {
      const antwort = await anmelden(neueAdresse(), PASSWORT, ip, {
        "X-Forwarded-For": `198.51.100.${versuch}`,
      });
      await antwort.text();
    }

    const elfter = await anmelden(neueAdresse(), PASSWORT, ip, {
      "X-Forwarded-For": "198.51.100.200",
    });
    await elfter.text();
    expect(elfter.status).toBe(429);
  });

  it("beendet die Sitzung beim Abmelden", async () => {
    const cookie = await kontoAnlegen(neueAdresse(), PASSWORT);
    expect(await sitzung(cookie)).not.toBeNull();

    const antwort = await anAuth("/sign-out", {}, { Cookie: cookie });
    await antwort.text();

    expect(antwort.status).toBe(200);
    expect(await sitzung(cookie)).toBeNull();
  });
});

describe("Konto löschen", () => {
  it("verlangt das richtige Passwort", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);

    const antwort = await anAuth(
      "/delete-user",
      { password: "falsch-123" },
      { Cookie: cookie },
    );
    await antwort.text();

    expect(antwort.status).toBeGreaterThanOrEqual(400);
    expect(await sitzung(cookie)).toMatchObject({ user: { email } });
  });

  it("löscht Konto und Sitzung, danach gibt es keine Anmeldung mehr", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);

    const antwort = await anAuth(
      "/delete-user",
      { password: PASSWORT },
      { Cookie: cookie },
    );
    await antwort.text();

    expect(antwort.status).toBe(200);
    expect(await sitzung(cookie)).toBeNull();
    const danach = await anmelden(email, PASSWORT, neueIp());
    await danach.text();
    expect(danach.status).toBe(401);
  });

  it("begrenzt die Passwortversuche beim Löschen wie beim Anmelden", async () => {
    const cookie = await kontoAnlegen(neueAdresse(), PASSWORT);
    const ip = neueIp();
    const versuch = () =>
      anAuth(
        "/delete-user",
        { password: "falsch-123" },
        { Cookie: cookie, "cf-connecting-ip": ip },
      );

    for (let nummer = 0; nummer < 10; nummer++) {
      const antwort = await versuch();
      await antwort.text();
      expect(antwort.status).toBe(400);
    }
    const elfter = await versuch();
    await elfter.text();

    expect(elfter.status).toBe(429);
  });

  it("verlangt eine Anmeldung", async () => {
    const antwort = await anAuth("/delete-user", { password: PASSWORT });
    await antwort.text();

    expect(antwort.status).toBeGreaterThanOrEqual(400);
  });
});

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

describe("Offene Wege", () => {
  it("löscht kein Konto ohne Passwort, auch nicht bei frischer Sitzung", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);

    for (const inhalt of [{}, { password: "" }]) {
      const antwort = await anAuth("/delete-user", inhalt, { Cookie: cookie });
      await antwort.text();

      expect(antwort.status).toBe(400);
    }
    expect(await sitzung(cookie)).toMatchObject({ user: { email } });
  });

  it.each([
    "/update-user",
    "/change-password",
    "/change-email",
    "/list-sessions",
    "/gibt-es-nicht",
    "/sign-in/email/",
  ])("beantwortet %s mit 404", async (pfad) => {
    const cookie = await kontoAnlegen(neueAdresse(), PASSWORT);

    const antwort = await anAuth(
      pfad,
      { name: "Max", newPassword: "x", currentPassword: "y" },
      { Cookie: cookie },
    );
    await antwort.text();

    expect(antwort.status).toBe(404);
  });

  it("schreibt für unbekannte Pfade keine IP-Adresse in die Datenbank", async () => {
    const ip = "192.0.2.88";
    const antwort = await anAuth("/gibt-es-nicht-1", undefined, {
      "cf-connecting-ip": ip,
    });
    await antwort.text();

    const { results } = await env.DB.prepare(
      'SELECT key FROM "rateLimit" WHERE key LIKE ?',
    )
      .bind(`${ip}|%`)
      .all();
    expect(results).toEqual([]);
  });

  it("speichert keinen anderen Namen als Quiz-Master", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);

    const antwort = await anAuth(
      "/update-user",
      { name: "Max Mustermann" },
      { Cookie: cookie },
    );
    await antwort.text();

    expect(await sitzung(cookie)).toMatchObject({
      user: { name: "Quiz-Master" },
    });
  });
});
