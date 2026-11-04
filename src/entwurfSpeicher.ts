import type { Quiz } from "./regeln/partie";
import { entwurfAusText } from "./regeln/quizEntwurf";

const SCHLUESSEL = "quiz-poker:einmal-quiz";

export function entwurfLesen(): Quiz {
  return entwurfAusText(localStorage.getItem(SCHLUESSEL));
}

export function entwurfSpeichern(entwurf: Quiz): void {
  localStorage.setItem(SCHLUESSEL, JSON.stringify(entwurf));
}

export function entwurfLoeschen(): void {
  localStorage.removeItem(SCHLUESSEL);
}
