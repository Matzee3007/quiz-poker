import { describe, expect, it } from "vitest";
import { quizMasterAnsicht, spielerAnsicht } from "./ansicht";
import {
  antwortAuswerten,
  antwortBestaetigen,
  aufloesen,
  auswertungStarten,
  einsatzSetzen,
  frageZeigen,
  naechsteRunde,
  partieErstellen,
  partieStarten,
  spielerBeitreten,
  type Partie,
  type Quiz,
} from "./partie";

const quiz: Quiz = {
  titel: "Testquiz",
  kategorien: [
    {
      name: "Sport",
      fragen: [
        { text: "Frage eins", musterloesung: "Lösung eins" },
        { text: "Frage zwei", musterloesung: "Lösung zwei" },
      ],
    },
  ],
};

function wartendePartie() {
  return spielerBeitreten(
    spielerBeitreten(partieErstellen(quiz), "anna", "Anna"),
    "ben",
    "Ben",
  );
}

function einsatzPhase() {
  return einsatzSetzen(partieStarten(wartendePartie()), "ben", 30);
}

function antwortPhase() {
  return antwortBestaetigen(frageZeigen(einsatzPhase()), "ben", "Bens Antwort");
}

function zeile(ansicht: { spieler: { id: string }[] }, id: string) {
  return ansicht.spieler.find((spieler) => spieler.id === id) as ReturnType<
    typeof spielerAnsicht
  >["spieler"][number];
}

function aufgeloestePartie(): Partie {
  // Anna antwortet nicht und setzt nichts, Ben liegt richtig.
  return aufloesen(
    antwortAuswerten(auswertungStarten(antwortPhase()), "ben", true),
  );
}

describe("Ansicht eines Spielers", () => {
  it("zeigt vor dem Start weder Kategorie noch Frage noch Lösung", () => {
    const ansicht = spielerAnsicht(wartendePartie(), "anna", []);

    expect(ansicht.rolle).toBe("spieler");
    expect(ansicht.ichId).toBe("anna");
    expect(ansicht.kategorie).toBeNull();
    expect(ansicht.frage).toBeNull();
    expect(ansicht.musterloesung).toBeNull();
  });

  it("zeigt im Einsatz nur die Kategorie und den eigenen Einsatz", () => {
    const fremd = spielerAnsicht(einsatzPhase(), "anna", []);
    const eigen = spielerAnsicht(einsatzPhase(), "ben", []);

    expect(fremd.kategorie).toBe("Sport");
    expect(fremd.rundeInKategorie).toBe(1);
    expect(fremd.rundenInKategorie).toBe(2);
    expect(fremd.frage).toBeNull();
    expect(fremd.musterloesung).toBeNull();
    expect(zeile(fremd, "ben").einsatz).toBeNull();
    expect(zeile(fremd, "ben").hatGesetzt).toBe(true);
    expect(zeile(fremd, "anna").hatGesetzt).toBe(false);
    expect(zeile(eigen, "ben").einsatz).toBe(30);
  });

  it("zeigt in der Antwortphase die Frage, aber keine Lösung und keine fremde Antwort", () => {
    const fremd = spielerAnsicht(antwortPhase(), "anna", []);
    const eigen = spielerAnsicht(antwortPhase(), "ben", []);

    expect(fremd.frage).toBe("Frage eins");
    expect(fremd.musterloesung).toBeNull();
    expect(zeile(fremd, "ben").antwort).toBeNull();
    expect(zeile(fremd, "ben").istBereit).toBe(true);
    expect(zeile(fremd, "anna").istBereit).toBe(false);
    expect(zeile(eigen, "ben").antwort).toBe("Bens Antwort");
    expect(zeile(eigen, "ben").richtig).toBeNull();
  });

  it("hält Lösung und fremde Daten auch während der Auswertung zurück", () => {
    const partie = antwortAuswerten(
      auswertungStarten(antwortPhase()),
      "ben",
      true,
    );
    const ansicht = spielerAnsicht(partie, "anna", []);

    expect(ansicht.frage).toBe("Frage eins");
    expect(ansicht.musterloesung).toBeNull();
    expect(zeile(ansicht, "ben").richtig).toBeNull();
    expect(zeile(ansicht, "ben").einsatz).toBeNull();
    expect(zeile(ansicht, "ben").antwort).toBeNull();
  });

  it("zeigt in der Auswertung die eigene Antwort, aber noch kein eigenes Ergebnis", () => {
    const partie = antwortAuswerten(
      auswertungStarten(antwortPhase()),
      "ben",
      true,
    );
    const ansicht = spielerAnsicht(partie, "ben", []);

    expect(zeile(ansicht, "ben").antwort).toBe("Bens Antwort");
    expect(zeile(ansicht, "ben").einsatz).toBe(30);
    expect(zeile(ansicht, "ben").richtig).toBeNull();
  });

  it("schickt vor der Auflösung nichts Geheimes mit", () => {
    for (const partie of [
      einsatzPhase(),
      antwortPhase(),
      auswertungStarten(antwortPhase()),
    ]) {
      const text = JSON.stringify(spielerAnsicht(partie, "anna", []));

      expect(text).not.toContain("Lösung eins");
      expect(text).not.toContain("Bens Antwort");
      expect(text).not.toContain('"einsatz":30');
    }
    expect(
      JSON.stringify(spielerAnsicht(einsatzPhase(), "anna", [])),
    ).not.toContain("Frage eins");
  });

  it("zeigt bei der Auflösung alles, eine fehlende Antwort zählt als falsch", () => {
    const ansicht = spielerAnsicht(aufgeloestePartie(), "anna", []);

    expect(ansicht.musterloesung).toBe("Lösung eins");
    expect(zeile(ansicht, "ben").einsatz).toBe(30);
    expect(zeile(ansicht, "ben").antwort).toBe("Bens Antwort");
    expect(zeile(ansicht, "ben").richtig).toBe(true);
    expect(zeile(ansicht, "ben").chips).toBe(130);
    expect(zeile(ansicht, "anna").richtig).toBe(false);
    expect(zeile(ansicht, "anna").antwort).toBeNull();
  });

  it("zeigt später Einsteigende als nicht mitspielend und den Verbindungsstatus", () => {
    const partie = spielerBeitreten(einsatzPhase(), "cara", "Cara");
    const ansicht = spielerAnsicht(partie, "cara", ["anna"]);

    expect(zeile(ansicht, "cara").spieltMit).toBe(false);
    expect(zeile(ansicht, "anna").spieltMit).toBe(true);
    expect(zeile(ansicht, "anna").verbunden).toBe(true);
    expect(zeile(ansicht, "ben").verbunden).toBe(false);
  });

  it("nennt die Sieger erst am Ende der Partie", () => {
    let partie = aufgeloestePartie();
    expect(spielerAnsicht(partie, "anna", []).sieger).toEqual([]);

    partie = naechsteRunde(partie);
    partie = frageZeigen(partie);
    partie = aufloesen(auswertungStarten(partie));
    partie = naechsteRunde(partie);

    expect(partie.phase).toBe("beendet");
    expect(spielerAnsicht(partie, "anna", []).sieger).toEqual(["ben"]);
  });
});

