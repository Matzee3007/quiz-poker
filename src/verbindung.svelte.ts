import {
  SCHLIESSCODE_ERSETZT,
  SCHLIESSCODE_RAUM_GESCHLOSSEN,
  SCHLIESSCODE_UNBEKANNT,
  type Aktion,
  type ServerNachricht,
} from "./protokoll";
import type { QuizMasterAnsicht, SpielerAnsicht } from "./regeln/ansicht";
import type { RegelfehlerCode } from "./regeln/fehler";

export type Zustand =
  | "verbinden"
  | "verbunden"
  | "wartet"
  | "unbekannt"
  | "geschlossen"
  | "ersetzt";

const WARTEZEITEN_MS = [1000, 2000, 4000, 10000];

/** Hält die WebSocket-Verbindung eines Geräts und verbindet nach Abbrüchen neu. */
export class Verbindung {
  ansicht = $state<SpielerAnsicht | QuizMasterAnsicht | null>(null);
  fehler = $state<RegelfehlerCode | "keine-verbindung" | null>(null);
  zustand = $state<Zustand>("verbinden");
  /** Das Gerät wartete auf den Quiz-Master, ein Unbekannt-Schließen heißt dann „Anfrage beendet“. */
  warteteAufBestaetigung = $state(false);

  private socket: WebSocket | null = null;
  private versuche = 0;
  private beendet = false;
  private raumcode: string;
  private token: string;

  constructor(raumcode: string, token: string) {
    this.raumcode = raumcode;
    this.token = token;
    this.oeffnen();
  }

  private oeffnen(): void {
    const protokoll = location.protocol === "https:" ? "wss" : "ws";
    const adresse = `${protokoll}://${location.host}/api/raeume/${this.raumcode}/verbindung?token=${encodeURIComponent(this.token)}`;
    const socket = new WebSocket(adresse);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.versuche = 0;
    });
    socket.addEventListener("message", (ereignis) => {
      this.nachrichtVerarbeiten(
        JSON.parse(ereignis.data as string) as ServerNachricht,
      );
    });
    socket.addEventListener("close", (ereignis) => {
      this.schliessenVerarbeiten(ereignis.code);
    });
  }

  private nachrichtVerarbeiten(nachricht: ServerNachricht): void {
    switch (nachricht.typ) {
      case "ansicht":
        // Eine Fehlermeldung gilt nur für den Schritt, in dem sie entstand.
        if (
          this.ansicht?.phase !== nachricht.ansicht.phase ||
          this.ansicht?.rundeInKategorie !== nachricht.ansicht.rundeInKategorie
        ) {
          this.fehler = null;
        }
        this.ansicht = nachricht.ansicht;
        this.zustand = "verbunden";
        this.warteteAufBestaetigung = false;
        break;
      case "fehler":
        this.fehler = nachricht.code;
        break;
      case "wartet-auf-bestaetigung":
        this.zustand = "wartet";
        this.warteteAufBestaetigung = true;
        break;
      case "beendet":
        this.schliessenVerarbeiten(nachricht.code);
        break;
    }
  }

  private schliessenVerarbeiten(code: number): void {
    if (this.beendet) {
      return;
    }
    if (code === SCHLIESSCODE_UNBEKANNT) {
      this.zustand = "unbekannt";
      this.beendet = true;
    } else if (code === SCHLIESSCODE_RAUM_GESCHLOSSEN) {
      this.zustand = "geschlossen";
      this.beendet = true;
    } else if (code === SCHLIESSCODE_ERSETZT) {
      this.zustand = "ersetzt";
      this.beendet = true;
    } else {
      this.zustand = "verbinden";
      const wartezeit =
        WARTEZEITEN_MS[Math.min(this.versuche, WARTEZEITEN_MS.length - 1)];
      this.versuche += 1;
      setTimeout(() => {
        if (!this.beendet) {
          this.oeffnen();
        }
      }, wartezeit);
    }
  }

  senden(aktion: Aktion): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.fehler = "keine-verbindung";
      return;
    }
    this.fehler = null;
    this.socket.send(JSON.stringify(aktion));
  }

  beenden(): void {
    this.beendet = true;
    this.socket?.close();
  }
}

function tokenSchluessel(raumcode: string): string {
  return `quiz-poker:${raumcode}`;
}

export function tokenLesen(raumcode: string): string | null {
  return localStorage.getItem(tokenSchluessel(raumcode));
}

export function tokenSpeichern(raumcode: string, token: string): void {
  localStorage.setItem(tokenSchluessel(raumcode), token);
}

export function tokenLoeschen(raumcode: string): void {
  localStorage.removeItem(tokenSchluessel(raumcode));
}
