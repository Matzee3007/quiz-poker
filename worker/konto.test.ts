import { env, exports } from "cloudflare:workers";
import { APIError } from "better-auth/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auth } from "./auth";
import { geheimnisErzeugen, geheimnisHash } from "./geheimnis";
import {
  BASIS,
  cookieAus,
  einladungAnlegen,
  kontoAnlegen,
  neueAdresse,
} from "./testhilfen";
import { kontoRegistrieren, passwortNeuSetzen } from "./konto";

const PASSWORT = "geheim-123";

function registrieren(
  daten: unknown,
  kopf: Record<string, string> = { Origin: BASIS },
) {
  return exports.default.fetch(`${BASIS}/api/konto/registrieren`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...kopf },
    body: typeof daten === "string" ? daten : JSON.stringify(daten),
  });
}

async function code(antwort: Response) {
  return ((await antwort.json()) as { code: string }).code;
}

async function kontenMit(email: string) {
  const zeile = await env.DB.prepare(
    'SELECT count(*) AS anzahl FROM "user" WHERE email = ?',
  )
    .bind(email)
    .first<{ anzahl: number }>();
  return zeile?.anzahl;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Registrieren mit Einladungscode", () => {
  it("legt mit gültigem Code ein Konto an und meldet es sicher an", async () => {
    const email = neueAdresse();
    const antwort = await registrieren({
      code: await einladungAnlegen(),
      email,
      passwort: PASSWORT,
    });
    await antwort.text();

    expect(antwort.status).toBe(201);
    const cookie = antwort.headers.getSetCookie().join("\n");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");

    const sitzung = await exports.default.fetch(
      `${BASIS}/api/auth/get-session`,
      { headers: { Cookie: cookieAus(antwort) } },
    );
    const { user } = (await sitzung.json()) as {
      user: { email: string; name: string };
    };
    expect(user.email).toBe(email);
    expect(user.name).toBe("Quiz-Master");
  });

  it("speichert das Passwort nur als Hash", async () => {
    const email = neueAdresse();
    const antwort = await registrieren({
      code: await einladungAnlegen(),
      email,
      passwort: PASSWORT,
    });
    await antwort.text();

    const zeile = await env.DB.prepare(
      'SELECT a.password FROM account a JOIN "user" u ON u.id = a.userId WHERE u.email = ?',
    )
      .bind(email)
      .first<{ password: string }>();
    expect(zeile?.password).toBeTruthy();
    expect(zeile?.password).not.toContain(PASSWORT);
  });

  it("speichert in der Sitzung weder IP-Adresse noch Browserkennung", async () => {
    const email = neueAdresse();
    const antwort = await registrieren(
      { code: await einladungAnlegen(), email, passwort: PASSWORT },
      {
        Origin: BASIS,
        "cf-connecting-ip": "203.0.113.50",
        "User-Agent": "Testbrowser",
      },
    );
    await antwort.text();

    const zeile = await env.DB.prepare(
      'SELECT s.ipAddress, s.userAgent FROM session s JOIN "user" u ON u.id = s.userId WHERE u.email = ?',
    )
      .bind(email)
      .first();
    expect(zeile).toEqual({ ipAddress: null, userAgent: null });
  });

  it("lässt jeden Code nur einmal zu", async () => {
    const einladung = await einladungAnlegen();
    const erste = await registrieren({
      code: einladung,
      email: neueAdresse(),
      passwort: PASSWORT,
    });
    await erste.text();

    const email = neueAdresse();
    const zweite = await registrieren({
      code: einladung,
      email,
      passwort: PASSWORT,
    });

    expect(zweite.status).toBe(403);
    expect(await code(zweite)).toBe("einladung-ungueltig");
    expect(await kontenMit(email)).toBe(0);
  });

  it("legt bei zwei gleichzeitigen Anfragen mit einem Code genau ein Konto an", async () => {
    const einladung = await einladungAnlegen();
    const adressen = [neueAdresse(), neueAdresse()];

    const antworten = await Promise.all(
      adressen.map((email) =>
        registrieren({ code: einladung, email, passwort: PASSWORT }),
      ),
    );
    await Promise.all(antworten.map((antwort) => antwort.text()));

    expect(antworten.map((antwort) => antwort.status).sort()).toEqual([
      201, 403,
    ]);
    const anzahlen = await Promise.all(adressen.map(kontenMit));
    expect(anzahlen.reduce((summe = 0, anzahl = 0) => summe + anzahl, 0)).toBe(
      1,
    );
  });

  it("lehnt einen unbekannten Code ab", async () => {
    const email = neueAdresse();
    const antwort = await registrieren({
      code: "gibt-es-nicht",
      email,
      passwort: PASSWORT,
    });

    expect(antwort.status).toBe(403);
    expect(await code(antwort)).toBe("einladung-ungueltig");
    expect(await kontenMit(email)).toBe(0);
  });

  it.each([
    ["zu kurzem Passwort", { passwort: "1234567" }, 422, "passwort-laenge"],
    [
      "zu langem Passwort",
      { passwort: "x".repeat(129) },
      422,
      "passwort-laenge",
    ],
    ["ungültiger Adresse", { email: "keine-adresse" }, 422, "ungueltige-email"],
  ])(
    "lässt den Code bei %s gültig",
    async (_fall, aenderung, status, fehlercode) => {
      const einladung = await einladungAnlegen();
      const abgelehnt = await registrieren({
        code: einladung,
        email: neueAdresse(),
        passwort: PASSWORT,
        ...aenderung,
      });

      expect(abgelehnt.status).toBe(status);
      expect(await code(abgelehnt)).toBe(fehlercode);

      const danach = await registrieren({
        code: einladung,
        email: neueAdresse(),
        passwort: PASSWORT,
      });
      await danach.text();
      expect(danach.status).toBe(201);
    },
  );

  it("lässt den Code bei vergebener Adresse gültig", async () => {
    const email = neueAdresse();
    const erste = await registrieren({
      code: await einladungAnlegen(),
      email,
      passwort: PASSWORT,
    });
    await erste.text();

    const einladung = await einladungAnlegen();
    const abgelehnt = await registrieren({
      code: einladung,
      email,
      passwort: PASSWORT,
    });
    expect(abgelehnt.status).toBe(409);
    expect(await code(abgelehnt)).toBe("email-vergeben");

    const danach = await registrieren({
      code: einladung,
      email: neueAdresse(),
      passwort: PASSWORT,
    });
    await danach.text();
    expect(danach.status).toBe(201);
  });

  it("lehnt eine fremde Herkunft ab und verbraucht den Code nicht", async () => {
    const einladung = await einladungAnlegen();
    const fremd = await registrieren(
      { code: einladung, email: neueAdresse(), passwort: PASSWORT },
      { Origin: "https://fremde-seite.test" },
    );

    expect(fremd.status).toBe(403);
    expect(await code(fremd)).toBe("fremde-herkunft");

    const danach = await registrieren({
      code: einladung,
      email: neueAdresse(),
      passwort: PASSWORT,
    });
    await danach.text();
    expect(danach.status).toBe(201);
  });

  it("lehnt Anfragen ohne Herkunft ab", async () => {
    const antwort = await registrieren(
      {
        code: await einladungAnlegen(),
        email: neueAdresse(),
        passwort: PASSWORT,
      },
      {},
    );

    expect(antwort.status).toBe(403);
    expect(await code(antwort)).toBe("fremde-herkunft");
  });

  it("lehnt zu große Anfragen ab", async () => {
    const antwort = await registrieren({
      code: "x".repeat(5000),
      email: neueAdresse(),
      passwort: PASSWORT,
    });

    expect(antwort.status).toBe(413);
    expect(await code(antwort)).toBe("anfrage-zu-gross");
  });

  it.each([
    ["kaputtem JSON", "{kaputt"],
    ["fehlenden Feldern", { code: "abc" }],
    ["falschen Typen", { code: 1, email: 2, passwort: 3 }],
    ["null als Inhalt", "null"],
  ])("antwortet bei %s mit 422", async (_fall, inhalt) => {
    const antwort = await registrieren(inhalt);

    expect(antwort.status).toBe(422);
    expect(await code(antwort)).toBe("ungueltige-nachricht");
  });
});

