// Prüft, ob der tägliche Lauf in den letzten 26 Stunden erfolgreich war: npm run cron-pruefen
// Braucht CLOUDFLARE_ANALYTICS_TOKEN (Recht „Account Analytics: Read“) und CLOUDFLARE_ACCOUNT_ID.
// Läuft täglich in .github/workflows/cron-pruefen.yml, schlägt fehl, wenn der Lauf fehlt.
import {
  cronAbfrage,
  cronLaufAuswerten,
  type AnalyticsAntwort,
} from "../worker/cronpruefung.ts";

if (process.argv.length > 2) {
  console.error("Aufruf: npm run cron-pruefen (ohne Optionen)");
  process.exit(1);
}

const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
const kontoId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !kontoId) {
  console.error(
    "CLOUDFLARE_ANALYTICS_TOKEN und CLOUDFLARE_ACCOUNT_ID müssen gesetzt sein.",
  );
  process.exit(1);
}

const antwort = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: cronAbfrage(kontoId, Date.now()),
});
const ergebnis = cronLaufAuswerten((await antwort.json()) as AnalyticsAntwort);

if (!ergebnis.ok) {
  console.error(
    `Prüfung des täglichen Laufs fehlgeschlagen: ${ergebnis.grund}`,
  );
  process.exit(1);
}
console.log("Täglicher Lauf in den letzten 26 Stunden: erfolgreich.");
