import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const rechner = () => env.PASSWORTRECHNER.getByName("global");

describe("Passwortrechner", () => {
  it("speichert nie den Klartext", async () => {
    const hash = await rechner().hashen("geheim-123");

    expect(hash).not.toContain("geheim-123");
  });

  it("erkennt das richtige Passwort und lehnt ein falsches ab", async () => {
    const hash = await rechner().hashen("geheim-123");

    expect(await rechner().pruefen(hash, "geheim-123")).toBe(true);
    expect(await rechner().pruefen(hash, "geheim-124")).toBe(false);
  });

  it("erzeugt für dasselbe Passwort jedes Mal einen anderen Hash", async () => {
    const erster = await rechner().hashen("geheim-123");
    const zweiter = await rechner().hashen("geheim-123");

    expect(erster).not.toBe(zweiter);
  });
});
