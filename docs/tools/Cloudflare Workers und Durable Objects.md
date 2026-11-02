---
titel: Cloudflare Workers und Durable Objects
status: aktiv
erstellt: 2026-11-02
tags: [tools, cloudflare, workers, durable-objects]
---

# Cloudflare Workers und Durable Objects

Ein **Worker** ist ein kleines Server-Programm, das bei Cloudflare läuft. Ein **Durable Object** ist ein Server-Objekt
mit eigenem Zustand, hier später genau eines je Spielraum. **`wrangler`** ist das Befehlszeilenwerkzeug dazu.

## Wofür wir es nutzen

Für den Server, die Echtzeit-Verbindungen und das Hosting. Durable Objects kommen erst in Phase 2 dazu, bisher gibt es nur
den Worker mit `/api/health`.

## Wie wir es eingerichtet haben

```bash
npm install -D @cloudflare/vite-plugin wrangler
```

- `wrangler.jsonc`: `run_worker_first` schickt nur `/api/*` an den Worker, alles andere sind statische Dateien.
  `not_found_handling` liefert bei unbekannten Pfaden `index.html`.
- `vite.config.ts`: Das Plugin `cloudflare()` führt den Worker bei `npm run dev` lokal in `workerd` aus.
- `npm install-scripts deny esbuild workerd`: Installationsskripte abgelehnt, der lokale Start lief trotzdem.
- `wrangler types` erzeugt `worker-configuration.d.ts`. Die Datei steht in `.gitignore`, `npm run typecheck` erzeugt sie neu.

## Kostenloser Tarif

Stand 2026-11-02 laut [Preisseite](https://developers.cloudflare.com/durable-objects/platform/pricing/): nur Durable
Objects mit SQLite-Speicher, 100.000 Anfragen pro Tag. Eingehende WebSocket-Nachrichten zählen 20:1, ausgehende gar nicht.

## Befehle

```bash
npm run dev       # Worker und Oberfläche lokal starten
npm run deploy    # bauen und hochladen, braucht Konto und wrangler login
```

## Fehler

-
