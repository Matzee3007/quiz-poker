import { describe, expect, it } from "vitest";
import {
  aktuelleRunde,
  antwortBestaetigen,
  antwortAuswerten,
  antwortZuruecknehmen,
  aufloesen,
  auswertungStarten,
  einsatzSetzen,
  frageZeigen,
  naechsteRunde,
  partieErstellen,
  partieStarten,
  sieger,
  spielerBeitreten,
  spielerEntfernen,
  type Partie,
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

/** Führt bis zur Auswertung: Beide haben gesetzt, Anna und Ben haben geantwortet. */
function partieInAuswertung(einsatzAnna = 20, einsatzBen = 30) {
  let partie = gestartetePartie();
  partie = einsatzSetzen(partie, "anna", einsatzAnna);
  partie = einsatzSetzen(partie, "ben", einsatzBen);
  partie = frageZeigen(partie);
  partie = antwortBestaetigen(partie, "anna", "Berlin");
  partie = antwortBestaetigen(partie, "ben", "Paris");
  return auswertungStarten(partie);
}

function chipsVon(partie: Partie, id: string) {
  return partie.spieler.find((spieler) => spieler.id === id)?.chips;
}

/** Spielt die aktuelle Runde bis zur Auflösung: Spieler-ID → [Einsatz, richtig]. */
function rundeSpielen(
  start: Partie,
  ergebnisse: Record<string, [number, boolean]>,
) {
  let partie = start;
  for (const [id, [einsatz]] of Object.entries(ergebnisse)) {
    partie = einsatzSetzen(partie, id, einsatz);
  }
  partie = frageZeigen(partie);
  for (const id of Object.keys(ergebnisse)) {
    partie = antwortBestaetigen(partie, id, "Antwort");
  }
  partie = auswertungStarten(partie);
  for (const [id, [, richtig]] of Object.entries(ergebnisse)) {
    partie = antwortAuswerten(partie, id, richtig);
  }
  return aufloesen(partie);
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
      "id-vergeben",
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
    expect(partie.rundenSpieler).toEqual(["anna", "ben"]);
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

describe("Einsatzphase", () => {
  it("speichert den Einsatz, ein zweiter ersetzt ihn", () => {
    const einmal = einsatzSetzen(gestartetePartie(), "anna", 20);
    const zweimal = einsatzSetzen(einmal, "anna", 50);

    expect(einmal.einsaetze).toEqual({ anna: 20 });
    expect(zweimal.einsaetze).toEqual({ anna: 50 });
  });

  it("lehnt ungültige Einsätze und unbekannte Spieler ab", () => {
    const partie = gestartetePartie();

    expect(() => einsatzSetzen(partie, "anna", 9)).toThrow(
      "ungueltiger-einsatz",
    );
    expect(() => einsatzSetzen(partie, "niemand", 20)).toThrow(
      "unbekannter-spieler",
    );
  });

  it("lehnt Spieler ab, die nicht in der Runde sind", () => {
    const partie = spielerBeitreten(gestartetePartie(), "cara", "Cara");

    expect(() => einsatzSetzen(partie, "cara", 20)).toThrow("nicht-in-runde");
  });

  it("zeigt die Frage auch ohne alle Einsätze, ein fehlender zählt als 0", () => {
    const partie = frageZeigen(einsatzSetzen(gestartetePartie(), "anna", 20));

    expect(partie.phase).toBe("antworten");
    expect(partie.einsaetze).toEqual({ anna: 20, ben: 0 });
  });

  it("sperrt den Einsatz, sobald die Frage gestellt ist", () => {
    const partie = frageZeigen(gestartetePartie());

    expect(() => einsatzSetzen(partie, "anna", 20)).toThrow("falsche-phase");
    expect(() => frageZeigen(partie)).toThrow("falsche-phase");
  });
});

describe("Antwortphase", () => {
  it("speichert die bestätigte Antwort ohne Leerzeichen am Rand", () => {
    const partie = antwortBestaetigen(
      frageZeigen(gestartetePartie()),
      "anna",
      "  Berlin ",
    );

    expect(partie.antworten).toEqual({ anna: "Berlin" });
  });

  it("lehnt eine leere Antwort ab", () => {
    expect(() =>
      antwortBestaetigen(frageZeigen(gestartetePartie()), "anna", "   "),
    ).toThrow("leere-antwort");
  });

  it("lässt eine Antwort zurücknehmen und ändern", () => {
    const bestaetigt = antwortBestaetigen(
      frageZeigen(gestartetePartie()),
      "anna",
      "Berlin",
    );
    const zurueckgenommen = antwortZuruecknehmen(bestaetigt, "anna");

    expect(zurueckgenommen.antworten).toEqual({});
    expect(
      antwortBestaetigen(zurueckgenommen, "anna", "Paris").antworten,
    ).toEqual({ anna: "Paris" });
  });

  it("startet die Auswertung auch ohne alle Antworten und sperrt sie dann", () => {
    const partie = auswertungStarten(
      antwortBestaetigen(frageZeigen(gestartetePartie()), "anna", "Berlin"),
    );

    expect(partie.phase).toBe("auswertung");
    expect(() => antwortBestaetigen(partie, "ben", "Paris")).toThrow(
      "falsche-phase",
    );
    expect(() => antwortZuruecknehmen(partie, "anna")).toThrow("falsche-phase");
  });

  it("lehnt Spieler ab, die nicht in der Runde sind", () => {
    const partie = spielerBeitreten(
      frageZeigen(gestartetePartie()),
      "cara",
      "Cara",
    );

    expect(() => antwortBestaetigen(partie, "cara", "Berlin")).toThrow(
      "nicht-in-runde",
    );
    expect(() => antwortZuruecknehmen(partie, "cara")).toThrow(
      "nicht-in-runde",
    );
  });
});

describe("Auswertung und Auflösung", () => {
  it("zahlt bei richtig den Einsatz aus und zieht ihn bei falsch ab", () => {
    let partie = partieInAuswertung();
    partie = antwortAuswerten(partie, "anna", true);
    partie = antwortAuswerten(partie, "ben", false);
    partie = aufloesen(partie);

    expect(partie.phase).toBe("aufgeloest");
    expect(chipsVon(partie, "anna")).toBe(120);
    expect(chipsVon(partie, "ben")).toBe(70);
  });

  it("lässt die Auswertung bis zur Auflösung korrigieren, die Chips bleiben so lange gleich", () => {
    let partie = partieInAuswertung();
    partie = antwortAuswerten(partie, "anna", false);
    partie = antwortAuswerten(partie, "anna", true);
    partie = antwortAuswerten(partie, "ben", false);

    expect(chipsVon(partie, "anna")).toBe(100);
    expect(chipsVon(aufloesen(partie), "anna")).toBe(120);
  });

  it("lehnt die Auswertung eines Spielers ohne Antwort ab", () => {
    const partie = auswertungStarten(frageZeigen(gestartetePartie()));

    expect(() => antwortAuswerten(partie, "anna", true)).toThrow(
      "keine-antwort",
    );
  });

  it("löst nicht auf, solange eine Antwort unausgewertet ist", () => {
    const partie = antwortAuswerten(partieInAuswertung(), "anna", true);

    expect(() => aufloesen(partie)).toThrow("nicht-ausgewertet");
  });

  it("zieht den Einsatz ab, wenn die Antwort fehlt", () => {
    let partie = einsatzSetzen(gestartetePartie(), "ben", 30);
    partie = auswertungStarten(frageZeigen(partie));

    expect(chipsVon(aufloesen(partie), "ben")).toBe(70);
  });

  it("ändert nichts, wenn Einsatz und Antwort fehlen", () => {
    const partie = auswertungStarten(frageZeigen(gestartetePartie()));

    expect(chipsVon(aufloesen(partie), "anna")).toBe(100);
  });

  it("zahlt beim zweiten Auflösen nicht doppelt aus", () => {
    let partie = partieInAuswertung();
    partie = antwortAuswerten(partie, "anna", true);
    partie = antwortAuswerten(partie, "ben", false);
    const aufgeloest = aufloesen(partie);

    expect(() => aufloesen(aufgeloest)).toThrow("falsche-phase");
  });
});

describe("Nächste Runde", () => {
  it("zeigt die nächste Frage und beginnt ohne Einsätze, Antworten und Auswertungen", () => {
    const partie = naechsteRunde(
      rundeSpielen(gestartetePartie(), {
        anna: [20, true],
        ben: [30, false],
      }),
    );

    expect(partie.phase).toBe("einsatz");
    expect(aktuelleRunde(partie).frage.text).toBe("Sportfrage 2");
    expect(partie.einsaetze).toEqual({});
    expect(partie.antworten).toEqual({});
    expect(partie.auswertungen).toEqual({});
  });

  it("wechselt nach der letzten Frage in die nächste Kategorie", () => {
    let partie = gestartetePartie();
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));

    expect(aktuelleRunde(partie)).toEqual({
      kategorie: "Gaming",
      frage: { text: "Gamingfrage 1", musterloesung: "Lösung G1" },
    });
  });

  it("gilt nur nach der Auflösung", () => {
    expect(() => naechsteRunde(gestartetePartie())).toThrow("falsche-phase");
  });

  it("gibt Spielern mit 0 Chips zu Beginn der nächsten Runde den Mindesteinsatz", () => {
    const partie = naechsteRunde(
      rundeSpielen(gestartetePartie(), { anna: [100, false] }),
    );

    expect(chipsVon(partie, "anna")).toBe(10);
  });

  it("beendet die Partie nach der letzten Frage ohne Nachschub", () => {
    let partie = gestartetePartie();
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [120, false] }));

    expect(partie.phase).toBe("beendet");
    expect(chipsVon(partie, "anna")).toBe(0);
  });
});

