---
titel: "ADR 0001: Stack"
status: akzeptiert
erstellt: 2026-11-02
tags: [adr, architektur, stack]
---

# ADR (Architecture Decision Record) 0001: Stack

## Kontext

Quiz-Poker braucht eine Web-Oberfläche fürs Handy und den Computer, einen Server mit Echtzeit-Verbindung zu allen
Geräten eines Spielraums und einen Ort, an dem Lösungen und geheime Einsätze sicher bis zur Auflösung liegen.

Randbedingungen: Der Entwickler will ausdrücklich einen neuen Stack kennenlernen. Next.js und Supabase kennt er aus
musik-app und tages-dashboard, Python aus sport-fantasy, Godot aus karten-app. Das Spiel ist für eine Freundesrunde und
soll kostenlos laufen. Der spätere Game-Launcher öffnet es über die Web-Adresse.

## Entscheidung

- **Sprache: TypeScript.** Dieselbe Sprache für Oberfläche, Server und Regeln.
- **Oberfläche: Svelte 5 mit Vite 8.** Neu für den Entwickler und schlank. Reines Svelte ohne SvelteKit, weil das Spiel
  aus einer Seite besteht.
- **Server und Echtzeit: Cloudflare Workers und Durable Objects mit WebSockets.** Je Spielraum ein Objekt mit eigenem
  Zustand. Lösungen und Einsätze bleiben darin, bis eine Runde aufgelöst wird.
- **Hosting: Cloudflare, kostenloser Tarif.** Oberfläche und Server liegen an einem Ort. Über dem Tageslimit schlagen
  Aufrufe fehl, statt Kosten zu erzeugen.
- **Tests: Vitest 4.** `@cloudflare/vitest-plugin` zum Testen von Durable Objects verlangt laut Doku Vitest 4.1. Das
  aktuelle Vitest 5 wäre spätestens in Phase 2 wieder zurückzustufen.
- **Qualität: ESLint, Prettier, `svelte-check`.** Wie in den anderen TypeScript-Projekten, ergänzt um die Svelte-Plugins.

## Alternativen

- **Next.js und Supabase:** Es gibt ein erprobtes Rezept, und es ginge am schnellsten. Aber der Entwickler kennt den
  Stack schon, das Lernziel „neuer Stack“ fiele weg.
- **Colyseus (Multiplayer-Framework):** Bringt Räume und Zustandsabgleich fertig mit, nimmt damit aber gerade den
  Lernstoff zu Echtzeit vorweg. Braucht außerdem einen dauerhaft laufenden Server, der meist Geld kostet.
- **SvelteKit statt reinem Svelte:** Für eine Seite nicht nötig. Der Cloudflare-Adapter gibt Durable-Object-Klassen laut
  Community-Beispielen nicht von selbst weiter, dafür wären Zusatzlösungen nötig.
- **Vitest 5:** Aktuellste Version, aber nicht mit `@cloudflare/vitest-plugin` nutzbar.

## Konsequenzen

- Oberfläche und Regeln lassen sich in Vitest ohne Cloudflare testen. Das Durable Object braucht in Phase 2 das
  Cloudflare-Testwerkzeug (vorgemerkt in [[projects/quiz-poker/docs/Tools für später|Tools für später]]).
- Bindung an Cloudflare: Durable Objects gibt es bei anderen Anbietern nicht. Die reinen Regeln bleiben davon frei.
- Für die Veröffentlichung in Phase 2 braucht der Entwickler ein Cloudflare-Konto.
- Es gab noch kein Rezept und kein Stack-Paket. Das Rezept kommt mit einem eigenen PR nach `STACKS.md`.
- `npm install` meldet Installationsskripte von `esbuild` und `workerd`. Beide sind abgelehnt (`allowScripts` in
  `package.json`), Prüfung, Build und lokaler Start liefen damit am 2026-11-02.
