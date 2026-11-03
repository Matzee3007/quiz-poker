import { describe, expect, it } from "vitest";
import { raumZulassen } from "./raumgrenze";

const STUNDE = 60 * 60 * 1000;

describe("Grenze für neue Spielräume", () => {
  it("erlaubt Räume bis zur Grenze und lehnt danach ab", () => {
    const erster = raumZulassen(undefined, 1000, 2);
    const zweiter = raumZulassen(erster.zaehlung, 2000, 2);
    const dritter = raumZulassen(zweiter.zaehlung, 3000, 2);

    expect(erster.erlaubt).toBe(true);
    expect(zweiter.erlaubt).toBe(true);
    expect(dritter.erlaubt).toBe(false);
  });

  it("beginnt nach einer Stunde neu zu zählen", () => {
    const voll = raumZulassen(raumZulassen(undefined, 0, 1).zaehlung, 1, 1);
    expect(voll.erlaubt).toBe(false);

    expect(raumZulassen(voll.zaehlung, STUNDE - 1, 1).erlaubt).toBe(false);
    expect(raumZulassen(voll.zaehlung, STUNDE, 1).erlaubt).toBe(true);
  });

  it("zählt abgelehnte Versuche nicht mit", () => {
    const voll = raumZulassen(raumZulassen(undefined, 0, 1).zaehlung, 1, 1);

    expect(voll.zaehlung.anzahl).toBe(1);
  });
});