describe("Sieger", () => {
  it("spielt eine ganze Partie und findet den Spieler mit den meisten Chips", () => {
    let partie = gestartetePartie();
    partie = rundeSpielen(partie, { anna: [20, true], ben: [30, false] });
    expect([chipsVon(partie, "anna"), chipsVon(partie, "ben")]).toEqual([
      120, 70,
    ]);

    partie = rundeSpielen(naechsteRunde(partie), {
      anna: [120, false],
      ben: [10, true],
    });
    expect([chipsVon(partie, "anna"), chipsVon(partie, "ben")]).toEqual([
      0, 80,
    ]);

    partie = rundeSpielen(naechsteRunde(partie), {
      anna: [10, true],
      ben: [20, true],
    });
    partie = naechsteRunde(partie);

    expect(partie.phase).toBe("beendet");
    expect([chipsVon(partie, "anna"), chipsVon(partie, "ben")]).toEqual([
      20, 100,
    ]);
    expect(sieger(partie).map((spieler) => spieler.id)).toEqual(["ben"]);
  });

  it("nennt bei Gleichstand alle Spieler mit dem höchsten Stand", () => {
    const beide: Record<string, [number, boolean]> = {
      anna: [10, true],
      ben: [10, true],
    };
    let partie = gestartetePartie();
    partie = naechsteRunde(rundeSpielen(partie, beide));
    partie = naechsteRunde(rundeSpielen(partie, beide));
    partie = naechsteRunde(rundeSpielen(partie, beide));

    expect(sieger(partie).map((spieler) => spieler.id)).toEqual([
      "anna",
      "ben",
    ]);
  });

  it("gilt erst nach dem Ende der Partie", () => {
    expect(() => sieger(gestartetePartie())).toThrow("falsche-phase");
  });
});

