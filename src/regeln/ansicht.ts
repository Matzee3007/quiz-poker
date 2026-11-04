import { aktuelleRunde, sieger, type Partie, type Phase } from "./partie";

export interface SpielerZeile {
  id: string;
  name: string;
  chips: number;
  verbunden: boolean;
  spieltMit: boolean;
  hatGesetzt: boolean;
  istBereit: boolean;
  einsatz: number | null;
  antwort: string | null;
  richtig: boolean | null;
}

export interface GemeinsameAnsicht {
  phase: Phase;
  quizTitel: string;
  /** Zählt über alle Kategorien, anders als Name und Runde der Kategorie eindeutig. */
  rundeNummer: number;
  kategorie: string | null;
  rundeInKategorie: number;
  rundenInKategorie: number;
  frage: string | null;
  musterloesung: string | null;
  spieler: SpielerZeile[];
  sieger: string[];
}

export interface SpielerAnsicht extends GemeinsameAnsicht {
  rolle: "spieler";
  ichId: string;
}

export interface RueckkehrAnfrage {
  spielerId: string;
  name: string;
}

export interface QuizMasterAnsicht extends GemeinsameAnsicht {
  rolle: "quiz-master";
  rueckkehrAnfragen: RueckkehrAnfrage[];
}

function istAufgeloest(partie: Partie): boolean {
  return partie.phase === "aufgeloest" || partie.phase === "beendet";
}

function gemeinsameAnsicht(
  partie: Partie,
  verbundeneIds: string[],
): Omit<GemeinsameAnsicht, "frage" | "musterloesung"> {
  const gestartet = partie.phase !== "warten";

  const fruehereRunden = partie.quiz.kategorien
    .slice(0, partie.kategorieIndex)
    .reduce((summe, kategorie) => summe + kategorie.fragen.length, 0);

  return {
    phase: partie.phase,
    quizTitel: partie.quiz.titel,
    rundeNummer: fruehereRunden + partie.frageIndex + 1,
    kategorie: gestartet ? aktuelleRunde(partie).kategorie : null,
    rundeInKategorie: partie.frageIndex + 1,
    rundenInKategorie:
      partie.quiz.kategorien[partie.kategorieIndex].fragen.length,
    sieger:
      partie.phase === "beendet"
        ? sieger(partie).map((spieler) => spieler.id)
        : [],
    spieler: partie.spieler.map((spieler) => ({
      id: spieler.id,
      name: spieler.name,
      chips: spieler.chips,
      verbunden: verbundeneIds.includes(spieler.id),
      spieltMit: partie.rundenSpieler.includes(spieler.id),
      hatGesetzt: (partie.einsaetze[spieler.id] ?? 0) > 0,
      istBereit: partie.antworten[spieler.id] !== undefined,
      einsatz: null,
      antwort: null,
      richtig: null,
    })),
  };
}

function mitGeheimem(partie: Partie, zeile: SpielerZeile): SpielerZeile {
  return {
    ...zeile,
    einsatz: partie.einsaetze[zeile.id] ?? null,
    antwort: partie.antworten[zeile.id] ?? null,
    richtig: istAufgeloest(partie)
      ? zeile.spieltMit
        ? partie.auswertungen[zeile.id] === true
        : null
      : (partie.auswertungen[zeile.id] ?? null),
  };
}

export function spielerAnsicht(
  partie: Partie,
  spielerId: string,
  verbundeneIds: string[],
): SpielerAnsicht {
  const gemeinsam = gemeinsameAnsicht(partie, verbundeneIds);
  const frageSichtbar = partie.phase !== "warten" && partie.phase !== "einsatz";

  return {
    ...gemeinsam,
    rolle: "spieler",
    ichId: spielerId,
    frage: frageSichtbar ? aktuelleRunde(partie).frage.text : null,
    musterloesung: istAufgeloest(partie)
      ? aktuelleRunde(partie).frage.musterloesung
      : null,
    spieler: gemeinsam.spieler.map((zeile) => {
      if (istAufgeloest(partie)) {
        return mitGeheimem(partie, zeile);
      }
      if (zeile.id === spielerId) {
        return { ...mitGeheimem(partie, zeile), richtig: null };
      }
      return zeile;
    }),
  };
}

export function quizMasterAnsicht(
  partie: Partie,
  verbundeneIds: string[],
  rueckkehrAnfragen: RueckkehrAnfrage[],
): QuizMasterAnsicht {
  const gemeinsam = gemeinsameAnsicht(partie, verbundeneIds);
  const runde = partie.phase === "warten" ? null : aktuelleRunde(partie);

  return {
    ...gemeinsam,
    rolle: "quiz-master",
    rueckkehrAnfragen,
    frage: runde?.frage.text ?? null,
    musterloesung: runde?.frage.musterloesung ?? null,
    spieler: gemeinsam.spieler.map((zeile) => mitGeheimem(partie, zeile)),
  };
}
