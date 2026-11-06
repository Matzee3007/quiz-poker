import type { Quiz } from "./regeln/partie";
import { fehlercodeLesen } from "./raumEroeffnen";

export type QuizEintrag = {
  id: string;
  titel: string;
  spielbar: boolean;
  geaendertAm: number;
};
export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; code: string };

/** Ruft /api/quizze auf. lesen macht aus der Antwort den Wert, nur bei Erfolg. */
async function anfrage<T>(
  pfad: string,
  methode: string,
  lesen: (antwort: Response) => Promise<T>,
  quiz?: Quiz,
): Promise<Ergebnis<T>> {
  try {
    const antwort = await fetch(
      `/api/quizze${pfad}`,
      quiz === undefined
        ? { method: methode }
        : {
            method: methode,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quiz }),
          },
    );
    if (antwort.ok) {
      return { ok: true, wert: await lesen(antwort) };
    }
    // Ohne gültige Sitzung: Wer hier ist, war angemeldet, also ist die Anmeldung abgelaufen.
    if (antwort.status === 401) {
      return { ok: false, code: "sitzung-abgelaufen" };
    }
    return { ok: false, code: await fehlercodeLesen(antwort) };
  } catch {
    return { ok: false, code: "keine-verbindung" };
  }
}

export function quizzeLaden(): Promise<Ergebnis<QuizEintrag[]>> {
  return anfrage("", "GET", (antwort) => antwort.json());
}

export function quizLaden(id: string): Promise<Ergebnis<Quiz>> {
  return anfrage(`/${id}`, "GET", async (antwort) => {
    const daten = (await antwort.json()) as { quiz: Quiz };
    return daten.quiz;
  });
}

export function quizAnlegen(quiz: Quiz): Promise<Ergebnis<string>> {
  return anfrage(
    "",
    "POST",
    async (antwort) => ((await antwort.json()) as { id: string }).id,
    quiz,
  );
}

export function quizSpeichern(
  id: string,
  quiz: Quiz,
): Promise<Ergebnis<number>> {
  return anfrage(
    `/${id}`,
    "PUT",
    async (antwort) =>
      ((await antwort.json()) as { geaendertAm: number }).geaendertAm,
    quiz,
  );
}

export function quizLoeschen(id: string): Promise<Ergebnis<null>> {
  return anfrage(`/${id}`, "DELETE", () => Promise.resolve(null));
}