describe("Später einsteigen", () => {
  it("gibt in der Einsatzphase Startchips, aber erst die nächste Runde zählt", () => {
    const partie = spielerBeitreten(gestartetePartie(), "cara", "Cara");

    expect(chipsVon(partie, "cara")).toBe(100);
    expect(() => einsatzSetzen(partie, "cara", 20)).toThrow("nicht-in-runde");
  });

  it("lässt die Chips bei der Auflösung unberührt und nimmt ab der nächsten Runde auf", () => {
    let partie = frageZeigen(gestartetePartie());
    partie = spielerBeitreten(partie, "cara", "Cara");
    partie = aufloesen(auswertungStarten(partie));

    expect(chipsVon(partie, "cara")).toBe(100);
    expect(naechsteRunde(partie).rundenSpieler).toContain("cara");
  });

  it("ist nach dem Ende der Partie nicht mehr möglich", () => {
    let partie = gestartetePartie();
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));

    expect(() => spielerBeitreten(partie, "cara", "Cara")).toThrow(
      "falsche-phase",
    );
  });
});

describe("Spieler entfernen", () => {
  it("nimmt den Spieler aus allen Listen der Runde", () => {
    let partie = partieInAuswertung();
    partie = antwortAuswerten(partie, "ben", true);
    partie = spielerEntfernen(partie, "ben");

    expect(partie.spieler.map((spieler) => spieler.id)).toEqual(["anna"]);
    expect(partie.rundenSpieler).toEqual(["anna"]);
    expect(partie.einsaetze).toEqual({ anna: 20 });
    expect(partie.antworten).toEqual({ anna: "Berlin" });
    expect(partie.auswertungen).toEqual({});
  });

  it("lehnt unbekannte Spieler und das Entfernen nach dem Ende ab", () => {
    let partie = gestartetePartie();
    expect(() => spielerEntfernen(partie, "niemand")).toThrow(
      "unbekannter-spieler",
    );

    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    expect(() => spielerEntfernen(partie, "anna")).toThrow("falsche-phase");
  });

  it("löst die Runde während der Auswertung ohne den Entfernten auf", () => {
    let partie = partieInAuswertung();
    partie = antwortAuswerten(partie, "anna", true);
    partie = antwortAuswerten(partie, "ben", true);
    partie = aufloesen(spielerEntfernen(partie, "ben"));

    expect(partie.phase).toBe("aufgeloest");
    expect(chipsVon(partie, "anna")).toBe(120);
    expect(chipsVon(partie, "ben")).toBeUndefined();
  });
});

