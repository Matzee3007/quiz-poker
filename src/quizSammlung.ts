import type { Quiz } from "./regeln/partie";
import { fehlercodeLesen } from "./raumEroeffnen";

export type QuizEintrag = {
  id: string;
  titel: string;
  spielbar: boolean;
  oeffentlich: boolean;
  geaendertAm: number;
};
export type SammlungEintrag = {
  id: string;
  titel: string;
  kategorien: string[];
  veroeffentlichtAm: number;
};
export type SammlungSeite = {
  quizze: SammlungEintrag[];
  weiter: string | null;
};
export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; code: string };

/** Ruft den Server auf. lesen macht aus der Antwort den Wert, nur bei Erfolg. daten geht als JSON mit. */
async function anfrage<T>(
  pfad: string,
  methode: string,
  lesen: (antwort: Response) => Promise<T>,
  daten?: unknown,
): Promise<Ergebnis<T>> {
  try {
    const antwort = await fetch(
      pfad,
      daten === undefined
        ? { method: methode }
        : {
            method: methode,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(daten),
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
  return anfrage("/api/quizze", "GET", (antwort) => antwort.json());
}

export type GeladenesQuiz = { quiz: Quiz; oeffentlich: boolean };

export function quizLaden(id: string): Promise<Ergebnis<GeladenesQuiz>> {
  return anfrage(`/api/quizze/${id}`, "GET", async (antwort) => {
    const daten = (await antwort.json()) as GeladenesQuiz;
    return { quiz: daten.quiz, oeffentlich: daten.oeffentlich };
  });
}

export function quizAnlegen(quiz: Quiz): Promise<Ergebnis<string>> {
  return anfrage(
    "/api/quizze",
    "POST",
    async (antwort) => ((await antwort.json()) as { id: string }).id,
    { quiz },
  );
}

export function quizSpeichern(
  id: string,
  quiz: Quiz,
): Promise<Ergebnis<number>> {
  return anfrage(
    `/api/quizze/${id}`,
    "PUT",
    async (antwort) =>
      ((await antwort.json()) as { geaendertAm: number }).geaendertAm,
    { quiz },
  );
}

export function quizLoeschen(id: string): Promise<Ergebnis<null>> {
  return anfrage(`/api/quizze/${id}`, "DELETE", () => Promise.resolve(null));
}

/** Eine Seite der Sammlung öffentlicher Quizze, weiter ist der Zeiger der vorigen Seite. */
export function sammlungLaden(
  weiter: string | null,
): Promise<Ergebnis<SammlungSeite>> {
  const pfad =
    weiter === null
      ? "/api/sammlung"
      : `/api/sammlung?weiter=${encodeURIComponent(weiter)}`;
  return anfrage(pfad, "GET", (antwort) => antwort.json());
}

/** Übernimmt ein öffentliches Quiz als eigene private Kopie, liefert deren ID. */
export function quizKopieren(id: string): Promise<Ergebnis<string>> {
  return anfrage(
    `/api/quizze/${id}/kopie`,
    "POST",
    async (antwort) => ((await antwort.json()) as { id: string }).id,
  );
}

/** Liefert den Zeitpunkt des Veröffentlichens, null bei privat. */
export function sichtbarkeitSetzen(
  id: string,
  oeffentlich: boolean,
): Promise<Ergebnis<number | null>> {
  return anfrage(
    `/api/quizze/${id}/sichtbarkeit`,
    "PUT",
    async (antwort) =>
      ((await antwort.json()) as { oeffentlichSeit: number | null })
        .oeffentlichSeit,
    { oeffentlich },
  );
}

/** „heute, 21:14“, „gestern, 22:05“, Älteres als „2. Nov. 2026“. */
export function geaendertText(zeit: number, jetzt: Date): string {
  const datum = new Date(zeit);
  const tagesanfang = (tag: Date) =>
    new Date(tag.getFullYear(), tag.getMonth(), tag.getDate()).getTime();
  const tage = Math.round((tagesanfang(jetzt) - tagesanfang(datum)) / 86400000);
  const uhrzeit = datum.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (tage === 0) {
    return `heute, ${uhrzeit}`;
  }
  if (tage === 1) {
    return `gestern, ${uhrzeit}`;
  }
  return datum.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
