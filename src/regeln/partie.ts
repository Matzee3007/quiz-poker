import {
  chipsNachRunde,
  istGueltigerEinsatz,
  MINDESTEINSATZ,
  START_CHIPS,
} from "./chips";
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

function rundenTeilnehmerFinden(partie: Partie, spielerId: string): Spieler {
  const spieler = partie.spieler.find((kandidat) => kandidat.id === spielerId);
  if (!spieler) {
    throw new Regelfehler("unbekannter-spieler");
  }
  if (!partie.rundenTeilnehmer.includes(spielerId)) {
    throw new Regelfehler("nicht-in-runde");
  }
  return spieler;
}

function ohneEintrag<T>(
  eintraege: Record<string, T>,
  schluessel: string,
): Record<string, T> {
  const kopie = { ...eintraege };
  delete kopie[schluessel];
  return kopie;
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
  if (partie.phase === "beendet") {
    throw new Regelfehler("falsche-phase");
  }

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

export function einsatzSetzen(
  partie: Partie,
  spielerId: string,
  einsatz: number,
): Partie {
  verlangePhase(partie, "einsatz");
  const spieler = rundenTeilnehmerFinden(partie, spielerId);
  if (!istGueltigerEinsatz(einsatz, spieler.chips)) {
    throw new Regelfehler("ungueltiger-einsatz");
  }

  return {
    ...partie,
    einsaetze: { ...partie.einsaetze, [spielerId]: einsatz },
  };
}

export function frageZeigen(partie: Partie): Partie {
  verlangePhase(partie, "einsatz");

  const einsaetze: Record<string, number> = {};
  for (const id of partie.rundenTeilnehmer) {
    einsaetze[id] = partie.einsaetze[id] ?? 0;
  }

  return { ...partie, phase: "antworten", einsaetze };
}

export function antwortBestaetigen(
  partie: Partie,
  spielerId: string,
  text: string,
): Partie {
  verlangePhase(partie, "antworten");
  rundenTeilnehmerFinden(partie, spielerId);
  const antwort = text.trim();
  if (antwort === "") {
    throw new Regelfehler("leere-antwort");
  }

  return {
    ...partie,
    antworten: { ...partie.antworten, [spielerId]: antwort },
  };
}

export function antwortZuruecknehmen(
  partie: Partie,
  spielerId: string,
): Partie {
  verlangePhase(partie, "antworten");
  rundenTeilnehmerFinden(partie, spielerId);

  return { ...partie, antworten: ohneEintrag(partie.antworten, spielerId) };
}

export function auswertungStarten(partie: Partie): Partie {
  verlangePhase(partie, "antworten");
  return { ...partie, phase: "auswertung" };
}

export function antwortBewerten(
  partie: Partie,
  spielerId: string,
  richtig: boolean,
): Partie {
  verlangePhase(partie, "auswertung");
  rundenTeilnehmerFinden(partie, spielerId);
  if (partie.antworten[spielerId] === undefined) {
    throw new Regelfehler("keine-antwort");
  }

  return {
    ...partie,
    bewertungen: { ...partie.bewertungen, [spielerId]: richtig },
  };
}

export function aufloesen(partie: Partie): Partie {
  verlangePhase(partie, "auswertung");
  const unbewertet = Object.keys(partie.antworten).some(
    (id) => partie.bewertungen[id] === undefined,
  );
  if (unbewertet) {
    throw new Regelfehler("nicht-bewertet");
  }

  return {
    ...partie,
    phase: "aufgeloest",
    spieler: partie.spieler.map((spieler) =>
      partie.rundenTeilnehmer.includes(spieler.id)
        ? {
            ...spieler,
            chips: chipsNachRunde(
              spieler.chips,
              partie.einsaetze[spieler.id] ?? 0,
              partie.bewertungen[spieler.id] === true,
            ),
          }
        : spieler,
    ),
  };
}

export function naechsteRunde(partie: Partie): Partie {
  verlangePhase(partie, "aufgeloest");

  const kategorie = partie.quiz.kategorien[partie.kategorieIndex];
  const weitereFrage = partie.frageIndex + 1 < kategorie.fragen.length;
  const weitereKategorie =
    partie.kategorieIndex + 1 < partie.quiz.kategorien.length;
  if (!weitereFrage && !weitereKategorie) {
    return { ...partie, phase: "beendet" };
  }

  const spieler = partie.spieler.map((kandidat) =>
    kandidat.chips === 0 ? { ...kandidat, chips: MINDESTEINSATZ } : kandidat,
  );

  return {
    ...partie,
    phase: "einsatz",
    kategorieIndex: weitereFrage
      ? partie.kategorieIndex
      : partie.kategorieIndex + 1,
    frageIndex: weitereFrage ? partie.frageIndex + 1 : 0,
    spieler,
    rundenTeilnehmer: spieler.map((kandidat) => kandidat.id),
    einsaetze: {},
    antworten: {},
    bewertungen: {},
  };
}

export function sieger(partie: Partie): Spieler[] {
  const hoechsterStand = Math.max(
    ...partie.spieler.map((spieler) => spieler.chips),
  );
  return partie.spieler.filter((spieler) => spieler.chips === hoechsterStand);
}

export function spielerEntfernen(partie: Partie, spielerId: string): Partie {
  if (partie.phase === "beendet") {
    throw new Regelfehler("falsche-phase");
  }
  if (!partie.spieler.some((spieler) => spieler.id === spielerId)) {
    throw new Regelfehler("unbekannter-spieler");
  }

  return {
    ...partie,
    spieler: partie.spieler.filter((spieler) => spieler.id !== spielerId),
    rundenTeilnehmer: partie.rundenTeilnehmer.filter((id) => id !== spielerId),
    einsaetze: ohneEintrag(partie.einsaetze, spielerId),
    antworten: ohneEintrag(partie.antworten, spielerId),
    bewertungen: ohneEintrag(partie.bewertungen, spielerId),
  };
}
