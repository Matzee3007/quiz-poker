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
function quizLesen(daten: unknown): Quiz | null {
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
      fragen.push({
        text: frage.text.trim(),
        musterloesung: frage.musterloesung.trim(),
      });
    }
    kategorien.push({ name: kategorie.name.trim(), fragen });
  }
  return { titel: daten.titel.trim(), kategorien };
}

/** Grund, aus dem das Quiz nicht spielbar ist, oder null. */
function verstoss(quiz: Quiz): QuizFehlerCode | null {
  const { kategorien } = quiz;
  const fragen = kategorien.flatMap((kategorie) => kategorie.fragen);

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

/** Prüft ein fremdes Quiz, auf dem Server und im Editor nach denselben Regeln. */
export function quizPruefen(daten: unknown): QuizPruefung {
  const quiz = quizLesen(daten);
  if (!quiz) {
    return { ok: false, code: "ungueltige-nachricht" };
  }
  const code = verstoss(quiz);
  return code ? { ok: false, code } : { ok: true, quiz };
}
