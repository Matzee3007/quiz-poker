export type RegelfehlerCode =
  | "falsche-phase"
  | "unbekannter-spieler"
  | "nicht-in-runde"
  | "leerer-name"
  | "name-vergeben"
  | "raum-voll"
  | "zu-wenige-spieler"
  | "ungueltiger-einsatz"
  | "leere-antwort"
  | "keine-antwort"
  | "nicht-ausgewertet"
  | "leeres-quiz";

/** Ein Verstoß gegen die Spielregeln. Die Meldung ist der Code. */
export class Regelfehler extends Error {
  constructor(code: RegelfehlerCode) {
    super(code);
    this.name = "Regelfehler";
  }
}
