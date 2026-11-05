import { fehlercodeLesen } from "./raumEroeffnen";

export type KontoErgebnis = { ok: true } | { ok: false; code: string };

/**
 * Better Auth antwortet mit eigenen Fehlercodes in Großbuchstaben. Für die Oberfläche zählt nur der Status,
 * die eigenen Wege unter /api/konto schicken ihren Code selbst.
 */
async function senden(
  pfad: string,
  daten: unknown,
  codes: Record<number, string> = {},
): Promise<KontoErgebnis> {
  try {
    const antwort = await fetch(pfad, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(daten),
    });
    if (antwort.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      code: codes[antwort.status] ?? (await fehlercodeLesen(antwort)),
    };
  } catch {
    return { ok: false, code: "keine-verbindung" };
  }
}

export function anmelden(
  email: string,
  passwort: string,
): Promise<KontoErgebnis> {
  return senden(
    "/api/auth/sign-in/email",
    { email, password: passwort },
    { 401: "anmeldung-falsch", 429: "zu-viele-versuche" },
  );
}

export function abmelden(): Promise<KontoErgebnis> {
  return senden("/api/auth/sign-out", {});
}

export function registrieren(
  code: string,
  email: string,
  passwort: string,
): Promise<KontoErgebnis> {
  return senden("/api/konto/registrieren", { code, email, passwort });
}

export function passwortNeu(
  token: string,
  passwort: string,
): Promise<KontoErgebnis> {
  return senden("/api/konto/passwort-neu", { token, passwort });
}

export function kontoLoeschen(passwort: string): Promise<KontoErgebnis> {
  return senden(
    "/api/auth/delete-user",
    { password: passwort },
    {
      400: "passwort-falsch",
      401: "sitzung-abgelaufen",
      429: "zu-viele-versuche",
    },
  );
}

/** Die Adresse, null ohne Anmeldung, undefined wenn der Server gerade nicht antwortet. */
export async function angemeldeteAdresse(): Promise<string | null | undefined> {
  try {
    const antwort = await fetch("/api/auth/get-session");
    if (!antwort.ok) {
      return undefined;
    }
    const sitzung = (await antwort.json()) as {
      user: { email: string };
    } | null;
    return sitzung?.user.email ?? null;
  } catch {
    return undefined;
  }
}
