import { describe, expect, it } from "vitest";
import { istGueltigerRaumcode, raumcodeErzeugen } from "./raumcode";

describe("Raumcode", () => {
  it("erzeugt 4 Zeichen aus dem Alphabet ohne verwechselbare Buchstaben", () => {
    expect(raumcodeErzeugen(() => 0)).toBe("AAAA");
    expect(raumcodeErzeugen(() => 0.999)).toBe("ZZZZ");
    expect(istGueltigerRaumcode(raumcodeErzeugen())).toBe(true);
  });

  it("erkennt gültige und ungültige Codes", () => {
    expect(istGueltigerRaumcode("KLMN")).toBe(true);
    for (const code of [
      "ABC",
      "ABCDE",
      "abcd",
      "OABC",
      "IABC",
      "constructor",
    ]) {
      expect(istGueltigerRaumcode(code)).toBe(false);
    }
  });
});
