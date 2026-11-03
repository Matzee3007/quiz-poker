import { DurableObject } from "cloudflare:workers";
import {
  aktionLesen,
  SCHLIESSCODE_ERSETZT,
  SCHLIESSCODE_RAUM_GESCHLOSSEN,
  SCHLIESSCODE_UNBEKANNT,
  type Aktion,
  type ServerNachricht,
} from "../src/protokoll";
import { quizMasterAnsicht, spielerAnsicht } from "../src/regeln/ansicht";
import { BEISPIEL_QUIZ } from "../src/regeln/beispielQuiz";
import { Regelfehler, type RegelfehlerCode } from "../src/regeln/fehler";
import {
  antwortAuswerten,
  antwortBestaetigen,
  antwortZuruecknehmen,
  aufloesen,
  auswertungStarten,
  einsatzSetzen,
  frageZeigen,
  naechsteRunde,
  partieErstellen,
  partieStarten,
  spielerBeitreten,
  spielerEntfernen,
  spielerNachName,
  type Partie,
} from "../src/regeln/partie";

const STAND_SCHLUESSEL = "stand";
const LEBENSDAUER_MS = 24 * 60 * 60 * 1000;

interface RueckkehrAnfrage {
  token: string;
  spielerId: string;
}

/** Alles, was das Einschlafen überstehen muss. */
interface Raumstand {
  partie: Partie;
  quizMasterToken: string;
  /** Token → Spieler-ID */
  spielerTokens: Record<string, string>;
  rueckkehrAnfragen: RueckkehrAnfrage[];
}

/** Hängt an jeder Verbindung und übersteht das Einschlafen. */
type Zugang =
  | { rolle: "quiz-master"; token: string }
  | { rolle: "spieler"; token: string; spielerId: string }
  | { rolle: "wartend"; token: string; spielerId: string };

export type BeitrittsErgebnis =
  | { ok: true; token: string }
  | { ok: false; code: RegelfehlerCode | "raum-unbekannt" };

/** Ein Spielraum: hält die Verbindungen und den gespeicherten Spielstand. */
export class Spielraum extends DurableObject<Env> {
  private standLesen(): Promise<Raumstand | undefined> {
    return this.ctx.storage.get<Raumstand>(STAND_SCHLUESSEL);
  }

