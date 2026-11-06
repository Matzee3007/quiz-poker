import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { BEISPIEL_QUIZ } from "../src/regeln/beispielQuiz";
import { anQuizze, BASIS, kontoAnlegen, neueAdresse } from "./testhilfen";

const PASSWORT = "geheim-123";
const UNFERTIG = {
  titel: "Halb fertig",
  kategorien: [{ name: "", fragen: [{ text: "", musterloesung: "" }] }],
};

async function neuesKonto() {
  return kontoAnlegen(neueAdresse(), PASSWORT);
}

async function anlegen(cookie: string, quiz: unknown = UNFERTIG) {
  const antwort = await anQuizze(cookie, "POST", "", { quiz });
  return {
    status: antwort.status,
    daten: (await antwort.json()) as { id?: string; code?: string },
  };
}

async function liste(cookie: string) {
  const antwort = await anQuizze(cookie, "GET");
  expect(antwort.status).toBe(200);
  return (await antwort.json()) as {
    id: string;
    titel: string;
    spielbar: boolean;
    geaendertAm: number;
  }[];
}

describe("Quizze anlegen und auflisten", () => {
  it("verlangt eine Anmeldung", async () => {
    const lesen = await exports.default.fetch(`${BASIS}/api/quizze`);
    expect(lesen.status).toBe(401);
    expect(await lesen.json()).toEqual({ code: "nicht-angemeldet" });

    const anlegenOhne = await anQuizze("", "POST", "", { quiz: UNFERTIG });
    expect(anlegenOhne.status).toBe(401);
    expect(await anlegenOhne.json()).toEqual({ code: "nicht-angemeldet" });
  });

  it("speichert ein unfertiges Quiz und zeigt es in der Liste", async () => {
    const cookie = await neuesKonto();

    const { status, daten } = await anlegen(cookie);

    expect(status).toBe(201);
    expect(daten.id).toMatch(/^[0-9a-f-]{36}$/);
    const [eintrag] = await liste(cookie);
    expect(eintrag).toMatchObject({
      id: daten.id,
      titel: "Halb fertig",
      spielbar: false,
    });
  });

  it("markiert ein vollständiges Quiz als spielbar", async () => {
    const cookie = await neuesKonto();

    await anlegen(cookie, BEISPIEL_QUIZ);

    expect((await liste(cookie))[0].spielbar).toBe(true);
  });

  it("zeigt die neuesten zuerst und keine fremden Quizze", async () => {
    const cookie = await neuesKonto();
    const fremd = await neuesKonto();
    await anlegen(fremd, { ...UNFERTIG, titel: "Fremd" });
    await anlegen(cookie, { ...UNFERTIG, titel: "Erstes" });
    await new Promise((fertig) => setTimeout(fertig, 5));
    await anlegen(cookie, { ...UNFERTIG, titel: "Zweites" });

    expect((await liste(cookie)).map((eintrag) => eintrag.titel)).toEqual([
      "Zweites",
      "Erstes",
    ]);
  });

  it("erlaubt höchstens 20 Quizze je Konto", async () => {
    const cookie = await neuesKonto();
    for (let nummer = 0; nummer < 20; nummer++) {
      expect((await anlegen(cookie)).status).toBe(201);
    }

    expect(await anlegen(cookie)).toEqual({
      status: 409,
      daten: { code: "zu-viele-quizze" },
    });
  });

  it("legt bei zwei gleichzeitigen Anfragen nicht mehr als 20 an", async () => {
    const cookie = await neuesKonto();
    for (let nummer = 0; nummer < 19; nummer++) {
      await anlegen(cookie);
    }

    const ergebnisse = await Promise.all([anlegen(cookie), anlegen(cookie)]);

    expect(ergebnisse.map((ergebnis) => ergebnis.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await liste(cookie)).toHaveLength(20);
  });

  it("prüft die Grenzen und lässt fremde Felder weg", async () => {
    const cookie = await neuesKonto();

    expect(
      await anlegen(cookie, {
        titel: "T",
        kategorien: [
          { name: "K", fragen: [{ text: "f".repeat(301), musterloesung: "" }] },
        ],
      }),
    ).toEqual({ status: 422, daten: { code: "text-zu-lang" } });

    const { daten } = await anlegen(cookie, { ...UNFERTIG, besitzer: "x" });
    const zeile = await env.DB.prepare("SELECT inhalt FROM quiz WHERE id = ?")
      .bind(daten.id)
      .first<{ inhalt: string }>();
    expect(JSON.parse(zeile!.inhalt)).toEqual(UNFERTIG);
  });

  it("lehnt fremde Herkunft, zu große und kaputte Anfragen ab", async () => {
    const cookie = await neuesKonto();

    const fremd = await exports.default.fetch(`${BASIS}/api/quizze`, {
      method: "POST",
      headers: { Origin: "https://boese.test", Cookie: cookie },
      body: JSON.stringify({ quiz: UNFERTIG }),
    });
    expect(fremd.status).toBe(403);
    expect(await fremd.json()).toEqual({ code: "fremde-herkunft" });

    const gross = await anQuizze(cookie, "POST", "", {
      quiz: UNFERTIG,
      fuell: "x".repeat(256 * 1024),
    });
    expect(gross.status).toBe(413);

    const kaputt = await exports.default.fetch(`${BASIS}/api/quizze`, {
      method: "POST",
      headers: { Origin: BASIS, Cookie: cookie },
      body: "{kaputt",
    });
    expect(kaputt.status).toBe(422);
    expect(await kaputt.json()).toEqual({ code: "ungueltige-nachricht" });
  });

  it("kennt keine anderen Methoden", async () => {
    const cookie = await neuesKonto();

    const antwort = await anQuizze(cookie, "PATCH");

    expect(antwort.status).toBe(405);
  });
});
