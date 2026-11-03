---
titel: Lernjournal Phase 0 - Projektstart
status: abgeschlossen
phase: 0
erstellt: 2026-11-02
tags: [lernjournal, phase-0, svelte, cloudflare, vitest]
---

# Lernjournal Phase 0: Projektstart

Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Projekt mit `/projekt-starten` geklärt: Name, Ziel, Lernziel, Stack, Phasen, Sichtbarkeit
- [x] Vorlage kopiert und ausgefüllt, Stack-Entscheidung in [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]]
- [x] Stack eingerichtet: Svelte 5, Vite 8, Cloudflare Worker, Vitest 4, ESLint, Prettier
- [x] Erster Test erst rot, dann grün: Worker antwortet unter `/api/health`, unbekannte API-Pfade ergeben 404
- [x] Lokaler Start geprüft: `/api/health` antwortet mit 200, die Seite liefert den Titel „Quiz-Poker“
- [ ] Projektvision mit `/grill-with-docs` schärfen

## Befehle: Einrichtung

```bash
npm create vite@latest quiz-poker -- --template svelte-ts --no-interactive
npm install -D @cloudflare/vite-plugin wrangler 'vitest@^4.1.0'
npm install-scripts deny esbuild workerd
npm run check
```

- `npm create vite@latest …`: erzeugt das Svelte-Gerüst, hier im Scratchpad, weil der Projektordner schon Dateien hatte.
- `npm install -D …`: installiert Entwicklungswerkzeuge, hier das Cloudflare-Plugin, `wrangler` und Vitest 4.
- `npm install-scripts deny …`: lehnt die Installationsskripte dieser Pakete ab, npm 11 fragt sonst bei jeder Installation.
- `npm run check`: führt Linter, Formatprüfung, Typprüfung, Tests und Build aus.

## Neu gelernt

### Durable Object

Ein Server-Objekt bei Cloudflare mit eigenem Zustand. Hier soll ab Phase 2 jeder Spielraum genau eines bekommen, damit
Einsätze und Lösungen bis zur Auflösung auf dem Server bleiben.

### Warum Vitest 4 statt 5

Das Cloudflare-Testwerkzeug verlangt laut Doku Vitest 4.1. Die neueste Version eines Pakets ist also nicht automatisch die
richtige, die Anforderungen der anderen Pakete entscheiden mit.

### Warum Svelte ohne SvelteKit

Das Spiel besteht aus einer Seite, das größere Framework brächte hier vor allem Zusatzaufwand für Durable Objects.

## Fehler und Lösungen

-

## Aus dem Chat

-

## Offene Fragen

- Regelfragen stehen in der [[projects/quiz-poker/docs/Projektvision|Projektvision]] unter „Offene Fragen“, vor allem: Bringen
  5 gesetzte Chips bei richtiger Antwort +5 oder +10?
- `npm audit` meldet 15 Schwachstellen (2 niedrig, 13 mittel), die gezeigten Einträge betreffen die ESLint-Werkzeugkette. Nicht
  behoben, `npm audit fix --force` kann Pakete brechen.
- Eine Veröffentlichung bei Cloudflare ist noch nicht getestet, dafür fehlt das Konto.

## Nächste Schritte

1. `/grill-with-docs Projektvision schärfen`
2. Mit `plan-schreiben` den Plan für den Rest von Phase 0 schreiben
