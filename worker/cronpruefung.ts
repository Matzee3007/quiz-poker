// Prüft über die Analytics von Cloudflare, ob der tägliche Lauf (aufraeumen.ts) stattfand.
// Wird von scripts/cron-pruefen.ts unter Node geladen, darf also nichts von Cloudflare importieren.

// Kürzer als der Abstand zweier Läufe: Sonst überdeckt der Lauf von gestern einen Ausfall von heute.
const FENSTER = 24 * 60 * 60 * 1000;

export type CronErgebnis = { ok: true } | { ok: false; grund: string };

export interface AnalyticsAntwort {
  data: {
    viewer: {
      accounts: {
        workersInvocationsAdaptive: {
          dimensions: { status: string; datetime: string };
        }[];
      }[];
    };
  } | null;
  errors: { message: string }[] | null;
}

/** Body für die GraphQL-Schnittstelle: der neueste Cron-Lauf des Workers quiz-poker (Name aus wrangler.jsonc). */
export function cronAbfrage(kontoId: string, jetzt: number): string {
  const seit = new Date(jetzt - FENSTER).toISOString();
  const query = `{ viewer { accounts(filter: { accountTag: ${JSON.stringify(kontoId)} }) {
    workersInvocationsAdaptive(limit: 1, orderBy: [datetime_DESC], filter: { scriptName: "quiz-poker", eventType: "cron", datetime_geq: "${seit}" }) {
      dimensions { status datetime }
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
  const konto = antwort.data.viewer.accounts[0];
  if (!konto) {
    return {
      ok: false,
      grund: "Konto nicht gefunden, CLOUDFLARE_ACCOUNT_ID prüfen",
    };
  }
  const neuester = konto.workersInvocationsAdaptive[0];
  if (!neuester) {
    return { ok: false, grund: "Kein Lauf in den letzten 24 Stunden" };
  }
  const { status, datetime } = neuester.dimensions;
  if (status !== "success") {
    return { ok: false, grund: `Lauf um ${datetime} ohne Erfolg: ${status}` };
  }
  return { ok: true };
}
