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
    const fehlercode = isAPIError(grund) ? grund.body?.code : undefined;
    // Scheitert erst die Sitzung, gibt es das Konto schon. Dann bleibt der Code verbraucht.
    const kontoDa =
      fehlercode !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" &&
      (await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
        .bind(email.toLowerCase())
        .first()) !== null;
    if (!kontoDa) {
      await env.DB.prepare(
        "UPDATE einladung SET benutzt_am = NULL WHERE code_hash = ?",
      )
        .bind(codeHash)
        .run();
    }
    if (fehlercode === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return fehler(409, "email-vergeben");
    }
    if (fehlercode === "INVALID_EMAIL" || fehlercode === "VALIDATION_ERROR") {
      return fehler(422, "ungueltige-email");
    }
    throw grund;
  }
}

export async function passwortNeuSetzen(
  anfrage: Request,
  env: Env,
): Promise<Response> {
  const daten = await eingabeLesen(anfrage, env);
  if (daten instanceof Response) {
    return daten;
  }
  const { token, passwort } = daten;
  if (typeof token !== "string" || typeof passwort !== "string") {
    return fehler(422, "ungueltige-nachricht");
  }
  if (!passwortPasst(passwort)) {
    return fehler(422, "passwort-laenge");
  }

  // Ein einziges UPDATE: Von zwei gleichzeitigen Anfragen kann nur eine den Link verbrauchen.
  const jetzt = Date.now();
  const tokenHash = await geheimnisHash(token);
  const link = await env.DB.prepare(
    "UPDATE passwort_link SET benutzt_am = ? WHERE token_hash = ? AND benutzt_am IS NULL AND gueltig_bis > ? RETURNING email",
  )
    .bind(jetzt, tokenHash, jetzt)
    .first<{ email: string }>();
  if (!link) {
    return fehler(403, "link-ungueltig");
  }
  const konto = await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
    .bind(link.email)
    .first<{ id: string }>();
  if (!konto) {
    return fehler(403, "link-ungueltig");
  }

  try {
    const hash = await env.PASSWORTRECHNER.getByName("global").hashen(passwort);
    // Wer ein Passwort zurücksetzt, wirft damit auch jemanden hinaus, der es kannte.
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = 'credential'",
      ).bind(hash, new Date(jetzt).toISOString(), konto.id),
      env.DB.prepare("DELETE FROM session WHERE userId = ?").bind(konto.id),
      env.DB.prepare("DELETE FROM passwort_link WHERE email = ?").bind(
        link.email,
      ),
    ]);
  } catch (grund) {
    // Das Passwort gilt noch nicht, also darf der Link nicht verloren sein.
    await env.DB.prepare(
      "UPDATE passwort_link SET benutzt_am = NULL WHERE token_hash = ?",
    )
      .bind(tokenHash)
      .run();
    throw grund;
  }
  return new Response(null, { status: 204 });
}
