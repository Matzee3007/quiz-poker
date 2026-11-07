import type { Quiz } from "../src/regeln/partie";
import {
  entwurfPruefen,
  QUIZ_GRENZEN,
  quizPruefen,
} from "../src/regeln/quizpruefung";
import { eingabeLesen, fehler } from "./anfrage";
import { auth } from "./auth";
import { QUIZ_ID_MUSTER } from "./betrieb";

// Wie beim Eröffnen eines Spielraums: Ein Quiz an allen Grenzen bleibt deutlich darunter.
const ANFRAGE_HOECHSTGROESSE = 256 * 1024;
const SICHTBARKEIT_HOECHSTGROESSE = 1024;

async function kontoDerSitzung(anfrage: Request): Promise<string | null> {
  const sitzung = await auth.api.getSession({ headers: anfrage.headers });
  return sitzung?.user.id ?? null;
}

async function quizzeAuflisten(env: Env, besitzer: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, json_extract(inhalt, '$.titel') AS titel, spielbar, geaendert_am, oeffentlich_seit
     FROM quiz WHERE besitzer = ? ORDER BY geaendert_am DESC, rowid DESC`,
  )
    .bind(besitzer)
    .all<{
      id: string;
      titel: string;
      spielbar: number;
      geaendert_am: number;
      oeffentlich_seit: number | null;
    }>();
  return Response.json(
    results.map((zeile) => ({
      id: zeile.id,
      titel: zeile.titel,
      spielbar: zeile.spielbar === 1,
      oeffentlich: zeile.oeffentlich_seit !== null,
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
      QUIZ_GRENZEN.quizzeJeKonto,
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
    "SELECT inhalt, spielbar, geaendert_am, oeffentlich_seit FROM quiz WHERE id = ? AND besitzer = ?",
  )
    .bind(id, besitzer)
    .first<{
      inhalt: string;
      spielbar: number;
      geaendert_am: number;
      oeffentlich_seit: number | null;
    }>();
  if (!zeile) {
    return fehler(404, "quiz-unbekannt");
  }
  return Response.json({
    id,
    quiz: JSON.parse(zeile.inhalt) as unknown,
    spielbar: zeile.spielbar === 1,
    oeffentlich: zeile.oeffentlich_seit !== null,
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
  const spielbar = quizPruefen(pruefung.quiz).ok ? 1 : 0;
  // Ein öffentliches Quiz bleibt spielbar: Ein unfertiger Stand ändert es nicht.
  const geaendert = await env.DB.prepare(
    `UPDATE quiz SET inhalt = ?, spielbar = ?, geaendert_am = ?
     WHERE id = ? AND besitzer = ? AND (oeffentlich_seit IS NULL OR ? = 1)`,
  )
    .bind(
      JSON.stringify(pruefung.quiz),
      spielbar,
      geaendertAm,
      id,
      besitzer,
      spielbar,
    )
    .run();
  if (geaendert.meta.changes === 0) {
    const vorhanden = await env.DB.prepare(
      "SELECT 1 FROM quiz WHERE id = ? AND besitzer = ?",
    )
      .bind(id, besitzer)
      .first();
    return vorhanden
      ? fehler(422, "oeffentlich-unfertig")
      : fehler(404, "quiz-unbekannt");
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

async function sichtbarkeitSetzen(
  anfrage: Request,
  env: Env,
  besitzer: string,
  id: string,
): Promise<Response> {
  const daten = await eingabeLesen(anfrage, env, SICHTBARKEIT_HOECHSTGROESSE);
  if (daten instanceof Response) {
    return daten;
  }
  if (typeof daten.oeffentlich !== "boolean") {
    return fehler(422, "ungueltige-nachricht");
  }
  // Öffentlich nur, wenn spielbar. COALESCE: Ein schon öffentliches Quiz behält seinen Zeitpunkt in der Sammlung.
  const befehl = daten.oeffentlich
    ? env.DB.prepare(
        `UPDATE quiz SET oeffentlich_seit = COALESCE(oeffentlich_seit, ?)
         WHERE id = ? AND besitzer = ? AND spielbar = 1`,
      ).bind(Date.now(), id, besitzer)
    : env.DB.prepare(
        "UPDATE quiz SET oeffentlich_seit = NULL WHERE id = ? AND besitzer = ?",
      ).bind(id, besitzer);
  await befehl.run();
  const zeile = await env.DB.prepare(
    "SELECT oeffentlich_seit, spielbar FROM quiz WHERE id = ? AND besitzer = ?",
  )
    .bind(id, besitzer)
    .first<{ oeffentlich_seit: number | null; spielbar: number }>();
  if (!zeile) {
    return fehler(404, "quiz-unbekannt");
  }
  if (daten.oeffentlich && zeile.spielbar === 0) {
    return fehler(422, "quiz-unfertig");
  }
  return Response.json({ oeffentlichSeit: zeile.oeffentlich_seit });
}

async function quizKopieren(
  anfrage: Request,
  env: Env,
  besitzer: string,
  id: string,
): Promise<Response> {
  if (anfrage.headers.get("Origin") !== new URL(env.BETTER_AUTH_URL).origin) {
    return fehler(403, "fremde-herkunft");
  }
  const neueId = crypto.randomUUID();
  // Nur öffentliche Quizze, und wie beim Anlegen Zählen und Einfügen in einem Befehl. Die Kopie ist privat.
  const kopiert = await env.DB.prepare(
    `INSERT INTO quiz (id, besitzer, inhalt, spielbar, geaendert_am)
     SELECT ?, ?, inhalt, spielbar, ? FROM quiz
     WHERE id = ? AND oeffentlich_seit IS NOT NULL
       AND (SELECT COUNT(*) FROM quiz WHERE besitzer = ?) < ?`,
  )
    .bind(
      neueId,
      besitzer,
      Date.now(),
      id,
      besitzer,
      QUIZ_GRENZEN.quizzeJeKonto,
    )
    .run();
  if (kopiert.meta.changes === 0) {
    const oeffentlich = await env.DB.prepare(
      "SELECT 1 FROM quiz WHERE id = ? AND oeffentlich_seit IS NOT NULL",
    )
      .bind(id)
      .first();
    return oeffentlich
      ? fehler(409, "zu-viele-quizze")
      : fehler(404, "quiz-unbekannt");
  }
  return Response.json({ id: neueId }, { status: 201 });
}

/**
 * Liest ein gespeichertes Quiz zum Spielen: ein öffentliches für alle, ein privates nur für seinen Besitzer.
 * Fremde private Quizze sind wie unbekannte 404.
 */
export async function gespeichertesQuizLesen(
  anfrage: Request,
  env: Env,
  quizId: string,
): Promise<
  { ok: true; quiz: Quiz } | { ok: false; status: number; code: string }
> {
  if (anfrage.headers.get("Origin") !== new URL(env.BETTER_AUTH_URL).origin) {
    return { ok: false, status: 403, code: "fremde-herkunft" };
  }
  const unbekannt = { ok: false, status: 404, code: "quiz-unbekannt" } as const;
  if (!QUIZ_ID_MUSTER.test(quizId)) {
    return unbekannt;
  }
  const zeile = await env.DB.prepare(
    "SELECT inhalt, besitzer, oeffentlich_seit FROM quiz WHERE id = ?",
  )
    .bind(quizId)
    .first<{
      inhalt: string;
      besitzer: string;
      oeffentlich_seit: number | null;
    }>();
  if (!zeile) {
    return unbekannt;
  }
  // Die Sitzung nur bei privaten Quizzen abfragen, das spart Rechenzeit (ADR 0005).
  if (
    zeile.oeffentlich_seit === null &&
    (await kontoDerSitzung(anfrage)) !== zeile.besitzer
  ) {
    return unbekannt;
  }
  const pruefung = quizPruefen(JSON.parse(zeile.inhalt));
  return pruefung.ok
    ? pruefung
    : { ok: false, status: 422, code: pruefung.code };
}

/** Alle Wege unter /api/quizze. id ist null für die Liste selbst, weg ist der Teil nach der ID. */
export async function quizAnfrage(
  anfrage: Request,
  env: Env,
  id: string | null,
  weg: "sichtbarkeit" | "kopie" | null = null,
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
  if (weg === "sichtbarkeit" && anfrage.method === "PUT") {
    return sichtbarkeitSetzen(anfrage, env, besitzer, id);
  }
  if (weg === "kopie" && anfrage.method === "POST") {
    return quizKopieren(anfrage, env, besitzer, id);
  }
  if (weg !== null) {
    return fehler(405, "falsche-methode");
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
