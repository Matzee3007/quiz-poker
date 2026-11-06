import type { Quiz } from "./partie";
import { quizFormLesen } from "./quizpruefung";

export function leererEntwurf(): Quiz {
  return {
    titel: "",
    kategorien: [{ name: "", fragen: [{ text: "", musterloesung: "" }] }],
  };
}

/**
 * Der Editor braucht mindestens eine Kategorie und je Kategorie eine Frage. Ein gespeichertes Quiz darf beides
 * fehlen lassen, dann kommen leere Felder dazu, statt dass Inhalt verloren geht.
 */
export function bearbeitbar(quiz: Quiz): Quiz {
  const kategorien = quiz.kategorien.map((kategorie) =>
    kategorie.fragen.length > 0
      ? kategorie
      : { ...kategorie, fragen: [{ text: "", musterloesung: "" }] },
  );
  return {
    titel: quiz.titel,
    kategorien: kategorien.length > 0 ? kategorien : leererEntwurf().kategorien,
  };
}

/** Liest einen gespeicherten Entwurf. Unfertige Felder bleiben, alles Kaputte ergibt einen leeren Entwurf. */
export function entwurfAusText(text: string | null): Quiz {
  if (text === null) {
    return leererEntwurf();
  }
  try {
    const entwurf = quizFormLesen(JSON.parse(text));
    return entwurf &&
      entwurf.kategorien.length > 0 &&
      entwurf.kategorien.every((kategorie) => kategorie.fragen.length > 0)
      ? entwurf
      : leererEntwurf();
  } catch {
    return leererEntwurf();
  }
}

/** Tauscht einen Eintrag mit seinem Nachbarn, am Rand bleibt die Liste gleich. */
export function verschieben<T>(
  liste: T[],
  index: number,
  richtung: -1 | 1,
): T[] {
  const ziel = index + richtung;
  const neu = [...liste];
  if (ziel < 0 || ziel >= liste.length) {
    return neu;
  }
  [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
  return neu;
}
