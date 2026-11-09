---
titel: Cloudflare Workers und Durable Objects
status: aktiv
erstellt: 2026-11-02
tags: [tools, cloudflare, workers, durable-objects]
---

# Cloudflare Workers und Durable Objects

Ein **Worker** ist ein kleines Server-Programm, das bei Cloudflare läuft. Ein **Durable Object** ist ein Server-Objekt
mit eigenem Zustand, hier genau eines je Spielraum. **`wrangler`** ist das Befehlszeilenwerkzeug dazu.

## Wofür wir es nutzen

Für den Server, die Echtzeit-Verbindungen und das Hosting. Jeder Spielraum ist ein Durable Object der Klasse `Spielraum`
(`worker/spielraum.ts`), siehe [[projects/quiz-poker/docs/adr/0004-spielstand-und-hibernation|ADR 0004]].

## Wie wir es eingerichtet haben

```bash
npm install -D @cloudflare/vite-plugin wrangler
```

- `wrangler.jsonc`: `run_worker_first` schickt nur `/api/*` an den Worker, alles andere sind statische Dateien.
  `not_found_handling` liefert bei unbekannten Pfaden `index.html`.
- `vite.config.ts`: Das Plugin `cloudflare()` führt den Worker bei `npm run dev` lokal in `workerd` aus.
- `npm install-scripts deny esbuild workerd`: Installationsskripte abgelehnt, der lokale Start lief trotzdem.
- `wrangler.jsonc`: Bindung `SPIELRAUM` und Migration `new_sqlite_classes`, im kostenlosen Tarif gibt es nur SQLite-Speicher.
- `wrangler types` erzeugt `worker-configuration.d.ts`. Die Datei steht in `.gitignore`, `npm run typecheck` erzeugt sie neu.

## Kostenloser Tarif

Stand 2026-11-02 laut [Preisseite](https://developers.cloudflare.com/durable-objects/platform/pricing/): nur Durable
Objects mit SQLite-Speicher, 100.000 Anfragen pro Tag. Eingehende WebSocket-Nachrichten zählen 20:1, ausgehende gar nicht.

Stand 2026-11-04 laut [Limits von Workers](https://developers.cloudflare.com/workers/platform/limits/) und
[Limits von Durable Objects](https://developers.cloudflare.com/durable-objects/platform/limits/): Ein Worker darf 10 ms je
Anfrage rechnen (sonst Fehler 1102), ein Durable Object 30 Sekunden. Warten auf das Netz zählt nicht. Lokal greift die Grenze
vermutlich nicht, Rechenzeit lässt sich also nur im echten Betrieb prüfen.

## Adresse

`https://quiz-poker.quiz-poker.workers.dev`: vorne der Name des Workers aus `wrangler.jsonc`, dahinter die Subdomain des Kontos.
Das erste `npm run deploy` hat die Subdomain angelegt, ändern lässt sie sich im Dashboard unter Workers, Subdomain.

## Grenze für neue Spielräume

Die Klasse `Raumzaehler` (`worker/raumzaehler.ts`) begrenzt neue Räume über die Variable `RAEUME_PRO_STUNDE` in `wrangler.jsonc`. Das
Rate-Limiting-Binding von Cloudflare nutzen wir nicht: Die Doku bestätigt es nicht für den kostenlosen Tarif, es zählt nur ungefähr und je Standort.

## Fehler

**Schließ-Signal kommt im Browser erst nach rund 10 Sekunden an** (2026-11-03, Phase 2, lokal mit `npm run dev`):

- Wo: Ein vom Quiz-Master entfernter Spieler sah noch rund 10 Sekunden lang das Spiel, in den Tests fiel das nicht auf.
- Ursache: nicht geklärt. Der Server ruft `close()` sofort auf, der Browser meldet das Schließen erst später. Bei Cloudflare trat es nicht auf: Im Testlauf vom 2026-11-04 kam das Signal nach 94 ms an (Node.js als Gegenstelle, kein Browser).
- Lösung: Der Server schickt vor dem Schließen die Nachricht `{ typ: "beendet", code }`, die Oberfläche reagiert darauf sofort.
- Prüfen: Spieler im Browser entfernen, die Meldung erscheint sofort.

**`curl: (35) ... sslv3 alert handshake failure` direkt nach dem ersten Deploy** (2026-11-04, Phase 2):

- Wo: Abruf von `/api/health` unter der neuen Adresse, unmittelbar nach dem ersten `npm run deploy`.
- Ursache: nicht endgültig geklärt. Die `workers.dev`-Subdomain war gerade erst angelegt, `wrangler` meldet dazu „It may take a few minutes for DNS records to update“.
- Lösung: warten, nach rund 3 Minuten kam die Antwort.
- Prüfen: `/usr/bin/curl -sS 'https://quiz-poker.quiz-poker.workers.dev/api/health'` liefert `{"status":"ok"}`.

## Analytics

Ob der tägliche Lauf stattfand, zeigt die GraphQL-Schnittstelle `https://api.cloudflare.com/client/v4/graphql`
(2026-11-09, [[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen|ADR 0009]]):

- **Sie braucht ein eigenes API-Token** mit „Account Analytics: Read“. Die OAuth-Anmeldung von wrangler lehnt sie mit
  `Authentication error` (Code 10000) ab, obwohl sie `account:read` enthält. Das Token liegt lokal in
  `~/.cloudflare-analytics-token` und als Secret `CLOUDFLARE_ANALYTICS_TOKEN` in GitHub.
- **Cron-Läufe:** `workersInvocationsAdaptive` mit dem Filter `eventType: "cron"` zeigt jeden Lauf minutengenau, mit `status`.
  `workersInvocationsScheduled` bleibt im kostenlosen Tarif leer, obwohl der Cron läuft.
- **Höchstens eine Woche** je Abfrage im kostenlosen Tarif, sonst Fehler `quota`.
- Der Zeitplan selbst steht unter `GET /accounts/<id>/workers/scripts/quiz-poker/schedules`. Dafür reicht die Anmeldung von wrangler.

```bash
npm run cron-pruefen   # braucht CLOUDFLARE_ANALYTICS_TOKEN und CLOUDFLARE_ACCOUNT_ID, siehe scripts/cron-pruefen.ts
```

## Befehle

```bash
npm run dev       # Worker und Oberfläche lokal starten
npx wrangler login   # wrangler im Browser mit dem Konto verbinden (einmalig)
npm run deploy    # bauen und hochladen, braucht Konto und wrangler login
npx wrangler whoami  # zeigt, ob und womit wrangler angemeldet ist
```

## Fehler

-
