import { describe, expect, it } from "vitest";
import { BEISPIEL_QUIZ } from "./beispielQuiz";
import { partieErstellen } from "./partie";

describe("Beispiel-Quiz", () => {
  it("hat 3 Kategorien mit je 3 vollständigen Fragen", () => {
    expect(BEISPIEL_QUIZ.kategorien).toHaveLength(3);
    for (const kategorie of BEISPIEL_QUIZ.kategorien) {
      expect(kategorie.fragen).toHaveLength(3);
      for (const frage of kategorie.fragen) {
        expect(frage.text).not.toBe("");
        expect(frage.musterloesung).not.toBe("");
      }
    }
  });

  it("lässt sich als Partie erstellen", () => {
    expect(partieErstellen(BEISPIEL_QUIZ).phase).toBe("warten");
  });
});
