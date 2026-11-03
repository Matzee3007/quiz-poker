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

## Grenze für neue Spielräume

Die Klasse `Raumzaehler` (`worker/raumzaehler.ts`) begrenzt neue Räume über die Variable `RAEUME_PRO_STUNDE` in `wrangler.jsonc`. Das
Rate-Limiting-Binding von Cloudflare nutzen wir nicht: Die Doku bestätigt es nicht für den kostenlosen Tarif, es zählt nur ungefähr und je Standort.

## Befehle

```bash
npm run dev       # Worker und Oberfläche lokal starten
npm run deploy    # bauen und hochladen, braucht Konto und wrangler login
```

## Fehler

-
