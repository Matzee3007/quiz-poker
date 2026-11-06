import { entwurfPruefen, quizPruefen } from "../src/regeln/quizpruefung";
import { eingabeLesen, fehler } from "./anfrage";
import { auth } from "./auth";
import { QUIZ_ID_MUSTER } from "./betrieb";

export const QUIZ_HOECHSTANZAHL = 20;
// Wie beim Eröffnen eines Spielraums: Ein Quiz an allen Grenzen bleibt deutlich darunter.
const ANFRAGE_HOECHSTGROESSE = 256 * 1024;

async function kontoDerSitzung(anfrage: Request): Promise<string | null> {
  const sitzung = await auth.api.getSession({ headers: anfrage.headers });
  return sitzung?.user.id ?? null;
}

async function quizzeAuflisten(env: Env, besitzer: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, json_extract(inhalt, '$.titel') AS titel, spielbar, geaendert_am
     FROM quiz WHERE besitzer = ? ORDER BY geaendert_am DESC, rowid DESC`,
  )
    .bind(besitzer)
    .all<{
      id: string;
      titel: string;
      spielbar: number;
      geaendert_am: number;
    }>();
  return Response.json(
    results.map((zeile) => ({
      id: zeile.id,
      titel: zeile.titel,
      spielbar: zeile.spielbar === 1,
      geaendertAm: zeile.geaendert_am,
    })),
  );
}

async function quizAnlegen(
  anfrage: Request,
  env: Env,
  besitzer: string,
): Promise<Response> {
  const daten = await eingabeLesen(anfrage, env, ANFRAGE_HOECHSTGROESSE);
  if (daten instanceof Response) {
    return daten;
  }
  const pruefung = entwurfPruefen(daten.quiz);
  if (!pruefung.ok) {
    return fehler(422, pruefung.code);
  }

  const id = crypto.randomUUID();
  // Zählen und Einfügen in einem Befehl: Zwei gleichzeitige Anfragen kommen nicht über die Grenze.
  const eingefuegt = await env.DB.prepare(
    `INSERT INTO quiz (id, besitzer, inhalt, spielbar, geaendert_am)
     SELECT ?, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM quiz WHERE besitzer = ?) < ?`,
  )
    .bind(
      id,
      besitzer,
      JSON.stringify(pruefung.quiz),
      quizPruefen(pruefung.quiz).ok ? 1 : 0,
      Date.now(),
      besitzer,
      QUIZ_HOECHSTANZAHL,
    )
    .run();
  if (eingefuegt.meta.changes === 0) {
    return fehler(409, "zu-viele-quizze");
  }
  return Response.json({ id }, { status: 201 });
}

async function quizLesen(
  env: Env,
  besitzer: string,
  id: string,
): Promise<Response> {
  const zeile = await env.DB.prepare(
    "SELECT inhalt, spielbar, geaendert_am FROM quiz WHERE id = ? AND besitzer = ?",
  )
    .bind(id, besitzer)
    .first<{ inhalt: string; spielbar: number; geaendert_am: number }>();
  if (!zeile) {
    return fehler(404, "quiz-unbekannt");
  }
  return Response.json({
    id,
    quiz: JSON.parse(zeile.inhalt) as unknown,
    spielbar: zeile.spielbar === 1,
    geaendertAm: zeile.geaendert_am,
  });
}

async function quizAendern(
  anfrage: Request,
  env: Env,
  besitzer: string,
  id: string,
): Promise<Response> {
  const daten = await eingabeLesen(anfrage, env, ANFRAGE_HOECHSTGROESSE);
  if (daten instanceof Response) {
    return daten;
  }
  const pruefung = entwurfPruefen(daten.quiz);
  if (!pruefung.ok) {
    return fehler(422, pruefung.code);
  }
  const geaendertAm = Date.now();
  const geaendert = await env.DB.prepare(
    "UPDATE quiz SET inhalt = ?, spielbar = ?, geaendert_am = ? WHERE id = ? AND besitzer = ?",
  )
    .bind(
      JSON.stringify(pruefung.quiz),
      quizPruefen(pruefung.quiz).ok ? 1 : 0,
      geaendertAm,
      id,
      besitzer,
    )
    .run();
  if (geaendert.meta.changes === 0) {
    return fehler(404, "quiz-unbekannt");
  }
  return Response.json({ geaendertAm });
}

async function quizLoeschen(
  anfrage: Request,
  env: Env,
  besitzer: string,
  id: string,
): Promise<Response> {
  if (anfrage.headers.get("Origin") !== new URL(env.BETTER_AUTH_URL).origin) {
    return fehler(403, "fremde-herkunft");
  }
  const geloescht = await env.DB.prepare(
    "DELETE FROM quiz WHERE id = ? AND besitzer = ?",
  )
    .bind(id, besitzer)
    .run();
  if (geloescht.meta.changes === 0) {
    return fehler(404, "quiz-unbekannt");
  }
  return new Response(null, { status: 204 });
}

/** Alle Wege unter /api/quizze. id ist null für die Liste selbst. */
export async function quizAnfrage(
  anfrage: Request,
  env: Env,
  id: string | null,
): Promise<Response> {
  const besitzer = await kontoDerSitzung(anfrage);
  if (!besitzer) {
    return fehler(401, "nicht-angemeldet");
  }
  if (id === null && anfrage.method === "GET") {
    return quizzeAuflisten(env, besitzer);
  }
  if (id === null && anfrage.method === "POST") {
    return quizAnlegen(anfrage, env, besitzer);
  }
  if (id === null) {
    return fehler(405, "falsche-methode");
  }
  if (!QUIZ_ID_MUSTER.test(id)) {
    return fehler(404, "quiz-unbekannt");
  }
  if (anfrage.method === "GET") {
    return quizLesen(env, besitzer, id);
  }
  if (anfrage.method === "PUT") {
    return quizAendern(anfrage, env, besitzer, id);
  }
  if (anfrage.method === "DELETE") {
    return quizLoeschen(anfrage, env, besitzer, id);
  }
  return fehler(405, "falsche-methode");
}
