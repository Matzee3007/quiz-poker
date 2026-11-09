// Prüft über die Analytics von Cloudflare, ob der tägliche Lauf (aufraeumen.ts) stattfand.
// Wird von scripts/cron-pruefen.ts unter Node geladen, darf also nichts von Cloudflare importieren.

const FENSTER = 26 * 60 * 60 * 1000;

export type CronErgebnis = { ok: true } | { ok: false; grund: string };

export interface AnalyticsAntwort {
  data: {
    viewer: {
      accounts: {
        workersInvocationsAdaptive: {
          sum: { requests: number };
          dimensions: { status: string };
        }[];
      }[];
    };
  } | null;
  errors: { message: string }[] | null;
}

/** Body für die GraphQL-Schnittstelle: Cron-Aufrufe von quiz-poker, je Status gezählt. */
export function cronAbfrage(kontoId: string, jetzt: number): string {
  const seit = new Date(jetzt - FENSTER).toISOString();
  const query = `{ viewer { accounts(filter: { accountTag: ${JSON.stringify(kontoId)} }) {
    workersInvocationsAdaptive(limit: 10, filter: { scriptName: "quiz-poker", eventType: "cron", datetime_geq: "${seit}" }) {
      sum { requests } dimensions { status }
    } } } }`;
  return JSON.stringify({ query });
}

export function cronLaufAuswerten(antwort: AnalyticsAntwort): CronErgebnis {
  if (antwort.errors?.length || !antwort.data) {
    const meldung = antwort.errors?.map((f) => f.message).join(", ");
    return {
      ok: false,
      grund: `Analytics-Abfrage fehlgeschlagen: ${meldung ?? "keine Daten"}`,
    };
  }
  const zeilen =
    antwort.data.viewer.accounts[0]?.workersInvocationsAdaptive ?? [];
  if (zeilen.some((z) => z.dimensions.status === "success")) {
    return { ok: true };
  }
  if (zeilen.length === 0) {
    return { ok: false, grund: "Kein Lauf in den letzten 26 Stunden" };
  }
  return {
    ok: false,
    grund: `Lauf ohne Erfolg: ${zeilen.map((z) => z.dimensions.status).join(", ")}`,
  };
}
