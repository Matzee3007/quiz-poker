import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { BEISPIEL_QUIZ } from "../src/regeln/beispielQuiz";
import { anQuizze, BASIS, kontoAnlegen, neueAdresse } from "./testhilfen";

type Seite = {
  quizze: {
    id: string;
    titel: string;
    kategorien: string[];
    veroeffentlichtAm: number;
  }[];
  weiter: string | null;
};

async function neuesKonto() {
  return kontoAnlegen(neueAdresse(), "geheim-123");
}

async function anlegen(cookie: string, titel: string, quiz = BEISPIEL_QUIZ) {
  const antwort = await anQuizze(cookie, "POST", "", {
    quiz: { ...quiz, titel },
  });
  return ((await antwort.json()) as { id: string }).id;
}

async function veroeffentlichen(cookie: string, id: string) {
  const antwort = await anQuizze(cookie, "PUT", `/${id}/sichtbarkeit`, {
    oeffentlich: true,
  });
  expect(antwort.status).toBe(200);
}

async function sammlung(weiter?: string) {
  const adresse =
    weiter === undefined
      ? `${BASIS}/api/sammlung`
      : `${BASIS}/api/sammlung?weiter=${encodeURIComponent(weiter)}`;
  return exports.default.fetch(adresse);
}

async function seite(weiter?: string): Promise<Seite> {
  const antwort = await sammlung(weiter);
  expect(antwort.status).toBe(200);
  return (await antwort.json()) as Seite;
}

describe("Sammlung öffentlicher Quizze", () => {
  // Alle Tests teilen eine D1. Öffentliche Quizze anderer Tests würden die Seiten verschieben.
  beforeEach(async () => {
    await env.DB.prepare("UPDATE quiz SET oeffentlich_seit = NULL").run();
  });

  it("zeigt ohne Anmeldung nur öffentliche Quizze, die neuesten zuerst", async () => {
    const cookie = await neuesKonto();
    const erstes = await anlegen(cookie, "Erstes");
    await anlegen(cookie, "Privat");
    const zweites = await anlegen(cookie, "Zweites");
    await veroeffentlichen(cookie, erstes);
    await new Promise((fertig) => setTimeout(fertig, 5));
    await veroeffentlichen(cookie, zweites);

    const { quizze, weiter } = await seite();

    expect(quizze.map((quiz) => quiz.titel)).toEqual(["Zweites", "Erstes"]);
    expect(weiter).toBeNull();
  });

  it("verrät nur Titel und Kategorien, keine Fragen und keinen Besitzer", async () => {
    const cookie = await neuesKonto();
    const id = await anlegen(cookie, "Offen");
    await veroeffentlichen(cookie, id);

    const [eintrag] = (await seite()).quizze;

    expect(Object.keys(eintrag).sort()).toEqual([
      "id",
      "kategorien",
      "titel",
      "veroeffentlichtAm",
    ]);
    expect(eintrag).toMatchObject({
      id,
      titel: "Offen",
      kategorien: BEISPIEL_QUIZ.kategorien.map((kategorie) => kategorie.name),
    });
  });

  it("blättert ohne Doppelte, auch bei gleichem Zeitpunkt und neuen Quizzen", async () => {
    const voll = await neuesKonto();
    const zweites = await neuesKonto();
    const ids = [];
    for (let nummer = 0; nummer < 20; nummer++) {
      ids.push(await anlegen(voll, `Quiz ${nummer}`));
    }
    ids.push(await anlegen(zweites, "Quiz 20"));
    // Zeitpunkte direkt setzen: 19 verschiedene, die letzten beiden gleich an der Seitengrenze.
    for (const [platz, id] of ids.entries()) {
      await env.DB.prepare("UPDATE quiz SET oeffentlich_seit = ? WHERE id = ?")
        .bind(platz < 19 ? 2000 + platz : 1000, id)
        .run();
    }

    const erste = await seite();
    const neu = await anlegen(zweites, "Neu dazwischen");
    await veroeffentlichen(zweites, neu);
    const zweite = await seite(erste.weiter!);

    expect(erste.quizze).toHaveLength(20);
    expect(erste.weiter).toEqual(expect.any(String));
    expect(zweite.quizze).toHaveLength(1);
    expect(zweite.weiter).toBeNull();
    const gesehen = [...erste.quizze, ...zweite.quizze].map((quiz) => quiz.id);
    expect(new Set(gesehen)).toEqual(new Set(ids));
  });

  it("lehnt einen kaputten Zeiger ab", async () => {
    for (const weiter of ["kaputt", "12_abc", "_"]) {
      const antwort = await sammlung(weiter);
      expect(antwort.status).toBe(422);
      expect(await antwort.json()).toEqual({ code: "ungueltige-nachricht" });
    }
  });

  it("kennt nur GET", async () => {
    const antwort = await exports.default.fetch(`${BASIS}/api/sammlung`, {
      method: "POST",
    });
    expect(antwort.status).toBe(405);
  });
});
