import { afterEach, describe, expect, it, vi } from "vitest";
import {
  abmelden,
  anmelden,
  angemeldeteAdresse,
  kontoLoeschen,
  passwortNeu,
  registrieren,
} from "./konto";
import { meldungFuer } from "./meldungen";

function antwortet(status: number, daten?: unknown) {
  const abruf = vi.fn(() =>
    Promise.resolve(
      daten === undefined
        ? new Response(null, { status })
        : Response.json(daten, { status }),
    ),
  );
  vi.stubGlobal("fetch", abruf);
  return abruf;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anmelden", () => {
  it("schickt Adresse und Passwort an Better Auth", async () => {
    const abruf = antwortet(200, { user: {} });

    expect(await anmelden("a@b.de", "geheim-123")).toEqual({ ok: true });
    expect(abruf).toHaveBeenCalledWith("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.de", password: "geheim-123" }),
    });
  });

  it("macht aus 401 eine Meldung, die Adresse und Passwort nicht unterscheidet", async () => {
    antwortet(401, { code: "INVALID_EMAIL_OR_PASSWORD" });

    expect(await anmelden("a@b.de", "falsch")).toEqual({
      ok: false,
      code: "anmeldung-falsch",
    });
  });

  it("meldet zu viele Versuche bei 429", async () => {
    antwortet(429, { message: "Too many requests" });

    expect(await anmelden("a@b.de", "falsch")).toEqual({
      ok: false,
      code: "zu-viele-versuche",
    });
  });

  it("meldet keine-verbindung ohne Netz", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("kein Netz")));

    expect(await anmelden("a@b.de", "geheim-123")).toEqual({
      ok: false,
      code: "keine-verbindung",
    });
  });
});

describe("registrieren", () => {
  it("schickt Code, Adresse und Passwort an den eigenen Weg", async () => {
    const abruf = antwortet(201);

    expect(await registrieren("c", "a@b.de", "geheim-123")).toEqual({
      ok: true,
    });
    expect(abruf).toHaveBeenCalledWith("/api/konto/registrieren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "c",
        email: "a@b.de",
        passwort: "geheim-123",
      }),
    });
  });

  it("gibt den Code des Servers weiter", async () => {
    antwortet(403, { code: "einladung-ungueltig" });

    expect(await registrieren("c", "a@b.de", "geheim-123")).toEqual({
      ok: false,
      code: "einladung-ungueltig",
    });
  });
});

describe("passwortNeu", () => {
  it("schickt Token und Passwort", async () => {
    const abruf = antwortet(204);

    expect(await passwortNeu("t", "geheim-123")).toEqual({ ok: true });
    expect(abruf).toHaveBeenCalledWith("/api/konto/passwort-neu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "t", passwort: "geheim-123" }),
    });
  });

  it("gibt den Code des Servers weiter", async () => {
    antwortet(403, { code: "link-ungueltig" });

    expect(await passwortNeu("t", "geheim-123")).toEqual({
      ok: false,
      code: "link-ungueltig",
    });
  });
});

describe("kontoLoeschen", () => {
  it("schickt das Passwort an Better Auth", async () => {
    const abruf = antwortet(200, { success: true });

    expect(await kontoLoeschen("geheim-123")).toEqual({ ok: true });
    expect(abruf).toHaveBeenCalledWith("/api/auth/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "geheim-123" }),
    });
  });

  it("unterscheidet eine abgelaufene Sitzung vom falschen Passwort", async () => {
    antwortet(401, { message: "Unauthorized" });

    expect(await kontoLoeschen("geheim-123")).toEqual({
      ok: false,
      code: "sitzung-abgelaufen",
    });
  });

  it("meldet ein falsches Passwort", async () => {
    antwortet(400, { code: "INVALID_PASSWORD" });

    expect(await kontoLoeschen("falsch")).toEqual({
      ok: false,
      code: "passwort-falsch",
    });
  });
});

describe("abmelden", () => {
  it("ruft Better Auth auf", async () => {
    const abruf = antwortet(200, { success: true });

    expect(await abmelden()).toEqual({ ok: true });
    expect(abruf).toHaveBeenCalledWith("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  });
});

describe("angemeldeteAdresse", () => {
  it("liefert die Adresse der Sitzung", async () => {
    antwortet(200, { user: { email: "a@b.de" } });

    expect(await angemeldeteAdresse()).toBe("a@b.de");
  });

  it("liefert null ohne Sitzung", async () => {
    antwortet(200, null);

    expect(await angemeldeteAdresse()).toBeNull();
  });

  it("liefert undefined bei einem Fehler, denn dann ist nichts bekannt", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("Fehlerseite", { status: 503 })),
    );

    expect(await angemeldeteAdresse()).toBeUndefined();
  });

  it("liefert undefined ohne Netz", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("kein Netz")));

    expect(await angemeldeteAdresse()).toBeUndefined();
  });
});

describe("Meldungen", () => {
  it.each([
    "anmeldung-falsch",
    "zu-viele-versuche",
    "einladung-ungueltig",
    "email-vergeben",
    "ungueltige-email",
    "passwort-laenge",
    "passwort-falsch",
    "sitzung-abgelaufen",
    "link-ungueltig",
    "fremde-herkunft",
    "konto-angelegt",
  ])("kennt eine eigene Meldung für %s", (code) => {
    expect(meldungFuer(code)).not.toBe(meldungFuer("gibt-es-nicht"));
  });
});
