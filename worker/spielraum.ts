import { DurableObject } from "cloudflare:workers";

/** Ein Spielraum: hält die Verbindungen und den gespeicherten Spielstand. */
export class Spielraum extends DurableObject<Env> {
  async fetch(): Promise<Response> {
    const paar = new WebSocketPair();
    this.ctx.acceptWebSocket(paar[1]);
    return new Response(null, { status: 101, webSocket: paar[0] });
  }

  async webSocketMessage(verbindung: WebSocket): Promise<void> {
    verbindung.send(
      JSON.stringify({ typ: "fehler", code: "ungueltige-nachricht" }),
    );
  }
}
