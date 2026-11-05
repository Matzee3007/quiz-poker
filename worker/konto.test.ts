import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { BASIS, cookieAus, einladungAnlegen, neueAdresse } from "./testhilfen";

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
