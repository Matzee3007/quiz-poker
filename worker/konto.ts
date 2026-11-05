import { isAPIError } from "better-auth/api";
import { auth } from "./auth";
import { geheimnisHash } from "./geheimnis";

const ANFRAGE_HOECHSTGROESSE = 4 * 1024;
const PASSWORT_MINDESTENS = 8;
const PASSWORT_HOECHSTENS = 128;
// Better Auth verlangt einen Namen. Es sollen aber keine persönlichen Daten gespeichert werden (ADR 0003).
const KONTONAME = "Quiz-Master";

function fehler(status: number, code: string): Response {
  return Response.json({ code }, { status });
}

function passwortPasst(passwort: string): boolean {
  return (
    passwort.length >= PASSWORT_MINDESTENS &&
    passwort.length <= PASSWORT_HOECHSTENS
  );
}

/** Liest eine Anfrage von der eigenen Seite. Die Antwort ist der Fehler, wenn sie abgelehnt wird. */
async function eingabeLesen(
  anfrage: Request,
  env: Env,
): Promise<Record<string, unknown> | Response> {
  if (anfrage.headers.get("Origin") !== new URL(env.BETTER_AUTH_URL).origin) {
    return fehler(403, "fremde-herkunft");
  }
  // Die Angabe spart das Lesen großer Anfragen. Sie kann fehlen, deshalb zählt danach die echte Größe.
  if (Number(anfrage.headers.get("Content-Length")) > ANFRAGE_HOECHSTGROESSE) {
    return fehler(413, "anfrage-zu-gross");
  }
  const inhalt = await anfrage.arrayBuffer();
  if (inhalt.byteLength > ANFRAGE_HOECHSTGROESSE) {
    return fehler(413, "anfrage-zu-gross");
  }
  try {
    const daten: unknown = JSON.parse(new TextDecoder().decode(inhalt));
    if (typeof daten === "object" && daten !== null) {
      return daten as Record<string, unknown>;
    }
  } catch {
    // Kaputtes JSON behandelt die Zeile darunter.
  }
  return fehler(422, "ungueltige-nachricht");
}

export async function kontoRegistrieren(
  anfrage: Request,
  env: Env,
): Promise<Response> {
  const daten = await eingabeLesen(anfrage, env);
  if (daten instanceof Response) {
    return daten;
  }
  const { code, email, passwort } = daten;
  if (
    typeof code !== "string" ||
    typeof email !== "string" ||
    typeof passwort !== "string"
  ) {
    return fehler(422, "ungueltige-nachricht");
  }
  if (!passwortPasst(passwort)) {
    return fehler(422, "passwort-laenge");
  }

  // Ein einziges UPDATE: Von zwei gleichzeitigen Anfragen kann nur eine den Code verbrauchen.
  const codeHash = await geheimnisHash(code);
  const verbraucht = await env.DB.prepare(
    "UPDATE einladung SET benutzt_am = ? WHERE code_hash = ? AND benutzt_am IS NULL",
  )
    .bind(Date.now(), codeHash)
    .run();
  if (verbraucht.meta.changes !== 1) {
    return fehler(403, "einladung-ungueltig");
  }

  try {
    const { headers } = await auth.api.signUpEmail({
      body: { email, password: passwort, name: KONTONAME },
      headers: anfrage.headers,
      returnHeaders: true,
    });
    const antwort = new Headers();
    for (const cookie of headers.getSetCookie()) {
      antwort.append("Set-Cookie", cookie);
    }
    return new Response(null, { status: 201, headers: antwort });
  } catch (grund) {
    await env.DB.prepare(
      "UPDATE einladung SET benutzt_am = NULL WHERE code_hash = ?",
    )
      .bind(codeHash)
      .run();
    if (isAPIError(grund)) {
      return grund.statusCode === 422
        ? fehler(409, "email-vergeben")
        : fehler(422, "ungueltige-email");
    }
    throw grund;
  }
}
