// Die Sammlung: öffentliche Quizze für alle, ohne Anmeldung.
import { fehler } from "./anfrage";
import { QUIZ_ID_MUSTER } from "./betrieb";

export const SAMMLUNG_SEITE = 20;
// Zeiger auf den letzten Eintrag einer Seite: "<oeffentlich_seit>_<id>".
const ZEIGER = new RegExp(`^(\\d+)_(${QUIZ_ID_MUSTER.source.slice(1, -1)})$`);

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
  // Titel und Kategorien liest D1 selbst aus dem JSON: Der ganze Inhalt kostet sonst Rechenzeit im Worker.
  const { results } = await env.DB.prepare(
    `SELECT id, json_extract(inhalt, '$.titel') AS titel,
       (SELECT json_group_array(json_extract(value, '$.name'))
        FROM json_each(inhalt, '$.kategorien')) AS kategorien,
       oeffentlich_seit
     FROM quiz
     WHERE oeffentlich_seit IS NOT NULL
       AND (oeffentlich_seit < ? OR (oeffentlich_seit = ? AND id < ?))
     ORDER BY oeffentlich_seit DESC, id DESC LIMIT ?`,
  )
    .bind(vorZeit, vorZeit, vorId, SAMMLUNG_SEITE + 1)
    .all<{
      id: string;
      titel: string;
      kategorien: string;
      oeffentlich_seit: number;
    }>();
  const zeilen = results.slice(0, SAMMLUNG_SEITE);
  const letzte = zeilen.at(-1);
  return Response.json({
    quizze: zeilen.map((zeile) => ({
      id: zeile.id,
      titel: zeile.titel,
      kategorien: JSON.parse(zeile.kategorien) as string[],
      veroeffentlichtAm: zeile.oeffentlich_seit,
    })),
    weiter:
      results.length > SAMMLUNG_SEITE && letzte
        ? `${letzte.oeffentlich_seit}_${letzte.id}`
        : null,
  });
}