  /**
   * Speichert den Stand und verschiebt das automatische Löschen des Raums.
   * Ohne await dazwischen landen beide Schreibvorgänge gemeinsam im Speicher.
   */
  private standSpeichern(stand: Raumstand): Promise<void> {
    void this.ctx.storage.put(STAND_SCHLUESSEL, stand);
    return this.ctx.storage.setAlarm(Date.now() + LEBENSDAUER_MS);
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
      rueckkehrAnfragen: [],
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

  /**
   * Ein Spieler möchte auf einem neuen Gerät zurück, der Quiz-Master muss das bestätigen.
   * Die erste Anfrage gilt, solange ihr Gerät verbunden ist.
   */
  async rueckkehrAnfragen(name: string): Promise<BeitrittsErgebnis> {
    const stand = await this.standLesen();
    if (!stand) {
      return { ok: false, code: "raum-unbekannt" };
    }

    const spieler = spielerNachName(stand.partie, name);
    if (!spieler) {
      return { ok: false, code: "unbekannter-spieler" };
    }
    const offen = stand.rueckkehrAnfragen.find(
      (anfrage) => anfrage.spielerId === spieler.id,
    );
    if (offen && this.istVerbunden(offen.token)) {
      return { ok: false, code: "anfrage-laeuft" };
    }

    const token = crypto.randomUUID();
    stand.rueckkehrAnfragen = stand.rueckkehrAnfragen.filter(
      (anfrage) => anfrage !== offen,
    );
    stand.rueckkehrAnfragen.push({ token, spielerId: spieler.id });
    await this.standSpeichern(stand);
    return { ok: true, token };
  }

  private istVerbunden(token: string): boolean {
    return this.offeneVerbindungen().some(
      (verbindung) => zugangVon(verbindung)?.token === token,
    );
  }

  /** Wirft die Anfrage eines Spielers weg und schließt das wartende Gerät. */
  private anfrageEntfernen(stand: Raumstand, spielerId: string): void {
    for (const anfrage of stand.rueckkehrAnfragen) {
      if (anfrage.spielerId === spielerId) {
        this.verbindungenSchliessen(
          anfrage.token,
          SCHLIESSCODE_UNBEKANNT,
          "Anfrage abgelehnt",
        );
      }
    }
    stand.rueckkehrAnfragen = stand.rueckkehrAnfragen.filter(
      (anfrage) => anfrage.spielerId !== spielerId,
    );
  }

  private verbindungenSchliessen(
    token: string,
    code: number,
    grund: string,
    ausser?: WebSocket,
  ): void {
    for (const verbindung of this.offeneVerbindungen(ausser)) {
      if (zugangVon(verbindung)?.token === token) {
        schliessen(verbindung, code, grund);
      }
    }
  }

  private spielerTokensLoeschen(stand: Raumstand, spielerId: string): void {
    for (const [token, id] of Object.entries(stand.spielerTokens)) {
      if (id === spielerId) {
        delete stand.spielerTokens[token];
        this.verbindungenSchliessen(
          token,
          SCHLIESSCODE_ERSETZT,
          "Platz nicht mehr gültig",
        );
      }
    }
  }

  private rueckkehrBestaetigen(stand: Raumstand, spielerId: string): void {
    const anfrage = stand.rueckkehrAnfragen.find(
      (kandidat) =>
        kandidat.spielerId === spielerId && this.istVerbunden(kandidat.token),
    );
    if (!anfrage) {
      throw new Regelfehler("unbekannter-spieler");
    }

    this.spielerTokensLoeschen(stand, spielerId);
    stand.spielerTokens[anfrage.token] = spielerId;
    stand.rueckkehrAnfragen = stand.rueckkehrAnfragen.filter(
      (kandidat) => kandidat !== anfrage,
    );
    for (const verbindung of this.offeneVerbindungen()) {
      if (zugangVon(verbindung)?.token === anfrage.token) {
        verbindung.serializeAttachment({
          rolle: "spieler",
          token: anfrage.token,
          spielerId,
        } satisfies Zugang);
      }
    }
  }

  /** Löscht den Raum und schließt alle Geräte. */
  private async raumSchliessen(): Promise<void> {
    for (const verbindung of this.offeneVerbindungen()) {
      schliessen(
        verbindung,
        SCHLIESSCODE_RAUM_GESCHLOSSEN,
        "Spielraum geschlossen",
      );
    }
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  async alarm(): Promise<void> {
    await this.raumSchliessen();
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
      schliessen(verbindung, SCHLIESSCODE_UNBEKANNT, "Unbekanntes Token");
      return antwort;
    }

    this.verbindungenSchliessen(
      token,
      SCHLIESSCODE_ERSETZT,
      "Auf einem anderen Gerät geöffnet",
      verbindung,
    );
    verbindung.serializeAttachment(zugang);
    if (zugang.rolle === "wartend") {
      senden(verbindung, { typ: "wartet-auf-bestaetigung" });
    }
    this.ansichtenVerteilen(stand);
    return antwort;
  }

  async webSocketMessage(
    verbindung: WebSocket,
    roh: string | ArrayBuffer,
  ): Promise<void> {
    const anhang = zugangVon(verbindung);
    const stand = await this.standLesen();
    const zugang = anhang && stand && zugangFinden(stand, anhang.token);
    // Eine schon ersetzte oder entfernte Verbindung darf nichts mehr auslösen.
    if (!stand || !zugang) {
      return;
    }
    if (zugang.rolle === "wartend") {
      senden(verbindung, { typ: "fehler", code: "keine-berechtigung" });
      return;
    }

    const aktion = typeof roh === "string" ? aktionLesen(roh) : null;
    if (!aktion) {
      senden(verbindung, { typ: "fehler", code: "ungueltige-nachricht" });
      return;
    }

    try {
      if (aktion.typ === "raum-schliessen") {
        nurQuizMaster(zugang);
        await this.raumSchliessen();
        return;
      }
      this.aktionAusfuehren(stand, aktion, zugang);
    } catch (fehler) {
      if (fehler instanceof Regelfehler) {
        senden(verbindung, {
          typ: "fehler",
          code: fehler.message as RegelfehlerCode,
        });
        return;
      }
      throw fehler;
    }

    await this.standSpeichern(stand);
    this.ansichtenVerteilen(stand);
  }

  private aktionAusfuehren(
    stand: Raumstand,
    aktion: Exclude<Aktion, { typ: "raum-schliessen" }>,
    zugang: Zugang,
  ): void {
    const { partie } = stand;
    switch (aktion.typ) {
      case "einsatz-setzen":
        stand.partie = einsatzSetzen(
          partie,
          spielerIdVon(zugang),
          aktion.einsatz,
        );
        break;
      case "antwort-bestaetigen":
        stand.partie = antwortBestaetigen(
          partie,
          spielerIdVon(zugang),
          aktion.text,
        );
        break;
      case "antwort-zuruecknehmen":
        stand.partie = antwortZuruecknehmen(partie, spielerIdVon(zugang));
        break;
      case "partie-starten":
        nurQuizMaster(zugang);
        stand.partie = partieStarten(partie);
        break;
      case "frage-zeigen":
        nurQuizMaster(zugang);
        stand.partie = frageZeigen(partie);
        break;
      case "auswertung-starten":
        nurQuizMaster(zugang);
        stand.partie = auswertungStarten(partie);
        break;
      case "antwort-auswerten":
        nurQuizMaster(zugang);
        stand.partie = antwortAuswerten(
          partie,
          aktion.spielerId,
          aktion.richtig,
        );
        break;
      case "aufloesen":
        nurQuizMaster(zugang);
        stand.partie = aufloesen(partie);
        break;
      case "naechste-runde":
        nurQuizMaster(zugang);
        stand.partie = naechsteRunde(partie);
        break;
      case "rueckkehr-bestaetigen":
        nurQuizMaster(zugang);
        this.rueckkehrBestaetigen(stand, aktion.spielerId);
        break;
      case "rueckkehr-ablehnen":
        nurQuizMaster(zugang);
        this.anfrageEntfernen(stand, aktion.spielerId);
        break;
      case "spieler-entfernen":
        nurQuizMaster(zugang);
        stand.partie = spielerEntfernen(partie, aktion.spielerId);
        this.anfrageEntfernen(stand, aktion.spielerId);
        this.spielerTokensLoeschen(stand, aktion.spielerId);
        break;
      default:
        aktion satisfies never;
    }
  }

  async webSocketClose(verbindung: WebSocket): Promise<void> {
    await this.verbindungBeendet(verbindung);
  }

  async webSocketError(verbindung: WebSocket): Promise<void> {
    await this.verbindungBeendet(verbindung);
  }

  private async verbindungBeendet(verbindung: WebSocket): Promise<void> {
    const stand = await this.standLesen();
    if (!stand) {
      return;
    }

    const zugang = zugangVon(verbindung);
    // Eine neue Verbindung mit demselben Token ersetzt die alte, die Anfrage bleibt dann bestehen.
    const ersetzt = this.offeneVerbindungen(verbindung).some(
      (andere) => zugangVon(andere)?.token === zugang?.token,
    );
    if (zugang?.rolle === "wartend" && !ersetzt) {
      stand.rueckkehrAnfragen = stand.rueckkehrAnfragen.filter(
        (anfrage) => anfrage.token !== zugang.token,
      );
      await this.standSpeichern(stand);
    }
    this.ansichtenVerteilen(stand, verbindung);
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
    const verbundeneTokens = offen.flatMap((verbindung) => {
      const zugang = zugangVon(verbindung);
      return zugang ? [zugang.token] : [];
    });
    const verbundeneIds = offen.flatMap((verbindung) => {
      const zugang = zugangVon(verbindung);
      return zugang?.rolle === "spieler" ? [zugang.spielerId] : [];
    });
    const anfragen = stand.rueckkehrAnfragen.flatMap(({ token, spielerId }) => {
      const spieler = stand.partie.spieler.find((s) => s.id === spielerId);
      return spieler && verbundeneTokens.includes(token)
        ? [{ spielerId, name: spieler.name }]
        : [];
    });

    for (const verbindung of offen) {
      const zugang = zugangVon(verbindung);
      if (zugang?.rolle === "quiz-master") {
        senden(verbindung, {
          typ: "ansicht",
          ansicht: quizMasterAnsicht(stand.partie, verbundeneIds, anfragen),
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

function nurQuizMaster(zugang: Zugang): void {
  if (zugang.rolle !== "quiz-master") {
    throw new Regelfehler("keine-berechtigung");
  }
}

function spielerIdVon(zugang: Zugang): string {
  if (zugang.rolle !== "spieler") {
    throw new Regelfehler("keine-berechtigung");
  }
  return zugang.spielerId;
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
  const anfrage = stand.rueckkehrAnfragen.find(
    (kandidat) => kandidat.token === token,
  );
  if (anfrage) {
    return { rolle: "wartend", token, spielerId: anfrage.spielerId };
  }
  return null;
}

/** Das Schließ-Signal kann verzögert ankommen, deshalb geht vorher eine eigene Nachricht hinaus. */
function schliessen(verbindung: WebSocket, code: number, grund: string): void {
  senden(verbindung, { typ: "beendet", code });
  verbindung.close(code, grund);
}

/** Sendet nur an offene Verbindungen, eine schließende würde sonst einen Fehler werfen. */
function senden(verbindung: WebSocket, nachricht: ServerNachricht): void {
  if (verbindung.readyState === WebSocket.READY_STATE_OPEN) {
    verbindung.send(JSON.stringify(nachricht));
  }
}
