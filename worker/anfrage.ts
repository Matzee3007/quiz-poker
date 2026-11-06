// Gemeinsame Hilfen für Anfragen von der eigenen Seite.

export function fehler(status: number, code: string): Response {
  return Response.json({ code }, { status });
}

/** Liest eine Anfrage von der eigenen Seite. Die Antwort ist der Fehler, wenn sie abgelehnt wird. */
export async function eingabeLesen(
  anfrage: Request,
  env: Env,
  hoechstgroesse: number,
): Promise<Record<string, unknown> | Response> {
  if (anfrage.headers.get("Origin") !== new URL(env.BETTER_AUTH_URL).origin) {
    return fehler(403, "fremde-herkunft");
  }
  // Die Angabe spart das Lesen großer Anfragen. Sie kann fehlen, deshalb zählt danach die echte Größe.
  if (Number(anfrage.headers.get("Content-Length")) > hoechstgroesse) {
    return fehler(413, "anfrage-zu-gross");
  }
  const inhalt = await anfrage.arrayBuffer();
  if (inhalt.byteLength > hoechstgroesse) {
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