describe("Letzte Runde", () => {
  function letzteRunde() {
    let partie = gestartetePartie();
    partie = naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
    return naechsteRunde(rundeSpielen(partie, { anna: [10, true] }));
  }

  it("lehnt den Beitritt ab, weil es keine nächste Runde mehr gibt", () => {
    const einsatz = letzteRunde();
    const aufgeloest = rundeSpielen(einsatz, { anna: [10, true] });

    expect(() => spielerBeitreten(einsatz, "cara", "Cara")).toThrow(
      "letzte-runde",
    );
    expect(() => spielerBeitreten(aufgeloest, "cara", "Cara")).toThrow(
      "letzte-runde",
    );
  });

  it("erlaubt den Beitritt vor dem Start auch bei einem Quiz mit nur einer Frage", () => {
    const partie = partieErstellen({
      titel: "Kurz",
      kategorien: [{ name: "Sport", fragen: [quiz.kategorien[0].fragen[0]] }],
    });

    expect(spielerBeitreten(partie, "anna", "Anna").spieler).toHaveLength(1);
  });
});

describe("Phasen und Grenzen", () => {
  it("sperrt die Auswertung nach der Auflösung", () => {
    const partie = rundeSpielen(gestartetePartie(), { anna: [20, true] });

    expect(() => antwortAuswerten(partie, "anna", false)).toThrow(
      "falsche-phase",
    );
  });

  it("startet die Auswertung nur aus der Antwortphase", () => {
    expect(() => auswertungStarten(gestartetePartie())).toThrow(
      "falsche-phase",
    );
  });

  it("gibt Nachschub nur bei genau 0 Chips, mit 5 Chips gilt der Rest als Mindesteinsatz", () => {
    const partie = naechsteRunde(
      rundeSpielen(gestartetePartie(), { anna: [95, false] }),
    );

    expect(chipsVon(partie, "anna")).toBe(5);
    expect(() => einsatzSetzen(partie, "anna", 4)).toThrow(
      "ungueltiger-einsatz",
    );
    expect(einsatzSetzen(partie, "anna", 5).einsaetze).toEqual({ anna: 5 });
  });

  it("löst nach dem Entfernen eines Spielers mit noch nicht ausgewerteter Antwort auf", () => {
    let partie = antwortAuswerten(partieInAuswertung(), "anna", true);
    partie = aufloesen(spielerEntfernen(partie, "ben"));

    expect(partie.phase).toBe("aufgeloest");
    expect(chipsVon(partie, "anna")).toBe(120);
  });
});

describe("Unveränderte Eingabe", () => {
  function tiefEingefroren<T>(wert: T): T {
    if (typeof wert === "object" && wert !== null) {
      Object.values(wert).forEach(tiefEingefroren);
      Object.freeze(wert);
    }
    return wert;
  }

  it("lässt sich mit eingefrorenen Spielständen vollständig durchspielen", () => {
    const schritte: ((partie: Partie) => Partie)[] = [
      (partie) => spielerBeitreten(partie, "anna", "Anna"),
      (partie) => spielerBeitreten(partie, "ben", "Ben"),
      (partie) => spielerBeitreten(partie, "cara", "Cara"),
      partieStarten,
      (partie) => spielerEntfernen(partie, "cara"),
      (partie) => einsatzSetzen(partie, "anna", 100),
      (partie) => einsatzSetzen(partie, "ben", 20),
      frageZeigen,
      (partie) => antwortBestaetigen(partie, "anna", "Berlin"),
      (partie) => antwortZuruecknehmen(partie, "anna"),
      (partie) => antwortBestaetigen(partie, "anna", "Paris"),
      (partie) => antwortBestaetigen(partie, "ben", "Rom"),
      auswertungStarten,
      (partie) => antwortAuswerten(partie, "anna", false),
      (partie) => antwortAuswerten(partie, "ben", true),
      aufloesen,
      naechsteRunde,
    ];

    let partie = tiefEingefroren(partieErstellen(quiz));
    for (const schritt of schritte) {
      partie = tiefEingefroren(schritt(partie));
    }

    expect(partie.phase).toBe("einsatz");
    expect(chipsVon(partie, "anna")).toBe(10);
    expect(chipsVon(partie, "ben")).toBe(120);
  });
});
