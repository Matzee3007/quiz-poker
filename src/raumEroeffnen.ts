import type { Quiz } from "./regeln/partie";

export type Eroeffnung =
  { ok: true; raumcode: string; token: string } | { ok: false; code: string };

/** Ohne Quiz eröffnet der Server den Spielraum mit dem Beispiel-Quiz. */
export async function raumEroeffnen(quiz?: Quiz): Promise<Eroeffnung> {
  try {
    const antwort = await fetch("/api/raeume", {
      method: "POST",
      body: quiz ? JSON.stringify({ quiz }) : undefined,
    });
    const daten = (await antwort.json().catch(() => ({}))) as {
      raumcode?: string;
      token?: string;
      code?: string;
    };
    return antwort.ok && daten.raumcode && daten.token
      ? { ok: true, raumcode: daten.raumcode, token: daten.token }
      : { ok: false, code: daten.code ?? "" };
  } catch {
    return { ok: false, code: "keine-verbindung" };
  }
}
