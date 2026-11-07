import { afterEach, describe, expect, it, vi } from "vitest";
import { meldungFuer } from "./meldungen";
import {
  geaendertText,
  quizAnlegen,
  quizLaden,
  quizLoeschen,
  quizKopieren,
  quizSpeichern,
  quizzeLaden,
  sammlungLaden,
  sichtbarkeitSetzen,
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
    expect(meldungFuer("anfrage-zu-gross")).toBe("Das Quiz ist zu groß.");
  });
});

describe("geaendertText", () => {
  const jetzt = new Date(2026, 10, 6, 22, 30);

  it("nennt heute und gestern mit Uhrzeit", () => {
    expect(geaendertText(new Date(2026, 10, 6, 21, 14).getTime(), jetzt)).toBe(
      "heute, 21:14",
    );
    expect(geaendertText(new Date(2026, 10, 5, 9, 5).getTime(), jetzt)).toBe(
      "gestern, 09:05",
    );
  });

  it("nennt Älteres mit Datum", () => {
    expect(geaendertText(new Date(2026, 10, 2, 12, 0).getTime(), jetzt)).toBe(
      "2. Nov. 2026",
    );
  });
});

describe("Anfragen für öffentliche Quizze", () => {
  it("lädt die erste Seite der Sammlung", async () => {
    const seite = {
      quizze: [{ id: ID, titel: "T", kategorien: ["K"], veroeffentlichtAm: 5 }],
      weiter: `5_${ID}`,
    };
    const abruf = antwortet(200, seite);

    expect(await sammlungLaden(null)).toEqual({ ok: true, wert: seite });
    expect(abruf).toHaveBeenCalledWith("/api/sammlung", { method: "GET" });
  });

  it("lädt die nächste Seite mit dem Zeiger", async () => {
    const abruf = antwortet(200, { quizze: [], weiter: null });

    await sammlungLaden(`5_${ID}`);

    expect(abruf).toHaveBeenCalledWith(`/api/sammlung?weiter=5_${ID}`, {
      method: "GET",
    });
  });

  it("kopiert ein Quiz und liefert die neue ID", async () => {
    const neu = "3f2b0c1e-0000-4000-8000-000000000001";
    const abruf = antwortet(201, { id: neu });

    expect(await quizKopieren(ID)).toEqual({ ok: true, wert: neu });
    expect(abruf).toHaveBeenCalledWith(`/api/quizze/${ID}/kopie`, {
      method: "POST",
    });
  });

  it.each([
    [404, "quiz-unbekannt"],
    [409, "zu-viele-quizze"],
  ])("meldet beim Kopieren %i als %s", async (status, code) => {
    antwortet(status, { code });

    expect(await quizKopieren(ID)).toEqual({ ok: false, code });
  });

  it("stellt ein Quiz öffentlich und liefert den Zeitpunkt", async () => {
    const abruf = antwortet(200, { oeffentlichSeit: 7 });

    expect(await sichtbarkeitSetzen(ID, true)).toEqual({ ok: true, wert: 7 });
    expect(abruf).toHaveBeenCalledWith(`/api/quizze/${ID}/sichtbarkeit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oeffentlich: true }),
    });
  });

  it("meldet ein unfertiges Quiz beim Veröffentlichen", async () => {
    antwortet(422, { code: "quiz-unfertig" });

    expect(await sichtbarkeitSetzen(ID, true)).toEqual({
      ok: false,
      code: "quiz-unfertig",
    });
  });

  it("hat Meldungen für unfertige öffentliche Quizze", () => {
    expect(meldungFuer("quiz-unfertig")).toBe(
      "Nur ein fertiges Quiz kann öffentlich werden. Bitte fülle zuerst alle Felder aus.",
    );
    expect(meldungFuer("oeffentlich-unfertig")).toBe(
      "Ein öffentliches Quiz muss spielbar bleiben. Fülle alle Felder aus oder stelle es zuerst auf privat.",
    );
  });
});
