---
titel: Lernjournal Phase 3 - Editor und Einmal-Quiz
status: abgeschlossen
phase: 3
erstellt: 2026-11-04
tags: [lernjournal, phase-3, svelte, cloudflare, github-actions]
---

# Lernjournal Phase 3: Editor und Einmal-Quiz

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 2 - Veröffentlichung|Lernjournal Phase 2 - Veröffentlichung]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] CI-Falle behoben (PR #12): Läufe auf `main` verdrängen sich nicht mehr gegenseitig.
- [x] Phase 3 mit `/grill-with-docs` geklärt (PR #14): [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]], Glossar, Projektvision.
- [x] Schritt 1 von Phase 3 nach [[projects/quiz-poker/docs/plaene/2026-11-04-einmal-quiz|Plan: Editor und Einmal-Quiz]] gebaut (PR #15): Prüfregeln, Server, Mock, Entwurf im Browser, Editor, Startseite.
- [x] Veröffentlicht mit `npm run deploy`, Version `0f632cd6`. Testpartie auf der echten Seite bis zum Ende gespielt.
- [ ] Schritt 2 von Phase 3 (Konten) ist noch nicht begonnen.

## Befehle: CI und GitHub

```bash
gh pr checks 15 --watch --interval 10
gh run list --branch main --limit 3
gh pr merge 15 --merge --delete-branch
```

- `gh pr checks <nr> --watch`: wartet, bis die Prüfungen eines PRs fertig sind. Vor jedem Merge nötig, weil GitHub Free eine rote CI nicht blockiert.
- `gh run list --branch main`: zeigt die letzten Läufe auf `main`, hier, um zu sehen, ob ein Merge-Commit geprüft wurde.
- `gh pr merge <nr> --merge --delete-branch`: übernimmt den PR und löscht seinen Branch.

## Befehle: Prüfen und Veröffentlichen

```bash
npx vitest run src/regeln/quizpruefung.test.ts
npm run check
npm run dev -- --port 5199 --strictPort
npm run deploy
npx wrangler deployments list
```

- `npx vitest run <datei>`: führt nur eine Testdatei aus, für den schnellen Rot-Grün-Wechsel.
- `npm run check`: alle Prüfungen auf einmal, vor jedem Commit.
- `npm run dev -- --port 5199 --strictPort`: startet lokal auf einem festen Port, damit die Browser-Skripte die Adresse kennen.
- `npm run deploy`: baut und lädt zu Cloudflare hoch, die öffentliche Seite ändert sich sofort.
- `npx wrangler deployments list`: zeigt, welche Version gerade aktiv ist.

## Neu gelernt

### `concurrency`-Gruppe

Läufe in derselben Gruppe laufen nicht gleichzeitig. Eine Gruppe hat höchstens einen laufenden und einen wartenden Lauf, ein neuer wartender verdrängt den alten. Mit `cancel-in-progress: true` bricht schon der zweite Merge den Lauf des ersten ab. Auf `main` hat deshalb jeder Commit eine eigene Gruppe.

### Grenzen des kostenlosen Tarifs

Ein Worker darf 10 ms je Anfrage rechnen, sonst kommt Fehler 1102. Warten auf das Netz zählt nicht. Ein Durable Object darf laut Doku 30 Sekunden rechnen. Passwort-Hashing soll deshalb dort laufen, gemessen ist das noch nicht.

### E-Mail braucht praktisch eine Domain

Resend schickt ohne geprüfte Domain nur an die eigene Adresse, Brevo warnt bei Gratis-Adressen vor Ablehnung und Spam, und Cloudflares Dienst verlangt für beliebige Empfänger den bezahlten Tarif. Deshalb gibt es in Phase 3 keinen Mail-Versand, sondern Einladungscodes und Links von Hand.

### Ein Test, der nicht fehlschlagen kann

Der erste Test zur Musterlösung las die Phase `warten` gar nicht mit, und `?? ""` machte aus den fehlenden Daten einen leeren Text, der die Prüfung immer bestand. Der Agent `plan-pruefer` hat das gefunden. Jetzt prüft der Test zusätzlich, dass in jeder Phase überhaupt Nachrichten angekommen sind.

### Zeichen sind nicht Bytes

`text.length` zählt Zeichen, ein „€“ belegt in UTF-8 aber drei Bytes. Eine Größengrenze muss `byteLength` prüfen. Damit der Server eine riesige Anfrage gar nicht erst liest, prüft er vorher die Angabe `Content-Length`.

### Prüfreihenfolge auf dem Server

Erst Größe und Inhalt, dann die Raumgrenze. So kostet eine kaputte Anfrage keinen der 30 Räume pro Stunde.

### Sperren mit `fieldset`

`<fieldset disabled>` sperrt alle Felder und Knöpfe darin auf einmal. Mit `display: contents` erzeugt es keine eigene Box und stört das Layout nicht.

### Verzögerung im echten Netz

Die Geräte bekommen eine Änderung nicht gleichzeitig. Lokal fällt das nicht auf, ein Skript oder ein schneller Doppelklick kann online aber auf eine noch alte Ansicht treffen. Das Spiel lehnt so eine Aktion richtig ab.

## Fehler und Lösungen

### `no checks reported on the 'fix/ci-main-runs' branch`

- **Wo:** `gh pr checks --watch` direkt nach `gh pr create`.
- **Ursache:** GitHub hatte den Lauf noch nicht angelegt.
- **Lösung:** Kurz warten, bis der Lauf erscheint, dann erneut aufrufen.
- **Prüfen:** `gh pr checks <nr>`

### Lauf meldet `success`, sein Job steht auf `queued`

- **Wo:** PR #12 während einer Störung von GitHub Actions (`partial_outage`), dazu `GraphQL: Something went wrong while executing your query`.
- **Ursache:** Die Angaben von GitHub widersprachen sich während der Störung.
- **Lösung:** Nicht dem Lauf glauben, sondern auf den Job warten, erst dann mergen.
- **Prüfen:** `gh api 'repos/Matzee3007/quiz-poker/commits/<sha>/check-runs' --jq '.check_runs[] | [.name,.status,.conclusion] | @tsv'`

### `status „teilweise ersetzt durch ADR 0005“ ist kein erlaubter Wert`

- **Wo:** Prüf-Hook beim Bearbeiten von ADR 0003.
- **Ursache:** Der Hook kennt nur `aktiv`, `abgeschlossen`, `akzeptiert` und `geplant`.
- **Lösung:** Status bleibt `akzeptiert`, der Hinweis auf ADR 0005 steht im Text.
- **Prüfen:** Der Hook meldet beim nächsten Bearbeiten nichts mehr.

### Frage steht als Spalte mit einem Buchstaben je Zeile

- **Wo:** Auswertung und Auflösung, nur im Screenshot sichtbar. Alle Tests waren grün.
- **Ursache:** Frage und Musterlösung lagen in einem Flex-Container, die lange Lösung nahm sich die ganze Breite.
- **Lösung:** Klasse `frage-loesung` mit festen Spalten, dazu `overflow-wrap: anywhere`.
- **Prüfen:** Quiz mit 300 und 100 Zeichen ohne Leerzeichen im Browser spielen.

### `locator.click: Timeout 30000ms exceeded` und `Das geht in diesem Schritt nicht`

- **Wo:** Testpartie auf der echten Seite, zweite Runde.
- **Ursache:** Fehler im Testskript. Anna sah die Auflösung schon, der Quiz-Master noch nicht, und das Skript drückte ein zweites Mal „Auflösen“.
- **Lösung:** Das Skript wartet auf die Auflösung beim Quiz-Master.
- **Prüfen:** Der Lauf spielt die Partie bis zum Ende, ohne Seitenfehler.

### `env: timeout: No such file or directory`

- **Wo:** Browser-Skript mit `timeout` starten.
- **Ursache:** macOS bringt den Befehl `timeout` nicht mit.
- **Lösung:** Ohne ihn starten, das Zeitlimit des Werkzeugs reicht.
- **Prüfen:** `which timeout`

## Aus dem Chat

-

## Offene Fragen

- Passt Passwort-Hashing im kostenlosen Tarif in ein Durable Object? Der Test im echten Betrieb steht aus.
- Braucht eine frei erreichbare Seite für Freunde ein Impressum? Ließ sich nicht klären, es kommt deshalb vor der Veröffentlichung der Konten.
- Hält die Grenze von 10 ms auch bei einem Quiz an allen Grenzen? Online lief nur ein kleines Quiz.

## Nächste Schritte

1. Plan für Schritt 2 von Phase 3 schreiben, beginnend mit dem Test zum Passwort-Hashing.
2. Konten mit Einladungscode bauen, davor Impressum und Datenschutzhinweise.
3. Danach Schritt 3 (Quizze in D1 speichern) und Schritt 4 (öffentliche Quizze).
