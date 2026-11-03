import { describe, expect, it } from "vitest";
import {
  aktuelleRunde,
  partieErstellen,
  partieStarten,
  spielerBeitreten,
  type Quiz,
} from "./partie";

const quiz: Quiz = {
  titel: "Testquiz",
  kategorien: [
    {
      name: "Sport",
      fragen: [
        { text: "Sportfrage 1", musterloesung: "Lösung S1" },
        { text: "Sportfrage 2", musterloesung: "Lösung S2" },
      ],
    },
    {
      name: "Gaming",
      fragen: [{ text: "Gamingfrage 1", musterloesung: "Lösung G1" }],
    },
  ],
};

function partieMitAnnaUndBen() {
  return spielerBeitreten(
    spielerBeitreten(partieErstellen(quiz), "anna", "Anna"),
    "ben",
    "Ben",
  );
}

function gestartetePartie() {
  return partieStarten(partieMitAnnaUndBen());
}

describe("Partie erstellen", () => {
  it("wartet ohne Spieler auf den Start", () => {
    const partie = partieErstellen(quiz);

    expect(partie.phase).toBe("warten");
    expect(partie.spieler).toEqual([]);
  });

  it("lehnt ein Quiz ohne Kategorien oder mit leerer Kategorie ab", () => {
    expect(() => partieErstellen({ titel: "Leer", kategorien: [] })).toThrow(
      "leeres-quiz",
    );
    expect(() =>
      partieErstellen({
        titel: "Leer",
        kategorien: [{ name: "Sport", fragen: [] }],
      }),
    ).toThrow("leeres-quiz");
  });
});

describe("Spieler beitreten", () => {
  it("legt den Spieler mit den Startchips an, ohne die Eingabe zu verändern", () => {
    const vorher = partieErstellen(quiz);
    const nachher = spielerBeitreten(vorher, "anna", "  Anna ");

    expect(nachher.spieler).toEqual([{ id: "anna", name: "Anna", chips: 100 }]);
    expect(vorher.spieler).toHaveLength(0);
  });

  it("lehnt leere und doppelte Namen und doppelte IDs ab", () => {
    const partie = spielerBeitreten(partieErstellen(quiz), "anna", "Anna");

    expect(() => spielerBeitreten(partie, "x", "   ")).toThrow("leerer-name");
    expect(() => spielerBeitreten(partie, "x", "anna")).toThrow(
      "name-vergeben",
    );
    expect(() => spielerBeitreten(partie, "anna", "Andere")).toThrow(
      "name-vergeben",
    );
  });

  it("lehnt den neunten Spieler ab", () => {
    let partie = partieErstellen(quiz);
    for (let nummer = 1; nummer <= 8; nummer++) {
      partie = spielerBeitreten(partie, `id${nummer}`, `Spieler ${nummer}`);
    }

    expect(() => spielerBeitreten(partie, "id9", "Spieler 9")).toThrow(
      "raum-voll",
    );
  });
});

describe("Partie starten", () => {
  it("braucht mindestens zwei Spieler", () => {
    const partie = spielerBeitreten(partieErstellen(quiz), "anna", "Anna");

    expect(() => partieStarten(partie)).toThrow("zu-wenige-spieler");
  });

  it("beginnt die erste Runde mit allen Spielern in der Einsatzphase", () => {
    const partie = gestartetePartie();

    expect(partie.phase).toBe("einsatz");
    expect(partie.rundenTeilnehmer).toEqual(["anna", "ben"]);
  });

  it("lässt sich nicht zweimal starten", () => {
    expect(() => partieStarten(gestartetePartie())).toThrow("falsche-phase");
  });

  it("zeigt zuerst die erste Frage der ersten Kategorie", () => {
    expect(aktuelleRunde(gestartetePartie())).toEqual({
      kategorie: "Sport",
      frage: { text: "Sportfrage 1", musterloesung: "Lösung S1" },
    });
  });
});
