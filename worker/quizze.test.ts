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

describe("Ein Quiz lesen, ändern und löschen", () => {
  async function lesen(cookie: string, id: string) {
    const antwort = await anQuizze(cookie, "GET", `/${id}`);
    return {
      status: antwort.status,
      daten: (await antwort.json()) as {
        id?: string;
        quiz?: unknown;
        spielbar?: boolean;
        geaendertAm?: number;
        code?: string;
      },
    };
  }

  async function quizMitKonto() {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie);
    return { cookie, id: daten.id! };
  }

  it("liefert das eigene Quiz", async () => {
    const { cookie, id } = await quizMitKonto();

    const { status, daten } = await lesen(cookie, id);

    expect(status).toBe(200);
    expect(daten).toMatchObject({ id, quiz: UNFERTIG, spielbar: false });
  });

  it("speichert Änderungen und erkennt, wenn das Quiz spielbar wird", async () => {
    const { cookie, id } = await quizMitKonto();
    const vorher = (await lesen(cookie, id)).daten.geaendertAm!;
    await new Promise((fertig) => setTimeout(fertig, 5));

    const antwort = await anQuizze(cookie, "PUT", `/${id}`, {
      quiz: BEISPIEL_QUIZ,
    });

    expect(antwort.status).toBe(200);
    const { geaendertAm } = (await antwort.json()) as { geaendertAm: number };
    expect(geaendertAm).toBeGreaterThan(vorher);
    expect((await lesen(cookie, id)).daten).toMatchObject({
      quiz: BEISPIEL_QUIZ,
      spielbar: true,
      geaendertAm,
    });
  });

  it("prüft auch beim Ändern die Grenzen", async () => {
    const { cookie, id } = await quizMitKonto();

    const antwort = await anQuizze(cookie, "PUT", `/${id}`, {
      quiz: { titel: "t".repeat(101), kategorien: [] },
    });

    expect(antwort.status).toBe(422);
    expect(await antwort.json()).toEqual({ code: "text-zu-lang" });
    expect((await lesen(cookie, id)).daten.quiz).toEqual(UNFERTIG);
  });

  it("löscht das Quiz", async () => {
    const { cookie, id } = await quizMitKonto();

    const antwort = await anQuizze(cookie, "DELETE", `/${id}`);

    expect(antwort.status).toBe(204);
    expect(await lesen(cookie, id)).toEqual({
      status: 404,
      daten: { code: "quiz-unbekannt" },
    });
    expect(await liste(cookie)).toEqual([]);
  });

  it("verbirgt fremde Quizze und lässt sie unverändert", async () => {
    const { cookie, id } = await quizMitKonto();
    const fremd = await neuesKonto();

    expect((await lesen(fremd, id)).status).toBe(404);
    const aendern = await anQuizze(fremd, "PUT", `/${id}`, {
      quiz: BEISPIEL_QUIZ,
    });
    expect(aendern.status).toBe(404);
    const loeschen = await anQuizze(fremd, "DELETE", `/${id}`);
    expect(loeschen.status).toBe(404);

    expect((await lesen(cookie, id)).daten.quiz).toEqual(UNFERTIG);
  });

  it("löscht nur auf Anfrage der eigenen Seite", async () => {
    const { cookie, id } = await quizMitKonto();

    const antwort = await exports.default.fetch(`${BASIS}/api/quizze/${id}`, {
      method: "DELETE",
      headers: { Origin: "https://boese.test", Cookie: cookie },
    });

    expect(antwort.status).toBe(403);
    expect((await lesen(cookie, id)).status).toBe(200);
  });

  it("kennt unbekannte und ungültige IDs nicht", async () => {
    const cookie = await neuesKonto();

    expect((await lesen(cookie, crypto.randomUUID())).status).toBe(404);
    expect((await lesen(cookie, "abc")).status).toBe(404);
  });

  it("verlangt auch hier eine Anmeldung", async () => {
    const { id } = await quizMitKonto();

    expect((await lesen("", id)).status).toBe(401);
  });

  it("löscht mit dem Konto alle seine Quizze, fremde bleiben", async () => {
    const email = neueAdresse();
    const cookie = await kontoAnlegen(email, PASSWORT);
    await anlegen(cookie);
    await anlegen(cookie);
    const anderes = await quizMitKonto();

    const antwort = await exports.default.fetch(
      `${BASIS}/api/auth/delete-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASIS,
          Cookie: cookie,
          "cf-connecting-ip": "198.51.100.7",
        },
        body: JSON.stringify({ password: PASSWORT }),
      },
    );
    await antwort.text();

    expect(antwort.status).toBe(200);
    const uebrig = await env.DB.prepare(
      `SELECT COUNT(*) AS anzahl FROM quiz
       WHERE besitzer NOT IN (SELECT id FROM "user")`,
    ).first<{ anzahl: number }>();
    expect(uebrig!.anzahl).toBe(0);
    expect((await lesen(anderes.cookie, anderes.id)).status).toBe(200);
  });
});

describe("Öffentlich und privat", () => {
  async function sichtbarkeit(cookie: string, id: string, daten: unknown) {
    const antwort = await anQuizze(cookie, "PUT", `/${id}/sichtbarkeit`, daten);
    return {
      status: antwort.status,
      daten: (await antwort.json()) as {
        oeffentlichSeit?: number | null;
        code?: string;
      },
    };
  }

  async function lesen(cookie: string, id: string) {
    const antwort = await anQuizze(cookie, "GET", `/${id}`);
    return (await antwort.json()) as { oeffentlich: boolean; quiz: unknown };
  }

  it("legt neue Quizze privat an, auch mit oeffentlich im Inhalt", async () => {
    const cookie = await neuesKonto();

    const { daten } = await anlegen(cookie, {
      ...BEISPIEL_QUIZ,
      oeffentlich: true,
    });

    expect((await liste(cookie))[0]).toMatchObject({ oeffentlich: false });
    expect((await lesen(cookie, daten.id!)).oeffentlich).toBe(false);
  });

  it("veröffentlicht ein spielbares Quiz und behält beim zweiten Mal den Zeitpunkt", async () => {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie, BEISPIEL_QUIZ);

    const erstes = await sichtbarkeit(cookie, daten.id!, { oeffentlich: true });
    await new Promise((fertig) => setTimeout(fertig, 5));
    const zweites = await sichtbarkeit(cookie, daten.id!, {
      oeffentlich: true,
    });

    expect(erstes.status).toBe(200);
    expect(erstes.daten.oeffentlichSeit).toEqual(expect.any(Number));
    expect(zweites.daten.oeffentlichSeit).toBe(erstes.daten.oeffentlichSeit);
    expect((await liste(cookie))[0]).toMatchObject({ oeffentlich: true });
  });

  it("lehnt ein unfertiges Quiz ab", async () => {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie);

    const antwort = await sichtbarkeit(cookie, daten.id!, {
      oeffentlich: true,
    });

    expect(antwort).toEqual({ status: 422, daten: { code: "quiz-unfertig" } });
    expect((await liste(cookie))[0]).toMatchObject({ oeffentlich: false });
  });

  it("kennt fremde und unbekannte Quizze nicht", async () => {
    const fremd = await neuesKonto();
    const { daten } = await anlegen(fremd, BEISPIEL_QUIZ);
    const cookie = await neuesKonto();

    for (const id of [daten.id!, crypto.randomUUID()]) {
      expect(await sichtbarkeit(cookie, id, { oeffentlich: true })).toEqual({
        status: 404,
        daten: { code: "quiz-unbekannt" },
      });
    }
    expect((await liste(fremd))[0]).toMatchObject({ oeffentlich: false });
  });

  it("stellt ein öffentliches Quiz wieder auf privat", async () => {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie, BEISPIEL_QUIZ);
    await sichtbarkeit(cookie, daten.id!, { oeffentlich: true });

    const antwort = await sichtbarkeit(cookie, daten.id!, {
      oeffentlich: false,
    });

    expect(antwort).toEqual({ status: 200, daten: { oeffentlichSeit: null } });
    expect((await liste(cookie))[0]).toMatchObject({ oeffentlich: false });
  });

  it("versteht nur oeffentlich als true oder false", async () => {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie, BEISPIEL_QUIZ);

    for (const eingabe of [{ oeffentlich: "ja" }, {}]) {
      expect(await sichtbarkeit(cookie, daten.id!, eingabe)).toEqual({
        status: 422,
        daten: { code: "ungueltige-nachricht" },
      });
    }
    expect((await liste(cookie))[0]).toMatchObject({ oeffentlich: false });
  });

  it("verlangt Anmeldung und die eigene Seite", async () => {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie, BEISPIEL_QUIZ);

    const ohneAnmeldung = await sichtbarkeit("", daten.id!, {
      oeffentlich: true,
    });
    const fremdeSeite = await exports.default.fetch(
      `${BASIS}/api/quizze/${daten.id}/sichtbarkeit`,
      {
        method: "PUT",
        headers: { Origin: "https://fremd.test", Cookie: cookie },
        body: JSON.stringify({ oeffentlich: true }),
      },
    );

    expect(ohneAnmeldung.status).toBe(401);
    expect(fremdeSeite.status).toBe(403);
    expect(await fremdeSeite.json()).toEqual({ code: "fremde-herkunft" });
    expect((await liste(cookie))[0]).toMatchObject({ oeffentlich: false });
  });

  it("lässt ein öffentliches Quiz nur spielbar speichern", async () => {
    const cookie = await neuesKonto();
    const { daten } = await anlegen(cookie, BEISPIEL_QUIZ);
    await sichtbarkeit(cookie, daten.id!, { oeffentlich: true });

    const unfertig = await anQuizze(cookie, "PUT", `/${daten.id}`, {
      quiz: UNFERTIG,
    });
    const fertig = await anQuizze(cookie, "PUT", `/${daten.id}`, {
      quiz: { ...BEISPIEL_QUIZ, titel: "Neuer Titel" },
    });

    expect(unfertig.status).toBe(422);
    expect(await unfertig.json()).toEqual({ code: "oeffentlich-unfertig" });
    expect(fertig.status).toBe(200);
    expect(await lesen(cookie, daten.id!)).toMatchObject({
      oeffentlich: true,
      quiz: { titel: "Neuer Titel" },
    });
  });
});
