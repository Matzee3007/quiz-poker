import { BEISPIEL_QUIZ } from "../src/regeln/beispielQuiz";
import type { Quiz } from "../src/regeln/partie";
import { quizPruefen, type QuizFehlerCode } from "../src/regeln/quizpruefung";
import { istGueltigerRaumcode, raumcodeErzeugen } from "../src/regeln/raumcode";
import { aufraeumen } from "./aufraeumen";
import { auth } from "./auth";
import { kontoRegistrieren, passwortNeuSetzen } from "./konto";
import { quizAnfrage } from "./quizze";

export { Passwortrechner } from "./passwortrechner";
export { Raumzaehler } from "./raumzaehler";
export { Spielraum } from "./spielraum";

const RAUMCODE_VERSUCHE = 10;
// Better Auth bietet viel mehr an, zum Beispiel Namen ändern. Alles andere endet hier,
// auch bevor sein Zähler für unbekannte Pfade neue Zeilen in D1 schreibt.
const AUTH_WEGE = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-out",
  "/api/auth/get-session",
  "/api/auth/delete-user",
]);
const ANFRAGE_HOECHSTGROESSE = 256 * 1024;

/** Ohne Inhalt gilt das Beispiel-Quiz, sonst das mitgeschickte Einmal-Quiz. */
function quizAusAnfrage(
  text: string,
): { ok: true; quiz: Quiz } | { ok: false; code: QuizFehlerCode } {
  if (text === "") {
    return { ok: true, quiz: BEISPIEL_QUIZ };
  }
  try {
    const daten = JSON.parse(text) as { quiz?: unknown } | null;
    return quizPruefen(daten?.quiz);
  } catch {
    return { ok: false, code: "ungueltige-nachricht" };
  }
}

async function raumEroeffnen(anfrage: Request, env: Env): Promise<Response> {
  // Die Angabe spart das Lesen großer Anfragen. Sie kann fehlen, deshalb zählt danach die echte Größe.
  if (Number(anfrage.headers.get("Content-Length")) > ANFRAGE_HOECHSTGROESSE) {
    return Response.json({ code: "anfrage-zu-gross" }, { status: 413 });
  }
  const inhalt = await anfrage.arrayBuffer();
  if (inhalt.byteLength > ANFRAGE_HOECHSTGROESSE) {
    return Response.json({ code: "anfrage-zu-gross" }, { status: 413 });
  }
  const pruefung = quizAusAnfrage(new TextDecoder().decode(inhalt));
  if (!pruefung.ok) {
    return Response.json({ code: pruefung.code }, { status: 422 });
  }

  const zugelassen = await env.RAUMZAEHLER.getByName("global").raumZulassen(
    Number(env.RAEUME_PRO_STUNDE),
  );
  if (!zugelassen) {
    return Response.json({ code: "zu-viele-raeume" }, { status: 429 });
  }

  for (let versuch = 0; versuch < RAUMCODE_VERSUCHE; versuch++) {
    const raumcode = raumcodeErzeugen();
    const token = await env.SPIELRAUM.getByName(raumcode).eroeffnen(
      pruefung.quiz,
    );
    if (token) {
      return Response.json({ raumcode, token }, { status: 201 });
    }
  }
  return new Response("Kein freier Raumcode gefunden", { status: 503 });
}

async function nameLesen(anfrage: Request): Promise<string | null> {
  try {
    const { name } = (await anfrage.json()) as { name?: unknown };
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

async function namensAnfrage(
  anfrage: Request,
  env: Env,
  raumcode: string,
  weg: "spieler" | "rueckkehr",
): Promise<Response> {
  const name = await nameLesen(anfrage);
  if (name === null) {
    return Response.json({ code: "ungueltige-nachricht" }, { status: 422 });
  }

  const raum = env.SPIELRAUM.getByName(raumcode);
  const ergebnis =
    weg === "spieler"
      ? await raum.spielerAnlegen(name)
      : await raum.rueckkehrAnfragen(name);
  if (ergebnis.ok) {
    return Response.json(
      { token: ergebnis.token },
      { status: weg === "spieler" ? 201 : 202 },
    );
  }
  if (ergebnis.code === "raum-unbekannt") {
    return Response.json({ code: ergebnis.code }, { status: 404 });
  }
  return Response.json(
    { code: ergebnis.code },
    {
      status:
        ergebnis.code === "name-vergeben" || ergebnis.code === "anfrage-laeuft"
          ? 409
          : 422,
    },
  );
}

// Einstieg des Servers: Cloudflare ruft fetch für alle Anfragen an /api/* auf (siehe wrangler.jsonc).
export default {
  async fetch(anfrage: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(anfrage.url);

    if (pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }

    if (AUTH_WEGE.has(pathname)) {
      return auth.handler(anfrage);
    }

    if (pathname === "/api/konto/registrieren" && anfrage.method === "POST") {
      return kontoRegistrieren(anfrage, env);
    }

    if (pathname === "/api/konto/passwort-neu" && anfrage.method === "POST") {
      return passwortNeuSetzen(anfrage, env);
    }

    const quizTreffer =
      /^\/api\/quizze(?:\/([^/]+)(?:\/(sichtbarkeit|kopie))?)?$/.exec(pathname);
    if (quizTreffer) {
      const [, id, weg] = quizTreffer;
      return quizAnfrage(
        anfrage,
        env,
        id ?? null,
        (weg as "sichtbarkeit" | "kopie" | undefined) ?? null,
      );
    }

    if (pathname === "/api/raeume" && anfrage.method === "POST") {
      return raumEroeffnen(anfrage, env);
    }

    const treffer =
      /^\/api\/raeume\/([^/]+)\/(spieler|rueckkehr|verbindung)$/.exec(pathname);
    if (treffer) {
      const [, raumcode, weg] = treffer;
      if (!istGueltigerRaumcode(raumcode)) {
        return Response.json({ code: "raum-unbekannt" }, { status: 404 });
      }
      if (
        (weg === "spieler" || weg === "rueckkehr") &&
        anfrage.method === "POST"
      ) {
        return namensAnfrage(anfrage, env, raumcode, weg);
      }
      if (weg === "verbindung") {
        if (anfrage.headers.get("Upgrade") !== "websocket") {
          return new Response("WebSocket erforderlich", { status: 426 });
        }
        return env.SPIELRAUM.getByName(raumcode).fetch(anfrage);
      }
    }

    return new Response("Nicht gefunden", { status: 404 });
  },

  // Einstieg für den täglichen Lauf (siehe triggers in wrangler.jsonc).
  async scheduled(ereignis: ScheduledController, env: Env): Promise<void> {
    await aufraeumen(env, ereignis.scheduledTime);
  },
};
