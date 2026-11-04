import type { Quiz } from "./regeln/partie";

export type Eroeffnung =
  { ok: true; raumcode: string; token: string } | { ok: false; code: string };

/** Liest den Fehlercode aus der Antwort des Servers, leer ohne lesbares JSON. */
export async function fehlercodeLesen(antwort: Response): Promise<string> {
  const daten = (await antwort.json().catch(() => ({}))) as { code?: string };
  return daten.code ?? "";
}

/** Ohne Quiz eröffnet der Server den Spielraum mit dem Beispiel-Quiz. */
export async function raumEroeffnen(quiz?: Quiz): Promise<Eroeffnung> {
  try {
    const antwort = await fetch("/api/raeume", {
      method: "POST",
      body: quiz ? JSON.stringify({ quiz }) : undefined,
    });
    if (!antwort.ok) {
      return { ok: false, code: await fehlercodeLesen(antwort) };
    }
    const daten = (await antwort.json()) as { raumcode: string; token: string };
    return { ok: true, raumcode: daten.raumcode, token: daten.token };
  } catch {
    return { ok: false, code: "keine-verbindung" };
  }
}
