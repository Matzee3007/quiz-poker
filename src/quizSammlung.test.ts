import { afterEach, describe, expect, it, vi } from "vitest";
import { meldungFuer } from "./meldungen";
import {
  quizAnlegen,
  quizLaden,
  quizLoeschen,
  quizSpeichern,
  quizzeLaden,
} from "./quizSammlung";
import { BEISPIEL_QUIZ } from "./regeln/beispielQuiz";

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

const ID = "3f2b0c1e-0000-4000-8000-000000000000";

describe("Anfragen an die Quiz-Sammlung", () => {
  it("lädt die Liste", async () => {
    const eintrag = { id: ID, titel: "T", spielbar: true, geaendertAm: 5 };
    const abruf = antwortet(200, [eintrag]);

    expect(await quizzeLaden()).toEqual({ ok: true, wert: [eintrag] });
    expect(abruf).toHaveBeenCalledWith("/api/quizze", { method: "GET" });
  });

  it("lädt ein Quiz", async () => {
    antwortet(200, {
      id: ID,
      quiz: BEISPIEL_QUIZ,
      spielbar: true,
      geaendertAm: 5,
    });

    expect(await quizLaden(ID)).toEqual({ ok: true, wert: BEISPIEL_QUIZ });
  });

  it("legt ein Quiz an und liefert seine ID", async () => {
    const abruf = antwortet(201, { id: ID });

    expect(await quizAnlegen(BEISPIEL_QUIZ)).toEqual({ ok: true, wert: ID });
    expect(abruf).toHaveBeenCalledWith("/api/quizze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz: BEISPIEL_QUIZ }),
    });
  });

  it("speichert ein Quiz und liefert den neuen Stand", async () => {
    const abruf = antwortet(200, { geaendertAm: 7 });

    expect(await quizSpeichern(ID, BEISPIEL_QUIZ)).toEqual({
      ok: true,
      wert: 7,
    });
    expect(abruf).toHaveBeenCalledWith(`/api/quizze/${ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz: BEISPIEL_QUIZ }),
    });
  });

  it("löscht ein Quiz", async () => {
    antwortet(204);

    expect(await quizLoeschen(ID)).toEqual({ ok: true, wert: null });
  });

  it("macht aus 401 eine abgelaufene Anmeldung", async () => {
    antwortet(401, { code: "nicht-angemeldet" });

    expect(await quizSpeichern(ID, BEISPIEL_QUIZ)).toEqual({
      ok: false,
      code: "sitzung-abgelaufen",
    });
  });

  it("gibt die Codes des Servers weiter", async () => {
    antwortet(404, { code: "quiz-unbekannt" });
    expect(await quizLaden(ID)).toEqual({ ok: false, code: "quiz-unbekannt" });

    antwortet(409, { code: "zu-viele-quizze" });
    expect(await quizAnlegen(BEISPIEL_QUIZ)).toEqual({
      ok: false,
      code: "zu-viele-quizze",
    });
  });

  it("meldet keine-verbindung ohne Netz", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("kein Netz")));

    expect(await quizzeLaden()).toEqual({
      ok: false,
      code: "keine-verbindung",
    });
  });

  it("hat für jeden neuen Code eine eigene Meldung", () => {
    const allgemein = meldungFuer("gibt-es-nicht");

    for (const code of [
      "quiz-unbekannt",
      "zu-viele-quizze",
      "nicht-angemeldet",
    ]) {
      expect(meldungFuer(code)).not.toBe(allgemein);
    }
  });
});
