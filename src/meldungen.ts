const MELDUNGEN: Record<string, string> = {
  "falsche-phase": "Das geht in diesem Schritt nicht.",
  "unbekannter-spieler": "Diesen Spieler gibt es in diesem Spielraum nicht.",
  "nicht-in-runde": "Du spielst erst ab der nächsten Runde mit.",
  "leerer-name": "Bitte gib einen Namen ein.",
  "name-vergeben": "Dieser Name ist schon vergeben.",
  "id-vergeben": "Dieser Platz ist schon vergeben.",
  "name-zu-lang": "Der Name darf höchstens 20 Zeichen haben.",
  "letzte-runde":
    "Die letzte Runde läuft schon, ein Einstieg ist nicht mehr möglich.",
  "raum-voll": "Der Spielraum ist voll.",
  "zu-wenige-spieler": "Zum Start braucht es mindestens 2 Spieler.",
  "ungueltiger-einsatz": "Dieser Einsatz ist nicht erlaubt.",
  "leere-antwort": "Bitte gib eine Antwort ein.",
  "antwort-zu-lang": "Die Antwort darf höchstens 200 Zeichen haben.",
  "keine-antwort": "Dieser Spieler hat nicht geantwortet.",
  "nicht-ausgewertet": "Es sind noch nicht alle Antworten ausgewertet.",
  "keine-berechtigung": "Das darfst du in dieser Rolle nicht.",
  "ungueltige-nachricht": "Der Server hat die Eingabe nicht verstanden.",
  "anfrage-laeuft": "Für diesen Namen läuft schon eine Rückkehr-Anfrage.",
  "leeres-quiz":
    "Das Quiz braucht mindestens eine Kategorie und je Kategorie eine Frage.",
  "leeres-feld": "Bitte fülle alle markierten Felder aus.",
  "zu-viele-kategorien": "Ein Quiz darf höchstens 10 Kategorien haben.",
  "zu-viele-fragen": "Eine Kategorie darf höchstens 10 Fragen haben.",
  "text-zu-lang": "Ein Text im Quiz ist zu lang.",
  "anfrage-zu-gross": "Das Quiz ist zu groß.",
  "keine-verbindung":
    "Gerade besteht keine Verbindung. Das wurde nicht übernommen, bitte versuche es gleich noch einmal.",
  "raum-unbekannt": "Diesen Spielraum gibt es nicht.",
  "zu-viele-raeume":
    "Gerade wurden zu viele Spielräume eröffnet. Bitte versuche es später noch einmal.",
};

export function meldungFuer(code: string): string {
  return MELDUNGEN[code] ?? "Das hat leider nicht geklappt.";
}
