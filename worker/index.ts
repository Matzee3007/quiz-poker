export { Spielraum } from "./spielraum";

// Einstieg des Servers: Cloudflare ruft fetch für alle Anfragen an /api/* auf (siehe wrangler.jsonc).
export default {
  async fetch(anfrage: Request): Promise<Response> {
    const { pathname } = new URL(anfrage.url);

    if (pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }

    return new Response("Nicht gefunden", { status: 404 });
  },
};
