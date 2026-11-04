import { describe, expect, it } from "vitest";
import { BEISPIEL_QUIZ } from "./beispielQuiz";
import { quizPruefen } from "./quizpruefung";

const frage = { text: "F", musterloesung: "L" };
const kategorie = { name: "K", fragen: [frage] };
const quiz = (kategorien: unknown) => ({ titel: "T", kategorien });

describe("quizPruefen", () => {
  it("nimmt ein Quiz genau an den Grenzen an", () => {
    const fragen = Array(10).fill({
      text: "f".repeat(300),
      musterloesung: "l".repeat(100),
    });
    const kategorien = Array(10).fill({ name: "k".repeat(50), fragen });

    expect(quizPruefen({ titel: "t".repeat(100), kategorien }).ok).toBe(true);
  });

  it("lehnt zu lange Texte ab", () => {
    const zuLang = { ok: false, code: "text-zu-lang" };

    expect(
      quizPruefen({ titel: "t".repeat(101), kategorien: [kategorie] }),
    ).toEqual(zuLang);
    expect(
      quizPruefen(quiz([{ name: "k".repeat(51), fragen: [frage] }])),
    ).toEqual(zuLang);
    expect(
      quizPruefen(
        quiz([
          {
            name: "K",
            fragen: [{ text: "f".repeat(301), musterloesung: "L" }],
          },
        ]),
      ),
    ).toEqual(zuLang);
    expect(
      quizPruefen(
        quiz([
          {
            name: "K",
            fragen: [{ text: "F", musterloesung: "l".repeat(101) }],
          },
        ]),
      ),
    ).toEqual(zuLang);
  });

  it("lehnt zu viele Kategorien und Fragen ab", () => {
    expect(quizPruefen(quiz(Array(11).fill(kategorie)))).toEqual({
      ok: false,
      code: "zu-viele-kategorien",
    });
    expect(
      quizPruefen(quiz([{ name: "K", fragen: Array(11).fill(frage) }])),
    ).toEqual({ ok: false, code: "zu-viele-fragen" });
  });

  it("lehnt leere und nur aus Leerzeichen bestehende Felder ab", () => {
    const leer = { ok: false, code: "leeres-feld" };

    expect(quizPruefen({ titel: " ", kategorien: [kategorie] })).toEqual(leer);
    expect(quizPruefen(quiz([{ name: "  ", fragen: [frage] }]))).toEqual(leer);
    expect(
      quizPruefen(
        quiz([{ name: "K", fragen: [{ text: "", musterloesung: "L" }] }]),
      ),
    ).toEqual(leer);
    expect(
      quizPruefen(
        quiz([{ name: "K", fragen: [{ text: "F", musterloesung: " " }] }]),
      ),
    ).toEqual(leer);
  });

  it("lehnt ein Quiz ohne Kategorie oder eine Kategorie ohne Frage ab", () => {
    const leer = { ok: false, code: "leeres-quiz" };

    expect(quizPruefen(quiz([]))).toEqual(leer);
    expect(quizPruefen(quiz([{ name: "K", fragen: [] }]))).toEqual(leer);
  });

  it.each([
    ["null", null],
    ["Text", "x"],
    ["Titel als Zahl", { titel: 1, kategorien: [kategorie] }],
    ["Kategorien ohne Liste", { titel: "T", kategorien: "x" }],
    ["Kategorie als null", quiz([null])],
    ["Fragen ohne Liste", quiz([{ name: "K", fragen: "x" }])],
    [
      "Frage ohne Text",
      quiz([{ name: "K", fragen: [{ musterloesung: "L" }] }]),
    ],
  ])("lehnt falsche Typen ab: %s", (_name, daten) => {
    expect(quizPruefen(daten)).toEqual({
      ok: false,
      code: "ungueltige-nachricht",
    });
  });

  it("kürzt Leerzeichen am Rand und übernimmt nur bekannte Felder", () => {
    const ergebnis = quizPruefen({
      titel: " T ",
      kategorien: [
        {
          name: " K ",
          fremd: 1,
          fragen: [{ text: " F ", musterloesung: " L ", fremd: 2 }],
        },
      ],
      fremd: 3,
    });

    expect(ergebnis).toEqual({
      ok: true,
      quiz: { titel: "T", kategorien: [{ name: "K", fragen: [frage] }] },
    });
  });

  it("zählt die Länge erst nach dem Kürzen", () => {
    expect(
      quizPruefen({ titel: `  ${"t".repeat(100)}  `, kategorien: [kategorie] })
        .ok,
    ).toBe(true);
  });

  it("nimmt das Beispiel-Quiz an", () => {
    expect(quizPruefen(BEISPIEL_QUIZ)).toEqual({
      ok: true,
      quiz: BEISPIEL_QUIZ,
    });
  });
});
