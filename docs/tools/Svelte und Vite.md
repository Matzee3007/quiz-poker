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

## Aufbau der Oberfläche

- `src/App.svelte` entscheidet anhand von Adresse, Token und Ansicht, was zu sehen ist. Einen Router gibt es nicht.
- `src/verbindung.svelte.ts` hält die WebSocket-Verbindung als Klasse mit Runes (`$state`) und verbindet nach Abbrüchen neu.
- `src/ansichten/` enthält eine Komponente je Ansicht, `src/stil.css` den Stil C aus dem [[projects/quiz-poker/docs/mocks/2026-11-03-spielraum.html|Mock]].
- `{#key}` setzt in `SpielerRunde` die Eingaben zu Beginn jeder Runde zurück.
- Das Token liegt im `localStorage` je Browser-Profil. Zum Testen mehrerer Spieler braucht es also getrennte Profile oder private Fenster.
- `QuizEditor` bearbeitet den Entwurf als `$state` und speichert ihn in einem `$effect` im `localStorage`. `$state.snapshot` macht aus dem reaktiven Objekt ein normales, außerdem liest es dabei alle Felder, sodass der Effekt bei jeder Änderung neu läuft.
- `{#each … (kategorie)}` nutzt das Objekt selbst als Schlüssel, damit beim Sortieren jedes Feld bei seinem Inhalt bleibt.
- [[projects/quiz-poker/docs/mocks/2026-11-04-editor.html|Mock des Editors]], umgesetzt ist Variante 2.

## Befehle

```bash
npm run dev     # lokal starten
npm run build   # für den Betrieb bauen
```

## Fehler

**Frage steht als Spalte mit einem Buchstaben je Zeile** (2026-11-04, nur im Browser sichtbar, kein Test schlägt an):

- Ursache: Frage und Musterlösung lagen in einem Flex-Container. Eine lange Musterlösung nahm sich ihre volle Breite, die Frage schrumpfte auf das Mindestmaß.
- Lösung: Raster mit festen Spalten (`grid-template-columns: minmax(0, 1fr) 340px`) und `overflow-wrap: anywhere` für lange Wörter.
