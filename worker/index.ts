import { istGueltigerRaumcode, raumcodeErzeugen } from "../src/regeln/raumcode";

export { Raumzaehler } from "./raumzaehler";
export { Spielraum } from "./spielraum";

const RAUMCODE_VERSUCHE = 10;

async function raumEroeffnen(env: Env): Promise<Response> {
  const zugelassen = await env.RAUMZAEHLER.getByName("global").raumZulassen(
    Number(env.RAEUME_PRO_STUNDE),
  );
  if (!zugelassen) {
    return Response.json({ code: "zu-viele-raeume" }, { status: 429 });
  }

  for (let versuch = 0; versuch < RAUMCODE_VERSUCHE; versuch++) {
    const raumcode = raumcodeErzeugen();
    const token = await env.SPIELRAUM.getByName(raumcode).eroeffnen();
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

    if (pathname === "/api/raeume" && anfrage.method === "POST") {
      return raumEroeffnen(env);
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
};
