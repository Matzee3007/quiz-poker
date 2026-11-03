import { DurableObject } from "cloudflare:workers";
import {
  SCHLIESSCODE_ERSETZT,
  SCHLIESSCODE_UNBEKANNT,
  type ServerNachricht,
} from "../src/protokoll";
import { quizMasterAnsicht, spielerAnsicht } from "../src/regeln/ansicht";
import { BEISPIEL_QUIZ } from "../src/regeln/beispielQuiz";
import { Regelfehler, type RegelfehlerCode } from "../src/regeln/fehler";
import {
  partieErstellen,
  spielerBeitreten,
  type Partie,
} from "../src/regeln/partie";

const STAND_SCHLUESSEL = "stand";

/** Alles, was das Einschlafen überstehen muss. */
interface Raumstand {
  partie: Partie;
  quizMasterToken: string;
  /** Token → Spieler-ID */
  spielerTokens: Record<string, string>;
}

/** Hängt an jeder Verbindung und übersteht das Einschlafen. */
type Zugang =
  | { rolle: "quiz-master"; token: string }
  | { rolle: "spieler"; token: string; spielerId: string };

export type BeitrittsErgebnis =
  | { ok: true; token: string }
  | { ok: false; code: RegelfehlerCode | "raum-unbekannt" };

/** Ein Spielraum: hält die Verbindungen und den gespeicherten Spielstand. */
export class Spielraum extends DurableObject<Env> {
  private standLesen(): Promise<Raumstand | undefined> {
    return this.ctx.storage.get<Raumstand>(STAND_SCHLUESSEL);
  }

  private standSpeichern(stand: Raumstand): Promise<void> {
    return this.ctx.storage.put(STAND_SCHLUESSEL, stand);
  }

  /** Legt den Raum an. Liefert das Quiz-Master-Token oder null, wenn der Raum schon belegt ist. */
  async eroeffnen(): Promise<string | null> {
    if (await this.standLesen()) {
      return null;
    }

    const quizMasterToken = crypto.randomUUID();
    await this.standSpeichern({
      partie: partieErstellen(BEISPIEL_QUIZ),
      quizMasterToken,
      spielerTokens: {},
    });
    return quizMasterToken;
  }

  async spielerAnlegen(name: string): Promise<BeitrittsErgebnis> {
    const stand = await this.standLesen();
    if (!stand) {
      return { ok: false, code: "raum-unbekannt" };
    }

    const spielerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    try {
      stand.partie = spielerBeitreten(stand.partie, spielerId, name);
    } catch (fehler) {
      if (fehler instanceof Regelfehler) {
        return { ok: false, code: fehler.message as RegelfehlerCode };
      }
      throw fehler;
    }
    stand.spielerTokens[token] = spielerId;
    await this.standSpeichern(stand);
    this.ansichtenVerteilen(stand);
    return { ok: true, token };
  }

  async fetch(anfrage: Request): Promise<Response> {
    const token = new URL(anfrage.url).searchParams.get("token") ?? "";
    const paar = new WebSocketPair();
    const verbindung = paar[1];
    this.ctx.acceptWebSocket(verbindung);
    const antwort = new Response(null, { status: 101, webSocket: paar[0] });

    const stand = await this.standLesen();
    const zugang = stand && zugangFinden(stand, token);
    if (!stand || !zugang) {
      verbindung.close(SCHLIESSCODE_UNBEKANNT, "Unbekanntes Token");
      return antwort;
    }

    for (const andere of this.offeneVerbindungen()) {
      if (andere !== verbindung && zugangVon(andere)?.token === token) {
        andere.close(SCHLIESSCODE_ERSETZT, "Auf einem anderen Gerät geöffnet");
      }
    }
    verbindung.serializeAttachment(zugang);
    this.ansichtenVerteilen(stand);
    return antwort;
  }

  async webSocketClose(verbindung: WebSocket): Promise<void> {
    const stand = await this.standLesen();
    if (stand) {
      this.ansichtenVerteilen(stand, verbindung);
    }
  }

  private offeneVerbindungen(ausser?: WebSocket): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter(
        (verbindung) =>
          verbindung !== ausser &&
          verbindung.readyState === WebSocket.READY_STATE_OPEN,
      );
  }

  private ansichtenVerteilen(stand: Raumstand, ausser?: WebSocket): void {
    const offen = this.offeneVerbindungen(ausser);
    const verbundeneIds = offen.flatMap((verbindung) => {
      const zugang = zugangVon(verbindung);
      return zugang?.rolle === "spieler" ? [zugang.spielerId] : [];
    });

    for (const verbindung of offen) {
      const zugang = zugangVon(verbindung);
      if (zugang?.rolle === "quiz-master") {
        senden(verbindung, {
          typ: "ansicht",
          ansicht: quizMasterAnsicht(stand.partie, verbundeneIds, []),
        });
      } else if (zugang?.rolle === "spieler") {
        senden(verbindung, {
          typ: "ansicht",
          ansicht: spielerAnsicht(
            stand.partie,
            zugang.spielerId,
            verbundeneIds,
          ),
        });
      }
    }
  }
}

function zugangVon(verbindung: WebSocket): Zugang | null {
  return verbindung.deserializeAttachment() as Zugang | null;
}

function zugangFinden(stand: Raumstand, token: string): Zugang | null {
  if (token === stand.quizMasterToken) {
    return { rolle: "quiz-master", token };
  }
  if (Object.hasOwn(stand.spielerTokens, token)) {
    return { rolle: "spieler", token, spielerId: stand.spielerTokens[token] };
  }
  return null;
}

function senden(verbindung: WebSocket, nachricht: ServerNachricht): void {
  verbindung.send(JSON.stringify(nachricht));
}
