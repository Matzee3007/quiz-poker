---
titel: Svelte und Vite
status: aktiv
erstellt: 2026-11-02
tags: [tools, svelte, vite]
---

# Svelte und Vite

**Svelte** ist ein Oberflächen-Framework: Komponenten stehen in `.svelte`-Dateien und werden beim Bauen zu schlankem
JavaScript übersetzt. **Vite** liefert die Oberfläche beim Entwickeln aus und baut sie für den Betrieb.

## Wofür wir es nutzen

Für die Oberfläche von Quiz-Poker im Browser. Reines Svelte 5 ohne SvelteKit, siehe [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]].

## Wie wir es eingerichtet haben

Gerüst im Scratchpad erzeugt und in den Projektordner kopiert, weil dieser nicht leer war:

```bash
npm create vite@latest quiz-poker -- --template svelte-ts --no-interactive
```

## Befehle

```bash
npm run dev     # lokal starten
npm run build   # für den Betrieb bauen
```

## Fehler

-
