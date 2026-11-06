import type { Frage, Kategorie, Quiz } from "./partie";

export const QUIZ_GRENZEN = {
  kategorien: 10,
  fragenJeKategorie: 10,
  titel: 100,
  kategorieName: 50,
  frage: 300,
  musterloesung: 100,
} as const;

export type QuizFehlerCode =
  | "ungueltige-nachricht"
  | "leeres-quiz"
  | "leeres-feld"
  | "zu-viele-kategorien"
  | "zu-viele-fragen"
  | "text-zu-lang";

export type QuizPruefung =
  { ok: true; quiz: Quiz } | { ok: false; code: QuizFehlerCode };

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === "object" && wert !== null;
}

/** Baut das Quiz neu auf, damit fremde Felder nicht mitkommen. Liefert null bei falschen Typen. */
export function quizFormLesen(daten: unknown): Quiz | null {
  if (
    !istObjekt(daten) ||
    typeof daten.titel !== "string" ||
    !Array.isArray(daten.kategorien)
  ) {
    return null;
  }

  const kategorien: Kategorie[] = [];
  for (const kategorie of daten.kategorien as unknown[]) {
    if (
      !istObjekt(kategorie) ||
      typeof kategorie.name !== "string" ||
      !Array.isArray(kategorie.fragen)
    ) {
      return null;
    }

    const fragen: Frage[] = [];
    for (const frage of kategorie.fragen as unknown[]) {
      if (
        !istObjekt(frage) ||
        typeof frage.text !== "string" ||
        typeof frage.musterloesung !== "string"
      ) {
        return null;
      }
      fragen.push({ text: frage.text, musterloesung: frage.musterloesung });
    }
    kategorien.push({ name: kategorie.name, fragen });
  }
  return { titel: daten.titel, kategorien };
}

function gekuerzt(quiz: Quiz): Quiz {
  return {
    titel: quiz.titel.trim(),
    kategorien: quiz.kategorien.map((kategorie) => ({
      name: kategorie.name.trim(),
      fragen: kategorie.fragen.map((frage) => ({
        text: frage.text.trim(),
        musterloesung: frage.musterloesung.trim(),
      })),
    })),
  };
}

/** Zu viele Kategorien oder Fragen, gilt auch für Entwürfe. */
function anzahlVerstoss(quiz: Quiz): QuizFehlerCode | null {
  const { kategorien } = quiz;
  if (kategorien.length > QUIZ_GRENZEN.kategorien) {
    return "zu-viele-kategorien";
  }
  if (
    kategorien.some(
      (kategorie) => kategorie.fragen.length > QUIZ_GRENZEN.fragenJeKategorie,
    )
  ) {
    return "zu-viele-fragen";
  }
  return null;
}

/** Was zum Spielen noch fehlt. Ein Entwurf darf unfertig sein. */
function luecke(quiz: Quiz): QuizFehlerCode | null {
  const { kategorien } = quiz;
  const fragen = kategorien.flatMap((kategorie) => kategorie.fragen);
  if (
    kategorien.length === 0 ||
    kategorien.some((kategorie) => kategorie.fragen.length === 0)
  ) {
    return "leeres-quiz";
  }
  if (
    quiz.titel === "" ||
    kategorien.some((kategorie) => kategorie.name === "") ||
    fragen.some((frage) => frage.text === "" || frage.musterloesung === "")
  ) {
    return "leeres-feld";
  }
  return null;
}

/** Zu lange Texte, gilt auch für Entwürfe. */
function laengeVerstoss(quiz: Quiz): QuizFehlerCode | null {
  const { kategorien } = quiz;
  const fragen = kategorien.flatMap((kategorie) => kategorie.fragen);
  if (
    quiz.titel.length > QUIZ_GRENZEN.titel ||
    kategorien.some(
      (kategorie) => kategorie.name.length > QUIZ_GRENZEN.kategorieName,
    ) ||
    fragen.some(
      (frage) =>
        frage.text.length > QUIZ_GRENZEN.frage ||
        frage.musterloesung.length > QUIZ_GRENZEN.musterloesung,
    )
  ) {
    return "text-zu-lang";
  }
  return null;
}

function pruefenMit(
  daten: unknown,
  regeln: ((quiz: Quiz) => QuizFehlerCode | null)[],
): QuizPruefung {
  const gelesen = quizFormLesen(daten);
  if (!gelesen) {
    return { ok: false, code: "ungueltige-nachricht" };
  }
  const quiz = gekuerzt(gelesen);
  for (const regel of regeln) {
    const code = regel(quiz);
    if (code) {
      return { ok: false, code };
    }
  }
  return { ok: true, quiz };
}

/** Prüft ein fremdes Quiz, auf dem Server und im Editor nach denselben Regeln. */
export function quizPruefen(daten: unknown): QuizPruefung {
  return pruefenMit(daten, [anzahlVerstoss, luecke, laengeVerstoss]);
}

/** Prüft einen Entwurf zum Speichern: Leere Felder sind erlaubt, die Grenzen gelten. */
export function entwurfPruefen(daten: unknown): QuizPruefung {
  return pruefenMit(daten, [anzahlVerstoss, laengeVerstoss]);
}
