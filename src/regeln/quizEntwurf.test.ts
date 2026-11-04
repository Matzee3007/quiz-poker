import { describe, expect, it } from "vitest";
import { entwurfAusText, leererEntwurf, verschieben } from "./quizEntwurf";

describe("leererEntwurf", () => {
  it("hat einen leeren Titel und eine Kategorie mit einer leeren Frage", () => {
    expect(leererEntwurf()).toEqual({
      titel: "",
      kategorien: [{ name: "", fragen: [{ text: "", musterloesung: "" }] }],
    });
  });
});

describe("entwurfAusText", () => {
  it.each([
    ["nichts gespeichert", null],
    ["kaputtes JSON", "{kaputt"],
    ["null", "null"],
    ["eine Zahl", "1"],
    ["Titel als Zahl", '{"titel":1,"kategorien":[]}'],
    ["Kategorien ohne Liste", '{"titel":"T","kategorien":"x"}'],
    ["Kategorie als null", '{"titel":"T","kategorien":[null]}'],
    [
      "Frage ohne Text",
      '{"titel":"T","kategorien":[{"name":"K","fragen":[{"musterloesung":"L"}]}]}',
    ],
    ["keine Kategorie", '{"titel":"T","kategorien":[]}'],
    [
      "Kategorie ohne Frage",
      '{"titel":"T","kategorien":[{"name":"K","fragen":[]}]}',
    ],
  ])("startet leer bei %s", (_name, text) => {
    expect(entwurfAusText(text)).toEqual(leererEntwurf());
  });

  it("behält einen unfertigen Entwurf mit leeren Feldern und Leerzeichen", () => {
    const entwurf = {
      titel: " ",
      kategorien: [{ name: "", fragen: [{ text: "Fra ", musterloesung: "" }] }],
    };

    expect(entwurfAusText(JSON.stringify(entwurf))).toEqual(entwurf);
  });

  it("liefert nur bekannte Felder", () => {
    const text = JSON.stringify({
      titel: "T",
      fremd: 1,
      kategorien: [
        {
          name: "K",
          fremd: 2,
          fragen: [{ text: "F", musterloesung: "L", fremd: 3 }],
        },
      ],
    });

    expect(entwurfAusText(text)).toEqual({
      titel: "T",
      kategorien: [{ name: "K", fragen: [{ text: "F", musterloesung: "L" }] }],
    });
  });
});

describe("verschieben", () => {
  it("tauscht mit dem Nachbarn und gibt eine neue Liste zurück", () => {
    const liste = ["a", "b", "c"];

    expect(verschieben(liste, 1, -1)).toEqual(["b", "a", "c"]);
    expect(verschieben(liste, 1, 1)).toEqual(["a", "c", "b"]);
    expect(liste).toEqual(["a", "b", "c"]);
  });

  it("lässt die Liste am Rand unverändert", () => {
    expect(verschieben(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(verschieben(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
