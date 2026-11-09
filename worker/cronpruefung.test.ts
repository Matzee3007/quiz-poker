import { describe, expect, it } from "vitest";
import { cronAbfrage, cronLaufAuswerten } from "./cronpruefung";

const JETZT = Date.parse("2026-11-09T05:00:00Z");

function antwortMit(zeilen: { status: string; requests: number }[]) {
  return {
    data: {
      viewer: {
        accounts: [
          {
            workersInvocationsAdaptive: zeilen.map(({ status, requests }) => ({
              sum: { requests },
              dimensions: { status },
            })),
          },
        ],
      },
    },
    errors: null,
  };
}

describe("Prüfung des täglichen Laufs", () => {
  it("fragt die Cron-Aufrufe von quiz-poker der letzten 26 Stunden ab", () => {
    const { query } = JSON.parse(cronAbfrage("konto-123", JETZT)) as {
      query: string;
    };

    expect(query).toContain('accountTag: "konto-123"');
    expect(query).toContain('scriptName: "quiz-poker"');
    expect(query).toContain('eventType: "cron"');
    expect(query).toContain('datetime_geq: "2026-11-08T03:00:00.000Z"');
  });

  it("ist zufrieden mit einem erfolgreichen Lauf", () => {
    expect(
      cronLaufAuswerten(antwortMit([{ status: "success", requests: 1 }])),
    ).toEqual({ ok: true });
  });

  it("meldet, wenn kein Lauf stattfand", () => {
    expect(cronLaufAuswerten(antwortMit([]))).toEqual({
      ok: false,
      grund: "Kein Lauf in den letzten 26 Stunden",
    });
  });

  it("meldet einen Lauf, der mit Fehler endete", () => {
    expect(
      cronLaufAuswerten(
        antwortMit([{ status: "scriptThrewException", requests: 1 }]),
      ),
    ).toEqual({
      ok: false,
      grund: "Lauf ohne Erfolg: scriptThrewException",
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
