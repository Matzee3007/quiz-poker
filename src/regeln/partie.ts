import { START_CHIPS } from "./chips";
import { Regelfehler } from "./fehler";

const MINDESTSPIELER = 2;
const HOECHSTSPIELER = 8;

export interface Frage {
  text: string;
  musterloesung: string;
}

export interface Kategorie {
  name: string;
  fragen: Frage[];
}

export interface Quiz {
  titel: string;
  kategorien: Kategorie[];
}

export interface Spieler {
  id: string;
  name: string;
  chips: number;
}

export type Phase =
  "warten" | "einsatz" | "antworten" | "auswertung" | "aufgeloest" | "beendet";

export interface Partie {
  quiz: Quiz;
  phase: Phase;
  kategorieIndex: number;
  frageIndex: number;
  spieler: Spieler[];
  /** Spieler-IDs, festgelegt zu Beginn jeder Runde. */
  rundenTeilnehmer: string[];
  einsaetze: Record<string, number>;
  /** Nur bestätigte Antworten. */
  antworten: Record<string, string>;
  bewertungen: Record<string, boolean>;
}

function verlangePhase(partie: Partie, phase: Phase): void {
  if (partie.phase !== phase) {
    throw new Regelfehler("falsche-phase");
  }
}

export function partieErstellen(quiz: Quiz): Partie {
  if (
    quiz.kategorien.length === 0 ||
    quiz.kategorien.some((kategorie) => kategorie.fragen.length === 0)
  ) {
    throw new Regelfehler("leeres-quiz");
  }

  return {
    quiz,
    phase: "warten",
    kategorieIndex: 0,
    frageIndex: 0,
    spieler: [],
    rundenTeilnehmer: [],
    einsaetze: {},
    antworten: {},
    bewertungen: {},
  };
}

export function spielerBeitreten(
  partie: Partie,
  id: string,
  name: string,
): Partie {
  const sauberName = name.trim();
  if (sauberName === "") {
    throw new Regelfehler("leerer-name");
  }

  const vergeben = partie.spieler.some(
    (spieler) =>
      spieler.id === id ||
      spieler.name.toLowerCase() === sauberName.toLowerCase(),
  );
  if (vergeben) {
    throw new Regelfehler("name-vergeben");
  }

  if (partie.spieler.length >= HOECHSTSPIELER) {
    throw new Regelfehler("raum-voll");
  }

  return {
    ...partie,
    spieler: [...partie.spieler, { id, name: sauberName, chips: START_CHIPS }],
  };
}

export function partieStarten(partie: Partie): Partie {
  verlangePhase(partie, "warten");
  if (partie.spieler.length < MINDESTSPIELER) {
    throw new Regelfehler("zu-wenige-spieler");
  }

  return {
    ...partie,
    phase: "einsatz",
    rundenTeilnehmer: partie.spieler.map((spieler) => spieler.id),
  };
}

export function aktuelleRunde(partie: Partie): {
  kategorie: string;
  frage: Frage;
} {
  const kategorie = partie.quiz.kategorien[partie.kategorieIndex];
  return {
    kategorie: kategorie.name,
    frage: kategorie.fragen[partie.frageIndex],
  };
}
