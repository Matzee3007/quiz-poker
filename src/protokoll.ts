import type { QuizMasterAnsicht, SpielerAnsicht } from "./regeln/ansicht";
import type { RegelfehlerCode } from "./regeln/fehler";

/** Was ein Gerät dem Server schicken darf. */
export type Aktion =
  | { typ: "partie-starten" }
  | { typ: "frage-zeigen" }
  | { typ: "auswertung-starten" }
  | { typ: "aufloesen" }
  | { typ: "naechste-runde" }
  | { typ: "raum-schliessen" }
  | { typ: "einsatz-setzen"; einsatz: number }
  | { typ: "antwort-bestaetigen"; text: string }
  | { typ: "antwort-zuruecknehmen" }
  | { typ: "antwort-auswerten"; spielerId: string; richtig: boolean }
  | { typ: "rueckkehr-bestaetigen"; spielerId: string }
  | { typ: "rueckkehr-ablehnen"; spielerId: string }
  | { typ: "spieler-entfernen"; spielerId: string };

/** Was der Server einem Gerät schickt. */
export type ServerNachricht =
  | { typ: "ansicht"; ansicht: SpielerAnsicht | QuizMasterAnsicht }
  | { typ: "fehler"; code: RegelfehlerCode }
  | { typ: "wartet-auf-bestaetigung" }
  | { typ: "beendet"; code: number };

export const SCHLIESSCODE_UNBEKANNT = 4001;
export const SCHLIESSCODE_RAUM_GESCHLOSSEN = 4002;
export const SCHLIESSCODE_ERSETZT = 4003;

export function aktionLesen(roh: string): Aktion | null {
  let daten: unknown;
  try {
    daten = JSON.parse(roh);
  } catch {
    return null;
  }
  if (typeof daten !== "object" || daten === null) {
    return null;
  }

  const { typ, einsatz, text, spielerId, richtig } = daten as Record<
    string,
    unknown
  >;
  switch (typ) {
    case "partie-starten":
    case "frage-zeigen":
    case "auswertung-starten":
    case "aufloesen":
    case "naechste-runde":
    case "raum-schliessen":
    case "antwort-zuruecknehmen":
      return { typ };
    case "einsatz-setzen":
      return typeof einsatz === "number" ? { typ, einsatz } : null;
    case "antwort-bestaetigen":
      return typeof text === "string" ? { typ, text } : null;
    case "antwort-auswerten":
      return typeof spielerId === "string" && typeof richtig === "boolean"
        ? { typ, spielerId, richtig }
        : null;
    case "rueckkehr-bestaetigen":
    case "rueckkehr-ablehnen":
    case "spieler-entfernen":
      return typeof spielerId === "string" ? { typ, spielerId } : null;
    default:
      return null;
  }
}
