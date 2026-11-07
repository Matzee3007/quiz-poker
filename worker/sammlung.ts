// Die Sammlung: öffentliche Quizze für alle, ohne Anmeldung.
import type { Quiz } from "../src/regeln/partie";
import { fehler } from "./anfrage";

export const SAMMLUNG_SEITE = 20;
// Zeiger auf den letzten Eintrag einer Seite: "<oeffentlich_seit>_<id>".
const ZEIGER = /^(\d+)_([0-9a-f-]{36})$/;

/** GET /api/sammlung. Liefert nur Titel und Kategorien, keine Fragen, Lösungen oder Besitzer. */
export async function sammlungAnfrage(
  anfrage: Request,
  env: Env,
): Promise<Response> {
  if (anfrage.method !== "GET") {
    return fehler(405, "falsche-methode");
  }
  // Ohne Zeiger beginnt die Liste vor allem, was es gibt.
  let vorZeit = Number.MAX_SAFE_INTEGER;
  let vorId = "";
  const weiter = new URL(anfrage.url).searchParams.get("weiter");
  if (weiter !== null) {
    const treffer = ZEIGER.exec(weiter);
    if (!treffer) {
      return fehler(422, "ungueltige-nachricht");
    }
    vorZeit = Number(treffer[1]);
    vorId = treffer[2];
  }

  // Blättern mit Zeiger statt Seitennummer: Neu veröffentlichte Quizze verschieben die nächste Seite nicht.
  // Ein Eintrag mehr als die Seite zeigt nur, dass es weitergeht.
  const { results } = await env.DB.prepare(
    `SELECT id, inhalt, oeffentlich_seit FROM quiz
     WHERE oeffentlich_seit IS NOT NULL
       AND (oeffentlich_seit < ? OR (oeffentlich_seit = ? AND id < ?))
     ORDER BY oeffentlich_seit DESC, id DESC LIMIT ?`,
  )
    .bind(vorZeit, vorZeit, vorId, SAMMLUNG_SEITE + 1)
    .all<{ id: string; inhalt: string; oeffentlich_seit: number }>();
  const zeilen = results.slice(0, SAMMLUNG_SEITE);
  const letzte = zeilen.at(-1);
  return Response.json({
    quizze: zeilen.map((zeile) => {
      const quiz = JSON.parse(zeile.inhalt) as Quiz;
      return {
        id: zeile.id,
        titel: quiz.titel,
        kategorien: quiz.kategorien.map((kategorie) => kategorie.name),
        veroeffentlichtAm: zeile.oeffentlich_seit,
      };
    }),
    weiter:
      results.length > SAMMLUNG_SEITE && letzte
        ? `${letzte.oeffentlich_seit}_${letzte.id}`
        : null,
  });
}