describe("Passwort über Link neu setzen", () => {
  const NEU = "ganz-neu-456";
  const STUNDE = 60 * 60 * 1000;

  async function linkAnlegen(email: string, gueltigFuer = STUNDE) {
    const token = geheimnisErzeugen();
    await env.DB.prepare(
      "INSERT INTO passwort_link (token_hash, email, gueltig_bis) VALUES (?, ?, ?)",
    )
      .bind(await geheimnisHash(token), email, Date.now() + gueltigFuer)
      .run();
    return token;
  }

  function neuSetzen(
    daten: unknown,
    kopf: Record<string, string> = { Origin: BASIS },
  ) {
    return exports.default.fetch(`${BASIS}/api/konto/passwort-neu`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...kopf },
      body: JSON.stringify(daten),
    });
  }

  let letzteAdresse = 0;

  async function anmeldeStatus(email: string, passwort: string) {
    letzteAdresse += 1;
    const antwort = await exports.default.fetch(
      `${BASIS}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASIS,
          "cf-connecting-ip": `198.51.100.${letzteAdresse}`,
        },
        body: JSON.stringify({ email, password: passwort }),
      },
    );
    await antwort.text();
    return antwort.status;
  }

  it("setzt das Passwort neu und beendet alte Sitzungen", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);

    const antwort = await neuSetzen({
      token: await linkAnlegen(email),
      passwort: NEU,
    });
    await antwort.text();

    expect(antwort.status).toBe(204);
    expect(await anmeldeStatus(email, NEU)).toBe(200);
    expect(await anmeldeStatus(email, PASSWORT)).toBe(401);
    const sitzung = await exports.default.fetch(
      `${BASIS}/api/auth/get-session`,
      { headers: { Cookie: cookie } },
    );
    expect(await sitzung.json()).toBeNull();
  });

  it("lässt jeden Link nur einmal zu", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);
    const erste = await neuSetzen({ token, passwort: NEU });
    await erste.text();

    const zweite = await neuSetzen({ token, passwort: "noch-neuer-789" });

    expect(zweite.status).toBe(403);
    expect(await code(zweite)).toBe("link-ungueltig");
    expect(await anmeldeStatus(email, NEU)).toBe(200);
  });

  it("lehnt einen abgelaufenen Link ab", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);

    const antwort = await neuSetzen({
      token: await linkAnlegen(email, -1000),
      passwort: NEU,
    });

    expect(antwort.status).toBe(403);
    expect(await code(antwort)).toBe("link-ungueltig");
    expect(await anmeldeStatus(email, PASSWORT)).toBe(200);
  });

  it("lehnt einen unbekannten Link ab", async () => {
    const antwort = await neuSetzen({ token: "gibt-es-nicht", passwort: NEU });

    expect(antwort.status).toBe(403);
    expect(await code(antwort)).toBe("link-ungueltig");
  });

  it("lässt den Link bei zu kurzem Passwort gültig", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);

    const abgelehnt = await neuSetzen({ token, passwort: "1234567" });
    expect(abgelehnt.status).toBe(422);
    expect(await code(abgelehnt)).toBe("passwort-laenge");

    const danach = await neuSetzen({ token, passwort: NEU });
    await danach.text();
    expect(danach.status).toBe(204);
  });

  it("lehnt einen Link für eine Adresse ohne Konto ab", async () => {
    const antwort = await neuSetzen({
      token: await linkAnlegen(neueAdresse()),
      passwort: NEU,
    });

    expect(antwort.status).toBe(403);
    expect(await code(antwort)).toBe("link-ungueltig");
  });

  it("lehnt eine fremde Herkunft ab und verbraucht den Link nicht", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);

    const fremd = await neuSetzen(
      { token, passwort: NEU },
      { Origin: "https://fremde-seite.test" },
    );
    expect(fremd.status).toBe(403);
    expect(await code(fremd)).toBe("fremde-herkunft");

    const danach = await neuSetzen({ token, passwort: NEU });
    await danach.text();
    expect(danach.status).toBe(204);
  });

  it("lehnt zu große Anfragen ab", async () => {
    const antwort = await neuSetzen({
      token: "x".repeat(5000),
      passwort: NEU,
    });

    expect(antwort.status).toBe(413);
    expect(await code(antwort)).toBe("anfrage-zu-gross");
  });

  it("antwortet bei fehlenden Feldern mit 422", async () => {
    const antwort = await neuSetzen({ token: "abc" });

    expect(antwort.status).toBe(422);
    expect(await code(antwort)).toBe("ungueltige-nachricht");
  });
});

describe("Registrieren bei Fehlern des Servers", () => {
  function direkt(code: string, email: string) {
    return kontoRegistrieren(
      new Request(`${BASIS}/api/konto/registrieren`, {
        method: "POST",
        headers: { Origin: BASIS },
        body: JSON.stringify({ code, email, passwort: PASSWORT }),
      }),
      env,
    );
  }

  it("meldet einen Datenbankfehler nicht als vergebene Adresse und gibt den Code frei", async () => {
    const einladung = await einladungAnlegen();
    const email = neueAdresse();
    vi.spyOn(auth.api, "signUpEmail").mockRejectedValueOnce(
      new APIError("UNPROCESSABLE_ENTITY", {
        code: "FAILED_TO_CREATE_USER",
        message: "Failed to create user",
      }),
    );

    await expect(direkt(einladung, email)).rejects.toThrow();

    const danach = await direkt(einladung, email);
    await danach.text();
    expect(danach.status).toBe(201);
  });

  async function kontozeileEintragen(email: string, mitPasswort: boolean) {
    const id = crypto.randomUUID();
    const jetzt = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)',
    )
      .bind(id, "Quiz-Master", email, jetzt, jetzt)
      .run();
    if (mitPasswort) {
      await env.DB.prepare(
        "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, 'hash', ?, ?)",
      )
        .bind(crypto.randomUUID(), id, id, jetzt, jetzt)
        .run();
    }
  }

  it("meldet ein angelegtes Konto, wenn nur die Sitzung scheitert, und verbraucht den Code", async () => {
    const einladung = await einladungAnlegen();
    const email = neueAdresse();
    vi.spyOn(auth.api, "signUpEmail").mockImplementationOnce(async () => {
      await kontozeileEintragen(email, true);
      throw new APIError("BAD_REQUEST", {
        code: "FAILED_TO_CREATE_SESSION",
        message: "Failed to create session",
      });
    });

    const antwort = await direkt(einladung, email);
    expect(antwort.status).toBe(409);
    expect(await code(antwort)).toBe("konto-angelegt");

    const danach = await direkt(einladung, neueAdresse());
    expect(danach.status).toBe(403);
    expect(await code(danach)).toBe("einladung-ungueltig");
  });

  it("gibt den Code frei, wenn die Adresse schon vorher vergeben war und der Server scheitert", async () => {
    const einladung = await einladungAnlegen();
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    vi.spyOn(auth.api, "signUpEmail").mockRejectedValueOnce(
      new Error("D1-Aussetzer"),
    );

    await expect(direkt(einladung, email)).rejects.toThrow("D1-Aussetzer");

    const danach = await direkt(einladung, neueAdresse());
    await danach.text();
    expect(danach.status).toBe(201);
  });

  it("räumt ein Konto ohne Passwort auf und gibt den Code frei", async () => {
    const einladung = await einladungAnlegen();
    const email = neueAdresse();
    vi.spyOn(auth.api, "signUpEmail").mockImplementationOnce(async () => {
      await kontozeileEintragen(email, false);
      throw new Error("linkAccount gescheitert");
    });

    await expect(direkt(einladung, email)).rejects.toThrow(
      "linkAccount gescheitert",
    );
    expect(await kontenMit(email)).toBe(0);

    const danach = await direkt(einladung, email);
    await danach.text();
    expect(danach.status).toBe(201);
  });

  it("meldet beim Verlieren eines Wettlaufs die vergebene Adresse und lässt den Code gültig", async () => {
    const einladungen = [await einladungAnlegen(), await einladungAnlegen()];
    const email = neueAdresse();

    const antworten = await Promise.all(
      einladungen.map((einladung) =>
        registrieren({ code: einladung, email, passwort: PASSWORT }),
      ),
    );
    await Promise.all(antworten.map((antwort) => antwort.text()));
    expect(antworten.map((antwort) => antwort.status).sort()).toEqual([
      201, 409,
    ]);

    const verlierer = einladungen[antworten[0].status === 201 ? 1 : 0];
    const danach = await registrieren({
      code: verlierer,
      email: neueAdresse(),
      passwort: PASSWORT,
    });
    await danach.text();
    expect(danach.status).toBe(201);
  });

  it("macht aus einem gescheiterten Anlegen bei vergebener Adresse email-vergeben", async () => {
    const einladung = await einladungAnlegen();
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    vi.spyOn(auth.api, "signUpEmail").mockRejectedValueOnce(
      new APIError("UNPROCESSABLE_ENTITY", {
        code: "FAILED_TO_CREATE_USER",
        message: "Failed to create user",
      }),
    );

    const antwort = await direkt(einladung, email);
    expect(antwort.status).toBe(409);
    expect(await code(antwort)).toBe("email-vergeben");
  });
});

describe("Passwort-Links aufräumen", () => {
  async function linkAnlegen(email: string) {
    const token = geheimnisErzeugen();
    await env.DB.prepare(
      "INSERT INTO passwort_link (token_hash, email, gueltig_bis) VALUES (?, ?, ?)",
    )
      .bind(await geheimnisHash(token), email, Date.now() + 3_600_000)
      .run();
    return token;
  }

  function neuSetzen(token: string, passwort: string) {
    return exports.default.fetch(`${BASIS}/api/konto/passwort-neu`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASIS },
      body: JSON.stringify({ token, passwort }),
    });
  }

  it("macht andere Links derselben Adresse ungültig, wenn einer benutzt wird", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    const erster = await linkAnlegen(email);
    const zweiter = await linkAnlegen(email);

    const benutzt = await neuSetzen(erster, "ganz-neu-456");
    await benutzt.text();
    expect(benutzt.status).toBe(204);

    const danach = await neuSetzen(zweiter, "noch-neuer-789");
    expect(danach.status).toBe(403);
    expect(await code(danach)).toBe("link-ungueltig");
  });

  it("entfernt Links beim Löschen des Kontos, ein neues Konto mit derselben Adresse ist sicher", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);

    const geloescht = await exports.default.fetch(
      `${BASIS}/api/auth/delete-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASIS,
          Cookie: cookie,
        },
        body: JSON.stringify({ password: PASSWORT }),
      },
    );
    await geloescht.text();
    expect(geloescht.status).toBe(200);

    const zeile = await env.DB.prepare(
      "SELECT email FROM passwort_link WHERE email = ?",
    )
      .bind(email)
      .first();
    expect(zeile).toBeNull();

    await kontoAnlegen(email, "neues-konto-123");
    const danach = await neuSetzen(token, "uebernahme-123");
    expect(danach.status).toBe(403);
    expect(await code(danach)).toBe("link-ungueltig");
  });

  it("lässt den Link gültig, wenn das Hashing scheitert", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);
    const kaputt = {
      DB: env.DB,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      PASSWORTRECHNER: {
        getByName: () => ({
          hashen: () => Promise.reject(new Error("Neustart")),
        }),
      },
    } as unknown as Env;

    await expect(
      passwortNeuSetzen(
        new Request(`${BASIS}/api/konto/passwort-neu`, {
          method: "POST",
          headers: { Origin: BASIS },
          body: JSON.stringify({ token, passwort: "ganz-neu-456" }),
        }),
        kaputt,
      ),
    ).rejects.toThrow("Neustart");

    const danach = await neuSetzen(token, "ganz-neu-456");
    await danach.text();
    expect(danach.status).toBe(204);
  });

  it("meldet keinen Erfolg für ein Konto ohne Passwort", async () => {
    const email = neueAdresse();
    const jetzt = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)',
    )
      .bind(crypto.randomUUID(), "Quiz-Master", email, jetzt, jetzt)
      .run();

    const antwort = await neuSetzen(await linkAnlegen(email), "ganz-neu-456");

    expect(antwort.status).toBe(403);
    expect(await code(antwort)).toBe("link-ungueltig");
  });

  it("lässt den Link gültig, wenn die Suche nach dem Konto scheitert", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);
    const kaputt = {
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      PASSWORTRECHNER: env.PASSWORTRECHNER,
      DB: {
        prepare: (sql: string) => {
          if (sql.startsWith("SELECT")) {
            throw new Error("D1-Aussetzer");
          }
          return env.DB.prepare(sql);
        },
      },
    } as unknown as Env;

    await expect(
      passwortNeuSetzen(
        new Request(`${BASIS}/api/konto/passwort-neu`, {
          method: "POST",
          headers: { Origin: BASIS },
          body: JSON.stringify({ token, passwort: "ganz-neu-456" }),
        }),
        kaputt,
      ),
    ).rejects.toThrow("D1-Aussetzer");

    const danach = await neuSetzen(token, "ganz-neu-456");
    await danach.text();
    expect(danach.status).toBe(204);
  });

  it("behält Links, wenn das Löschen am falschen Passwort scheitert", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);
    const token = await linkAnlegen(email);

    const abgelehnt = await exports.default.fetch(
      `${BASIS}/api/auth/delete-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASIS,
          Cookie: cookie,
        },
        body: JSON.stringify({ password: "falsch-falsch" }),
      },
    );
    await abgelehnt.text();
    expect(abgelehnt.status).toBe(400);

    const danach = await neuSetzen(token, "ganz-neu-456");
    await danach.text();
    expect(danach.status).toBe(204);
  });
});