describe("Ansicht des Quiz-Masters", () => {
  it("zeigt in jeder gestarteten Phase Frage, Lösung, Einsätze und Antworten", () => {
    const anfragen = [{ spielerId: "ben", name: "Ben" }];
    const imEinsatz = quizMasterAnsicht(einsatzPhase(), ["anna"], anfragen);
    const beiAntworten = quizMasterAnsicht(antwortPhase(), [], []);

    expect(imEinsatz.rolle).toBe("quiz-master");
    expect(imEinsatz.rueckkehrAnfragen).toEqual(anfragen);
    expect(imEinsatz.frage).toBe("Frage eins");
    expect(imEinsatz.musterloesung).toBe("Lösung eins");
    expect(zeile(imEinsatz, "ben").einsatz).toBe(30);
    expect(zeile(imEinsatz, "anna").verbunden).toBe(true);
    expect(zeile(beiAntworten, "ben").antwort).toBe("Bens Antwort");
  });

  it("zeigt die laufende Auswertung", () => {
    const partie = antwortAuswerten(
      auswertungStarten(antwortPhase()),
      "ben",
      true,
    );

    expect(zeile(quizMasterAnsicht(partie, [], []), "ben").richtig).toBe(true);
    expect(zeile(quizMasterAnsicht(partie, [], []), "anna").richtig).toBeNull();
  });

  it("zeigt auch nach der Auflösung und am Ende alles", () => {
    const aufgeloest = aufgeloestePartie();
    const ende = naechsteRunde(
      aufloesen(auswertungStarten(frageZeigen(naechsteRunde(aufgeloest)))),
    );

    for (const partie of [aufgeloest, ende]) {
      const ansicht = quizMasterAnsicht(partie, [], []);

      expect(ansicht.frage).not.toBeNull();
      expect(ansicht.musterloesung).not.toBeNull();
    }
    expect(zeile(quizMasterAnsicht(aufgeloest, [], []), "ben")).toMatchObject({
      einsatz: 30,
      antwort: "Bens Antwort",
      richtig: true,
    });
    expect(quizMasterAnsicht(ende, [], []).sieger).toEqual(["ben"]);
  });

  it("zeigt vor dem Start noch keine Runde", () => {
    const ansicht = quizMasterAnsicht(wartendePartie(), [], []);

    expect(ansicht.kategorie).toBeNull();
    expect(ansicht.frage).toBeNull();
  });
});
