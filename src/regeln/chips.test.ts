import { describe, expect, it } from "vitest";
import {
  chipsNachRunde,
  istGueltigerEinsatz,
  MINDESTEINSATZ,
  mindesteinsatzFuer,
  START_CHIPS,
} from "./chips";
import { Regelfehler } from "./fehler";

describe("Chips", () => {
  it("legt Startchips und Mindesteinsatz fest", () => {
    expect(START_CHIPS).toBe(100);
    expect(MINDESTEINSATZ).toBe(10);
  });

  it("senkt den Mindesteinsatz auf den Rest, wenn weniger Chips da sind", () => {
    expect(mindesteinsatzFuer(100)).toBe(10);
    expect(mindesteinsatzFuer(5)).toBe(5);
  });

  it("erlaubt Einsätze vom Mindesteinsatz bis zu allen eigenen Chips", () => {
    expect(istGueltigerEinsatz(10, 100)).toBe(true);
    expect(istGueltigerEinsatz(100, 100)).toBe(true);
    expect(istGueltigerEinsatz(5, 5)).toBe(true);
  });

  it("lehnt zu kleine, zu große und nicht ganzzahlige Einsätze ab", () => {
    expect(istGueltigerEinsatz(9, 100)).toBe(false);
    expect(istGueltigerEinsatz(101, 100)).toBe(false);
    expect(istGueltigerEinsatz(10.5, 100)).toBe(false);
    expect(istGueltigerEinsatz(Number.NaN, 100)).toBe(false);
    expect(istGueltigerEinsatz(4, 5)).toBe(false);
  });

  it("zahlt den Einsatz bei richtiger Antwort aus und zieht ihn bei falscher ab", () => {
    expect(chipsNachRunde(100, 5, true)).toBe(105);
    expect(chipsNachRunde(100, 5, false)).toBe(95);
    expect(chipsNachRunde(100, 100, false)).toBe(0);
  });
});

describe("Regelfehler", () => {
  it("trägt den Code als Meldung", () => {
    expect(new Regelfehler("raum-voll").message).toBe("raum-voll");
  });
});
