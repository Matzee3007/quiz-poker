import { describe, expect, it } from "vitest";
import { cronAbfrage, cronLaufAuswerten } from "./cronpruefung";

const JETZT = Date.parse("2026-11-09T05:00:00Z");

/** Zeilen wie von der Schnittstelle: neuester Lauf zuerst. */
function antwortMit(zeilen: { status: string; datetime: string }[]) {
  return {
    data: {
      viewer: {
        accounts: [
          {
            workersInvocationsAdaptive: zeilen.map(({ status, datetime }) => ({
              dimensions: { status, datetime },
            })),
          },
        ],
      },
    },
    errors: null,
  };
}

describe("Prüfung des täglichen Laufs", () => {
  it("fragt nur den neuesten Cron-Lauf von quiz-poker der letzten 24 Stunden ab", () => {
    const { query } = JSON.parse(cronAbfrage("konto-123", JETZT)) as {
      query: string;
    };

    expect(query).toContain('accountTag: "konto-123"');
    expect(query).toContain('scriptName: "quiz-poker"');
    expect(query).toContain('eventType: "cron"');
    expect(query).toContain('datetime_geq: "2026-11-08T05:00:00.000Z"');
    expect(query).toContain("orderBy: [datetime_DESC]");
    expect(query).toContain("limit: 1");
  });

  it("ist zufrieden mit einem erfolgreichen Lauf", () => {
    expect(
      cronLaufAuswerten(
        antwortMit([{ status: "success", datetime: "2026-11-09T03:17:00Z" }]),
      ),
    ).toEqual({ ok: true });
  });

  it("meldet, wenn kein Lauf stattfand", () => {
    expect(cronLaufAuswerten(antwortMit([]))).toEqual({
      ok: false,
      grund: "Kein Lauf in den letzten 24 Stunden",
    });
  });

  it("wertet nur den neuesten Lauf aus", () => {
    expect(
      cronLaufAuswerten(
        antwortMit([
          { status: "scriptThrewException", datetime: "2026-11-09T03:17:00Z" },
          { status: "success", datetime: "2026-11-08T03:17:00Z" },
        ]),
      ),
    ).toEqual({
      ok: false,
      grund: "Lauf um 2026-11-09T03:17:00Z ohne Erfolg: scriptThrewException",
    });
  });

  it("meldet ein unbekanntes Konto", () => {
    expect(
      cronLaufAuswerten({ data: { viewer: { accounts: [] } }, errors: null }),
    ).toEqual({
      ok: false,
      grund: "Konto nicht gefunden, CLOUDFLARE_ACCOUNT_ID prüfen",
    });
  });

  it("meldet Fehler der Schnittstelle", () => {
    expect(
      cronLaufAuswerten({
        data: null,
        errors: [{ message: "Authentication error" }],
      }),
    ).toEqual({
      ok: false,
      grund: "Analytics-Abfrage fehlgeschlagen: Authentication error",
    });
  });
});
