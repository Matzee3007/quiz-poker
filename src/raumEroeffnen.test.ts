import { afterEach, describe, expect, it, vi } from "vitest";
import { raumEroeffnen, raumMitQuizEroeffnen } from "./raumEroeffnen";

const quiz = {
  titel: "T",
  kategorien: [{ name: "K", fragen: [{ text: "F", musterloesung: "L" }] }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("raumEroeffnen", () => {
  it("schickt das Quiz mit und liefert Raumcode und Token", async () => {
    const abruf = vi.fn(() =>
      Promise.resolve(
        Response.json({ raumcode: "ABCD", token: "t" }, { status: 201 }),
      ),
    );
    vi.stubGlobal("fetch", abruf);

    expect(await raumEroeffnen(quiz)).toEqual({
      ok: true,
      raumcode: "ABCD",
      token: "t",
    });
    expect(abruf).toHaveBeenCalledWith("/api/raeume", {
      method: "POST",
      body: JSON.stringify({ quiz }),
    });
  });

  it("schickt ohne Quiz keinen Inhalt", async () => {
    const abruf = vi.fn(() =>
      Promise.resolve(
        Response.json({ raumcode: "ABCD", token: "t" }, { status: 201 }),
      ),
    );
    vi.stubGlobal("fetch", abruf);

    await raumEroeffnen();

    expect(abruf).toHaveBeenCalledWith("/api/raeume", {
      method: "POST",
      body: undefined,
    });
  });

  it("meldet den Code des Servers bei voller Raumgrenze", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        Response.json({ code: "zu-viele-raeume" }, { status: 429 }),
      ),
    );

    expect(await raumEroeffnen(quiz)).toEqual({
      ok: false,
      code: "zu-viele-raeume",
    });
  });

  it("meldet keine-verbindung ohne Netz", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("kein Netz")));

    expect(await raumEroeffnen(quiz)).toEqual({
      ok: false,
      code: "keine-verbindung",
    });
  });

  it("liefert einen leeren Code bei einer Antwort ohne JSON", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("Kein freier Raumcode", { status: 503 })),
    );

    expect(await raumEroeffnen(quiz)).toEqual({ ok: false, code: "" });
  });
});

describe("raumMitQuizEroeffnen", () => {
  const ID = "3f2b0c1e-0000-4000-8000-000000000000";

  it("schickt nur die ID des gespeicherten Quiz", async () => {
    const abruf = vi.fn(() =>
      Promise.resolve(
        Response.json({ raumcode: "ABCD", token: "t" }, { status: 201 }),
      ),
    );
    vi.stubGlobal("fetch", abruf);

    expect(await raumMitQuizEroeffnen(ID)).toEqual({
      ok: true,
      raumcode: "ABCD",
      token: "t",
    });
    expect(abruf).toHaveBeenCalledWith("/api/raeume", {
      method: "POST",
      body: JSON.stringify({ quizId: ID }),
    });
  });

  it("meldet ein verschwundenes Quiz und fehlende Verbindung", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({ code: "quiz-unbekannt" }, { status: 404 }),
        ),
      ),
    );
    expect(await raumMitQuizEroeffnen(ID)).toEqual({
      ok: false,
      code: "quiz-unbekannt",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("offline"))),
    );
    expect(await raumMitQuizEroeffnen(ID)).toEqual({
      ok: false,
      code: "keine-verbindung",
    });
  });

  it("meldet 401 als abgelaufene Anmeldung", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({ code: "nicht-angemeldet" }, { status: 401 }),
        ),
      ),
    );

    expect(await raumMitQuizEroeffnen(ID)).toEqual({
      ok: false,
      code: "sitzung-abgelaufen",
    });
  });
});
