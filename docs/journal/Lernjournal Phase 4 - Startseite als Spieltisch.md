---
titel: Lernjournal Phase 4 - Startseite als Spieltisch
status: aktiv
phase: 4
erstellt: 2026-11-17
tags: [lernjournal, phase-4, svelte, css, svg, cloudflare, git]
---

# Lernjournal Phase 4: Startseite als Spieltisch

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 4 - Betrieb und Handy|Lernjournal Phase 4 - Betrieb und Handy]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Startseite mit mehr Poker-Gefühl: Der Entwickler fand sie „zu langweilig“, Text und Reihenfolge störten nicht.
- [x] Mock `docs/mocks/2026-11-17-startseite.html` mit den Varianten A (Spieltisch), B (Chips) und C (Spielkarten),
  dann D als Mischung: Kopf als Tisch aus A, Wege mit Chips aus B, Beitreten-Karte aus A
- [x] Variante D umgesetzt: `.tisch`, `.chip-wege`, `.weg-chip`, `input.code-feld` in `src/stil.css`, neue Komponente
  `src/ansichten/ChipStapel.svelte` für die Chip-Stapel als SVG
- [x] PR #35 mit `/code-review` (6 Funde, alle behoben), gemergt und deployt (Version `baa8224a`)
- [x] Abnahme auf dem eigenen iPhone: „sieht gut aus“
- [ ] Spieleabend mit Freunden (der eigentliche Test von Phase 4)

## Entscheidungen

| Art | Entscheidung | Warum | Wer |
|---|---|---|---|
| Design | Startseite als Variante D: Spieltisch im Kopf, Chip je Weg mit runden Knöpfen, Beitreten-Karte mit grüner Kante und Raumcode in Gold | mehr Poker-Gefühl bei gleichem Inhalt | Entwickler |
| Design | Texte, Reihenfolge und Logik der Startseite bleiben gleich | gestört hat nur das Aussehen | Entwickler |
| Design | Symbol für „Meine Quizze“ ist ein Lesezeichen | der Auftrag nannte keines | ungefragt |
| Technik | Neue Klassen `tisch`, `chip-wege`, `weg-chip` statt `.spielidee`, `.wege`, `.chip` zu ändern | diese Klassen nutzen auch Anmelden, Konto, Sammlung und die leere Karte | ungefragt |
| Technik | Farben für Filz, Holz und Chips als Variablen in `:root`, Gold mit Transparenz über `color-mix` | Review-Fund: Farben standen doppelt | Entwickler |
| Technik | Chip-Stapel als eigene Komponente, gefärbt über CSS-Klassen statt Hex-Werte im Skript | Review-Fund: `Start.svelte` zu groß, Farbzuordnung zerbrechlich | Entwickler |

## Befehle: Mock, Prüfen und Deploy

```bash
git switch -c feature/startseite-spieltisch
npm run check
npm run dev
gh pr merge 35 --merge --delete-branch
git stash && git pull && git stash pop
npm run deploy
```

- `git switch -c …`: neuer Branch für die Änderung, `main` bleibt unberührt.
- `npm run check`: Linter, Format, Typen, 394 Tests und Build, vor jedem Commit.
- `npm run dev`: lokaler Server, für Screenshots mit Playwright in 1280 und 375 px Breite.
- `gh pr merge 35 …`: PR auf GitHub mergen und den Branch löschen.
- `git stash` / `git stash pop`: lokale Änderungen kurz beiseitelegen, damit `git pull` durchläuft, und danach
  zurückholen.
- `npm run deploy`: baut und lädt zu Cloudflare hoch. Der Entwickler hat ihn selbst mit `!` gestartet.

## Neu gelernt

### Snippet in Svelte 5

`{#snippet name(…)}` und `{@render name(…)}` machen ein Stück Markup innerhalb einer Komponente wiederverwendbar.
Wird es größer oder bekommt eigene Logik, ist eine eigene Komponente übersichtlicher, so wie hier `ChipStapel.svelte`.

### Spezifität in CSS

Widersprechen sich zwei Regeln, gewinnt die genauere. `input.code-feld` schlägt `input`, deshalb bleibt der Raumcode
auch im Handy-Block groß.

### `color-mix` und SVG über CSS färben

`color-mix(in srgb, var(--gold) 60%, transparent)` mischt eine Variable mit Durchsichtigkeit, ohne den Farbwert zu
wiederholen. SVG-Elemente mit Klasse bekommen ihre Farbe über `fill: var(--c)` aus dem CSS. `color-mix` gibt es in
Safari erst ab 16.2.

### Globale Klassennamen kollidieren

Die neue globale Klasse `.chip` hätte den leeren Platzhalter in „Meine Quizze“ und „Sammlung“ verändert, der die
Klasse schon nutzte. Vor einem neuen Klassennamen mit `grep -rn 'class="name' src` nach vorhandenen Nutzern suchen.

### Cache nach dem Deploy

Direkt nach dem Deploy lieferte Cloudflare noch die alte Seite (`cf-cache-status: HIT`), nach etwa 5 Sekunden die neue.
Am Dateinamen mit Hash (`index-DdjHWd74.css`) sieht man, welche Version ausgeliefert wird.

## Fehler und Lösungen

### `error: Your local changes to the following files would be overwritten by merge: docs/Nächste Session.md`

- **Wo:** `git pull` nach dem Merge von PR #35
- **Ursache:** Eine andere Sitzung hatte einen Punkt in die Übergabe geschrieben, lokal noch nicht committet.
- **Lösung:** `git stash`, `git pull`, `git stash pop`. Die Änderung blieb erhalten.
- **Prüfen:** `git stash list` ist leer, der Punkt steht in der Datei.

### `Permission for this action was denied by the Claude Code auto mode classifier`

- **Wo:** `npm run deploy` durch Claude
- **Ursache:** Der Auto-Modus lässt Claude die öffentliche Seite nicht selbst verändern.
- **Lösung:** Der Entwickler hat `! npm run deploy` selbst ausgeführt.
- **Prüfen:** Ausgabe `Current Version ID: baa8224a-…`, die Live-Seite liefert `index-DdjHWd74.css`.

## Aus dem Chat

-

## Offene Fragen

- Die Ansicht mit Anmeldung (4 Wege im Raster 2 × 2) ist nicht im Browser angesehen.

## Nächste Schritte

1. Spieleabend durchführen und auswerten.
2. `checks.sh` anlegen (steht in der Übergabe).
